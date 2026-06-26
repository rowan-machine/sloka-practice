import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const API_KEY = process.env.ELEVENLABS_API_KEY
// Charlotte — clear, expressive female voice (better for melodic chanting)
// Alternatives: 'pNInz6obpgDQGcFmaJgB' (Adam), 'ThT5KcBeYPX3keUQqHPh' (Dorothy)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa'

// Per-pāda pitch/rate settings for each meter
// Each meter defines 4 pādas with unique pitch (semitones shift) and rate
interface PadaSettings {
  rate: number    // speech rate (0.5 = very slow, 1.0 = normal)
  stability: number  // voice stability (lower = more expressive/melodic)
  style: number      // style exaggeration (higher = more dramatic)
}

interface MeterConfig {
  name: string
  syllablesPerLine: number
  padas: PadaSettings[]  // settings for pāda a, b, c, d
}

const meterConfigs: Record<string, MeterConfig> = {
  anushtubh: {
    name: 'Anuṣṭubh',
    syllablesPerLine: 8,
    padas: [
      { rate: 0.78, stability: 0.45, style: 0.75 },  // a: steady opening
      { rate: 0.74, stability: 0.40, style: 0.80 },  // b: slightly slower, more expressive
      { rate: 0.78, stability: 0.45, style: 0.75 },  // c: reopens
      { rate: 0.70, stability: 0.35, style: 0.85 },  // d: slowest, most expressive
    ]
  },
  trishtubh: {
    name: 'Triṣṭubh',
    syllablesPerLine: 11,
    padas: [
      { rate: 0.74, stability: 0.45, style: 0.75 },  // a: steady
      { rate: 0.70, stability: 0.40, style: 0.80 },  // b: resolves
      { rate: 0.74, stability: 0.42, style: 0.78 },  // c: reopens
      { rate: 0.66, stability: 0.35, style: 0.85 },  // d: slowest
    ]
  },
  jagati: {
    name: 'Jagatī',
    syllablesPerLine: 12,
    padas: [
      { rate: 0.70, stability: 0.45, style: 0.75 },  // a: flowing
      { rate: 0.66, stability: 0.40, style: 0.80 },  // b: resolves
      { rate: 0.70, stability: 0.42, style: 0.78 },  // c: reopens
      { rate: 0.62, stability: 0.35, style: 0.85 },  // d: slowest
    ]
  },
  vasanta_tilaka: {
    name: 'Vasanta-tilakā',
    syllablesPerLine: 14,
    padas: [
      { rate: 0.66, stability: 0.45, style: 0.75 },  // a: gradual
      { rate: 0.62, stability: 0.40, style: 0.80 },  // b: resolves
      { rate: 0.66, stability: 0.38, style: 0.82 },  // c: most expressive
      { rate: 0.58, stability: 0.35, style: 0.85 },  // d: slowest
    ]
  },
  longer: {
    name: 'Longer Metres',
    syllablesPerLine: 17,
    padas: [
      { rate: 0.64, stability: 0.45, style: 0.75 },  // a: opening
      { rate: 0.60, stability: 0.40, style: 0.80 },  // b: settles
      { rate: 0.64, stability: 0.42, style: 0.78 },  // c: energetic
      { rate: 0.56, stability: 0.35, style: 0.85 },  // d: slowest
    ]
  }
}

function countSyllables(word: string): number {
  const vowels = /[aāiīuūṛṝḷeaioau]/gi
  const matches = word.match(vowels)
  return matches ? matches.length : 1
}

function splitIntoPadas(text: string, syllablesPerLine: number): string[] {
  let lines = text.split('\n').filter(l => l.trim())

  if (lines.length > 1) return lines.map(l => l.trim())

  const words = text.split(/\s+/).filter(w => w.length > 0)
  lines = []
  let currentLine: string[] = []
  let currentSyllables = 0
  for (const word of words) {
    const wordSyllables = countSyllables(word)
    if (currentSyllables + wordSyllables > syllablesPerLine && currentLine.length > 0) {
      lines.push(currentLine.join(' '))
      currentLine = [word]
      currentSyllables = wordSyllables
    } else {
      currentLine.push(word)
      currentSyllables += wordSyllables
    }
  }
  if (currentLine.length > 0) lines.push(currentLine.join(' '))
  return lines
}

// Synthesize one pāda with ElevenLabs
async function synthesizePada(text: string, settings: PadaSettings): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY!
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: 0.75,
          style: settings.style,
          use_speaker_boost: true
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

// Returns per-pāda audio buffers + pitch/rate info for frontend processing
app.post('/api/speak', async (req, res) => {
  const { text, meter } = req.body

  if (!API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set in .env' })
  }

  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  const meterKey = meter || 'anushtubh'
  const config = meterConfigs[meterKey] || meterConfigs.anushtubh
  const padas = splitIntoPadas(text, config.syllablesPerLine)

  try {
    console.log(`Generating ${config.name} — ${padas.length} pādas...`)

    const results: { audio: string; rate: number }[] = []

    for (let i = 0; i < padas.length; i++) {
      const padaSettings = config.padas[i % config.padas.length]
      console.log(`  Pāda ${i + 1}: "${padas[i]}" rate=${padaSettings.rate} stability=${padaSettings.stability} style=${padaSettings.style}`)
      const audioBuffer = await synthesizePada(padas[i], padaSettings)
      results.push({
        audio: audioBuffer.toString('base64'),
        rate: padaSettings.rate
      })
    }

    console.log('Done!')
    res.json({ padas: results, meter: meterKey })
  } catch (err: any) {
    console.error('ElevenLabs error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Single word pronunciation
app.post('/api/speak-word', async (req, res) => {
  const { word } = req.body

  if (!API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set in .env' })
  }

  try {
    const audioBuffer = await synthesizePada(word, { rate: 0.75, stability: 0.45, style: 0.75 })
    res.json({ audioContent: audioBuffer.toString('base64') })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`TTS server running on http://localhost:${PORT}`)
  console.log(`Using ElevenLabs voice: ${VOICE_ID}`)
})
