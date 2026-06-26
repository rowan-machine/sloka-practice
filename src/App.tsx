import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { slokaLibrary, difficultyLabels, difficultyColors, type Difficulty, type SlokaEntry } from './slokaLibrary'
import { loadScores, saveScores, recordResult, loadKnownWords, addKnownWord, isWordKnown, loadWordStats, recordWordAttempt, loadSlokaProgress, recordSlokaAttempt, type SoundScore, type KnownWord, type WordStats, type SlokaProgress } from './sanskritSounds'
import { getUserDifficulty } from './difficultyScorer'
import SoundPractice from './SoundPractice'

type Meter = 'anushtubh' | 'trishtubh' | 'jagati' | 'vasanta_tilaka' | 'longer' | 'mantra'

interface MeterInfo {
  name: string
  syllablesPerLine: number
  description: string
  pattern: string
  example: string
  exampleRef: string
}

const meters: Record<Meter, MeterInfo> = {
  anushtubh: {
    name: 'Anuṣṭubh',
    syllablesPerLine: 8,
    description: 'The Bhagavad-gītā meter. Most prevalent meter.',
    pattern: '8 syllables per pāda (quarter-verse)',
    example: `sarva-dharmān parityajya\nmām ekaṁ śaraṇaṁ vraja\nahaṁ tvāṁ sarva-pāpebhyo\nmokṣayiṣyāmi mā śucaḥ`,
    exampleRef: 'Bhagavad-gītā 18.66'
  },
  trishtubh: {
    name: 'Triṣṭubh',
    syllablesPerLine: 11,
    description: 'Irregular meter with 11 syllables. Can be chanted with Classic SB meter or Brahma-saṁhitā meter.',
    pattern: '11 syllables per pāda (quarter-verse)',
    example: `naiṣāṁ matis tāvad urukramāṅghriṁ\nspṛśaty anarthāpagamo yad-arthaḥ\nmahīyasāṁ pāda-rajo-'bhiṣekaṁ\nniṣkiñcanānāṁ na vṛṇīta yāvat`,
    exampleRef: 'ŚB 7.5.32'
  },
  jagati: {
    name: 'Jagatī',
    syllablesPerLine: 12,
    description: 'The classic Śrīmad-Bhāgavatam meter with 12 syllables.',
    pattern: '12 syllables per pāda (quarter-verse)',
    example: `bhavāpavargo bhramato yadā bhavej\njanasya tarhy acyuta sat-samāgamaḥ\nsat-saṅgamo yarhi tadaiva sad-gatau\nparāvareśe tvayi jāyate matiḥ`,
    exampleRef: 'ŚB 10.51.53'
  },
  vasanta_tilaka: {
    name: 'Vasanta-tilakā',
    syllablesPerLine: 14,
    description: 'The Śrī Brahma-saṁhitā meter with 14 syllables.',
    pattern: '14 syllables per pāda (quarter-verse)',
    example: `veṇuṁ kvaṇantam aravinda-dalāyatākṣam-\nbarhāvataṁsam asitāmbuda-sundarāṅgam\nkandarpa-koṭi-kamanīya-viśeṣa-śobhaṁ\ngovindam ādi-puruṣaṁ tam ahaṁ bhajāmi`,
    exampleRef: 'Brahma-saṁhitā 5.30'
  },
  longer: {
    name: 'Longer Metres',
    syllablesPerLine: 17,
    description: 'Includes 15-syllable (Pṛthvī) and 17-syllable (Nardaṭaka) metres. Pattern: da-da-da-da-dA da-dA / da-da-da-dA da-da-dA da-da-dA',
    pattern: '15–17+ syllables per pāda. Nardaṭaka: da-da-da-da-dA da-dA / da-da-da-dA da-da-dA da-da-dA',
    example: `anarpita-carīṁ cirāt karuṇayāvatīrṇaḥ kalau\nsamarpayitum unnatojjvala-rasāṁ sva-bhakti-śriyam\nhariḥ puraṭa-sundara-dyuti-kadamba-sandīpitaḥ\nsadā hṛdaya-kandare sphuratu vaḥ śacī-nandanaḥ`,
    exampleRef: 'CC Ādi 1.4'
  },
  mantra: {
    name: 'Mantra / Chant',
    syllablesPerLine: 0,
    description: 'Sacred mantras, mahā-mantras, and popular ISKCON chants. No fixed metrical pattern.',
    pattern: 'Free — varies by chant',
    example: `hare kṛṣṇa hare kṛṣṇa\nkṛṣṇa kṛṣṇa hare hare\nhare rāma hare rāma\nrāma rāma hare hare`,
    exampleRef: 'Mahā-mantra'
  }
}

interface SyllableMatch {
  text: string
  status: 'green' | 'yellow' | 'red' | 'pending'
}

interface WordMatch {
  index: number
  status: 'green' | 'yellow' | 'red' | 'pending'
  syllables?: SyllableMatch[]
}

function countSanskritSyllables(word: string): number {
  const vowels = /[aāiīuūṛṝḷeaioau]/gi
  const matches = word.match(vowels)
  return matches ? matches.length : 1
}

// Sanskrit prosody: classify a syllable as guru (long/heavy) or laghu (short/light)
// A syllable is guru if:
//   1. It contains a long vowel (ā ī ū ṝ e ai o au) or
//   2. It ends with a consonant cluster (saṁyoga — vowel followed by 2+ consonants before next vowel)
//   3. It ends with visarga (ḥ) or anusvāra (ṁ/ṃ)
// Otherwise it is laghu.
function classifySyllableWeight(syllable: string, nextSyllable?: string): 'guru' | 'laghu' {
  const lower = syllable.toLowerCase()

  // Check for long vowels in the syllable
  const longVowels = /[āīūṝ]/i
  // e, ai, o, au are always long in Sanskrit
  const diphthongs = /(?:ai|au)/i
  const naturallyLong = /[eo]/i  // e and o are always long in Sanskrit

  if (longVowels.test(lower)) return 'guru'
  if (diphthongs.test(lower)) return 'guru'
  if (naturallyLong.test(lower)) return 'guru'

  // Check for visarga or anusvāra
  if (/[ḥṁṃ]/.test(lower)) return 'guru'

  // Check if syllable ends with consonant(s) after the vowel (position makes heavy)
  // Extract trailing consonants after the last vowel
  const vowelPattern = /[aāiīuūṛṝḷeaioau]/gi
  let lastVowelEnd = 0
  let m
  while ((m = vowelPattern.exec(lower)) !== null) {
    lastVowelEnd = m.index + m[0].length
  }
  const trailingConsonants = lower.slice(lastVowelEnd).replace(/[^a-zḍṭṅñṇśṣṛṝḷḥṁṃ]/gi, '')

  // If this syllable has trailing consonants, it's heavy by position
  if (trailingConsonants.length >= 1) return 'guru'

  // If the NEXT syllable starts with 2+ consonants, this syllable is heavy by position
  if (nextSyllable) {
    const nextLower = nextSyllable.toLowerCase()
    const firstVowelIdx = nextLower.search(/[aāiīuūṛṝḷeaioau]/i)
    if (firstVowelIdx > 1) return 'guru' // 2+ consonants before first vowel
  }

  return 'laghu'
}

// Get scansion for all syllables of a word
function getWordScansion(syllables: string[], isLastWordInLine: boolean, nextWordSyllables?: string[]): ('guru' | 'laghu')[] {
  return syllables.map((syl, i) => {
    let nextSyl: string | undefined
    if (i + 1 < syllables.length) {
      nextSyl = syllables[i + 1]
    } else if (!isLastWordInLine && nextWordSyllables && nextWordSyllables.length > 0) {
      nextSyl = nextWordSyllables[0]
    }
    return classifySyllableWeight(syl, nextSyl)
  })
}

function detectMeter(text: string): Meter {
  const lines = text.split('\n').filter(l => l.trim())
  
  let totalSyllables = 0
  let lineCount = 0
  
  for (const line of lines) {
    const words = line.trim().split(/\s+/)
    let lineSyllables = 0
    for (const word of words) {
      lineSyllables += countSanskritSyllables(word)
    }
    if (lineSyllables > 0) {
      totalSyllables += lineSyllables
      lineCount++
    }
  }
  
  // If no newlines, count total and divide by 4 (assumed 4 pādas)
  if (lineCount <= 1) {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    totalSyllables = 0
    for (const word of words) {
      totalSyllables += countSanskritSyllables(word)
    }
    const perPada = totalSyllables / 4
    if (perPada <= 9) return 'anushtubh'
    if (perPada <= 11.5) return 'trishtubh'
    if (perPada <= 13) return 'jagati'
    if (perPada <= 15) return 'vasanta_tilaka'
    return 'longer'
  }
  
  const avgSyllablesPerLine = totalSyllables / lineCount
  
  if (avgSyllablesPerLine <= 9) return 'anushtubh'
  if (avgSyllablesPerLine <= 11.5) return 'trishtubh'
  if (avgSyllablesPerLine <= 13) return 'jagati'
  if (avgSyllablesPerLine <= 15) return 'vasanta_tilaka'
  return 'longer'
}

function splitIntoLines(text: string, syllablesPerLine: number): string[][] {
  // For mantras / free-form (syllablesPerLine === 0), split on actual newlines
  if (syllablesPerLine <= 0) {
    return text.split('\n')
      .map(line => line.split(/\s+/).filter(w => w.length > 0))
      .filter(line => line.length > 0)
  }

  const words = text.split(/\s+/).filter(w => w.length > 0)
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentSyllables = 0

  for (const word of words) {
    const wordSyllables = countSanskritSyllables(word)
    if (currentSyllables + wordSyllables > syllablesPerLine && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = [word]
      currentSyllables = wordSyllables
    } else {
      currentLine.push(word)
      currentSyllables += wordSyllables
    }
  }
  if (currentLine.length > 0) lines.push(currentLine)
  return lines
}

function App() {
  const [page, setPage] = useState<'practice' | 'sounds'>('practice')
  const [sloka, setSloka] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [selectedMeter, setSelectedMeter] = useState<Meter>('anushtubh')
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpokenWord, setCurrentSpokenWord] = useState(-1)
  const [showMeterMarks, setShowMeterMarks] = useState(false)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)

  // Sound scores, known words, word stats (all persisted)
  const [soundScores, setSoundScores] = useState<Record<string, SoundScore>>(() => loadScores())
  const [knownWords, setKnownWords] = useState<KnownWord[]>(() => loadKnownWords())
  const [wordStats, setWordStats] = useState<Record<string, WordStats>>(() => loadWordStats())
  const [slokaProgress, setSlokaProgress] = useState<Record<string, SlokaProgress>>(() => loadSlokaProgress())

  // Audio recording for capturing user's pronunciation
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const lastRecordingRef = useRef<string | undefined>(undefined)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => { lastRecordingRef.current = reader.result as string }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
    } catch (_) {
      // Mic access denied — recording won't be available
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  // Library browser state
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryMeter, setLibraryMeter] = useState<Meter | 'all'>('all')
  const [libraryDifficulty, setLibraryDifficulty] = useState<Difficulty | 'all'>('all')
  const [librarySource, setLibrarySource] = useState<string>('all')
  const [useDynamicDifficulty, setUseDynamicDifficulty] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<SlokaEntry | null>(null)
  const [librarySearch, setLibrarySearch] = useState('')

  // Collect unique sources for filter
  const allSources: string[] = Array.from(new Set(slokaLibrary.map(s => s.source))).sort()
  // Group similar sources for cleaner UI
  const sourceGroups: Record<string, string[]> = {
    'Bhagavad-gītā': allSources.filter((s: string) => s === 'Bhagavad-gītā'),
    'Śrīmad-Bhāgavatam': allSources.filter((s: string) => s === 'Śrīmad-Bhāgavatam'),
    'Brahma-saṁhitā': allSources.filter((s: string) => s === 'Brahma-saṁhitā'),
    'Other Śāstra': allSources.filter((s: string) => ['Caitanya-caritāmṛta', 'Śikṣāṣṭaka', 'Īśopaniṣad'].includes(s)),
    'Mantras & Prayers': allSources.filter((s: string) => s.includes('Mantra') || s.includes('Praṇāma') || s.includes('Āratī') || s.includes('Gāyatrī') || s.includes('Prayer') || s.includes('Nṛsiṁha')),
    'Bhajans & Kīrtana': allSources.filter((s: string) => ['Bhaktivinoda Ṭhākura', 'Narottama dāsa Ṭhākura', 'Viśvanātha Cakravartī Ṭhākura', 'Kīrtana', 'Rūpa Gosvāmī', 'Śrīla Prabhupāda', 'Dāmodarāṣṭaka', 'Gurv-aṣṭaka'].includes(s)),
  }

  // Compute per-user difficulty for each verse
  const verseDifficulties = new Map<string, ReturnType<typeof getUserDifficulty>>()
  for (const s of slokaLibrary) {
    verseDifficulties.set(s.id, getUserDifficulty(s.text, knownWords, soundScores))
  }

  const filteredSlokas = slokaLibrary.filter(s => {
    if (libraryMeter !== 'all' && s.meter !== libraryMeter) return false
    if (librarySource !== 'all') {
      const groupSources = sourceGroups[librarySource]
      if (groupSources) {
        if (!groupSources.includes(s.source)) return false
      } else if (s.source !== librarySource) return false
    }
    if (libraryDifficulty !== 'all') {
      if (useDynamicDifficulty) {
        const ud = verseDifficulties.get(s.id)
        if (ud && ud.difficulty !== libraryDifficulty) return false
      } else {
        if (s.difficulty !== libraryDifficulty) return false
      }
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase()
      if (!s.text.toLowerCase().includes(q) && !s.reference.toLowerCase().includes(q) && !s.translation.toLowerCase().includes(q) && !s.source.toLowerCase().includes(q)) return false
    }
    return true
  })

  const loadSloka = (entry: SlokaEntry) => {
    setSloka(entry.text)
    setSelectedEntry(entry)
    setWordMatches([])
    setTranscript('')
    setShowLibrary(false)
  }

  // Auto-detect meter when sloka changes
  useEffect(() => {
    if (sloka.trim()) {
      const detected = detectMeter(sloka)
      setSelectedMeter(detected)
    }
  }, [sloka])

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event: any) => {
      // Only use finalized results — interim results jump ahead
      let finalized = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalized += event.results[i][0].transcript
        }
      }
      if (finalized.trim()) {
        setTranscript(finalized)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start() } catch (_) {}
      }
    }

    recognitionRef.current = recognition
  }, [])

  // Split a word into syllables based on vowel nuclei
  const splitSyllables = (word: string): string[] => {
    // Match consonant clusters + vowel (+ optional trailing consonants at end)
    const syllables: string[] = []
    const re = /[^aāiīuūṛṝḷeaioau]*[aāiīuūṛṝḷeaioau]+[^aāiīuūṛṝḷeaioau]*/gi
    let match
    while ((match = re.exec(word)) !== null) {
      syllables.push(match[0])
    }
    // If regex didn't match anything, return the whole word
    return syllables.length > 0 ? syllables : [word]
  }

  const normalize = (s: string) => s.toLowerCase()
    .replace(/[।॥\-,\.!?'":;''/]/g, '')
    // Long vowels → short
    .replace(/ā/g, 'a').replace(/ī/g, 'i').replace(/ū/g, 'u')
    // Special vowels
    .replace(/ṛ/g, 'ri').replace(/ṝ/g, 'ri').replace(/ḷ/g, 'li')
    // Nasals
    .replace(/ṁ/g, 'm').replace(/ṃ/g, 'm').replace(/ṅ/g, 'ng')
    .replace(/ñ/g, 'ny').replace(/ṇ/g, 'n')
    // Sibilants
    .replace(/ś/g, 'sh').replace(/ṣ/g, 'sh')
    // Aspirates — reduce to base consonant for comparison
    .replace(/kh/g, 'k').replace(/gh/g, 'g')
    .replace(/ch/g, 'ch').replace(/jh/g, 'j')
    .replace(/ṭh/g, 't').replace(/ḍh/g, 'd')
    .replace(/th/g, 't').replace(/dh/g, 'd')
    .replace(/ph/g, 'p').replace(/bh/g, 'b')
    // Retroflexes → dental
    .replace(/ṭ/g, 't').replace(/ḍ/g, 'd')
    // Visarga
    .replace(/ḥ/g, 'h')
    // Common speech recognition outputs
    .replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u')
    .trim()

  // Best-match alignment: find the best śloka word for each spoken word
  // using a sliding window, so a missed/extra word doesn't ruin the rest
  const compareSyllables = (word: string, spokenWord: string): SyllableMatch[] => {
    const wordSyls = splitSyllables(word)
    const spokenSyls = splitSyllables(spokenWord)
    return wordSyls.map((syl, si) => {
      if (si < spokenSyls.length) {
        const nSyl = normalize(syl)
        const nSpoken = normalize(spokenSyls[si])
        const sylDist = levenshteinDistance(nSyl, nSpoken)
        const sylMax = Math.max(nSyl.length, nSpoken.length)
        const sylSim = sylMax > 0 ? 1 - sylDist / sylMax : 1
        if (sylSim >= 0.5) return { text: syl, status: 'green' as const }
        if (sylSim >= 0.25) return { text: syl, status: 'yellow' as const }
        return { text: syl, status: 'red' as const }
      }
      return { text: syl, status: 'pending' as const }
    })
  }

  const matchWord = (word: string, spokenWord: string): WordMatch & { similarity: number } => {
    const normalizedWord = normalize(word)
    const normalizedSpoken = normalize(spokenWord)
    const dist = levenshteinDistance(normalizedWord, normalizedSpoken)
    const maxLen = Math.max(normalizedWord.length, normalizedSpoken.length)
    const similarity = maxLen > 0 ? 1 - dist / maxLen : 1

    if (similarity >= 0.65) {
      return { index: 0, status: 'green', syllables: splitSyllables(word).map(s => ({ text: s, status: 'green' })), similarity }
    } else if (similarity >= 0.35) {
      return { index: 0, status: 'yellow', syllables: compareSyllables(word, spokenWord), similarity }
    } else {
      return { index: 0, status: 'red', syllables: compareSyllables(word, spokenWord), similarity }
    }
  }

  const compareWords = useCallback((spokenText: string) => {
    if (!sloka) return

    // Expand hyphenated śloka words into sub-tokens for comparison
    // but track which original word index each token belongs to
    const rawSlokaWords = sloka.split(/\s+/).filter(w => w.length > 0)
    const slokaTokens: { text: string; origIdx: number; isPartOf: string }[] = []
    rawSlokaWords.forEach((word, idx) => {
      if (word.includes('-')) {
        const parts = word.split('-').filter(p => p.length > 0)
        parts.forEach(part => slokaTokens.push({ text: part, origIdx: idx, isPartOf: word }))
      } else {
        slokaTokens.push({ text: word, origIdx: idx, isPartOf: word })
      }
    })

    const spokenWords = spokenText.split(/\s+/).filter(w => w.length > 0)
    if (spokenWords.length === 0) return

    // Match spoken words against expanded tokens
    const tokenMatches = new Map<number, { status: 'green' | 'yellow' | 'red' | 'pending'; similarity: number }>()

    let tokenIdx = 0
    for (let spIdx = 0; spIdx < spokenWords.length && tokenIdx < slokaTokens.length; spIdx++) {
      const spoken = spokenWords[spIdx]
      const token = slokaTokens[tokenIdx]
      const result = matchWord(token.text, spoken)

      // Try next token in case of skip
      let nextResult = null
      if (tokenIdx + 1 < slokaTokens.length) {
        nextResult = matchWord(slokaTokens[tokenIdx + 1].text, spoken)
      }

      if (nextResult && nextResult.similarity > result.similarity + 0.3) {
        tokenMatches.set(tokenIdx, { status: 'yellow', similarity: 0.5 })
        tokenIdx++
        tokenMatches.set(tokenIdx, { status: nextResult.status, similarity: nextResult.similarity })
      } else {
        tokenMatches.set(tokenIdx, { status: result.status, similarity: result.similarity })
      }
      tokenIdx++
    }

    // Aggregate token results back to original word indices
    const matches: WordMatch[] = rawSlokaWords.map((_w, i) => ({ index: i, status: 'pending' as const }))

    for (const [tIdx, tResult] of tokenMatches) {
      const origIdx = slokaTokens[tIdx].origIdx
      const origWord = rawSlokaWords[origIdx]
      const existing = matches[origIdx]

      if (existing.status === 'pending') {
        // First token for this word
        matches[origIdx] = { index: origIdx, status: tResult.status, syllables: compareSyllables(origWord, spokenWords[0] || '') }
      } else {
        // Merge: if any token is green, upgrade; if any is red, keep red parts
        const best = tResult.status === 'green' ? 'green' : tResult.status === 'yellow' ? 'yellow' : existing.status
        const worst = existing.status === 'red' ? 'red' : tResult.status
        matches[origIdx] = {
          index: origIdx,
          status: (best === 'green' && worst === 'green') ? 'green' : (best === 'green' || worst === 'green') ? 'yellow' : worst,
        }
      }
    }

    // Add syllable breakdown for non-pending words
    matches.forEach((m, i) => {
      if (m.status !== 'pending') {
        const word = rawSlokaWords[i]
        // Find the spoken words that mapped to this word's tokens
        const myTokenIdxs = slokaTokens
          .map((t, ti) => t.origIdx === i ? ti : -1)
          .filter(ti => ti >= 0)
        const allMatched = myTokenIdxs.every(ti => tokenMatches.has(ti))
        if (allMatched) {
          const statuses = myTokenIdxs.map(ti => tokenMatches.get(ti)!.status)
          // Simple syllable coloring based on token results
          const syls = splitSyllables(word)
          matches[i].syllables = syls.map((s, si) => {
            const tokenForSyl = si < statuses.length ? statuses[si] : statuses[statuses.length - 1]
            return { text: s, status: tokenForSyl || m.status }
          })
        } else {
          matches[i].syllables = splitSyllables(word).map(s => ({ text: s, status: m.status }))
        }
      }
    })

    // Track sound scores for newly matched words
    setSoundScores(prev => {
      let updated = { ...prev }
      matches.forEach((m, i) => {
        if (m.status !== 'pending') {
          const word = rawSlokaWords[i]
          updated = recordResult(updated, word, m.status)
        }
      })
      saveScores(updated)
      return updated
    })

    // Auto-save green words as known
    setKnownWords(prev => {
      let updated = prev
      matches.forEach((m, i) => {
        if (m.status === 'green') {
          const word = rawSlokaWords[i]
          updated = addKnownWord(updated, word)
        }
      })
      return updated
    })

    // Track per-word stats with recording
    // Small delay to ensure recording is finalized
    setTimeout(() => {
      setWordStats(prev => {
        let updated = { ...prev }
        matches.forEach((m, i) => {
          if (m.status !== 'pending') {
            const word = rawSlokaWords[i]
            updated = recordWordAttempt(
              updated, word, m.status,
              spokenText,
              lastRecordingRef.current
            )
          }
        })
        return updated
      })
    }, 500)

    setWordMatches(matches)

    // Check if entire śloka was perfect (all non-empty words green)
    if (selectedEntry) {
      const nonEmpty = matches.filter(m => m.status !== 'pending')
      const allGreen = nonEmpty.length > 0 && nonEmpty.length === matches.length && nonEmpty.every(m => m.status === 'green')
      setSlokaProgress(prev => recordSlokaAttempt(prev, selectedEntry.id, allGreen))
    }
  }, [sloka, selectedEntry])

  useEffect(() => {
    if (transcript) compareWords(transcript)
  }, [transcript, compareWords])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('')
      setWordMatches([])
      setIsListening(true)
      lastRecordingRef.current = undefined
      startRecording()
      try { recognitionRef.current.start() } catch (_) {}
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false)
      recognitionRef.current.stop()
      stopRecording()
    }
  }

  const audioCtxRef = useRef<AudioContext | null>(null)
  const playbackCancelledRef = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const getAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }

  // Decode base64 MP3 into AudioBuffer and play with rate control
  const playPadaAudio = async (
    ctx: AudioContext,
    base64Audio: string,
    playbackRate: number
  ): Promise<void> => {
    const binary = atob(base64Audio)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer)

    return new Promise((resolve) => {
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      // Only adjust rate for cadence — no pitch shifting
      source.playbackRate.value = playbackRate
      source.connect(ctx.destination)
      source.onended = () => resolve()
      source.start()
    })
  }

  // Pause durations between pādas
  const PADA_PAUSE_MS = 350
  const HALF_VERSE_PAUSE_MS = 600

  const speakWithMeter = async (text: string, meter: Meter) => {
    setIsGenerating(true)
    setIsSpeaking(true)
    playbackCancelledRef.current = false

    try {
      const response = await fetch('http://localhost:3001/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, meter })
      })

      if (!response.ok) {
        const err = await response.json()
        console.error('Server error:', err.error)
        setIsGenerating(false)
        setIsSpeaking(false)
        return
      }

      const data = await response.json()
      setIsGenerating(false)

      if (!data.padas || data.padas.length === 0) {
        setIsSpeaking(false)
        return
      }

      const ctx = getAudioCtx()
      if (ctx.state === 'suspended') await ctx.resume()

      // Play each pāda sequentially with pauses
      for (let i = 0; i < data.padas.length; i++) {
        if (playbackCancelledRef.current) break

        const pada = data.padas[i]
        await playPadaAudio(ctx, pada.audio, pada.rate)

        // Pause between pādas
        if (i < data.padas.length - 1 && !playbackCancelledRef.current) {
          const isHalfVerseBoundary = (i + 1) % 2 === 0
          const pauseMs = isHalfVerseBoundary ? HALF_VERSE_PAUSE_MS : PADA_PAUSE_MS
          await new Promise(r => setTimeout(r, pauseMs))
        }
      }

      setIsSpeaking(false)
      setCurrentSpokenWord(-1)
    } catch (err) {
      console.error('Fetch error:', err)
      setIsGenerating(false)
      setIsSpeaking(false)
    }
  }

  const stopPlayback = () => {
    playbackCancelledRef.current = true
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setIsSpeaking(false)
    setIsGenerating(false)
    setCurrentSpokenWord(-1)
  }

  const speakWord = async (word: string) => {
    try {
      const resp = await fetch('http://localhost:3001/api/speak-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      })
      const data = await resp.json()
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        await audio.play()
      }
    } catch (err) {
      console.error('Word TTS error:', err)
    }
  }

  const speakLineWithMeter = async (lineText: string) => {
    // Speak a single line using Suno (same endpoint, just one line)
    await speakWithMeter(lineText, selectedMeter)
  }

  const renderSlokaWithHighlights = () => {
    const lines = splitIntoLines(sloka, meters[selectedMeter].syllablesPerLine)
    let globalIndex = 0

    // Pre-compute syllables for all words in each line for cross-word scansion
    const lineSyllables = lines.map(line => line.map(word => splitSyllables(word)))

    return (
      <div className="space-y-3">
        {lines.map((line, lineIdx) => {
          const lineWordSyls = lineSyllables[lineIdx]

          return (
          <div key={lineIdx} className="flex flex-wrap items-start gap-1">
            <span className="text-xs text-gray-400 mr-2 w-6 mt-1.5">{lineIdx + 1}.</span>
            {line.map((word, wordInLineIdx) => {
              const idx = globalIndex
              const match = wordMatches.find(m => m.index === idx)
              const isCurrentlySpoken = currentSpokenWord === idx
              globalIndex++

              const sylColorClass = (status: string) => {
                switch (status) {
                  case 'green': return 'bg-green-100 border-b-4 border-green-500'
                  case 'yellow': return 'bg-yellow-100 border-b-4 border-yellow-500'
                  case 'red': return 'bg-red-100 border-b-4 border-red-500'
                  default: return ''
                }
              }

              const wordIsKnown = isWordKnown(knownWords, word)
              const wordSyls = lineWordSyls[wordInLineIdx]
              const isLastWordInLine = wordInLineIdx === line.length - 1
              const nextWordSyls = !isLastWordInLine ? lineWordSyls[wordInLineIdx + 1] : undefined
              const scansion = showMeterMarks ? getWordScansion(wordSyls, isLastWordInLine, nextWordSyls) : null

              // Helper: render a single syllable column (text + optional scansion mark)
              const renderSylColumn = (sylText: string, si: number, totalSyls: number, statusClass: string) => (
                <span key={si} className={`inline-flex flex-col items-center ${statusClass} ${si === 0 ? 'rounded-l' : ''} ${si === totalSyls - 1 ? 'rounded-r' : ''} px-0.5`}>
                  <span className="text-xl leading-tight">{sylText}</span>
                  {scansion && (
                    <span
                      className={`text-center leading-none mt-0.5 ${
                        scansion[si] === 'guru' ? 'text-purple-600 font-bold' : 'text-gray-400'
                      }`}
                      style={{ fontSize: '13px' }}
                      title={scansion[si] === 'guru' ? 'Guru (long/heavy)' : 'Laghu (short/light)'}
                    >
                      {scansion[si] === 'guru' ? '—' : '◡'}
                    </span>
                  )}
                </span>
              )

              // If we have per-syllable data, render each syllable colored separately
              if (match?.syllables && match.status !== 'pending') {
                return (
                  <span
                    key={idx}
                    className={`cursor-pointer py-0.5 rounded transition-all duration-200 inline-flex items-end
                      ${isCurrentlySpoken ? 'ring-2 ring-purple-500 scale-110' : ''}
                      hover:opacity-80
                    `}
                    onClick={() => speakWord(word)}
                    title={wordIsKnown ? 'Known word ✓ — Click to hear' : 'Click to hear correct pronunciation'}
                  >
                    {match.syllables.map((syl, si) =>
                      renderSylColumn(syl.text, si, match.syllables!.length, sylColorClass(syl.status))
                    )}
                    {match.status === 'green' && wordIsKnown && (
                      <span className="ml-0.5 text-xs text-green-600 self-start" title="Saved to known words">✓</span>
                    )}
                  </span>
                )
              }

              // No syllable data (pending or fully green)
              let colorClass = ''
              let underlineClass = ''
              if (match) {
                switch (match.status) {
                  case 'green':
                    colorClass = 'bg-green-100'
                    underlineClass = 'border-b-4 border-green-500'
                    break
                  case 'yellow':
                    colorClass = 'bg-yellow-100'
                    underlineClass = 'border-b-4 border-yellow-500'
                    break
                  case 'red':
                    colorClass = 'bg-red-100'
                    underlineClass = 'border-b-4 border-red-500'
                    break
                }
              }

              return (
                <span
                  key={idx}
                  className={`cursor-pointer px-0.5 py-0.5 rounded transition-all duration-200 inline-flex items-end
                    ${colorClass} ${underlineClass}
                    ${isCurrentlySpoken ? 'ring-2 ring-purple-500 scale-110' : ''}
                    hover:bg-gray-200
                  `}
                  onClick={() => speakWord(word)}
                  title="Click to hear"
                >
                  {wordSyls.map((syl, si) =>
                    renderSylColumn(syl, si, wordSyls.length, '')
                  )}
                </span>
              )
            })}
            <button
              onClick={() => speakLineWithMeter(line.join(' '))}
              className="ml-2 text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors mt-1"
              title="Hear this line in meter"
            >
              🔊
            </button>
          </div>
          )
        })}
      </div>
    )
  }


  if (page === 'sounds') {
    return (
      <SoundPractice
        onBack={() => setPage('practice')}
        scores={soundScores}
        setScores={setSoundScores}
        knownWords={knownWords}
        setKnownWords={setKnownWords}
        wordStats={wordStats}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-1">
            संस्कृत श्लोक अभ्यास
          </h1>
          <h2 className="text-lg md:text-xl text-gray-600">
            Sanskrit Śloka Pronunciation Practice
          </h2>
          <p className="text-sm text-gray-400 mt-1">Speak and see real-time feedback • Click words to hear correct pronunciation in meter</p>
          <button
            onClick={() => setPage('sounds')}
            className="mt-3 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors border border-amber-300 font-medium text-sm"
          >
            🔤 Sound Practice & Scores
          </button>
        </header>

        {/* Śloka Library Browser */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <h3 className="text-lg font-semibold text-gray-700">
              {showLibrary ? 'Śloka Library' : 'Select a Śloka'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showLibrary 
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300'
                }`}
              >
                {showLibrary ? '✕ Close Library' : '📚 Browse Library'}
              </button>
            </div>
          </div>

          {/* Selected śloka info */}
          {selectedEntry && !showLibrary && (
            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-amber-50 rounded-xl">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-sm">
                  {meters[selectedEntry.meter].name}
                </span>
                {(() => {
                  const ud = verseDifficulties.get(selectedEntry.id)!
                  return (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${difficultyColors[ud.difficulty]}`}
                      title={`Score: ${ud.score}/100 • ${ud.knownWordCount}/${ud.totalWords} words known • ${ud.strongSoundCount} strong / ${ud.weakSoundCount} weak / ${ud.newSoundCount} new sounds`}
                    >
                      {difficultyLabels[ud.difficulty]} (for you)
                    </span>
                  )
                })()}
                <span className="text-sm text-gray-600 font-medium">{selectedEntry.reference}</span>
                <span className="text-xs text-gray-400">({selectedEntry.source})</span>
              </div>
              {(() => {
                const ud = verseDifficulties.get(selectedEntry.id)!
                return (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-1">
                    <span>📊 {ud.knownWordCount}/{ud.totalWords} words known</span>
                    {ud.strongSoundCount > 0 && <span>💪 {ud.strongSoundCount} strong sounds</span>}
                    {ud.weakSoundCount > 0 && <span>⚠️ {ud.weakSoundCount} weak sounds</span>}
                    {ud.newSoundCount > 0 && <span>🆕 {ud.newSoundCount} new sounds</span>}
                  </div>
                )
              })()}
              <p className="text-sm text-gray-500 italic">{selectedEntry.translation}</p>
            </div>
          )}

          {showLibrary && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Meter</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setLibraryMeter('all')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        libraryMeter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >All</button>
                    {Object.entries(meters).map(([key, m]) => (
                      <button
                        key={key}
                        onClick={() => setLibraryMeter(key as Meter)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                          libraryMeter === key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >{m.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Difficulty</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setLibraryDifficulty('all')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        libraryDifficulty === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >All</button>
                    {(Object.keys(difficultyLabels) as Difficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setLibraryDifficulty(d)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors border ${
                          libraryDifficulty === d ? difficultyColors[d] + ' font-bold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                      >{difficultyLabels[d]}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredSlokas.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-4 text-center">No ślokas found for this combination.</p>
                )}
                {[...filteredSlokas].sort((a, b) => {
                  const da = verseDifficulties.get(a.id)?.score ?? 50
                  const db = verseDifficulties.get(b.id)?.score ?? 50
                  return da - db
                }).map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => loadSloka(entry)}
                    className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md ${
                      selectedEntry?.id === entry.id
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {(() => {
                        const sp = slokaProgress[entry.id]
                        if (sp?.completed) return <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs font-bold" title={`Completed! ${sp.perfectCount} perfect recitations`}>✓ Complete</span>
                        if (sp && sp.perfectCount > 0) return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs font-bold" title={`${sp.perfectCount}/3 perfect recitations`}>⭐ {sp.perfectCount}/3</span>
                        return null
                      })()}
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                        {meters[entry.meter].name}
                      </span>
                      {(() => {
                        const ud = verseDifficulties.get(entry.id)!
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${difficultyColors[ud.difficulty]}`}
                            title={`Score: ${ud.score}/100 • ${ud.knownWordCount}/${ud.totalWords} words known`}
                          >
                            {difficultyLabels[ud.difficulty]}
                          </span>
                        )
                      })()}
                      <span className="text-xs text-gray-600 font-medium">{entry.reference}</span>
                      <span className="text-xs text-gray-400">({entry.source})</span>
                    </div>
                    <p className="text-sm font-serif text-gray-700 line-clamp-2">{entry.text.split('\n')[0]}...</p>
                    <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">{entry.translation}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom paste fallback */}
          {!showLibrary && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-500">
                Or paste your own:
              </label>
              <textarea
                value={sloka}
                onChange={(e) => {
                  setSloka(e.target.value)
                  setSelectedEntry(null)
                  setWordMatches([])
                  setTranscript('')
                }}
                className="w-full h-28 p-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-serif resize-y"
                placeholder="Paste Sanskrit śloka here (IAST romanization)..."
              />
            </div>
          )}

          {sloka && !showLibrary && !selectedEntry && (
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-amber-50 rounded-xl flex flex-wrap items-center gap-3">
              <span className="text-purple-700 font-semibold text-sm">Detected Chandas:</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">
                {meters[selectedMeter].name}
              </span>
              <span className="text-xs text-gray-500">
                ({meters[selectedMeter].syllablesPerLine} syllables/pāda — {meters[selectedMeter].description})
              </span>
            </div>
          )}
        </section>

        {/* Sloka Display with Highlights */}
        {sloka && (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-gray-700">
                Śloka — {meters[selectedMeter].name} Meter
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMeterMarks(!showMeterMarks)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    showMeterMarks
                      ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={showMeterMarks ? 'Hide meter scansion marks' : 'Show guru (—) / laghu (◡) under each syllable'}
                >
                  <span style={{ fontFamily: 'serif' }}>◡—</span>
                  {showMeterMarks ? 'Meter On' : 'Meter'}
                </button>
              <button
                onClick={() => isSpeaking ? stopPlayback() : speakWithMeter(sloka, selectedMeter)}
                disabled={isGenerating}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                  isGenerating
                    ? 'bg-amber-500 text-white animate-pulse cursor-wait'
                    : isSpeaking 
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <span>{isGenerating ? '⏳' : isSpeaking ? '⏹' : '🔊'}</span>
                {isGenerating 
                  ? 'Generating chant...' 
                  : isSpeaking 
                    ? 'Stop' 
                    : `Hear ${meters[selectedMeter].name} Chanting`}
              </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              {renderSlokaWithHighlights()}
            </div>
            
            <div className="mt-4 text-sm border-t pt-3 space-y-2">
              <p className="text-gray-500 italic">Your speech is compared against the <strong>text above</strong>. Click any word to hear how it should sound.</p>
              <div className="flex flex-wrap gap-4">
                {showMeterMarks && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="text-purple-600 font-bold" style={{ fontFamily: 'serif' }}>—</span>
                      <span className="text-gray-500">Guru (long/heavy)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-400" style={{ fontFamily: 'serif' }}>◡</span>
                      <span className="text-gray-500">Laghu (short/light)</span>
                    </span>
                    <span className="text-gray-300">|</span>
                  </>
                )}
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-100 border-b-4 border-green-500 rounded"></span> Correct
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-yellow-100 border-b-4 border-yellow-500 rounded"></span> Close
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-100 border-b-4 border-red-500 rounded"></span> Incorrect
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Śloka Completion Progress */}
        {selectedEntry && wordMatches.length > 0 && (() => {
          const sp = slokaProgress[selectedEntry.id]
          const nonPending = wordMatches.filter(m => m.status !== 'pending')
          const allGreen = nonPending.length > 0 && nonPending.length === wordMatches.length && nonPending.every(m => m.status === 'green')
          const perfectCount = sp?.perfectCount ?? 0
          const completed = sp?.completed ?? false

          if (!sp && !allGreen) return null

          return (
            <section className={`rounded-2xl shadow-lg p-4 mb-6 border ${
              completed ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' :
              allGreen ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' :
              'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {completed ? (
                    <span className="text-3xl">🏆</span>
                  ) : allGreen ? (
                    <span className="text-3xl">🎉</span>
                  ) : (
                    <span className="text-2xl">📖</span>
                  )}
                  <div>
                    {completed ? (
                      <p className="font-bold text-green-700">Mastered! You've recited this perfectly {perfectCount} times.</p>
                    ) : allGreen ? (
                      <p className="font-bold text-amber-700">
                        Perfect recitation! {perfectCount}/3 toward mastery.
                      </p>
                    ) : sp ? (
                      <p className="text-sm text-gray-600">
                        {perfectCount}/3 perfect recitations{sp.attempts > 0 ? ` (${sp.attempts} total attempts)` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-2 shrink-0">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        i < perfectCount
                          ? 'bg-green-500 border-green-600 text-white'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {i < perfectCount ? '✓' : i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })()}

        {/* Speech Practice */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <h3 className="text-lg font-semibold text-gray-700">Practice Speaking</h3>
            <div className="flex gap-2">
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-red-600">Listening...</span>
                </div>
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!sloka}
                className={`px-5 py-2.5 rounded-lg font-semibold transition-colors ${
                  !sloka 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isListening ? '⏹ Stop' : '🎤 Start Speaking'}
              </button>
            </div>
          </div>
          
          {false && transcript && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">What you said:</p>
              <p className="text-lg font-serif">{transcript}</p>
            </div>
          )}

          {!sloka && (
            <p className="text-sm text-gray-400 italic">Paste a śloka above to begin practicing.</p>
          )}
          
          {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
              ⚠️ Speech recognition is not supported in your browser. Please use Chrome or Edge.
            </div>
          )}
        </section>

        {/* Instructions */}
        <section className="text-center text-sm text-gray-500 space-y-1 pb-8">
          <p><strong>How to use:</strong> Paste a śloka (meter auto-detects) → Click "Start Speaking" → Read the śloka aloud</p>
          <p>Words turn <span className="text-green-600 font-medium">green</span> (correct), <span className="text-yellow-600 font-medium">yellow</span> (close), or <span className="text-red-600 font-medium">red</span> (incorrect)</p>
          <p>Click any red/yellow word to hear the correct pronunciation • Click 🔊 to hear a full line in the selected meter</p>
        </section>
      </div>
    </div>
  )
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

export default App
