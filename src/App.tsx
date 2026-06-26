import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { slokaLibrary, difficultyLabels, difficultyColors, type Difficulty, type SlokaEntry } from './slokaLibrary'
import { loadScores, saveScores, recordResult, loadKnownWords, addKnownWord, removeKnownWord, isWordKnown, loadWordStats, recordWordAttempt, loadSlokaProgress, saveSlokaProgress, recordSlokaAttempt, devanagariToRoman, getWordAccuracy, getWordsNeedingWork, type SoundScore, type KnownWord, type WordStats, type SlokaProgress } from './sanskritSounds'
import { getUserDifficulty } from './difficultyScorer'
import { lookupWord, type GlossaryEntry } from './sanskritGlossary'
import SoundPractice from './SoundPractice'
import PronunciationGuide from './PronunciationGuide'
import TempleProgram from './TempleProgram'
import Settings, { getStoredApiKey, getStoredVoiceId, getMasteryThreshold } from './Settings'
import { WORD_BANK, WORD_CATEGORIES, addCustomWord, removeCustomWord, loadCustomWords, type WordBankEntry, type WordCategory } from './wordBank'

type Meter = 'anushtubh' | 'trishtubh' | 'jagati' | 'vasanta_tilaka' | 'longer' | 'mantra'

interface MeterInfo {
  name: string
  syllablesPerLine: number
  description: string
  pattern: string
  example: string
  exampleRef: string
}

// Pitch contour for each meter: pitch 1=low 2=mid 3=high, emphasis: true = stressed beat
// Based on traditional ISKCON/Gauḍīya Vaiṣṇava chanting melodies
type SyllablePitch = { pitch: 1 | 2 | 3; emphasis: boolean }

// Anuṣṭubh has alternating odd/even pāda patterns
const anushtubhOdd: SyllablePitch[] = [
  // Odd pādas (1st, 3rd lines): da da da da da da(lower) da(mid) da(lowest)
  { pitch: 2, emphasis: false }, // 1: mid
  { pitch: 2, emphasis: false }, // 2: mid
  { pitch: 2, emphasis: false }, // 3: mid
  { pitch: 2, emphasis: false }, // 4: mid
  { pitch: 2, emphasis: false }, // 5: mid
  { pitch: 1, emphasis: true },  // 6: lower (dips down)
  { pitch: 2, emphasis: true },  // 7: back to mid
  { pitch: 1, emphasis: true },  // 8: lowest
]
const anushtubhEven: SyllablePitch[] = [
  // Even pādas (2nd, 4th lines — resolves): da da da da da da(high) da(low) da(resolve)
  { pitch: 2, emphasis: false }, // 1: mid
  { pitch: 2, emphasis: false }, // 2: mid
  { pitch: 2, emphasis: false }, // 3: mid
  { pitch: 2, emphasis: false }, // 4: mid
  { pitch: 2, emphasis: false }, // 5: mid
  { pitch: 3, emphasis: true },  // 6: high (rises up)
  { pitch: 1, emphasis: true },  // 7: low (drops down)
  { pitch: 2, emphasis: true },  // 8: resolve back to mid
]

const meterPitchContours: Record<Meter, SyllablePitch[]> = {
  anushtubh: [], // handled specially via odd/even — see getLinePitchContour
  // Triṣṭubh (11): classic ŚB recitation — rise in middle, resolve at end
  trishtubh: [
    { pitch: 2, emphasis: true },  // 1
    { pitch: 2, emphasis: false }, // 2
    { pitch: 2, emphasis: false }, // 3
    { pitch: 3, emphasis: true },  // 4: rise
    { pitch: 3, emphasis: false }, // 5
    { pitch: 3, emphasis: true },  // 6: peak
    { pitch: 2, emphasis: false }, // 7: descend
    { pitch: 2, emphasis: false }, // 8
    { pitch: 1, emphasis: true },  // 9: low
    { pitch: 2, emphasis: false }, // 10
    { pitch: 2, emphasis: true },  // 11: resolve
  ],
  // Jagatī (12): ŚB melody — two phrases with rise-fall
  jagati: [
    { pitch: 2, emphasis: true },  // 1
    { pitch: 2, emphasis: false }, // 2
    { pitch: 3, emphasis: true },  // 3: rise
    { pitch: 3, emphasis: false }, // 4
    { pitch: 3, emphasis: true },  // 5: peak
    { pitch: 2, emphasis: false }, // 6: fall — caesura
    { pitch: 2, emphasis: true },  // 7: second phrase
    { pitch: 2, emphasis: false }, // 8
    { pitch: 3, emphasis: true },  // 9: rise
    { pitch: 3, emphasis: false }, // 10
    { pitch: 1, emphasis: true },  // 11: low
    { pitch: 2, emphasis: true },  // 12: resolve
  ],
  // Vasanta-tilakā (14): Brahma-saṁhitā melody — sweeping arc
  vasanta_tilaka: [
    { pitch: 2, emphasis: true },  // 1
    { pitch: 2, emphasis: false }, // 2
    { pitch: 3, emphasis: true },  // 3: rise
    { pitch: 3, emphasis: false }, // 4
    { pitch: 3, emphasis: true },  // 5: high
    { pitch: 3, emphasis: false }, // 6
    { pitch: 2, emphasis: false }, // 7: descend — caesura
    { pitch: 2, emphasis: true },  // 8: second phrase
    { pitch: 2, emphasis: false }, // 9
    { pitch: 3, emphasis: true },  // 10: rise
    { pitch: 3, emphasis: false }, // 11
    { pitch: 2, emphasis: false }, // 12: descend
    { pitch: 1, emphasis: true },  // 13: low
    { pitch: 2, emphasis: true },  // 14: resolve
  ],
  // Longer metres (17): Nardaṭaka-like — two long phrases
  longer: [
    { pitch: 2, emphasis: true },  // 1
    { pitch: 2, emphasis: false }, // 2
    { pitch: 2, emphasis: false }, // 3
    { pitch: 2, emphasis: false }, // 4
    { pitch: 3, emphasis: true },  // 5: rise
    { pitch: 3, emphasis: false }, // 6
    { pitch: 3, emphasis: true },  // 7: peak — caesura
    { pitch: 2, emphasis: false }, // 8
    { pitch: 2, emphasis: false }, // 9
    { pitch: 2, emphasis: true },  // 10
    { pitch: 3, emphasis: true },  // 11: rise
    { pitch: 3, emphasis: false }, // 12
    { pitch: 3, emphasis: false }, // 13
    { pitch: 2, emphasis: true },  // 14: fall
    { pitch: 2, emphasis: false }, // 15
    { pitch: 1, emphasis: true },  // 16: low
    { pitch: 2, emphasis: true },  // 17: resolve
  ],
  mantra: [], // No fixed pitch pattern
}

const pitchColors = {
  1: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400', label: 'Low' },
  2: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Mid' },
  3: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-400', label: 'High' },
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
  const [page, setPage] = useState<'practice' | 'sounds' | 'guide' | 'settings' | 'temple' | 'progress'>(() => {
    const saved = localStorage.getItem('sloka_active_tab')
    return (saved === 'temple' || saved === 'sounds' || saved === 'progress') ? saved : 'practice'
  })
  const [sloka, setSloka] = useState(() => {
    const savedId = localStorage.getItem('sloka_last_verse')
    if (savedId) {
      const entry = slokaLibrary.find(e => e.id === savedId)
      return entry?.text || ''
    }
    return ''
  })
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [selectedMeter, setSelectedMeter] = useState<Meter>('anushtubh')
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpokenWord, setCurrentSpokenWord] = useState(-1)
  const [showMeterMarks, setShowMeterMarks] = useState(false)
  const [showPitchHints, setShowPitchHints] = useState(false)
  const [memorizationLevel, setMemorizationLevel] = useState(0) // 0=off, 1-7=progressive blanking
  const lastMemLevelRef = useRef(1) // remembers last active level for toggle
  // Line-by-line practice mode
  const [lineMode, setLineMode] = useState(false)
  const [activeLine, setActiveLine] = useState(0) // which line is being practiced
  const [linePerfects, setLinePerfects] = useState<Record<number, number>>({}) // line index → perfect count
  const [masteredLines, setMasteredLines] = useState<Set<number>>(new Set()) // lines with 3+ perfects
  const [showMastered, setShowMastered] = useState(false) // toggle to peek at mastered lines
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 0.75 | 1>(1)
  const [tooltipWord, setTooltipWord] = useState<{ word: string; entry: GlossaryEntry; rect: DOMRect } | null>(null)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const accumulatedTranscriptRef = useRef('')

  // Sound scores, known words, word stats (all persisted)
  const [soundScores, setSoundScores] = useState<Record<string, SoundScore>>(() => loadScores())
  const [knownWords, setKnownWords] = useState<KnownWord[]>(() => loadKnownWords())
  const [wordStats, setWordStats] = useState<Record<string, WordStats>>(() => loadWordStats())
  const [slokaProgress, setSlokaProgress] = useState<Record<string, SlokaProgress>>(() => loadSlokaProgress())

  // Audio recording for capturing user's pronunciation
  const wordMatchesRef = useRef<WordMatch[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const lastRecordingRef = useRef<string | undefined>(undefined)
  // Shared playback ref — stops previous recording before playing a new one
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playRecording = (url: string) => {
    if (playbackAudioRef.current) { playbackAudioRef.current.pause(); playbackAudioRef.current.currentTime = 0 }
    const audio = new Audio(url)
    playbackAudioRef.current = audio
    audio.play()
  }

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

  // Tab navigation helper
  const switchTab = useCallback((tab: typeof page) => {
    setPage(tab)
    if (tab === 'temple' || tab === 'sounds' || tab === 'practice' || tab === 'progress') {
      localStorage.setItem('sloka_active_tab', tab)
    }
  }, [])

  // Library browser state
  const [showLibrary, setShowLibrary] = useState(false)
  // Word practice panel on Practice tab
  const [showWordPractice, setShowWordPractice] = useState(false)
  // Word bank panel
  const [showWordBank, setShowWordBank] = useState(false)
  const [wbFilter, setWbFilter] = useState<WordCategory | 'all'>('all')
  const [wbSearch, setWbSearch] = useState('')
  const [wbCustom, setWbCustom] = useState<WordBankEntry[]>(() => loadCustomWords())
  const [wbAddWord, setWbAddWord] = useState('')
  const [wbAddMeaning, setWbAddMeaning] = useState('')
  const [wbAddCat, setWbAddCat] = useState<WordCategory>('general')
  const [wbPracticing, setWbPracticing] = useState<string | null>(null)
  const [wbPracticeResult, setWbPracticeResult] = useState<'green' | 'yellow' | 'red' | null>(null)
  const [wbPracticeTranscript, setWbPracticeTranscript] = useState('')
  const [wpQueue, setWpQueue] = useState<string[]>([])
  const [wpIdx, setWpIdx] = useState(0)
  const [wpWord, setWpWord] = useState<string | null>(null)
  const [wpResult, setWpResult] = useState<'green' | 'yellow' | 'red' | null>(null)
  const [wpTranscript, setWpTranscript] = useState('')
  const [wpListening, setWpListening] = useState(false)
  const wpRecRef = useRef<any>(null)

  // Word practice helpers
  const wpNormalize = (s: string) => s.toLowerCase()
    .replace(/[।॥\-,\.!?'":;''/]/g, '')
    .replace(/ā/g, 'a').replace(/ī/g, 'i').replace(/ū/g, 'u')
    .replace(/ṛ/g, 'ri').replace(/ṝ/g, 'ri').replace(/ḷ/g, 'li')
    .replace(/ṁ/g, 'm').replace(/ṃ/g, 'm').replace(/ṅ/g, 'ng')
    .replace(/ñ/g, 'ny').replace(/ṇ/g, 'n')
    .replace(/ś/g, 'sh').replace(/ṣ/g, 'sh')
    .replace(/ṭ/g, 't').replace(/ḍ/g, 'd')
    .replace(/ḥ/g, 'h')
    .replace(/kh/g, 'k').replace(/gh/g, 'g')
    .replace(/th/g, 't').replace(/dh/g, 'd')
    .replace(/ph/g, 'p').replace(/bh/g, 'b')
    .trim()
  const wpPhonetic = (s: string) => s
    .replace(/sh/g, 's').replace(/ch/g, 'c').replace(/th/g, 't').replace(/ph/g, 'p')
    .replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/dh/g, 'd').replace(/bh/g, 'b')
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')
    .replace(/y/g, 'i').replace(/w/g, 'v')
    .replace(/[aeiou]+/g, m => m[0])
  const wpCompare = (expected: string, spoken: string): number => {
    const a = wpNormalize(expected), b = wpNormalize(spoken)
    if (a === b) return 1
    const basic = Math.max(a.length, b.length) > 0 ? 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length) : 1
    const pa = wpPhonetic(a), pb = wpPhonetic(b)
    const phon = Math.max(pa.length, pb.length) > 0 ? 1 - levenshteinDistance(pa, pb) / Math.max(pa.length, pb.length) : 1
    let best = Math.max(basic, phon)
    for (const w of b.split(/\s+/)) {
      const wn = wpNormalize(w), pw = wpPhonetic(w)
      const ws = Math.max(a.length, wn.length) > 0 ? 1 - levenshteinDistance(a, wn) / Math.max(a.length, wn.length) : 1
      const ps = Math.max(pa.length, pw.length) > 0 ? 1 - levenshteinDistance(pa, pw) / Math.max(pa.length, pw.length) : 1
      best = Math.max(best, ws, ps)
    }
    return best
  }
  const wpStartPractice = (word: string) => { setWpWord(word); setWpResult(null); setWpTranscript('') }
  const wbStartPractice = (word: string) => {
    setWbPracticing(word); setWbPracticeResult(null); setWbPracticeTranscript('')
    setWpWord(word); setWpResult(null); setWpTranscript('')
    setTimeout(() => {
      if (wpRecRef.current) {
        setWpListening(true)
        try { wpRecRef.current.start() } catch (_) {}
      }
    }, 100)
  }
  const wpListen = () => {
    if (wpRecRef.current) {
      setWpListening(true); setWpResult(null); setWpTranscript('')
      try { wpRecRef.current.start() } catch (_) {}
    }
  }

  // Speech recognition for word practice
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-IN'
    rec.onresult = (event: any) => {
      const raw = event.results[0][0].transcript.trim().toLowerCase()
      const roman = devanagariToRoman(raw).toLowerCase()
      const result = roman !== raw ? roman : raw
      setWpTranscript(result)
      if (wpWord) {
        const sim = Math.max(wpCompare(wpWord, raw), roman !== raw ? wpCompare(wpWord, roman) : 0)
        const status = sim >= 0.65 ? 'green' : sim >= 0.35 ? 'yellow' : 'red'
        setWpResult(status)
        if (status === 'green') {
          setKnownWords(addKnownWord(knownWords, wpWord))
          const ws = wordStats[wpWord.toLowerCase().trim()]
          if (ws) {
            const greens = ws.history.filter(h => h.status === 'green').length + 1
            if (greens / (ws.attempts + 1) >= getMasteryThreshold() / 100) {
              setWpQueue(prev => {
                const next = prev.filter(w => w !== wpWord)
                if (next.length > 0) { const ni = Math.min(wpIdx, next.length - 1); setWpIdx(ni); setTimeout(() => wpStartPractice(next[ni]), 300) }
                return next
              })
            }
          }
        }
        setWordStats(prev => recordWordAttempt(prev, wpWord, status, result))
        if (wbPracticing && wbPracticing.toLowerCase().trim() === wpWord.toLowerCase().trim()) {
          setWbPracticeResult(status)
          setWbPracticeTranscript(result)
        }
      }
    }
    rec.onerror = () => setWpListening(false)
    rec.onend = () => setWpListening(false)
    wpRecRef.current = rec
    return () => { try { rec.stop() } catch (_) {} }
  }, [wpWord, knownWords, wordStats, wpIdx, wbPracticing])

  const [libraryMeter, setLibraryMeter] = useState<Meter | 'all'>('all')
  const [libraryDifficulty, setLibraryDifficulty] = useState<Difficulty | 'all'>('all')
  const [librarySource, setLibrarySource] = useState<string>('all')
  const [useDynamicDifficulty, setUseDynamicDifficulty] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<SlokaEntry | null>(() => {
    const savedId = localStorage.getItem('sloka_last_verse')
    if (savedId) {
      const entry = slokaLibrary.find(e => e.id === savedId)
      return entry || null
    }
    return null
  })
  const [librarySearch, setLibrarySearch] = useState('')

  // Collect unique sources for filter
  const allSources: string[] = Array.from(new Set<string>(slokaLibrary.map(s => s.source))).sort()
  // Group similar sources for cleaner UI
  const sourceGroups: Record<string, string[]> = {
    'Bhagavad-gītā': allSources.filter((s: string) => s === 'Bhagavad-gītā'),
    'Śrīmad-Bhāgavatam': allSources.filter((s: string) => s === 'Śrīmad-Bhāgavatam'),
    'Brahma-saṁhitā': allSources.filter((s: string) => s === 'Brahma-saṁhitā'),
    'Other Śāstra': allSources.filter((s: string) => ['Caitanya-caritāmṛta', 'Śikṣāṣṭaka', 'Īśopaniṣad'].includes(s)),
    'Mantras & Prayers': allSources.filter((s: string) => s.toLowerCase().includes('mantra') || s.includes('Praṇāma') || s.includes('Āratī') || s.includes('Gāyatrī') || s.includes('Prayer') || s.includes('Nṛsiṁha')),
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
      const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (!strip(s.text).includes(q) && !strip(s.reference).includes(q) && !strip(s.translation).includes(q) && !strip(s.source).includes(q) && !s.text.toLowerCase().includes(q) && !s.reference.toLowerCase().includes(q)) return false
    }
    return true
  })

  const loadSloka = (entry: SlokaEntry) => {
    setSloka(entry.text)
    setSelectedEntry(entry)
    localStorage.setItem('sloka_last_verse', entry.id)
    setWordMatches([])
    setTranscript('')
    setShowLibrary(false)
    setTooltipWord(null)
  }

  // Reset line mode when sloka changes
  useEffect(() => {
    setLinePerfects({})
    setMasteredLines(new Set())
    setActiveLine(0)
    setShowMastered(false)
  }, [sloka])

  // Use library entry's meter if available, otherwise auto-detect
  useEffect(() => {
    if (selectedEntry) {
      setSelectedMeter(selectedEntry.meter)
    } else if (sloka.trim()) {
      const detected = detectMeter(sloka)
      setSelectedMeter(detected)
    }
  }, [sloka, selectedEntry])

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    recognition.continuous = !isMobile
    recognition.interimResults = true
    // Desktop: hi-IN gives Devanagari which we transliterate — best match
    // iOS: en-IN returns Latin text that matches IAST well
    recognition.lang = isIOS ? 'en-IN' : 'hi-IN'
    recognition.maxAlternatives = 3

    recognition.onstart = () => {}

    recognition.onaudiostart = () => {}

    recognition.onresult = (event: any) => {
      let finalized = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalized += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript + ' '
        }
      }
      // With continuous=false, accumulate finalized text across restarts
      if (finalized.trim()) {
        accumulatedTranscriptRef.current += ' ' + finalized.trim()
      }
      const text = (accumulatedTranscriptRef.current + ' ' + interim).trim()
      if (text) {
        setTranscript(text)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('[SR] onerror:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { recognition.start() } catch (_) {}
          }
        }, 100)
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

  // Devanagari → Latin transliteration for speech recognition output
  const devanagariToLatin = (s: string): string => {
    const map: Record<string, string> = {
      'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
      'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
      'क': 'ka', 'ख': 'ka', 'ग': 'ga', 'घ': 'ga', 'ङ': 'nga',
      'च': 'cha', 'छ': 'cha', 'ज': 'ja', 'झ': 'ja', 'ञ': 'nya',
      'ट': 'ta', 'ठ': 'ta', 'ड': 'da', 'ढ': 'da', 'ण': 'na',
      'त': 'ta', 'थ': 'ta', 'द': 'da', 'ध': 'da', 'न': 'na',
      'प': 'pa', 'फ': 'pa', 'ब': 'ba', 'भ': 'ba', 'म': 'ma',
      'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
      'ष': 'sha', 'स': 'sa', 'ह': 'ha',
      'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
      'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
      'ं': 'm', 'ः': 'h', 'ँ': 'm',
      '्': '', // virama — suppresses inherent 'a'
      'ॐ': 'om',
    }
    let result = ''
    let i = 0
    while (i < s.length) {
      // Try two-char match first
      if (i + 1 < s.length && map[s.slice(i, i + 2)] !== undefined) {
        result += map[s.slice(i, i + 2)]
        i += 2
      } else if (map[s[i]] !== undefined) {
        result += map[s[i]]
        i++
      } else {
        result += s[i]
        i++
      }
    }
    return result
  }

  const normalize = (s: string) => {
    // First transliterate any Devanagari to Latin
    let text = /[\u0900-\u097F]/.test(s) ? devanagariToLatin(s) : s
    return text.toLowerCase()
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
  }

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

    // Stricter thresholds for short words to avoid false positives
    const nLen = normalizedWord.length
    const greenThreshold = nLen <= 2 ? 0.99 : nLen <= 4 ? 0.75 : 0.65
    const yellowThreshold = nLen <= 2 ? 0.6 : 0.35

    if (similarity >= greenThreshold) {
      return { index: 0, status: 'green', syllables: splitSyllables(word).map(s => ({ text: s, status: 'green' })), similarity }
    } else if (similarity >= yellowThreshold) {
      return { index: 0, status: 'yellow', syllables: compareSyllables(word, spokenWord), similarity }
    } else {
      return { index: 0, status: 'red', syllables: compareSyllables(word, spokenWord), similarity }
    }
  }

  const compareWords = useCallback((spokenText: string) => {
    if (!sloka) return

    const allSlokaWords = sloka.split(/\s+/).filter(w => w.length > 0)

    // In line mode, only match against the active line
    let rawSlokaWords: string[]
    let globalOffset = 0 // offset into allSlokaWords for the active line
    if (lineMode) {
      const lines = splitIntoLines(sloka, meters[selectedMeter].syllablesPerLine)
      if (activeLine >= lines.length) return
      rawSlokaWords = lines[activeLine]
      // Calculate word offset for lines before activeLine
      for (let i = 0; i < activeLine; i++) globalOffset += lines[i].length
    } else {
      rawSlokaWords = allSlokaWords
    }

    // Expand hyphenated śloka words into sub-tokens for comparison
    // but track which original word index each token belongs to
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

      // Try next token in case user skipped a word — but only if current match is poor
      // AND the next token is a strong match (high confidence skip detection)
      let nextResult = null
      if (tokenIdx + 1 < slokaTokens.length && result.similarity < 0.3) {
        nextResult = matchWord(slokaTokens[tokenIdx + 1].text, spoken)
      }

      if (nextResult && nextResult.similarity >= 0.6) {
        // User likely skipped current token — mark it as missed, match next
        tokenMatches.set(tokenIdx, { status: 'red', similarity: 0 })
        tokenIdx++
        tokenMatches.set(tokenIdx, { status: nextResult.status, similarity: nextResult.similarity })
      } else if (result.similarity >= 0.2) {
        tokenMatches.set(tokenIdx, { status: result.status, similarity: result.similarity })
      }
      // Only advance if we actually matched something
      if (result.similarity >= 0.2 || (nextResult && nextResult.similarity >= 0.6)) {
        tokenIdx++
      }
    }

    // Aggregate token results back to original word indices
    // In line mode, matches are indexed relative to the line, but we store with global indices
    const matches: WordMatch[] = allSlokaWords.map((_w, i) => ({ index: i, status: 'pending' as const }))

    for (const [tIdx, tResult] of tokenMatches) {
      const localIdx = slokaTokens[tIdx].origIdx
      const globalIdx = localIdx + globalOffset
      const origWord = rawSlokaWords[localIdx]
      const existing = matches[globalIdx]

      if (existing.status === 'pending') {
        // First token for this word
        matches[globalIdx] = { index: globalIdx, status: tResult.status, syllables: compareSyllables(origWord, spokenWords[0] || '') }
      } else {
        // Merge: if any token is green, upgrade; if any is red, keep red parts
        const best = tResult.status === 'green' ? 'green' : tResult.status === 'yellow' ? 'yellow' : existing.status
        const worst = existing.status === 'red' ? 'red' : tResult.status
        matches[globalIdx] = {
          index: globalIdx,
          status: (best === 'green' && worst === 'green') ? 'green' : (best === 'green' || worst === 'green') ? 'yellow' : worst,
        }
      }
    }

    // Add syllable breakdown for non-pending words
    matches.forEach((m, i) => {
      if (m.status !== 'pending') {
        const word = allSlokaWords[i]
        const localI = i - globalOffset
        // Find the spoken words that mapped to this word's tokens
        const myTokenIdxs = slokaTokens
          .map((t, ti) => t.origIdx === localI ? ti : -1)
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

    setWordMatches(matches)
    wordMatchesRef.current = matches
  }, [sloka, selectedEntry, lineMode, activeLine, selectedMeter])

  // Save stats/recordings once per session when results are finalized
  const finalizeSession = useCallback(() => {
    const matches = wordMatchesRef.current
    const spokenText = accumulatedTranscriptRef.current
    if (!matches || matches.length === 0) return
    const rawSlokaWords = sloka.replace(/[।॥]/g, '').split(/\s+/).filter(w => w.length > 0)

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

    // Small delay to ensure recording is finalized
    setTimeout(() => {
      setWordStats(prev => {
        let updated = { ...prev }
        // Find the last word the user actually reached (non-pending)
        let lastAttemptedIdx = -1
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].status !== 'pending') { lastAttemptedIdx = i; break }
        }
        let recordingUsed = false
        matches.forEach((m, i) => {
          // Only record words up to the last word the user reached
          if (m.status === 'pending' || i > lastAttemptedIdx) return
          const word = rawSlokaWords[i]
          // Attach recording only to the first non-green word to avoid duplicating large base64 blobs
          const attachRecording = !recordingUsed && m.status !== 'green' && !!lastRecordingRef.current
          updated = recordWordAttempt(
            updated, word, m.status,
            spokenText,
            attachRecording ? lastRecordingRef.current : undefined
          )
          if (attachRecording) recordingUsed = true
        })
        return updated
      })
    }, 500)

    if (selectedEntry) {
      const nonEmpty = matches.filter(m => m.status !== 'pending')
      const allGreen = nonEmpty.length > 0 && nonEmpty.length === matches.length && nonEmpty.every(m => m.status === 'green')
      setSlokaProgress(prev => recordSlokaAttempt(prev, selectedEntry.id, allGreen))
    }

    // Line-by-line: track perfects for the active line (skip if already mastered)
    if (lineMode && !masteredLines.has(activeLine)) {
      const lines = splitIntoLines(sloka, meters[selectedMeter].syllablesPerLine)
      let offset = 0
      for (let i = 0; i < activeLine; i++) offset += lines[i].length
      const lineWords = matches.slice(offset, offset + lines[activeLine].length)
      const lineNonEmpty = lineWords.filter(m => m.status !== 'pending')
      const lineAllGreen = lineNonEmpty.length > 0 && lineNonEmpty.length === lineWords.length && lineNonEmpty.every(m => m.status === 'green')
      if (lineAllGreen) {
        setLinePerfects(prev => {
          const count = (prev[activeLine] || 0) + 1
          const updated = { ...prev, [activeLine]: count }
          if (count >= 3) {
            setMasteredLines(prev2 => {
              const next = new Set(prev2)
              next.add(activeLine)
              // Auto-advance to next unmastered line
              const totalLines = lines.length
              for (let n = 1; n <= totalLines; n++) {
                const candidate = (activeLine + n) % totalLines
                if (!next.has(candidate)) {
                  setActiveLine(candidate)
                  break
                }
              }
              return next
            })
          }
          return updated
        })
      }
    }
  }, [sloka, selectedEntry, lineMode, activeLine, selectedMeter, masteredLines])

  useEffect(() => {
    if (transcript) compareWords(transcript)
  }, [transcript, compareWords])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('')
      setWordMatches([])
      accumulatedTranscriptRef.current = ''
      setIsListening(true)
      lastRecordingRef.current = undefined
      try {
        recognitionRef.current.start()
      } catch (e) {
        // recognition start failed
      }
      // Delay recording to avoid mic conflict with speech recognition
      setTimeout(() => startRecording(), 500)
    } else {
      console.warn('[SR] recognitionRef is null — Speech API not available')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false)
      recognitionRef.current.stop()
      stopRecording()
      // Record stats/recordings once at end of session
      finalizeSession()
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
      const userKey = getStoredApiKey()
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userKey ? { 'x-api-key': userKey, 'x-voice-id': getStoredVoiceId() } : {})
        },
        body: JSON.stringify({ text, meter, speed: playbackSpeed })
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
      // Speed is handled server-side (ElevenLabs generates slower speech)
      // Only scale pauses on client for additional breathing room
      const pauseMultiplier = playbackSpeed === 0.5 ? 3.5 : playbackSpeed === 0.75 ? 1.8 : 1

      for (let i = 0; i < data.padas.length; i++) {
        if (playbackCancelledRef.current) break

        const pada = data.padas[i]
        await playPadaAudio(ctx, pada.audio, pada.rate)

        // Pause between pādas
        if (i < data.padas.length - 1 && !playbackCancelledRef.current) {
          const isHalfVerseBoundary = (i + 1) % 2 === 0
          const basePause = isHalfVerseBoundary ? HALF_VERSE_PAUSE_MS : PADA_PAUSE_MS
          await new Promise(r => setTimeout(r, basePause * pauseMultiplier))
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
        const voiceId = getStoredVoiceId()
        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
      utter.rate = 0.8 * playbackSpeed
      speechSynthesis.speak(utter)
    }
  }

  const speakLineWithMeter = async (lineText: string) => {
    // Speak a single line using Suno (same endpoint, just one line)
    await speakWithMeter(lineText, selectedMeter)
  }

  // Memorization masking: progressively hide text based on level
  // Uses a seeded pseudo-random so the same words are consistently masked
  const maskText = (text: string, level: number, wordIdx: number, lineIdx: number, _totalWords: number, _totalLines: number): string => {
    if (level === 0) return text // Level 0: full text
    // Seeded hash for consistent masking per word position
    const hash = ((wordIdx * 7 + lineIdx * 13) % 100) / 100

    switch (level) {
      case 1: // Some syllables masked (vowels replaced with _)
        return text.replace(/[aāiīuūṛṝeēoōai au]/gi, (ch, offset) =>
          (offset + wordIdx) % 3 === 0 ? '_' : ch
        )
      case 2: // First 2 letters shown, rest blanked
        if (text.length <= 2) return text
        return text.slice(0, 2) + '·'.repeat(text.length - 2)
      case 3: // First letter only
        if (text.length <= 1) return text
        return text[0] + '·'.repeat(text.length - 1)
      case 4: // ~40% of words fully blanked (keep structural words)
        return hash < 0.4 ? '·'.repeat(Math.max(text.length, 3)) : text
      case 5: // ~65% of words blanked
        return hash < 0.65 ? '·'.repeat(Math.max(text.length, 3)) : text
      case 6: // Blank by pāda — hide odd lines, show even (anchor lines)
        return lineIdx % 2 === 0 ? '·'.repeat(Math.max(text.length, 3)) : text
      case 7: // Fully blank
        return '·'.repeat(Math.max(text.length, 3))
      default: return text
    }
  }

  const memorizationLabels = [
    '', // 0
    'Syllable hints',       // 1
    'First 2 letters',      // 2
    'First letter only',    // 3
    'Some words hidden',    // 4
    'Most words hidden',    // 5
    'Alternate lines',      // 6
    'Fully blank',          // 7
  ]

  // Expand grammar abbreviations to readable English
  const expandGrammar = (g: string): string => {
    const expansions: Record<string, string> = {
      'nom.': 'nominative (subject)',
      'acc.': 'accusative (object)',
      'inst.': 'instrumental (by/with)',
      'dat.': 'dative (to/for)',
      'abl.': 'ablative (from)',
      'gen.': 'genitive (of/belonging to)',
      'loc.': 'locative (in/at)',
      'voc.': 'vocative (addressing)',
      'sg.': 'singular',
      'pl.': 'plural',
      'du.': 'dual',
      'masc.': 'masculine',
      'fem.': 'feminine',
      'neut.': 'neuter',
      'indecl.': 'indeclinable (unchanged)',
      'pp.': 'past participle',
      'pres.': 'present tense',
      'imp.': 'imperative (command)',
      'opt.': 'optative (wish)',
      'inf.': 'infinitive (to...)',
      'abs.': 'absolutive (having done)',
      'caus.': 'causative',
      'pass.': 'passive',
      'prefix': 'prefix',
      'suffix': 'suffix',
    }
    let result = g
    for (const [abbr, full] of Object.entries(expansions)) {
      result = result.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), full)
    }
    return result
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

          // Count syllables before each word so we can index into pitch contour
          // Anuṣṭubh alternates odd/even pāda patterns
          const pitchContour = selectedMeter === 'anushtubh'
            ? (lineIdx % 2 === 0 ? anushtubhOdd : anushtubhEven)
            : meterPitchContours[selectedMeter]
          const hasPitch = showPitchHints && pitchContour.length > 0
          let lineSylOffset = 0

          // Line-by-line mode: mastered lines are blanked, non-active lines are dimmed
          const isLineMastered = lineMode && masteredLines.has(lineIdx)
          const isLineActive = !lineMode || lineIdx === activeLine
          const isLineDimmed = lineMode && !isLineActive && !isLineMastered

          // Mastered line: show blanked text unless showMastered is on
          if (isLineMastered && !showMastered) {
            const wordCount = line.length
            globalIndex += wordCount
            return (
              <div key={lineIdx} className="flex flex-wrap items-start gap-1">
                <span className="text-xs text-gray-400 mr-2 w-6 mt-1.5">{lineIdx + 1}.</span>
                <button
                  onClick={() => setShowMastered(true)}
                  className="text-xs text-green-400 italic py-1 hover:text-green-600 transition-colors"
                  title="Click to reveal"
                >
                  ✓ Line mastered — tap to peek
                </button>
              </div>
            )
          }

          return (
          <div key={lineIdx} className={`flex flex-wrap items-start gap-1 transition-opacity ${isLineDimmed ? 'opacity-30' : ''} ${lineMode && isLineActive ? 'bg-blue-50/50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
            <span className={`text-xs mr-2 w-6 mt-1.5 ${lineMode && isLineActive ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>{lineIdx + 1}.</span>
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
              const wordSylStart = lineSylOffset
              lineSylOffset += wordSyls.length
              const isLastWordInLine = wordInLineIdx === line.length - 1
              const nextWordSyls = !isLastWordInLine ? lineWordSyls[wordInLineIdx + 1] : undefined
              const scansion = showMeterMarks ? getWordScansion(wordSyls, isLastWordInLine, nextWordSyls) : null

              // Helper: render a single syllable column (text + optional scansion/pitch marks)
              const renderSylColumn = (sylText: string, si: number, totalSyls: number, statusClass: string) => {
                // Apply memorization masking
                const maskedText = memorizationLevel > 0
                  ? maskText(sylText, memorizationLevel, wordInLineIdx, lineIdx, line.length, lines.length)
                  : sylText
                const isMasked = maskedText !== sylText

                // Pitch data for this syllable
                const sylPosInLine = wordSylStart + si
                const pitchData = hasPitch && sylPosInLine < pitchContour.length ? pitchContour[sylPosInLine] : null

                // When scansion is on and no speech match active, color syllables by weight
                const meterColorClass = scansion && !statusClass
                  ? scansion[si].weight === 'guru'
                    ? 'bg-indigo-50 border-b-2 border-indigo-400'
                    : 'bg-amber-50 border-b-2 border-amber-300'
                  : ''

                // Pitch background (only when pitch is on and no speech/scansion color)
                const pitchBg = pitchData && !statusClass && !meterColorClass
                  ? pitchColors[pitchData.pitch].bg
                  : ''
                const pitchTextColor = pitchData && !statusClass
                  ? pitchColors[pitchData.pitch].text
                  : ''

                // Pitch height indicator (visual position offset)
                const pitchOffset = pitchData
                  ? { 3: '-4px', 2: '0px', 1: '4px' }[pitchData.pitch]
                  : '0px'

                return (
                <span key={si} className={`inline-flex flex-col items-center ${statusClass || meterColorClass || pitchBg} ${si === 0 ? 'rounded-l' : ''} ${si === totalSyls - 1 ? 'rounded-r' : ''} px-0.5`}
                  style={hasPitch ? { position: 'relative', top: pitchOffset, transition: 'top 0.2s ease' } : undefined}
                >
                  <span className={`text-xl leading-tight ${isMasked ? 'text-gray-300 select-none tracking-wider' : ''} ${pitchTextColor} ${pitchData?.emphasis ? 'font-bold' : ''} ${scansion && !statusClass && !pitchData ? (scansion[si].weight === 'guru' ? 'text-indigo-800 font-semibold' : 'text-amber-700') : ''}`}>{maskedText}</span>
                  {/* Pitch arrow indicator */}
                  {pitchData && (
                    <span
                      className={`text-center leading-none mt-0.5 ${pitchColors[pitchData.pitch].text} ${pitchData.emphasis ? 'font-bold' : ''}`}
                      style={{ fontSize: '10px' }}
                      title={`${pitchColors[pitchData.pitch].label} pitch${pitchData.emphasis ? ' (stressed)' : ''}`}
                    >
                      {pitchData.pitch === 3 ? '▲' : pitchData.pitch === 1 ? '▼' : '●'}{pitchData.emphasis ? '!' : ''}
                    </span>
                  )}
                  {scansion && (
                    <span
                      className={`text-center leading-none mt-0.5 cursor-help ${
                        scansion[si].weight === 'guru' ? 'text-indigo-600 font-bold' : 'text-amber-500'
                      }`}
                      style={{ fontSize: '13px' }}
                      title={`${scansion[si].weight === 'guru' ? 'Guru (heavy)' : 'Laghu (light)'}: ${scansion[si].reason}`}
                    >
                      {scansion[si].weight === 'guru' ? '—' : '◡'}
                    </span>
                  )}
                </span>
                )
              }

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


  if (page === 'guide') {
    return <PronunciationGuide onBack={() => switchTab('sounds')} />
  }

  if (page === 'settings') {
    return <Settings onBack={() => switchTab('practice')} />
  }

  if (page === 'progress') {
    // Gather all progress data
    const allEntries = slokaLibrary
    const masteredVerses = allEntries.filter(e => {
      const sp = slokaProgress[e.id]
      if (sp?.manualStatus === 'mastered') return true
      return sp?.completed
    })
    const practicingVerses = allEntries.filter(e => {
      const sp = slokaProgress[e.id]
      if (sp?.manualStatus === 'practicing') return true
      if (sp?.manualStatus === 'mastered' || sp?.completed) return false
      return sp && sp.perfectCount > 0
    })
    const wordStatsArr = Object.values(wordStats).filter(ws => ws.attempts > 0)
    const masteredWords = wordStatsArr.filter(ws => getWordAccuracy(ws) >= 80)
    const practicingWords = wordStatsArr.filter(ws => { const a = getWordAccuracy(ws); return a > 0 && a < 80 })

    // Group mastered verses by source
    const bySource: Record<string, typeof masteredVerses> = {}
    masteredVerses.forEach(e => {
      const src = e.source || 'Other'
      if (!bySource[src]) bySource[src] = []
      bySource[src].push(e)
    })
    // Group mastered verses by group (bhajans)
    const byGroup: Record<string, typeof masteredVerses> = {}
    masteredVerses.filter(e => e.group).forEach(e => {
      if (!byGroup[e.group!]) byGroup[e.group!] = []
      byGroup[e.group!].push(e)
    })
    // Check complete groups
    const groupTotals: Record<string, number> = {}
    allEntries.filter(e => e.group).forEach(e => {
      groupTotals[e.group!] = (groupTotals[e.group!] || 0) + 1
    })

    const totalAttempts = wordStatsArr.reduce((s, ws) => s + ws.attempts, 0)

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 safe-top pb-20">
        <header className="sticky top-0 z-30 glass-nav border-b border-gray-200/60 px-3 py-2 md:px-6 md:py-3 safe-top">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            <h1 className="text-lg md:text-xl font-bold text-purple-900">👤 My Profile</h1>
            <button onClick={() => switchTab('settings')} className="chip chip-inactive" title="Settings">⚙️</button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* ═══ OVERVIEW STATS ═══ */}
          <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="text-2xl font-bold text-green-600">{masteredVerses.length}</div>
                <div className="text-xs text-gray-500">Mastered Verses</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{practicingVerses.length}</div>
                <div className="text-xs text-gray-500">Practicing</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-2xl font-bold text-purple-600">{masteredWords.length}</div>
                <div className="text-xs text-gray-500">Mastered Words</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-2xl font-bold text-amber-600">{totalAttempts}</div>
                <div className="text-xs text-gray-500">Total Attempts</div>
              </div>
            </div>
            {/* Progress bar: mastered / total */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Verses mastered</span>
                <span>{masteredVerses.length} / {allEntries.length}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style={{ width: `${(masteredVerses.length / Math.max(allEntries.length, 1)) * 100}%` }} />
              </div>
            </div>
          </section>

          {/* ═══ SOUND PRACTICE PROGRESS ═══ */}
          {(() => {
            const t = Object.values(soundScores).reduce((a, s) => ({ c: a.c + s.correct, cl: a.cl + s.close, w: a.w + s.wrong }), { c: 0, cl: 0, w: 0 })
            const total = t.c + t.cl + t.w
            const acc = total > 0 ? Math.round((t.c / total) * 100) : 0
            return (
              <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Sound Practice</h2>
                <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                  <span className="text-sm text-gray-500">
                    {knownWords.length > 0 && (
                      <span className="text-green-600 font-medium">✓ {knownWords.length} known word{knownWords.length !== 1 ? 's' : ''}</span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text" id="progress-add-word"
                      onKeyDown={e => {
                        const input = e.currentTarget
                        if (e.key === 'Enter' && input.value.trim()) { setKnownWords(addKnownWord(knownWords, input.value)); input.value = '' }
                      }}
                      placeholder="Add known word..."
                      className="px-3 py-1.5 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm font-serif w-40"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('progress-add-word') as HTMLInputElement
                        if (input?.value.trim()) { setKnownWords(addKnownWord(knownWords, input.value)); input.value = '' }
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >+ Add</button>
                  </div>
                </div>
                {total > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-purple-50 rounded-xl"><div className="text-xl font-bold text-purple-700">{total}</div><div className="text-xs text-gray-500">Attempts</div></div>
                    <div className="text-center p-2 bg-green-50 rounded-xl"><div className="text-xl font-bold text-green-600">{acc}%</div><div className="text-xs text-gray-500">Accuracy</div></div>
                    <div className="text-center p-2 bg-green-50 rounded-xl"><div className="text-xl font-bold text-green-600">{t.c}</div><div className="text-xs text-gray-500">Correct</div></div>
                    <div className="text-center p-2 bg-red-50 rounded-xl"><div className="text-xl font-bold text-red-600">{t.w}</div><div className="text-xs text-gray-500">Needs Work</div></div>
                  </div>
                )}
              </section>
            )
          })()}

          {/* ═══ MASTERED GROUPS / BHAJANS ═══ */}
          {Object.keys(byGroup).length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Bhajans & Groups</h2>
              <div className="space-y-2">
                {Object.entries(groupTotals).map(([group, total]) => {
                  const mastered = (byGroup[group] || []).length
                  const complete = mastered >= total
                  return (
                    <div key={group} className={`p-3 rounded-xl border ${complete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 capitalize">{group.replace(/_/g, ' ')}</span>
                        <span className={`text-sm font-bold ${complete ? 'text-green-600' : 'text-gray-500'}`}>
                          {complete ? '✓ Complete' : `${mastered} / ${total}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                        <div className={`h-full rounded-full ${complete ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${(mastered / total) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ═══ MASTERED VERSES ═══ */}
          {masteredVerses.length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-green-700 mb-3">✓ Mastered Verses ({masteredVerses.length})</h2>
              {Object.entries(bySource).map(([source, entries]) => (
                <div key={source} className="mb-4 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">{source}</h3>
                  <div className="space-y-1.5">
                    {entries.map(e => {
                      const sp = slokaProgress[e.id]
                      return (
                        <button
                          key={e.id}
                          onClick={() => { setSloka(e.text); setSelectedEntry(e); switchTab('practice') }}
                          className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-100 hover:bg-green-100 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-800">{e.reference}</span>
                              <span className="text-xs text-gray-400 ml-2">{e.text.split('\n')[0].slice(0, 40)}…</span>
                            </div>
                            <div className="text-xs text-green-600 shrink-0">
                              {sp?.perfectCount || 0}× perfect
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ═══ PRACTICING VERSES ═══ */}
          {practicingVerses.length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-blue-700 mb-3">🔄 Practicing ({practicingVerses.length})</h2>
              <div className="space-y-1.5">
                {practicingVerses.map(e => {
                  const sp = slokaProgress[e.id]!
                  return (
                    <button
                      key={e.id}
                      onClick={() => { setSloka(e.text); setSelectedEntry(e); switchTab('practice') }}
                      className="w-full text-left p-3 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-800">{e.reference}</span>
                          <span className="text-xs text-gray-400 ml-2">{e.source}</span>
                        </div>
                        <div className="text-xs text-blue-600 shrink-0">
                          {sp.perfectCount}/3 perfect · {sp.attempts} attempt{sp.attempts !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* ═══ MASTERED WORDS ═══ */}
          {masteredWords.length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-purple-700 mb-3">✓ Mastered Words ({masteredWords.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {masteredWords.sort((a, b) => getWordAccuracy(b) - getWordAccuracy(a)).map(ws => (
                  <span
                    key={ws.word}
                    className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-sm font-serif text-green-800"
                    title={`${getWordAccuracy(ws)}% accuracy · ${ws.attempts} attempts`}
                  >
                    {ws.word} <span className="text-[10px] font-sans text-green-500">{getWordAccuracy(ws)}%</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ═══ KNOWN WORDS (from sound practice) ═══ */}
          {knownWords.length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-purple-700 mb-3">📝 Known Words ({knownWords.length})</h2>
              <p className="text-xs text-gray-400 mb-3">Words marked as known from sound practice sessions.</p>
              <div className="flex flex-wrap gap-1.5">
                {knownWords.map(kw => (
                  <span
                    key={kw.word}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-sm font-serif text-purple-800"
                  >
                    {kw.word}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ═══ WORDS NEEDING WORK ═══ */}
          {practicingWords.length > 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-orange-700 mb-3">⚠ Needs Work ({practicingWords.length})</h2>
              <div className="space-y-1">
                {practicingWords.sort((a, b) => getWordAccuracy(a) - getWordAccuracy(b)).slice(0, 30).map(ws => {
                  const acc = getWordAccuracy(ws)
                  return (
                    <div key={ws.word} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-100">
                      <span className="font-serif text-sm font-medium text-gray-800">{ws.word}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${acc >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{acc}%</span>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${acc >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${acc}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {masteredVerses.length === 0 && practicingVerses.length === 0 && masteredWords.length === 0 && knownWords.length === 0 && (
            <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
              <div className="text-4xl mb-3">🌱</div>
              <h2 className="text-lg font-bold text-gray-700 mb-2">No progress yet</h2>
              <p className="text-sm text-gray-400 mb-4">Start practicing verses and sounds to see your progress here!</p>
              <button
                onClick={() => switchTab('practice')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >Start Practicing</button>
            </section>
          )}
        </main>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-gray-200/60 safe-bottom">
          <div className="max-w-5xl mx-auto flex items-stretch">
            {([
              { id: 'practice' as const, label: 'Home', icon: '🏠' },
              { id: 'sounds' as const, label: 'Sounds', icon: '🔤' },
              { id: 'temple' as const, label: 'Temple', icon: '🙏' },
              { id: 'progress' as const, label: 'Profile', icon: '👤' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                  page === tab.id
                    ? 'text-purple-700 font-semibold'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[10px]">{tab.label}</span>
                {page === tab.id && <span className="absolute bottom-0 h-0.5 w-10 bg-purple-600 rounded-full" />}
              </button>
            ))}
          </div>
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 safe-top">
      {/* ── Compact sticky header ── */}
      <header className="sticky top-0 z-30 glass-nav border-b border-gray-200/60 px-3 py-2 md:px-6 md:py-3 safe-top">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-purple-900 truncate">
              {page === 'temple' ? 'My Temple Program' : page === 'sounds' ? 'Sound Practice' : 'Śloka Practice'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {page === 'sounds' && (
              <button
                onClick={() => switchTab('guide')}
                className="chip chip-inactive"
              >
                📖 Rules
              </button>
            )}
            <button
              onClick={() => switchTab('settings')}
              className="chip chip-inactive"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 pb-20">

      {/* ═══ TEMPLE TAB ═══ */}
      {page === 'temple' && (
        <TempleProgram
          slokaProgress={slokaProgress}
          onUpdateProgress={(id, update) => {
            setSlokaProgress(prev => {
              const existing = prev[id] || { id, perfectCount: 0, completed: false, attempts: 0 }
              const updated = { ...prev, [id]: { ...existing, ...update } }
              saveSlokaProgress(updated)
              return updated
            })
          }}
          onSelectMantra={(entry, text) => {
            if (entry) {
              setSelectedEntry(entry)
              setSloka(entry.text)
              setSelectedMeter(entry.meter)
              localStorage.setItem('sloka_last_verse', entry.id)
            } else {
              setSelectedEntry(null)
              setSloka(text)
            }
            setWordMatches([])
            setTranscript('')
            switchTab('practice')
          }}
        />
      )}

      {/* ═══ SOUNDS TAB ═══ */}
      {page === 'sounds' && (
        <SoundPractice
          scores={soundScores}
          setScores={setSoundScores}
          knownWords={knownWords}
          setKnownWords={setKnownWords}
          wordStats={wordStats}
        />
      )}

      {/* ═══ HOME TAB ═══ */}
      {page === 'practice' && (<>

        {/* ─── Quick-access feature cards ─── */}
        {!showWordPractice && !showWordBank && !showLibrary && !selectedEntry && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button
              onClick={() => { setShowLibrary(true); setShowWordPractice(false); setShowWordBank(false) }}
              className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-2xl">📚</span>
              <span className="text-xs font-semibold text-gray-700">Library</span>
              <span className="text-[10px] text-gray-400">Browse verses</span>
            </button>
            <button
              onClick={() => { setShowWordPractice(true); setShowLibrary(false); setShowWordBank(false) }}
              className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-2xl">🎯</span>
              <span className="text-xs font-semibold text-gray-700">Words</span>
              <span className="text-[10px] text-gray-400">Practice queue</span>
            </button>
            <button
              onClick={() => { setShowWordBank(true); setShowLibrary(false); setShowWordPractice(false) }}
              className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-2xl">📖</span>
              <span className="text-xs font-semibold text-gray-700">Vocab</span>
              <span className="text-[10px] text-gray-400">{WORD_BANK.length}+ terms</span>
            </button>
          </div>
        )}

        {/* ─── Mobile sub-page header ─── */}
        {(showWordPractice || showWordBank || showLibrary) && (
          <div className="flex items-center gap-3 mb-4 -mx-1">
            <button
              onClick={() => { setShowWordPractice(false); setShowWordBank(false); setShowLibrary(false) }}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all shrink-0"
              aria-label="Back to Home"
            >
              <span className="text-gray-600 text-lg leading-none">‹</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{showLibrary ? '📚' : showWordPractice ? '🎯' : '📖'}</span>
              <h2 className="text-base font-bold text-gray-800 truncate">
                {showLibrary ? 'Library' : showWordPractice ? 'Word Practice' : 'Vocabulary'}
              </h2>
            </div>
          </div>
        )}

        {/* ═══════════════════ WORD PRACTICE PANEL ═══════════════════ */}
        {showWordPractice && (() => {
          const wordsToWork = getWordsNeedingWork(wordStats, getMasteryThreshold())
          return (
            <div className="mb-5 space-y-4">
              {/* ── Practice Queue ── */}
              {wpQueue.length > 0 && (
                <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">🎯 Practice Queue ({wpQueue.length})</h3>
                    <button onClick={() => { setWpQueue([]); setWpWord(null); setWpResult(null) }}
                      className="text-xs text-red-500 hover:text-red-700">Clear Queue</button>
                  </div>
                  {/* Word chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {wpQueue.map((w, i) => (
                      <button key={w} onClick={() => { setWpIdx(i); wpStartPractice(w) }}
                        className={`px-2.5 py-1 rounded-lg text-sm font-serif transition-colors border ${
                          i === wpIdx && wpWord === w ? 'bg-purple-100 border-purple-300 text-purple-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}>{w}</button>
                    ))}
                  </div>
                  {/* Active practice */}
                  {wpWord && (() => {
                    const ws = wordStats[wpWord.toLowerCase().trim()]
                    const acc = ws ? getWordAccuracy(ws) : 0
                    return (
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="text-center mb-3">
                          <button onClick={() => speakWord(wpWord)}
                            className="text-2xl font-serif font-bold text-purple-900 hover:text-purple-700">
                            🔊 {wpWord}
                          </button>
                          <div className="text-xs text-gray-400 mt-1">{acc}% accuracy · {ws?.attempts || 0} attempts</div>
                        </div>
                        <div className="flex justify-center gap-3">
                          <button onClick={() => speakWord(wpWord)}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium border border-purple-200">
                            🔊 Listen
                          </button>
                          <button onClick={wpListen} disabled={wpListening}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                              wpListening ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            }`}>
                            {wpListening ? '⏹ Listening...' : '🎤 Speak'}
                          </button>
                        </div>
                        {wpResult && (
                          <div className={`mt-3 p-3 rounded-lg text-center ${
                            wpResult === 'green' ? 'bg-green-100 text-green-800' : wpResult === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            <span className="font-bold">
                              {wpResult === 'green' ? '✓ Correct!' : wpResult === 'yellow' ? '≈ Close — try again' : '✗ Not quite — listen and try again'}
                            </span>
                            {wpTranscript && <span className="ml-2 text-sm opacity-75">(heard: "{devanagariToRoman(wpTranscript)}")</span>}
                            {wpResult === 'green' && acc >= 80 && <span className="ml-2 text-sm font-semibold text-green-600">🎉 Mastered!</span>}
                          </div>
                        )}
                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-3">
                          <button onClick={() => { const ni = Math.max(0, wpIdx - 1); setWpIdx(ni); wpStartPractice(wpQueue[ni]) }}
                            disabled={wpIdx <= 0} className="text-xs text-blue-500 disabled:text-gray-300 font-medium">◀ Prev</button>
                          <span className="text-xs text-gray-400">{wpIdx + 1} / {wpQueue.length}</span>
                          <button onClick={() => { const ni = Math.min(wpQueue.length - 1, wpIdx + 1); setWpIdx(ni); wpStartPractice(wpQueue[ni]) }}
                            disabled={wpIdx >= wpQueue.length - 1} className="text-xs text-blue-500 disabled:text-gray-300 font-medium">Next ▶</button>
                        </div>
                      </div>
                    )
                  })()}
                </section>
              )}

              {/* ── Needs Work ── */}
              {wordsToWork.length > 0 && (
                <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-700">Needs Work</h3>
                    <button onClick={() => {
                      const toAdd = wordsToWork.filter(ws => !wpQueue.includes(ws.word)).map(ws => ws.word)
                      if (toAdd.length > 0) { setWpQueue(prev => [...prev, ...toAdd]); setWpIdx(0); wpStartPractice(toAdd[0]) }
                    }} className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-medium">
                      🎯 Queue all ({wordsToWork.length})
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Words ranked by accuracy. Tap 🎯 to add to practice queue.</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {wordsToWork.map((ws, idx) => {
                      const acc = getWordAccuracy(ws)
                      const accColor = acc >= 80 ? 'text-green-600' : acc >= 50 ? 'text-yellow-600' : acc < 30 ? 'text-red-600' : 'text-orange-500'
                      const accBg = acc >= 80 ? 'bg-green-50 border-green-200' : acc >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                      const recordings = ws.history.filter(h => h.recordingUrl)

                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${accBg}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-xs text-gray-400 font-mono w-6 text-right shrink-0">#{idx + 1}</span>
                              <button onClick={() => speakWord(ws.word)}
                                className="font-serif text-lg font-bold truncate hover:text-purple-700 transition-colors text-gray-800"
                                title="Click to hear correct pronunciation">
                                <span className="text-xs mr-1 opacity-50">🔊</span>{ws.word}
                              </button>
                              {isWordKnown(knownWords, ws.word) && <span className="text-xs text-green-600 shrink-0">✓</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {wpQueue.includes(ws.word) ? (
                                <button onClick={() => setWpQueue(prev => prev.filter(w => w !== ws.word))}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-blue-100 text-blue-600 border border-blue-300 font-medium"
                                  title="Remove from queue">✓ Queued</button>
                              ) : (
                                <button onClick={() => {
                                  setWpQueue(prev => [...prev, ws.word])
                                  if (wpQueue.length === 0) { setWpIdx(0); wpStartPractice(ws.word) }
                                }} className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-medium"
                                  title="Add to practice queue">🎯 Queue</button>
                              )}
                              <div className="text-right">
                                <div className={`text-lg font-bold ${accColor}`}>{acc}%</div>
                                <div className="text-xs text-gray-400">{ws.attempts} attempt{ws.attempts !== 1 ? 's' : ''}</div>
                              </div>
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${acc >= 80 ? 'bg-green-500' : acc >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${acc}%` }} />
                              </div>
                            </div>
                          </div>
                          {/* History dots */}
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-gray-400 mr-1">History:</span>
                            {ws.history.slice(0, 15).map((h, hi) => (
                              <span key={hi} className={`w-3 h-3 rounded-full shrink-0 ${
                                h.status === 'green' ? 'bg-green-400' : h.status === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                              }`} title={`${h.status} — heard: "${devanagariToRoman(h.transcript)}" — ${new Date(h.date).toLocaleString()}`} />
                            ))}
                          </div>
                          {/* Recordings */}
                          {recordings.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs text-gray-400 self-center">Your recordings:</span>
                              {recordings.map((rec, ri) => (
                                <button key={ri} onClick={() => { if (rec.recordingUrl) playRecording(rec.recordingUrl) }}
                                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                    rec.status === 'red' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                                  }`} title={`Heard: "${devanagariToRoman(rec.transcript)}" — ${new Date(rec.date).toLocaleString()}`}>
                                  ▶ {rec.status === 'red' ? '✗' : '≈'} "{devanagariToRoman(rec.transcript).slice(0, 15)}"
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {wordsToWork.length === 0 && wpQueue.length === 0 && (
                <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="font-semibold text-gray-700">No words need work!</h3>
                  <p className="text-sm text-gray-400 mt-1">Practice verses to build your word list.</p>
                </section>
              )}
            </div>
          )
        })()}

        {/* ═══════════════════ WORD BANK PANEL ═══════════════════ */}
        {showWordBank && (() => {
          const allWords = [...WORD_BANK, ...wbCustom]
          const filtered = allWords.filter(w => {
            if (wbFilter !== 'all' && w.category !== wbFilter) return false
            if (wbSearch.trim()) {
              const q = wbSearch.toLowerCase().trim()
              return w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q) || (w.devanagari && w.devanagari.includes(q))
            }
            return true
          })
          const catCounts: Record<string, number> = {}
          allWords.forEach(w => { catCounts[w.category] = (catCounts[w.category] || 0) + 1 })

          return (
            <div className="mb-5 space-y-4">
              <section className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                <p className="text-xs text-gray-400 mb-3">{allWords.length} words across {Object.keys(catCounts).length} categories</p>

                {/* Search */}
                <input
                  type="text" value={wbSearch} onChange={e => setWbSearch(e.target.value)}
                  placeholder="Search words or meanings..."
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm mb-3"
                />

                {/* Category filter chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    onClick={() => setWbFilter('all')}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      wbFilter === 'all' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >All ({allWords.length})</button>
                  {(Object.entries(WORD_CATEGORIES) as [WordCategory, { label: string; color: string }][]).map(([key, cat]) => {
                    const count = catCounts[key] || 0
                    if (count === 0) return null
                    return (
                      <button
                        key={key}
                        onClick={() => setWbFilter(wbFilter === key ? 'all' : key)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          wbFilter === key ? cat.color + ' border-current' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >{cat.label} ({count})</button>
                    )
                  })}
                </div>

                {/* Word list */}
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {filtered.map((w, i) => {
                    const catInfo = WORD_CATEGORIES[w.category]
                    const known = isWordKnown(knownWords, w.word)
                    const isCustom = wbCustom.some(c => c.word.toLowerCase() === w.word.toLowerCase())
                    const ws = wordStats[w.word.toLowerCase().trim()]
                    const acc = ws ? getWordAccuracy(ws) : -1
                    const isPracticing = wbPracticing === w.word
                    const inQueue = wpQueue.some(q => q.toLowerCase() === w.word.toLowerCase())
                    return (
                      <div key={`${w.word}-${i}`} className={`p-3 rounded-xl border transition-colors ${isPracticing ? 'border-purple-300 bg-purple-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-serif text-lg font-bold text-gray-800">{w.word}</span>
                              {w.devanagari && <span className="text-lg text-gray-400">{w.devanagari}</span>}
                              {known && <span className="text-xs text-green-600 font-medium">✓ known</span>}
                              {acc >= 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  acc >= 80 ? 'bg-green-100 text-green-700' : acc >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>{acc}%</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catInfo.color}`}>{catInfo.label}</span>
                              {isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">custom</span>}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{w.meaning}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => speakWord(w.word)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                              title="Listen"
                            >🔊</button>
                            <button
                              onClick={() => isPracticing ? setWbPracticing(null) : wbStartPractice(w.word)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                isPracticing ? 'bg-purple-200 text-purple-800 animate-pulse' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                              }`}
                              title={isPracticing ? 'Stop' : 'Practice pronunciation'}
                            >🎤</button>
                            {!inQueue && (
                              <button
                                onClick={() => { setWpQueue(prev => prev.includes(w.word) ? prev : [...prev, w.word]) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs"
                                title="Add to practice queue"
                              >🎯</button>
                            )}
                            {!known ? (
                              <button
                                onClick={() => setKnownWords(addKnownWord(knownWords, w.word))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-bold"
                                title="Mark as known"
                              >+</button>
                            ) : (
                              <button
                                onClick={() => setKnownWords(removeKnownWord(knownWords, w.word))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors text-xs"
                                title="Remove from known"
                              >✕</button>
                            )}
                            {isCustom && (
                              <button
                                onClick={() => { setWbCustom(removeCustomWord(w.word)) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs"
                                title="Delete custom word"
                              >🗑</button>
                            )}
                          </div>
                        </div>
                        {/* Inline practice result */}
                        {isPracticing && (wbPracticeResult || wpListening) && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            {wpListening && !wbPracticeResult && (
                              <p className="text-sm text-purple-600 animate-pulse">🎤 Listening...</p>
                            )}
                            {wbPracticeResult && (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  wbPracticeResult === 'green' ? 'text-green-600' : wbPracticeResult === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {wbPracticeResult === 'green' ? '✅ Correct!' : wbPracticeResult === 'yellow' ? '🟡 Close' : '❌ Try again'}
                                </span>
                                {wbPracticeTranscript && <span className="text-xs text-gray-400">heard: "{wbPracticeTranscript}"</span>}
                                <button
                                  onClick={() => wbStartPractice(w.word)}
                                  className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium"
                                >Retry</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">No words match your search.</p>
                  )}
                </div>
              </section>

              {/* Add custom word */}
              <section className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                <h3 className="text-md font-semibold text-gray-700 mb-3">Add Your Own Word</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text" value={wbAddWord} onChange={e => setWbAddWord(e.target.value)}
                      placeholder="Word (e.g. vṛndāvana)"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm font-serif"
                    />
                    <select
                      value={wbAddCat} onChange={e => setWbAddCat(e.target.value as WordCategory)}
                      className="px-2 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                    >
                      {(Object.entries(WORD_CATEGORIES) as [WordCategory, { label: string }][]).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text" value={wbAddMeaning} onChange={e => setWbAddMeaning(e.target.value)}
                    placeholder="Meaning / definition"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={() => {
                      if (wbAddWord.trim() && wbAddMeaning.trim()) {
                        setWbCustom(addCustomWord(wbAddWord, wbAddMeaning, wbAddCat))
                        setWbAddWord('')
                        setWbAddMeaning('')
                      }
                    }}
                    disabled={!wbAddWord.trim() || !wbAddMeaning.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40"
                  >+ Add Word</button>
                </div>
              </section>
            </div>
          )
        })()}

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
                    className="text-[10px] flex items-center gap-1.5 text-purple-600 hover:text-purple-800 transition-colors whitespace-nowrap"
                    title={useDynamicDifficulty ? 'Showing personalized difficulty based on your progress' : 'Showing consensus difficulty rated by pronunciation complexity'}
                  >
                    {useDynamicDifficulty ? 'For You' : 'Standard'}
                    <span className={`inline-block w-7 h-4 rounded-full relative transition-colors shrink-0 ${useDynamicDifficulty ? 'bg-purple-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${useDynamicDifficulty ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </span>
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
                  onChange={(e) => { setSloka(e.target.value); setSelectedEntry(null); setWordMatches([]); setTranscript(''); localStorage.removeItem('sloka_last_verse') }}
                  className="mt-2 w-full h-24 p-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm font-serif resize-y bg-white"
                  placeholder="Paste Sanskrit śloka here (IAST romanization)..."
                />
                <button
                  onClick={() => { if (sloka.trim()) setShowLibrary(false) }}
                  disabled={!sloka.trim() || !!selectedEntry}
                  className="mt-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Use this text →
                </button>
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
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => setShowLibrary(true)} className="chip chip-inactive">Change</button>
                <button onClick={() => { setSelectedEntry(null); setSloka(''); setWordMatches([]); setTranscript(''); localStorage.removeItem('sloka_last_verse') }} className="chip chip-inactive text-[10px]">✕ Clear</button>
              </div>
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
                {selectedMeter !== 'mantra' && (
                  <button
                    onClick={() => setShowPitchHints(!showPitchHints)}
                    className={`chip ${showPitchHints ? 'chip-active' : 'chip-inactive'}`}
                    title={showPitchHints ? 'Hide pitch hints' : 'Show pitch & rhythm for this meter'}
                  >
                    <span style={{ fontSize: '11px' }}>♫</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (memorizationLevel > 0) {
                      lastMemLevelRef.current = memorizationLevel
                      setMemorizationLevel(0)
                    } else {
                      setMemorizationLevel(lastMemLevelRef.current || 1)
                    }
                  }}
                  className={`chip ${memorizationLevel > 0 ? 'chip-active' : 'chip-inactive'}`}
                  title={memorizationLevel > 0 ? 'Show full text (click again to return)' : 'Start memorization mode'}
                >
                  <span style={{ fontSize: '11px' }}>{memorizationLevel > 0 ? `🧠 ${memorizationLevel}/7` : '🧠'}</span>
                </button>
                <button
                  onClick={() => {
                    if (lineMode) {
                      setLineMode(false)
                    } else {
                      setLineMode(true)
                      setActiveLine(0)
                      setLinePerfects({})
                      setMasteredLines(new Set())
                      setShowMastered(false)
                      setWordMatches([])
                      setTranscript('')
                    }
                  }}
                  className={`chip ${lineMode ? 'chip-active' : 'chip-inactive'}`}
                  title={lineMode ? 'Exit line-by-line mode' : 'Practice one line at a time'}
                >
                  <span style={{ fontSize: '11px' }}>{lineMode ? '📝 Line' : '📝'}</span>
                </button>
                <button
                  onClick={() => setPlaybackSpeed(prev => prev === 1 ? 0.75 : prev === 0.75 ? 0.5 : 1)}
                  className={`chip ${playbackSpeed < 1 ? 'chip-active' : 'chip-inactive'}`}
                  title={`Pacing: ${playbackSpeed === 1 ? 'Normal' : playbackSpeed === 0.75 ? 'Slower pauses' : 'Long pauses'} — click to change`}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>{playbackSpeed}x</span>
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

            {/* Line-by-line practice bar */}
            {lineMode && (() => {
              const lines = splitIntoLines(sloka, meters[selectedMeter].syllablesPerLine)
              const totalLines = lines.length
              const masteredCount = masteredLines.size
              return (
              <div className="flex items-center justify-between px-3 md:px-5 py-1.5 bg-blue-50/80 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setActiveLine(prev => Math.max(0, prev - 1)); setWordMatches([]); setTranscript('') }}
                    disabled={activeLine <= 0}
                    className="text-blue-500 disabled:text-blue-200 text-sm font-bold px-1"
                  >◀</button>
                  <span className="text-[10px] text-blue-700 font-semibold min-w-[80px] text-center">
                    Line {activeLine + 1}/{totalLines}
                    {linePerfects[activeLine] ? ` · ${linePerfects[activeLine]}/3 ✓` : ''}
                  </span>
                  <button
                    onClick={() => { setActiveLine(prev => Math.min(totalLines - 1, prev + 1)); setWordMatches([]); setTranscript('') }}
                    disabled={activeLine >= totalLines - 1}
                    className="text-blue-500 disabled:text-blue-200 text-sm font-bold px-1"
                  >▶</button>
                  <div className="flex gap-0.5 ml-1">
                    {lines.map((_, li) => (
                      <button
                        key={li}
                        onClick={() => {
                          setActiveLine(li); setWordMatches([]); setTranscript('')
                          // Tapping a mastered line's dot un-masters it for re-practice
                          if (masteredLines.has(li)) {
                            setMasteredLines(prev => { const next = new Set(prev); next.delete(li); return next })
                            setLinePerfects(prev => ({ ...prev, [li]: 0 }))
                          }
                        }}
                        className={`w-3 h-3 rounded-full transition-colors text-[7px] font-bold leading-none flex items-center justify-center ${
                          masteredLines.has(li) ? 'bg-green-400 text-white' :
                          li === activeLine ? 'bg-blue-600 text-white' :
                          (linePerfects[li] || 0) > 0 ? 'bg-blue-400 text-white' : 'bg-blue-200 text-blue-400'
                        }`}
                        title={`Line ${li + 1}${masteredLines.has(li) ? ' ✓ mastered (tap to re-practice)' : ` (${linePerfects[li] || 0}/3)`}`}
                      >{li + 1}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {masteredCount > 0 && (
                    <button
                      onClick={() => setShowMastered(!showMastered)}
                      className={`text-[10px] font-medium ${showMastered ? 'text-blue-700' : 'text-blue-500 hover:text-blue-700'}`}
                    >{showMastered ? '🙈 Hide' : '👁 Show'} mastered</button>
                  )}
                  {masteredCount === totalLines && (
                    <span className="text-[10px] text-green-600 font-semibold">🎉 All lines mastered!</span>
                  )}
                </div>
              </div>
              )
            })()}

            {/* Memorization level bar */}
            {memorizationLevel > 0 && (
              <div className="flex items-center justify-between px-3 md:px-5 py-1.5 bg-purple-50/80 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMemorizationLevel(prev => Math.max(1, prev - 1))}
                    disabled={memorizationLevel <= 1}
                    className="text-purple-500 disabled:text-purple-200 text-sm font-bold px-1"
                    title="Easier"
                  >◀</button>
                  <span className="text-[10px] text-purple-600 font-semibold min-w-[90px] text-center">{memorizationLabels[memorizationLevel]}</span>
                  <button
                    onClick={() => setMemorizationLevel(prev => Math.min(7, prev + 1))}
                    disabled={memorizationLevel >= 7}
                    className="text-purple-500 disabled:text-purple-200 text-sm font-bold px-1"
                    title="Harder"
                  >▶</button>
                  <div className="flex gap-0.5 ml-1">
                    {[1,2,3,4,5,6,7].map(l => (
                      <button
                        key={l}
                        onClick={() => setMemorizationLevel(l)}
                        className={`w-3 h-3 rounded-full transition-colors text-[8px] font-bold leading-none flex items-center justify-center ${l === memorizationLevel ? 'bg-purple-600 text-white' : l < memorizationLevel ? 'bg-purple-400 text-white' : 'bg-purple-200 text-purple-400'}`}
                        title={`Level ${l}: ${memorizationLabels[l]}`}
                      >{l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { lastMemLevelRef.current = memorizationLevel; setMemorizationLevel(0) }}
                    className="text-[10px] text-purple-500 hover:text-purple-700 font-medium"
                  >👁 Peek</button>
                  <button onClick={() => { lastMemLevelRef.current = 1; setMemorizationLevel(0) }} className="text-[10px] text-purple-400 hover:text-purple-600" title="Turn off memorization">✕</button>
                </div>
              </div>
            )}

            {/* Pitch legend */}
            {showPitchHints && selectedMeter !== 'mantra' && (
              <div className="flex items-center gap-3 px-3 md:px-5 py-1.5 bg-gray-50/80 border-b border-gray-100 text-[10px]">
                <span className="text-gray-400 font-medium">Pitch:</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300"></span><span className="text-rose-700">▲ High</span></span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-gray-100 border border-gray-300"></span><span className="text-gray-600">● Mid</span></span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300"></span><span className="text-blue-700">▼ Low</span></span>
                <span className="text-gray-400 ml-1">! = stressed</span>
              </div>
            )}

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

            {/* Word-by-word breakdown toggle */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full px-3 md:px-5 py-2 text-left text-xs text-purple-600 hover:bg-purple-50/50 transition-colors flex items-center gap-1.5"
              >
                <span>{showBreakdown ? '▾' : '▸'}</span>
                <span className="font-medium">Word-by-word breakdown</span>
              </button>
              {showBreakdown && (
                <div className="px-3 md:px-5 pb-3 space-y-2">
                  {splitIntoLines(sloka, meters[selectedMeter].syllablesPerLine).map((line, li) => (
                    <div key={li} className="space-y-0.5">
                      <div className="text-[10px] text-gray-400 font-medium mt-1">Pāda {li + 1}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {line.map((word, wi) => {
                          const entry = lookupWord(word)
                          return (
                            <div key={wi} className="inline-flex flex-col items-center min-w-[40px]">
                              <span
                                className="text-base font-serif text-gray-800 cursor-pointer hover:text-purple-700"
                                onClick={() => speakWord(word)}
                                title="Tap to hear"
                              >{word}</span>
                              {entry ? (
                                <>
                                  <span className="text-[10px] text-amber-700 leading-tight text-center">{entry.meaning}</span>
                                  {entry.grammar && (
                                    <span className="text-[9px] text-gray-400 leading-tight text-center">{expandGrammar(entry.grammar)}</span>
                                  )}
                                  {entry.root && (
                                    <span className="text-[9px] text-purple-400 leading-tight text-center">√{entry.root}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-300 italic">—</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  {wordsWithRecordings.map(({ word, recordings }) => {
                    const gloss = lookupWord(word)
                    return (
                    <div key={word} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-[80px] shrink-0 pt-0.5">
                        <span className="text-sm font-serif text-gray-700">{word}</span>
                        {gloss && <span className="block text-[9px] text-gray-400 truncate">{gloss.meaning}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {recordings.slice(0, 5).map((rec, ri) => (
                          <button
                            key={ri}
                            onClick={() => {
                              if (rec.recordingUrl) playRecording(rec.recordingUrl)
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              rec.status === 'green' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' :
                              rec.status === 'yellow' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200' :
                              'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                            title={`${rec.status === 'green' ? 'Correct' : rec.status === 'yellow' ? 'Close' : 'Incorrect'} attempt — heard: "${devanagariToRoman(rec.transcript)}"`}
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
                  )})}
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

            {isListening && transcript && (
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-[11px] text-gray-400 mb-0.5">Heard:</p>
                <p className="text-xs text-gray-600 italic" data-transcript>{transcript}</p>
              </div>
            )}

            {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-xs text-center">
                Speech recognition requires Chrome or Edge.
              </div>
            )}

            {typeof window !== 'undefined' && /Samsung/i.test(navigator.userAgent) && (
              <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs text-center">
                Samsung devices may need the Google app updated for speech recognition. Try Settings → Apps → Google → Update.
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

      </>)}

      </div>

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-gray-200/60 safe-bottom">
        <div className="max-w-5xl mx-auto flex items-stretch">
          {([
            { id: 'practice' as const, label: 'Home', icon: '🏠' },
            { id: 'sounds' as const, label: 'Sounds', icon: '🔤' },
            { id: 'temple' as const, label: 'Temple', icon: '🙏' },
            { id: 'progress' as const, label: 'Profile', icon: '👤' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                page === tab.id
                  ? 'text-purple-700 font-semibold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px]">{tab.label}</span>
              {page === tab.id && <span className="absolute bottom-0 h-0.5 w-10 bg-purple-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
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
