// Sanskrit sound categories based on the varṇamālā (alphabet)
// Each category groups phonetically similar sounds that learners commonly confuse

export interface SoundCategory {
  id: string
  name: string
  devanagari: string
  description: string
  sounds: string[]        // IAST characters in this group
  commonConfusions: string  // What learners typically mix up
  exampleWords: ExampleWord[]
}

export interface ExampleWord {
  word: string
  meaning: string
  soundsHighlighted: string[]  // which sounds from this category appear
}

export interface SoundScore {
  categoryId: string
  correct: number
  close: number
  wrong: number
  lastPracticed: number  // timestamp
  history: { date: number; score: number }[]  // rolling score over time
}

export const soundCategories: SoundCategory[] = [
  // ─── VOWELS ───
  {
    id: 'short-vowels',
    name: 'Short Vowels',
    devanagari: 'अ इ उ ऋ',
    description: 'Short vowels (a, i, u, ṛ) — one mātrā duration. The foundation of Sanskrit pronunciation.',
    sounds: ['a', 'i', 'u', 'ṛ'],
    commonConfusions: 'Pronouncing short vowels too long, or mixing up ṛ with ri',
    exampleWords: [
      { word: 'guru', meaning: 'teacher', soundsHighlighted: ['u'] },
      { word: 'mati', meaning: 'intelligence', soundsHighlighted: ['a', 'i'] },
      { word: 'kṛṣṇa', meaning: 'Kṛṣṇa', soundsHighlighted: ['ṛ', 'a'] },
      { word: 'prabhu', meaning: 'master', soundsHighlighted: ['a', 'u'] },
      { word: 'hari', meaning: 'Lord Hari', soundsHighlighted: ['a', 'i'] },
    ]
  },
  {
    id: 'long-vowels',
    name: 'Long Vowels',
    devanagari: 'आ ई ऊ',
    description: 'Long vowels (ā, ī, ū) — two mātrā duration. Must be held noticeably longer than short vowels.',
    sounds: ['ā', 'ī', 'ū'],
    commonConfusions: 'Not holding long vowels long enough — they should be exactly twice the duration of short ones',
    exampleWords: [
      { word: 'rāma', meaning: 'Lord Rāma', soundsHighlighted: ['ā'] },
      { word: 'gītā', meaning: 'song/Bhagavad-gītā', soundsHighlighted: ['ī', 'ā'] },
      { word: 'rūpa', meaning: 'form', soundsHighlighted: ['ū'] },
      { word: 'sītā', meaning: 'Sītā-devī', soundsHighlighted: ['ī', 'ā'] },
      { word: 'dhāma', meaning: 'abode', soundsHighlighted: ['ā'] },
    ]
  },
  {
    id: 'diphthongs',
    name: 'Diphthongs & Compound Vowels',
    devanagari: 'ए ऐ ओ औ',
    description: 'Compound vowels (e, ai, o, au). E and o are always long in Sanskrit. Ai and au are extra-long.',
    sounds: ['e', 'ai', 'o', 'au'],
    commonConfusions: 'Pronouncing e as short "eh" — in Sanskrit e is always long like "ay". Au is "ow" not "aw".',
    exampleWords: [
      { word: 'deva', meaning: 'god/demigod', soundsHighlighted: ['e'] },
      { word: 'vaiṣṇava', meaning: 'devotee of Viṣṇu', soundsHighlighted: ['ai'] },
      { word: 'loka', meaning: 'world', soundsHighlighted: ['o'] },
      { word: 'gauḍīya', meaning: 'of Bengal', soundsHighlighted: ['au'] },
      { word: 'govinda', meaning: 'one who gives pleasure to cows', soundsHighlighted: ['o'] },
    ]
  },

  // ─── STOPS: UNASPIRATED ───
  {
    id: 'velar-stops',
    name: 'Velar Stops (ka-varga)',
    devanagari: 'क ख ग घ ङ',
    description: 'Produced at the back of the throat (velum): ka, kha, ga, gha, ṅa. The aspirated versions (kha, gha) have a puff of air.',
    sounds: ['k', 'kh', 'g', 'gh', 'ṅ'],
    commonConfusions: 'Not distinguishing ka/kha and ga/gha — kha and gha need a clear breathy puff of air after the consonant',
    exampleWords: [
      { word: 'karma', meaning: 'action', soundsHighlighted: ['k'] },
      { word: 'khaḍga', meaning: 'sword', soundsHighlighted: ['kh'] },
      { word: 'gopa', meaning: 'cowherd', soundsHighlighted: ['g'] },
      { word: 'ghaṭa', meaning: 'pot', soundsHighlighted: ['gh'] },
      { word: 'saṅga', meaning: 'association', soundsHighlighted: ['ṅ', 'g'] },
    ]
  },
  {
    id: 'palatal-stops',
    name: 'Palatal Stops (ca-varga)',
    devanagari: 'च छ ज झ ञ',
    description: 'Produced at the hard palate: ca, cha, ja, jha, ña. Ca is like "cha" in church, not "ka".',
    sounds: ['c', 'ch', 'j', 'jh', 'ñ'],
    commonConfusions: 'Ca is NOT "ka" — it\'s the "ch" sound as in "church". Cha is an aspirated version with extra breath.',
    exampleWords: [
      { word: 'candra', meaning: 'moon', soundsHighlighted: ['c'] },
      { word: 'chāyā', meaning: 'shadow', soundsHighlighted: ['ch'] },
      { word: 'jaya', meaning: 'victory', soundsHighlighted: ['j'] },
      { word: 'jhāṅkāra', meaning: 'jingling', soundsHighlighted: ['jh'] },
      { word: 'yajña', meaning: 'sacrifice', soundsHighlighted: ['ñ'] },
    ]
  },
  {
    id: 'retroflex-stops',
    name: 'Retroflex Stops (ṭa-varga)',
    devanagari: 'ट ठ ड ढ ण',
    description: 'Tongue curled back to touch the roof of the mouth: ṭa, ṭha, ḍa, ḍha, ṇa. These have NO equivalent in English.',
    sounds: ['ṭ', 'ṭh', 'ḍ', 'ḍh', 'ṇ'],
    commonConfusions: 'Pronouncing these like regular t/d — the tongue must curl BACK to touch the hard palate, giving a heavier sound',
    exampleWords: [
      { word: 'paṭa', meaning: 'cloth', soundsHighlighted: ['ṭ'] },
      { word: 'kaṭha', meaning: 'name of a sage', soundsHighlighted: ['ṭh'] },
      { word: 'daṇḍa', meaning: 'rod/stick', soundsHighlighted: ['ḍ', 'ṇ'] },
      { word: 'pāṇḍava', meaning: 'son of Pāṇḍu', soundsHighlighted: ['ṇ', 'ḍ'] },
      { word: 'vrṇḍāvana', meaning: 'Vṛndāvana', soundsHighlighted: ['ṇ'] },
    ]
  },
  {
    id: 'dental-stops',
    name: 'Dental Stops (ta-varga)',
    devanagari: 'त थ द ध न',
    description: 'Tongue touches the TEETH (not the gums): ta, tha, da, dha, na. Softer than English t/d.',
    sounds: ['t', 'th', 'd', 'dh', 'n'],
    commonConfusions: 'English t/d are alveolar (gums). Sanskrit dental t/d touch the upper teeth — sounds softer/thinner.',
    exampleWords: [
      { word: 'tattva', meaning: 'truth/essence', soundsHighlighted: ['t'] },
      { word: 'sthāna', meaning: 'place', soundsHighlighted: ['th'] },
      { word: 'dharma', meaning: 'duty/religion', soundsHighlighted: ['dh'] },
      { word: 'dāna', meaning: 'charity', soundsHighlighted: ['d'] },
      { word: 'nāma', meaning: 'name', soundsHighlighted: ['n'] },
    ]
  },
  {
    id: 'labial-stops',
    name: 'Labial Stops (pa-varga)',
    devanagari: 'प फ ब भ म',
    description: 'Produced with the lips: pa, pha, ba, bha, ma. Pha is NOT "fa" — it\'s an aspirated p.',
    sounds: ['p', 'ph', 'b', 'bh', 'm'],
    commonConfusions: 'Pha is NOT "f" — it\'s p with a puff of air (like "p-ha"). Bha needs the breathy aspiration too.',
    exampleWords: [
      { word: 'pūjā', meaning: 'worship', soundsHighlighted: ['p'] },
      { word: 'phala', meaning: 'fruit/result', soundsHighlighted: ['ph'] },
      { word: 'bhagavān', meaning: 'the Supreme Lord', soundsHighlighted: ['bh'] },
      { word: 'bhakti', meaning: 'devotion', soundsHighlighted: ['bh'] },
      { word: 'māyā', meaning: 'illusion', soundsHighlighted: ['m'] },
    ]
  },

  // ─── SEMIVOWELS ───
  {
    id: 'semivowels',
    name: 'Semivowels (Antaḥstha)',
    devanagari: 'य र ल व',
    description: 'Semivowels: ya, ra, la, va. These are between vowels and consonants. Va is closer to "wa" in many traditions.',
    sounds: ['y', 'r', 'l', 'v'],
    commonConfusions: 'Va can be "va" or "wa" depending on position. R should be a clear tap, not the English "r".',
    exampleWords: [
      { word: 'yoga', meaning: 'union/practice', soundsHighlighted: ['y'] },
      { word: 'rāsa', meaning: 'divine dance', soundsHighlighted: ['r'] },
      { word: 'līlā', meaning: 'divine pastimes', soundsHighlighted: ['l'] },
      { word: 'veda', meaning: 'knowledge/scripture', soundsHighlighted: ['v'] },
      { word: 'viṣṇu', meaning: 'the all-pervading Lord', soundsHighlighted: ['v'] },
    ]
  },

  // ─── SIBILANTS ───
  {
    id: 'sibilants',
    name: 'Sibilants (Ūṣman)',
    devanagari: 'श ष स',
    description: 'Three distinct "s" sounds: śa (palatal, like "sh"), ṣa (retroflex, tongue curled back), sa (dental, like English "s").',
    sounds: ['ś', 'ṣ', 's'],
    commonConfusions: 'All three sound similar to English ears. Śa is like "sh" in "ship". Ṣa is heavier with tongue curled back. Sa is a clean "s".',
    exampleWords: [
      { word: 'śānti', meaning: 'peace', soundsHighlighted: ['ś'] },
      { word: 'śrī', meaning: 'divine beauty/Lakṣmī', soundsHighlighted: ['ś'] },
      { word: 'ṣaḍ-bhuja', meaning: 'six-armed', soundsHighlighted: ['ṣ'] },
      { word: 'kṛṣṇa', meaning: 'Kṛṣṇa', soundsHighlighted: ['ṣ'] },
      { word: 'saṁsāra', meaning: 'cycle of rebirth', soundsHighlighted: ['s'] },
    ]
  },

  // ─── SPECIAL SOUNDS ───
  {
    id: 'aspirate-h',
    name: 'Aspirate & Visarga',
    devanagari: 'ह ः',
    description: 'Ha is a voiced aspirate from the glottis. Visarga (ḥ) is an echo of the preceding vowel with a soft breath.',
    sounds: ['h', 'ḥ'],
    commonConfusions: 'Visarga is NOT a hard "h" — it\'s a soft echo. After a it sounds like "aha", after i like "ihi".',
    exampleWords: [
      { word: 'hare', meaning: 'O Hari!', soundsHighlighted: ['h'] },
      { word: 'namaḥ', meaning: 'obeisance', soundsHighlighted: ['ḥ'] },
      { word: 'duḥkha', meaning: 'suffering', soundsHighlighted: ['ḥ'] },
      { word: 'antaḥkaraṇa', meaning: 'inner instrument/mind', soundsHighlighted: ['ḥ'] },
      { word: 'svāhā', meaning: 'oblation call', soundsHighlighted: ['h'] },
    ]
  },
  {
    id: 'anusvara-chandrabindu',
    name: 'Anusvāra & Nasals',
    devanagari: 'ं ँ',
    description: 'Anusvāra (ṁ) nasalizes the preceding vowel or becomes the nasal of the following consonant group. Candrabindu (ṅ, ñ, ṇ, n, m) are class nasals.',
    sounds: ['ṁ', 'ṃ', 'ṅ', 'ñ'],
    commonConfusions: 'Anusvāra before ka/kha/ga/gha becomes ṅ, before ca-group becomes ñ, etc. It\'s not always just "m".',
    exampleWords: [
      { word: 'saṁskṛta', meaning: 'refined/Sanskrit', soundsHighlighted: ['ṁ'] },
      { word: 'saṅkīrtana', meaning: 'congregational chanting', soundsHighlighted: ['ṅ'] },
      { word: 'pañca', meaning: 'five', soundsHighlighted: ['ñ'] },
      { word: 'maṁtra', meaning: 'sacred chant', soundsHighlighted: ['ṁ'] },
      { word: 'śaraṇaṁ', meaning: 'shelter', soundsHighlighted: ['ṁ'] },
    ]
  },
  {
    id: 'conjuncts',
    name: 'Conjunct Consonants',
    devanagari: 'क्ष त्र ज्ञ श्र',
    description: 'Combined consonants pronounced in quick succession: kṣa, tra, jña, śra. These are common in Sanskrit and need practice.',
    sounds: ['kṣ', 'tr', 'jñ', 'śr'],
    commonConfusions: 'Kṣa is NOT "ksha" — both k and ṣ are pronounced. Jña is "gya" or "dnya" depending on tradition. Śra needs the ś before ra.',
    exampleWords: [
      { word: 'kṣetra', meaning: 'field/holy place', soundsHighlighted: ['kṣ'] },
      { word: 'mokṣa', meaning: 'liberation', soundsHighlighted: ['kṣ'] },
      { word: 'mantra', meaning: 'sacred chant', soundsHighlighted: ['tr'] },
      { word: 'jñāna', meaning: 'knowledge', soundsHighlighted: ['jñ'] },
      { word: 'śrīmad', meaning: 'beautiful/opulent', soundsHighlighted: ['śr'] },
    ]
  },
]

// Map individual characters to their sound category
export function getSoundCategory(char: string): string | null {
  const lower = char.toLowerCase()
  for (const cat of soundCategories) {
    if (cat.sounds.some(s => lower.includes(s) || s.includes(lower))) {
      return cat.id
    }
  }
  return null
}

// Extract which sound categories appear in a word
export function extractSoundsFromWord(word: string): string[] {
  const found = new Set<string>()
  const lower = word.toLowerCase()

  for (const cat of soundCategories) {
    for (const sound of cat.sounds) {
      if (lower.includes(sound)) {
        found.add(cat.id)
      }
    }
  }

  return Array.from(found)
}

// Storage key
const STORAGE_KEY = 'sanskrit-sound-scores'

export function loadScores(): Record<string, SoundScore> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}

  // Initialize with zero scores
  const scores: Record<string, SoundScore> = {}
  for (const cat of soundCategories) {
    scores[cat.id] = {
      categoryId: cat.id,
      correct: 0,
      close: 0,
      wrong: 0,
      lastPracticed: 0,
      history: []
    }
  }
  return scores
}

export function saveScores(scores: Record<string, SoundScore>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
}

// Record a result for sounds found in a word
export function recordResult(
  scores: Record<string, SoundScore>,
  word: string,
  status: 'green' | 'yellow' | 'red'
): Record<string, SoundScore> {
  const updated = { ...scores }
  const categories = extractSoundsFromWord(word)
  const now = Date.now()

  for (const catId of categories) {
    if (!updated[catId]) {
      updated[catId] = { categoryId: catId, correct: 0, close: 0, wrong: 0, lastPracticed: 0, history: [] }
    }
    const s = { ...updated[catId] }
    if (status === 'green') s.correct++
    else if (status === 'yellow') s.close++
    else s.wrong++
    s.lastPracticed = now

    // Add to history (one entry per session, max 50)
    const total = s.correct + s.close + s.wrong
    const score = total > 0 ? Math.round((s.correct / total) * 100) : 0
    // Only add if last entry was > 1 hour ago
    const lastEntry = s.history[s.history.length - 1]
    if (!lastEntry || now - lastEntry.date > 3600000) {
      s.history.push({ date: now, score })
      if (s.history.length > 50) s.history.shift()
    } else {
      // Update the current session entry
      s.history[s.history.length - 1] = { date: now, score }
    }

    updated[catId] = s
  }

  return updated
}

export function getAccuracy(score: SoundScore): number {
  const total = score.correct + score.close + score.wrong
  if (total === 0) return -1 // no data
  return Math.round((score.correct / total) * 100)
}

export function getWeakestCategories(scores: Record<string, SoundScore>, limit = 5): SoundCategory[] {
  return soundCategories
    .filter(cat => {
      const s = scores[cat.id]
      return s && (s.correct + s.close + s.wrong) > 0
    })
    .sort((a, b) => getAccuracy(scores[a.id]) - getAccuracy(scores[b.id]))
    .slice(0, limit)
}

// ─── Known Words ───

export interface KnownWord {
  word: string
  addedAt: number
  soundCategories: string[]  // which sound category IDs this word covers
}

const KNOWN_WORDS_KEY = 'sanskrit-known-words'

export function loadKnownWords(): KnownWord[] {
  try {
    const raw = localStorage.getItem(KNOWN_WORDS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return []
}

export function saveKnownWords(words: KnownWord[]) {
  localStorage.setItem(KNOWN_WORDS_KEY, JSON.stringify(words))
}

export function addKnownWord(words: KnownWord[], word: string): KnownWord[] {
  const normalized = word.toLowerCase().trim()
  if (words.some(w => w.word.toLowerCase() === normalized)) return words
  const entry: KnownWord = {
    word: word.trim(),
    addedAt: Date.now(),
    soundCategories: extractSoundsFromWord(word)
  }
  const updated = [...words, entry]
  saveKnownWords(updated)
  return updated
}

export function removeKnownWord(words: KnownWord[], word: string): KnownWord[] {
  const updated = words.filter(w => w.word.toLowerCase() !== word.toLowerCase().trim())
  saveKnownWords(updated)
  return updated
}

export function isWordKnown(words: KnownWord[], word: string): boolean {
  return words.some(w => w.word.toLowerCase() === word.toLowerCase().trim())
}

// Get sound categories covered by known words
export function getKnownSoundCoverage(words: KnownWord[]): Record<string, number> {
  const coverage: Record<string, number> = {}
  for (const w of words) {
    for (const catId of w.soundCategories) {
      coverage[catId] = (coverage[catId] || 0) + 1
    }
  }
  return coverage
}

// ─── Per-Word Stats (tracks every word attempt with recordings) ───

export interface WordAttempt {
  date: number
  status: 'green' | 'yellow' | 'red'
  transcript: string        // what speech recognition heard
  recordingUrl?: string     // base64 data URL of user's audio (for wrong/close attempts)
}

export interface WordStats {
  word: string
  attempts: number
  correct: number
  close: number
  wrong: number
  history: WordAttempt[]    // last N attempts, most recent first
  lastAttempted: number
}

const WORD_STATS_KEY = 'sanskrit-word-stats'
const MAX_ATTEMPTS_STORED = 20
const MAX_RECORDINGS = 3  // keep only last 3 recordings per word to save storage

export function loadWordStats(): Record<string, WordStats> {
  try {
    const raw = localStorage.getItem(WORD_STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return {}
}

export function saveWordStats(stats: Record<string, WordStats>) {
  try {
    localStorage.setItem(WORD_STATS_KEY, JSON.stringify(stats))
  } catch (e) {
    // Quota exceeded — strip all recording URLs and retry
    console.warn('[WordStats] Storage quota exceeded, stripping recordings to free space')
    const stripped = { ...stats }
    for (const key of Object.keys(stripped)) {
      stripped[key] = {
        ...stripped[key],
        history: stripped[key].history.map(h => ({ ...h, recordingUrl: undefined }))
      }
    }
    try {
      localStorage.setItem(WORD_STATS_KEY, JSON.stringify(stripped))
    } catch (_) {
      console.error('[WordStats] Still cannot save even after stripping recordings')
    }
  }
}

export function recordWordAttempt(
  stats: Record<string, WordStats>,
  word: string,
  status: 'green' | 'yellow' | 'red',
  transcript: string,
  recordingUrl?: string
): Record<string, WordStats> {
  const key = word.toLowerCase().trim()
  const updated = { ...stats }
  const existing = updated[key] || {
    word: word.trim(),
    attempts: 0,
    correct: 0,
    close: 0,
    wrong: 0,
    history: [],
    lastAttempted: 0
  }

  const entry: WordAttempt = {
    date: Date.now(),
    status,
    transcript,
    recordingUrl // store recordings for all attempts so users can compare
  }

  existing.attempts++
  if (status === 'green') existing.correct++
  else if (status === 'yellow') existing.close++
  else existing.wrong++
  existing.lastAttempted = Date.now()

  // Prepend to history, trim
  existing.history = [entry, ...existing.history].slice(0, MAX_ATTEMPTS_STORED)

  // Trim recordings to MAX_RECORDINGS
  let recCount = 0
  existing.history = existing.history.map(h => {
    if (h.recordingUrl) {
      recCount++
      if (recCount > MAX_RECORDINGS) return { ...h, recordingUrl: undefined }
    }
    return h
  })

  updated[key] = existing
  saveWordStats(updated)
  return updated
}

export function getWordAccuracy(ws: WordStats): number {
  if (ws.attempts === 0) return 0
  return Math.round((ws.correct / ws.attempts) * 100)
}

// Get all words sorted by accuracy (worst first), excluding those at or above the mastery threshold
export function getWordsNeedingWork(stats: Record<string, WordStats>, masteryThreshold = 80): WordStats[] {
  return Object.values(stats)
    .filter(ws => ws.attempts > 0 && getWordAccuracy(ws) < masteryThreshold)
    .sort((a, b) => getWordAccuracy(a) - getWordAccuracy(b))
}

// ═══ Devanagari → Roman transliteration (for display) ═══

const devaMap: [string, string][] = [
  // Vowel signs (matras) — must come before independent vowels
  ['ौ','au'],['ै','ai'],['ो','o'],['े','e'],['ू','ū'],['ु','u'],['ी','ī'],['ि','i'],['ा','ā'],['ृ','ṛ'],
  // Independent vowels
  ['औ','au'],['ऐ','ai'],['ओ','o'],['ए','e'],['ऊ','ū'],['उ','u'],['ई','ī'],['इ','i'],['आ','ā'],['अ','a'],['ऋ','ṛ'],
  // Consonants (conjuncts/aspirates first)
  ['क्ष','kṣ'],['त्र','tr'],['ज्ञ','jñ'],['श्र','śr'],
  ['खा','khā'],['घा','ghā'],['छा','chā'],['झा','jhā'],['ठा','ṭhā'],['ढा','ḍhā'],['था','thā'],['धा','dhā'],['फा','phā'],['भा','bhā'],
  ['ख','kh'],['घ','gh'],['छ','ch'],['झ','jh'],['ठ','ṭh'],['ढ','ḍh'],['थ','th'],['ध','dh'],['फ','ph'],['भ','bh'],
  ['क','k'],['ग','g'],['ङ','ṅ'],['च','c'],['ज','j'],['ञ','ñ'],
  ['ट','ṭ'],['ड','ḍ'],['ण','ṇ'],['त','t'],['द','d'],['न','n'],
  ['प','p'],['ब','b'],['म','m'],
  ['य','y'],['र','r'],['ल','l'],['व','v'],
  ['श','ś'],['ष','ṣ'],['स','s'],['ह','h'],
  // Special marks
  ['ं','ṁ'],['ः','ḥ'],['ँ','~'],['्',''],['़',''],
  ['।','|'],['॥','||'],
]

export function devanagariToRoman(text: string): string {
  // If no Devanagari characters, return as-is
  if (!/[\u0900-\u097F]/.test(text)) return text
  let result = ''
  let i = 0
  while (i < text.length) {
    let matched = false
    // Try longest match first (2 chars, then 1)
    for (const [deva, roman] of devaMap) {
      if (text.startsWith(deva, i)) {
        result += roman
        i += deva.length
        matched = true
        // Add implicit 'a' after consonant if next char is not a matra, virama, or another combining mark
        if (roman.length > 0 && /[a-zḍṭṇṅñśṣṛṁḥ]$/i.test(roman) && !/[aeiouāīūṛ]$/i.test(roman)) {
          const next = text[i]
          const isVowelSign = next && /[\u093E-\u094C\u0962\u0963]/.test(next)
          const isVirama = next === '्'
          const isConsonant = next && /[\u0915-\u0939]/.test(next)
          if (!isVowelSign && !isVirama && !isConsonant) {
            result += 'a'
          }
        }
        break
      }
    }
    if (!matched) {
      result += text[i]
      i++
    }
  }
  return result
}

// ═══ Śloka / Mantra completion tracking ═══

export interface SlokaProgress {
  id: string              // sloka id from library
  perfectCount: number    // times ALL words were green in one attempt
  completed: boolean      // true when perfectCount >= 3
  lastPerfectDate?: string
  attempts: number        // total times practiced
  manualStatus?: 'not-started' | 'practicing' | 'mastered'  // user override
}

const SLOKA_PROGRESS_KEY = 'sloka_progress'

export function loadSlokaProgress(): Record<string, SlokaProgress> {
  try {
    const stored = localStorage.getItem(SLOKA_PROGRESS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch { return {} }
}

export function saveSlokaProgress(progress: Record<string, SlokaProgress>): void {
  localStorage.setItem(SLOKA_PROGRESS_KEY, JSON.stringify(progress))
}

// ═══ Temple Program (memorization queue) ═══

export interface CustomMantra {
  id: string           // e.g. 'custom-1719...'
  text: string
  title: string        // user-given name
  translation?: string
}

export interface TempleService {
  id: string           // e.g. 'mangala-arati'
  name: string
  timeOfDay: 'morning' | 'evening'
  order: number        // display order within time-of-day
  mantraIds: string[]  // slokaLibrary ids or custom-* ids
}

export interface TempleProgram {
  services: TempleService[]
  customMantras: CustomMantra[]
}

const TEMPLE_PROGRAM_KEY = 'temple_program'

const DEFAULT_SERVICES: TempleService[] = [
  { id: 'mangala-arati', name: 'Maṅgala Āratī', timeOfDay: 'morning', order: 0, mantraIds: [] },
  { id: 'tulasi-puja', name: 'Tulasī Pūjā', timeOfDay: 'morning', order: 1, mantraIds: [] },
  { id: 'darsana-arati', name: 'Darśana Āratī', timeOfDay: 'morning', order: 2, mantraIds: [] },
  { id: 'guru-puja', name: 'Guru Pūjā', timeOfDay: 'morning', order: 3, mantraIds: [] },
  { id: 'bhagavatam', name: 'Śrīmad-Bhāgavatam Class', timeOfDay: 'morning', order: 4, mantraIds: [] },
  { id: 'sandhya-arati', name: 'Sandhyā Āratī', timeOfDay: 'evening', order: 0, mantraIds: [] },
  { id: 'sayana-arati', name: 'Śayana Āratī', timeOfDay: 'evening', order: 1, mantraIds: [] },
]

export function loadTempleProgram(): TempleProgram {
  try {
    const stored = localStorage.getItem(TEMPLE_PROGRAM_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as TempleProgram
      // Merge any new default services not yet in stored data
      const existingIds = new Set(parsed.services.map(s => s.id))
      for (const def of DEFAULT_SERVICES) {
        if (!existingIds.has(def.id)) parsed.services.push(def)
      }
      return parsed
    }
  } catch { /* ignore */ }
  return { services: [...DEFAULT_SERVICES], customMantras: [] }
}

export function saveTempleProgram(program: TempleProgram): void {
  localStorage.setItem(TEMPLE_PROGRAM_KEY, JSON.stringify(program))
}

// Record an attempt — pass allGreen=true when every word in the śloka was green
export function recordSlokaAttempt(
  progress: Record<string, SlokaProgress>,
  slokaId: string,
  allGreen: boolean
): Record<string, SlokaProgress> {
  const updated = { ...progress }
  const existing = updated[slokaId] || { id: slokaId, perfectCount: 0, completed: false, attempts: 0 }
  existing.attempts += 1
  if (allGreen) {
    existing.perfectCount += 1
    existing.lastPerfectDate = new Date().toISOString()
    if (existing.perfectCount >= 3) existing.completed = true
  }
  updated[slokaId] = existing
  saveSlokaProgress(updated)
  return updated
}
