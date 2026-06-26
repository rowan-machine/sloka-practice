import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { slokaLibrary, difficultyLabels, difficultyColors, type Difficulty, type SlokaEntry } from './slokaLibrary'
import { loadScores, saveScores, recordResult, loadKnownWords, addKnownWord, isWordKnown, loadWordStats, recordWordAttempt, loadSlokaProgress, recordSlokaAttempt, type SoundScore, type KnownWord, type WordStats, type SlokaProgress } from './sanskritSounds'
import { getUserDifficulty } from './difficultyScorer'
import { lookupWord, type GlossaryEntry } from './sanskritGlossary'
import SoundPractice from './SoundPractice'
import PronunciationGuide from './PronunciationGuide'
import Settings, { getStoredApiKey, getStoredVoiceId } from './Settings'

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
interface SyllableWeight {
  weight: 'guru' | 'laghu'
  reason: string
}

function classifySyllableWeight(syllable: string, nextSyllable?: string): SyllableWeight {
  const lower = syllable.toLowerCase()

  // Check for long vowels in the syllable
  const longVowels = /[āīūṝ]/i
  // e, ai, o, au are always long in Sanskrit
  const diphthongs = /(?:ai|au)/i
  const naturallyLong = /[eo]/i  // e and o are always long in Sanskrit

  if (longVowels.test(lower)) {
    const v = lower.match(/[āīūṝ]/i)![0]
    const names: Record<string, string> = { 'ā': 'ā', 'ī': 'ī', 'ū': 'ū', 'ṝ': 'ṝ' }
    return { weight: 'guru', reason: `Long vowel ${names[v.toLowerCase()] || v} (macron = long)` }
  }
  if (diphthongs.test(lower)) {
    const v = lower.match(/ai|au/i)![0]
    return { weight: 'guru', reason: `${v} is always long in Sanskrit (compound vowel)` }
  }
  if (naturallyLong.test(lower)) {
    const v = lower.match(/[eo]/i)![0]
    return { weight: 'guru', reason: `${v} is always long in Sanskrit — no short ${v} exists` }
  }

  // Check for visarga or anusvāra
  if (/ḥ/.test(lower)) return { weight: 'guru', reason: 'Contains visarga (ḥ) — always heavy' }
  if (/[ṁṃ]/.test(lower)) return { weight: 'guru', reason: 'Contains anusvāra (ṁ) — always heavy' }

  // Check if syllable ends with consonant(s) after the vowel (position makes heavy)
  const vowelPattern = /[aāiīuūṛṝḷeaioau]/gi
  let lastVowelEnd = 0
  let m
  while ((m = vowelPattern.exec(lower)) !== null) {
    lastVowelEnd = m.index + m[0].length
  }
  const trailingConsonants = lower.slice(lastVowelEnd).replace(/[^a-zḍṭṅñṇśṣṛṝḷḥṁṃ]/gi, '')

  // If this syllable has trailing consonants, it's heavy by position
  if (trailingConsonants.length >= 1) return { weight: 'guru', reason: `Ends in consonant "${trailingConsonants}" — heavy by position (saṁyoga)` }

  // If the NEXT syllable starts with 2+ consonants, this syllable is heavy by position
  if (nextSyllable) {
    const nextLower = nextSyllable.toLowerCase()
    const firstVowelIdx = nextLower.search(/[aāiīuūṛṝḷeaioau]/i)
    if (firstVowelIdx > 1) {
      const cluster = nextLower.slice(0, firstVowelIdx)
      return { weight: 'guru', reason: `Next syllable starts with cluster "${cluster}" — heavy by position` }
    }
  }

  // Find the vowel to name it in the reason
  const vowelMatch = lower.match(/[aāiīuūṛṝḷ]/i)
  const shortV = vowelMatch ? vowelMatch[0] : 'a'
  return { weight: 'laghu', reason: `Short vowel ${shortV}` }
}

// Get scansion for all syllables of a word
function getWordScansion(syllables: string[], isLastWordInLine: boolean, nextWordSyllables?: string[]): SyllableWeight[] {
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
  const [page, setPage] = useState<'practice' | 'sounds' | 'guide' | 'settings'>('practice')
  const [sloka, setSloka] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [selectedMeter, setSelectedMeter] = useState<Meter>('anushtubh')
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpokenWord, setCurrentSpokenWord] = useState(-1)
  const [showMeterMarks, setShowMeterMarks] = useState(false)
  const [tooltipWord, setTooltipWord] = useState<{ word: string; entry: GlossaryEntry; rect: DOMRect } | null>(null)
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
  const allSources: string[] = Array.from(new Set<string>(slokaLibrary.map(s => s.source))).sort()
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
    setTooltipWord(null)
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

  // Split a word into syllables based on vowel nuclei.
  // Sanskrit rule: when consonants sit between two vowels, only the FIRST
  // consonant stays as the coda of the preceding syllable; the rest become
  // the onset of the next syllable.  E.g. bhakty-upahṛtam → bhak-tyu-pa-hṛ-tam
  const splitSyllables = (word: string): string[] => {
    const vowelRe = /[aāiīuūṛṝḷeoau]/i
    const isVowel = (ch: string) => vowelRe.test(ch)

    // 1. Find vowel positions
    const vowelPositions: number[] = []
    for (let i = 0; i < word.length; i++) {
      if (isVowel(word[i])) vowelPositions.push(i)
    }
    if (vowelPositions.length === 0) return [word]

    // 2. Build raw syllable boundaries around each vowel
    const syllables: string[] = []
    for (let vi = 0; vi < vowelPositions.length; vi++) {
      let start: number
      let end: number

      if (vi === 0) {
        // First syllable starts at beginning of word
        start = 0
      } else {
        // Find consonants between previous vowel and this vowel
        const prevVowelEnd = vowelPositions[vi - 1] + 1
        const thisVowel = vowelPositions[vi]
        const consonantsBetween = thisVowel - prevVowelEnd

        if (consonantsBetween <= 1) {
          // 0 or 1 consonant: all go to this syllable's onset
          start = prevVowelEnd
        } else {
          // 2+ consonants: first stays with previous syllable (coda),
          // rest become onset of this syllable
          start = prevVowelEnd + 1
        }
      }

      if (vi === vowelPositions.length - 1) {
        // Last syllable takes everything to end
        end = word.length
      } else {
        // Tentatively end right after the vowel; the next iteration
        // will claim consonants as needed
        const nextVowel = vowelPositions[vi + 1]
        const consonantsAfter = nextVowel - vowelPositions[vi] - 1
        if (consonantsAfter <= 1) {
          end = vowelPositions[vi] + 1
        } else {
          // Keep first consonant as coda
          end = vowelPositions[vi] + 2
        }
      }

      syllables.push(word.slice(start, end))
    }

    // If regex-fallback produced nothing meaningful, return whole word
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/speak`, {
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
    // Try user's local ElevenLabs key first (direct API call, no server needed)
    const userKey = getStoredApiKey()
    if (userKey) {
      try {
        const resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech/XB0fDUnXU5powFXDhCwa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': userKey
          },
          body: JSON.stringify({
            text: word,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.75 }
          })
        })
        if (resp.ok) {
          const blob = await resp.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          await audio.play()
          return
        }
      } catch {
        // Direct API failed, try server
      }
    }

    // Try backend server
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/speak-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      })
      const data = await resp.json()
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        await audio.play()
        return
      }
    } catch {
      // Server unavailable
    }

    // Browser fallback
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word)
      utter.lang = 'hi-IN'
      utter.rate = 0.8
      speechSynthesis.speak(utter)
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
                      className={`text-center leading-none mt-0.5 cursor-help ${
                        scansion[si].weight === 'guru' ? 'text-purple-600 font-bold' : 'text-gray-400'
                      }`}
                      style={{ fontSize: '13px' }}
                      title={`${scansion[si].weight === 'guru' ? 'Guru (heavy)' : 'Laghu (light)'}: ${scansion[si].reason}`}
                    >
                      {scansion[si].weight === 'guru' ? '—' : '◡'}
                    </span>
                  )}
                </span>
              )

              // Word click handler: play audio AND show tooltip
              const handleWordClick = (e: React.MouseEvent) => {
                speakWord(word)
                const entry = lookupWord(word)
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                if (entry) {
                  setTooltipWord(prev => prev?.word === word ? null : { word, entry, rect })
                } else {
                  setTooltipWord(null)
                }
              }

              // If we have per-syllable data, render each syllable colored separately
              if (match?.syllables && match.status !== 'pending') {
                return (
                  <span
                    key={idx}
                    className={`cursor-pointer py-0.5 rounded transition-all duration-200 inline-flex items-end
                      ${isCurrentlySpoken ? 'ring-2 ring-purple-500 scale-110' : ''}
                      hover:opacity-80
                    `}
                    onClick={handleWordClick}
                    title={wordIsKnown ? 'Known word ✓ — Tap for meaning' : 'Tap for meaning & pronunciation'}
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
                  onClick={handleWordClick}
                  title="Tap for meaning & pronunciation"
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

  if (page === 'guide') {
    return <PronunciationGuide onBack={() => setPage('practice')} />
  }

  if (page === 'settings') {
    return <Settings onBack={() => setPage('practice')} />
  }

  // Count stats for header
  const completedCount = Object.values(slokaProgress).filter(p => p.completed).length
  const knownWordCount = knownWords.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 safe-top">
      {/* ── Compact sticky header ── */}
      <header className="sticky top-0 z-30 glass-nav border-b border-gray-200/60 px-3 py-2 md:px-6 md:py-3 safe-top">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-purple-900 truncate">Śloka Practice</h1>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              {completedCount > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{completedCount} mastered</span>}
              {knownWordCount > 0 && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">{knownWordCount} words</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setShowLibrary(!showLibrary) }}
              className={`chip ${showLibrary ? 'chip-active' : 'chip-inactive'}`}
            >
              📚 Library
            </button>
            <button
              onClick={() => setPage('sounds')}
              className="chip chip-inactive"
            >
              🔤 Sounds
            </button>
            <button
              onClick={() => setPage('guide')}
              className="chip chip-inactive"
            >
              📖 Rules
            </button>
            <button
              onClick={() => setPage('settings')}
              className="chip chip-inactive"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 pb-24">

        {/* ═══════════════════ LIBRARY PANEL ═══════════════════ */}
        {showLibrary && (
          <section className="bg-white rounded-2xl shadow-lg mb-5 border border-gray-100 overflow-hidden">
            {/* Search bar */}
            <div className="p-3 md:p-4 border-b border-gray-100">
              <input
                type="text"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder="Search verses, references, translations..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
              />
            </div>

            {/* Filters */}
            <div className="px-3 md:px-4 py-3 space-y-3 border-b border-gray-100 bg-gray-50/50">
              {/* Source filter */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">Source</label>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setLibrarySource('all')} className={`chip ${librarySource === 'all' ? 'chip-active' : 'chip-inactive'}`}>All</button>
                  {Object.keys(sourceGroups).map(group => (
                    <button key={group} onClick={() => setLibrarySource(group)} className={`chip ${librarySource === group ? 'chip-active' : 'chip-inactive'}`}>{group}</button>
                  ))}
                </div>
              </div>

              {/* Meter filter */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">Meter</label>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setLibraryMeter('all')} className={`chip ${libraryMeter === 'all' ? 'chip-active' : 'chip-inactive'}`}>All</button>
                  {Object.entries(meters).map(([key, m]) => (
                    <button key={key} onClick={() => setLibraryMeter(key as Meter)} className={`chip ${libraryMeter === key ? 'chip-active' : 'chip-inactive'}`}>{m.name}</button>
                  ))}
                </div>
              </div>

              {/* Difficulty filter + toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Difficulty</label>
                  <button
                    onClick={() => setUseDynamicDifficulty(!useDynamicDifficulty)}
                    className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                    title={useDynamicDifficulty ? 'Showing personalized difficulty based on your progress' : 'Showing consensus difficulty rated by pronunciation complexity'}
                  >
                    <span className={`inline-block w-7 h-4 rounded-full relative transition-colors ${useDynamicDifficulty ? 'bg-purple-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${useDynamicDifficulty ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </span>
                    {useDynamicDifficulty ? 'For You' : 'Standard'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setLibraryDifficulty('all')} className={`chip ${libraryDifficulty === 'all' ? 'chip-active' : 'chip-inactive'}`}>All</button>
                  {(Object.keys(difficultyLabels) as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setLibraryDifficulty(d)}
                      className={`chip ${libraryDifficulty === d ? 'chip-active' : 'chip-inactive'}`}
                      style={libraryDifficulty === d ? {} : undefined}
                    >{difficultyLabels[d]}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="px-3 md:px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
              {filteredSlokas.length} verse{filteredSlokas.length !== 1 ? 's' : ''} found
              {librarySource !== 'all' || libraryMeter !== 'all' || libraryDifficulty !== 'all' || librarySearch.trim() ? (
                <button onClick={() => { setLibrarySource('all'); setLibraryMeter('all'); setLibraryDifficulty('all'); setLibrarySearch('') }} className="ml-2 text-purple-500 hover:text-purple-700 underline">Clear filters</button>
              ) : null}
            </div>

            {/* Results list */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
              {filteredSlokas.length === 0 && (
                <p className="text-sm text-gray-400 italic py-8 text-center">No verses match your filters.</p>
              )}
              {[...filteredSlokas].sort((a, b) => {
                if (useDynamicDifficulty) {
                  return (verseDifficulties.get(a.id)?.score ?? 50) - (verseDifficulties.get(b.id)?.score ?? 50)
                }
                const order: Record<string, number> = { easy: 0, 'easy-medium': 1, medium: 2, 'medium-hard': 3, hard: 4 }
                return (order[a.difficulty] ?? 2) - (order[b.difficulty] ?? 2)
              }).map(entry => {
                const sp = slokaProgress[entry.id]
                const ud = verseDifficulties.get(entry.id)!
                const diff = useDynamicDifficulty ? ud.difficulty : entry.difficulty

                return (
                  <button
                    key={entry.id}
                    onClick={() => loadSloka(entry)}
                    className={`w-full text-left px-3 md:px-4 py-3 border-b border-gray-50 transition-all hover:bg-purple-50/60 ${
                      selectedEntry?.id === entry.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Completion indicator */}
                      <div className="mt-0.5 shrink-0 w-5">
                        {sp?.completed ? (
                          <span className="text-green-500 text-sm" title="Mastered">✓</span>
                        ) : sp && sp.perfectCount > 0 ? (
                          <span className="text-amber-500 text-xs font-bold">{sp.perfectCount}/3</span>
                        ) : (
                          <span className="text-gray-200 text-sm">○</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-gray-700">{entry.reference}</span>
                          <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${difficultyColors[diff]}`}>
                            {difficultyLabels[diff]}
                          </span>
                          <span className="text-[10px] text-gray-400 hidden sm:inline">{meters[entry.meter].name}</span>
                        </div>
                        <p className="text-sm font-serif text-gray-600 line-clamp-1">{entry.text.split('\n')[0]}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 italic line-clamp-1">{entry.translation}</p>
                      </div>
                      <span className="text-[10px] text-gray-300 shrink-0 hidden sm:block">{entry.source}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom paste */}
            <div className="p-3 md:p-4 border-t border-gray-100 bg-gray-50/30">
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-purple-600 transition-colors select-none">
                  Or paste your own śloka...
                </summary>
                <textarea
                  value={selectedEntry ? '' : sloka}
                  onChange={(e) => { setSloka(e.target.value); setSelectedEntry(null); setWordMatches([]); setTranscript('') }}
                  className="mt-2 w-full h-24 p-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm font-serif resize-y bg-white"
                  placeholder="Paste Sanskrit śloka here (IAST romanization)..."
                />
              </details>
            </div>
          </section>
        )}

        {/* ═══════════════════ SELECTED VERSE INFO BAR ═══════════════════ */}
        {selectedEntry && !showLibrary && (
          <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 mb-4 border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-semibold text-gray-800 text-sm">{selectedEntry.reference}</span>
                  <span className="text-[10px] text-gray-400">({selectedEntry.source})</span>
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${difficultyColors[verseDifficulties.get(selectedEntry.id)!.difficulty]}`}>
                    {difficultyLabels[verseDifficulties.get(selectedEntry.id)!.difficulty]}
                  </span>
                  <span className="px-1.5 py-0 bg-purple-50 text-purple-700 rounded text-[10px] font-medium">
                    {meters[selectedEntry.meter].name}
                  </span>
                </div>
                {(() => {
                  const ud = verseDifficulties.get(selectedEntry.id)!
                  return (
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-400 mb-1">
                      <span>{ud.knownWordCount}/{ud.totalWords} words known</span>
                      {ud.weakSoundCount > 0 && <span className="text-amber-500">{ud.weakSoundCount} weak sounds</span>}
                      {ud.newSoundCount > 0 && <span className="text-blue-400">{ud.newSoundCount} new</span>}
                    </div>
                  )
                })()}
                <p className="text-xs text-gray-500 italic line-clamp-2">{selectedEntry.translation}</p>
              </div>
              <button onClick={() => setShowLibrary(true)} className="chip chip-inactive shrink-0">Change</button>
            </div>
          </div>
        )}

        {/* ═══════════════════ ŚLOKA DISPLAY ═══════════════════ */}
        {sloka && !showLibrary && (
          <section className="bg-white rounded-2xl shadow-lg mb-4 border border-gray-100 overflow-hidden relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-3 md:px-5 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">{meters[selectedMeter].name} Meter</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowMeterMarks(!showMeterMarks)}
                  className={`chip ${showMeterMarks ? 'chip-active' : 'chip-inactive'}`}
                  title={showMeterMarks ? 'Hide scansion' : 'Show guru/laghu marks'}
                >
                  <span style={{ fontFamily: 'serif', fontSize: '11px' }}>◡—</span>
                </button>
                <button
                  onClick={() => isSpeaking ? stopPlayback() : speakWithMeter(sloka, selectedMeter)}
                  disabled={isGenerating}
                  className={`chip ${isGenerating ? 'bg-amber-500 text-white animate-pulse border-amber-500' : isSpeaking ? 'bg-red-500 text-white border-red-500' : 'chip-inactive'}`}
                >
                  {isGenerating ? '⏳' : isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                </button>
              </div>
            </div>

            {/* Verse text */}
            <div className="p-3 md:p-5" onClick={(e) => { if (e.target === e.currentTarget) setTooltipWord(null) }}>
              {renderSlokaWithHighlights()}
            </div>

            {/* Word meaning tooltip */}
            {tooltipWord && (
              <div
                className="fixed z-50 animate-in fade-in"
                style={{
                  top: Math.min(tooltipWord.rect.bottom + 8, window.innerHeight - 160),
                  left: Math.max(8, Math.min(tooltipWord.rect.left, window.innerWidth - 260)),
                }}
              >
                <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 max-w-[250px] relative">
                  <button
                    onClick={() => setTooltipWord(null)}
                    className="absolute top-1.5 right-2 text-gray-400 hover:text-white text-xs"
                  >✕</button>
                  <div className="font-serif text-base font-semibold text-amber-300 mb-1">{tooltipWord.word}</div>
                  <div className="text-sm leading-snug mb-1.5">{tooltipWord.entry.meaning}</div>
                  {tooltipWord.entry.grammar && (
                    <div className="text-[11px] text-gray-400 mb-0.5">{tooltipWord.entry.grammar}</div>
                  )}
                  {tooltipWord.entry.root && (
                    <div className="text-[11px] text-purple-300 mb-0.5">Root: {tooltipWord.entry.root}</div>
                  )}
                  {tooltipWord.entry.related && (
                    <div className="text-[11px] text-blue-300 italic mt-1">{tooltipWord.entry.related}</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); speakWord(tooltipWord.word) }}
                    className="mt-2 w-full text-center px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg font-medium transition-colors"
                  >
                    🔊 Hear again
                  </button>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="px-3 md:px-5 py-2 border-t border-gray-50 bg-gray-50/30">
              <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                {showMeterMarks && (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="text-purple-600 font-bold" style={{ fontFamily: 'serif' }}>—</span> Guru
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400" style={{ fontFamily: 'serif' }}>◡</span> Laghu
                    </span>
                    <span className="text-gray-200">|</span>
                  </>
                )}
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-400 rounded-sm"></span> Correct</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-400 rounded-sm"></span> Close</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded-sm"></span> Incorrect</span>
                <span className="text-gray-300 ml-auto hidden sm:block">Tap any word for meaning & pronunciation</span>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════ COMPLETION PROGRESS ═══════════════════ */}
        {selectedEntry && !showLibrary && wordMatches.length > 0 && (() => {
          const sp = slokaProgress[selectedEntry.id]
          const nonPending = wordMatches.filter(m => m.status !== 'pending')
          const allGreen = nonPending.length > 0 && nonPending.length === wordMatches.length && nonPending.every(m => m.status === 'green')
          const perfectCount = sp?.perfectCount ?? 0
          const completed = sp?.completed ?? false

          if (!sp && !allGreen) return null

          return (
            <div className={`rounded-xl p-3 mb-4 flex items-center justify-between gap-3 ${
              completed ? 'bg-green-50 border border-green-200' :
              allGreen ? 'bg-amber-50 border border-amber-200' :
              'bg-gray-50 border border-gray-100'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{completed ? '🏆' : allGreen ? '🎉' : '📖'}</span>
                <span className={`text-sm font-medium ${completed ? 'text-green-700' : allGreen ? 'text-amber-700' : 'text-gray-600'}`}>
                  {completed ? 'Mastered!' : allGreen ? `Perfect! ${perfectCount}/3` : `${perfectCount}/3 perfect`}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                    i < perfectCount ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i < perfectCount ? '✓' : ''}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ═══════════════════ YOUR RECORDINGS ═══════════════════ */}
        {sloka && !showLibrary && wordMatches.length > 0 && (() => {
          const slokaWords = sloka.replace(/[।॥]/g, '').split(/\s+/).filter(w => w.length > 0)
          const wordsWithRecordings = slokaWords
            .map(w => {
              const key = w.toLowerCase().trim()
              const stats = wordStats[key]
              if (!stats || stats.history.length === 0) return null
              const recsWithAudio = stats.history.filter(h => h.recordingUrl)
              if (recsWithAudio.length === 0) return null
              return { word: w, stats, recordings: recsWithAudio }
            })
            .filter(Boolean) as { word: string; stats: WordStats; recordings: typeof wordStats[string]['history'] }[]

          if (wordsWithRecordings.length === 0) return null

          return (
            <section className="bg-white rounded-2xl shadow-sm mb-4 border border-gray-100 overflow-hidden">
              <details className="group">
                <summary className="px-3 md:px-5 py-2.5 cursor-pointer select-none flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                    🎧 Your Recordings
                    <span className="text-[10px] text-gray-400 font-normal">({wordsWithRecordings.length} word{wordsWithRecordings.length !== 1 ? 's' : ''})</span>
                  </span>
                  <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-3 md:px-5 pb-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {wordsWithRecordings.map(({ word, recordings }) => (
                    <div key={word} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-serif text-gray-700 min-w-[80px] shrink-0 pt-0.5">{word}</span>
                      <div className="flex flex-wrap gap-1">
                        {recordings.slice(0, 5).map((rec, ri) => (
                          <button
                            key={ri}
                            onClick={() => {
                              if (rec.recordingUrl) {
                                const audio = new Audio(rec.recordingUrl)
                                audio.play()
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              rec.status === 'green' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' :
                              rec.status === 'yellow' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200' :
                              'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                            title={`${rec.status === 'green' ? 'Correct' : rec.status === 'yellow' ? 'Close' : 'Incorrect'} attempt — heard: "${rec.transcript}"`}
                          >
                            ▶ {rec.status === 'green' ? '✓' : rec.status === 'yellow' ? '~' : '✗'}
                          </button>
                        ))}
                        <button
                          onClick={() => speakWord(word)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                          title="Hear correct pronunciation"
                        >
                          🔊 Correct
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </section>
          )
        })()}

        {/* ═══════════════════ SPEECH CONTROLS ═══════════════════ */}
        {!showLibrary && (
          <section className="mb-6">
            {/* Microphone FAB on mobile, inline on desktop */}
            <div className="flex items-center justify-center gap-3">
              {isListening && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-red-600 font-medium">Listening...</span>
                </div>
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!sloka}
                className={`px-6 py-3 rounded-full font-semibold text-sm transition-all shadow-md active:scale-95 ${
                  !sloka 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : isListening
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
                      : 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'
                }`}
              >
                {isListening ? '⏹ Stop Listening' : '🎤 Start Speaking'}
              </button>
            </div>

            {!sloka && !selectedEntry && (
              <p className="text-xs text-gray-400 text-center mt-3">Select a verse from the library to begin</p>
            )}

            {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-xs text-center">
                Speech recognition requires Chrome or Edge.
              </div>
            )}
          </section>
        )}

        {/* Custom paste (when no library) */}
        {!showLibrary && !selectedEntry && (
          <section className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100">
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Paste your own śloka</label>
            <textarea
              value={sloka}
              onChange={(e) => { setSloka(e.target.value); setSelectedEntry(null); setWordMatches([]); setTranscript('') }}
              className="w-full h-24 p-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm font-serif resize-y"
              placeholder="Paste Sanskrit śloka here (IAST romanization)..."
            />
            {sloka && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-purple-700">Detected:</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-medium">{meters[selectedMeter].name}</span>
              </div>
            )}
          </section>
        )}

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
