// Common Sanskrit / ISKCON vocabulary — curated bank of recurring words
// across Bhagavad-gītā, Śrīmad-Bhāgavatam, Caitanya-caritāmṛta, and general Vaiṣṇava discourse.

export interface WordBankEntry {
  word: string
  devanagari?: string
  meaning: string
  category: WordCategory
}

export type WordCategory =
  | 'theology'
  | 'philosophy'
  | 'devotion'
  | 'nature_of_self'
  | 'cosmology'
  | 'practice'
  | 'relationships'
  | 'qualities'
  | 'scripture'
  | 'general'

export const WORD_CATEGORIES: Record<WordCategory, { label: string; color: string }> = {
  theology:       { label: 'Theology',           color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  philosophy:     { label: 'Philosophy',         color: 'bg-purple-100 text-purple-700 border-purple-200' },
  devotion:       { label: 'Devotion & Worship', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  nature_of_self: { label: 'Nature of Self',     color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  cosmology:      { label: 'Cosmology',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  practice:       { label: 'Practice & Sādhana', color: 'bg-green-100 text-green-700 border-green-200' },
  relationships:  { label: 'Relationships',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  qualities:      { label: 'Qualities & Virtues', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  scripture:      { label: 'Scripture & Text',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  general:        { label: 'General Terms',      color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export const WORD_BANK: WordBankEntry[] = [
  // ═══ THEOLOGY ═══
  { word: 'Bhagavān', devanagari: 'भगवान्', meaning: 'The Supreme Personality of Godhead; one who possesses all opulences', category: 'theology' },
  { word: 'Brahman', devanagari: 'ब्रह्मन्', meaning: 'The impersonal, all-pervading aspect of the Absolute Truth', category: 'theology' },
  { word: 'Paramātmā', devanagari: 'परमात्मा', meaning: 'The Supersoul; localized aspect of God in every heart', category: 'theology' },
  { word: 'Kṛṣṇa', devanagari: 'कृष्ण', meaning: 'The Supreme Lord; the all-attractive one', category: 'theology' },
  { word: 'Viṣṇu', devanagari: 'विष्णु', meaning: 'The all-pervading Lord; maintainer of the universe', category: 'theology' },
  { word: 'Nārāyaṇa', devanagari: 'नारायण', meaning: 'The shelter of all living entities; four-armed form of Viṣṇu', category: 'theology' },
  { word: 'Īśvara', devanagari: 'ईश्वर', meaning: 'The supreme controller; God', category: 'theology' },
  { word: 'avatāra', devanagari: 'अवतार', meaning: 'Descent of the Lord; incarnation of God', category: 'theology' },
  { word: 'śakti', devanagari: 'शक्ति', meaning: 'Energy or potency (of the Lord)', category: 'theology' },
  { word: 'māyā', devanagari: 'माया', meaning: 'Illusion; the external energy of the Lord that deludes the living entities', category: 'theology' },
  { word: 'līlā', devanagari: 'लीला', meaning: 'Divine pastimes of the Lord', category: 'theology' },
  { word: 'dhāma', devanagari: 'धाम', meaning: 'Abode; transcendental dwelling place of the Lord', category: 'theology' },
  { word: 'Vaikuṇṭha', devanagari: 'वैकुण्ठ', meaning: 'The spiritual world; realm free from anxiety', category: 'theology' },
  { word: 'Goloka', devanagari: 'गोलोक', meaning: 'The highest spiritual planet; abode of Kṛṣṇa', category: 'theology' },
  { word: 'pradhāna', devanagari: 'प्रधान', meaning: 'The unmanifested material nature', category: 'theology' },

  // ═══ PHILOSOPHY ═══
  { word: 'dharma', devanagari: 'धर्म', meaning: 'Duty; religion; essential nature; occupational duty', category: 'philosophy' },
  { word: 'karma', devanagari: 'कर्म', meaning: 'Action; the law of cause and effect; material activities and their reactions', category: 'philosophy' },
  { word: 'jñāna', devanagari: 'ज्ञान', meaning: 'Knowledge; spiritual understanding', category: 'philosophy' },
  { word: 'yoga', devanagari: 'योग', meaning: 'Linking with the Supreme; spiritual discipline', category: 'philosophy' },
  { word: 'saṁsāra', devanagari: 'संसार', meaning: 'The cycle of birth and death in the material world', category: 'philosophy' },
  { word: 'mokṣa', devanagari: 'मोक्ष', meaning: 'Liberation from the cycle of birth and death', category: 'philosophy' },
  { word: 'mukti', devanagari: 'मुक्ति', meaning: 'Liberation; release from material bondage', category: 'philosophy' },
  { word: 'tattva', devanagari: 'तत्त्व', meaning: 'Truth; fundamental principle; reality', category: 'philosophy' },
  { word: 'guṇa', devanagari: 'गुण', meaning: 'Mode of material nature (sattva, rajas, tamas)', category: 'philosophy' },
  { word: 'sattva', devanagari: 'सत्त्व', meaning: 'Goodness; the mode of purity and knowledge', category: 'philosophy' },
  { word: 'rajas', devanagari: 'रजस्', meaning: 'Passion; the mode of desire and activity', category: 'philosophy' },
  { word: 'tamas', devanagari: 'तमस्', meaning: 'Ignorance; the mode of darkness and inertia', category: 'philosophy' },
  { word: 'prakṛti', devanagari: 'प्रकृति', meaning: 'Material nature; the external energy of the Lord', category: 'philosophy' },
  { word: 'puruṣa', devanagari: 'पुरुष', meaning: 'The enjoyer; the Supreme Person; the living entity', category: 'philosophy' },
  { word: 'ahiṁsā', devanagari: 'अहिंसा', meaning: 'Non-violence', category: 'philosophy' },
  { word: 'satya', devanagari: 'सत्य', meaning: 'Truth; truthfulness', category: 'philosophy' },
  { word: 'viveka', devanagari: 'विवेक', meaning: 'Discrimination; discernment between real and unreal', category: 'philosophy' },
  { word: 'vairāgya', devanagari: 'वैराग्य', meaning: 'Detachment; renunciation of material desires', category: 'philosophy' },

  // ═══ DEVOTION & WORSHIP ═══
  { word: 'bhakti', devanagari: 'भक्ति', meaning: 'Devotion; loving devotional service to the Lord', category: 'devotion' },
  { word: 'prema', devanagari: 'प्रेम', meaning: 'Pure love of God; the highest perfection of bhakti', category: 'devotion' },
  { word: 'sevā', devanagari: 'सेवा', meaning: 'Service; devotional service', category: 'devotion' },
  { word: 'pūjā', devanagari: 'पूजा', meaning: 'Worship; ceremonial adoration of the deity', category: 'devotion' },
  { word: 'ārati', devanagari: 'आरति', meaning: 'Ceremony of offering lamps and worship items to the deity', category: 'devotion' },
  { word: 'kīrtana', devanagari: 'कीर्तन', meaning: 'Congregational chanting of the holy names', category: 'devotion' },
  { word: 'saṅkīrtana', devanagari: 'सङ्कीर्तन', meaning: 'Congregational chanting; the yuga-dharma for Kali-yuga', category: 'devotion' },
  { word: 'japa', devanagari: 'जप', meaning: 'Soft chanting; individual recitation of the holy names on beads', category: 'devotion' },
  { word: 'mantra', devanagari: 'मन्त्र', meaning: 'Sacred sound vibration that delivers the mind', category: 'devotion' },
  { word: 'prasāda', devanagari: 'प्रसाद', meaning: 'The mercy of the Lord; sanctified food offered to the deity', category: 'devotion' },
  { word: 'darśana', devanagari: 'दर्शन', meaning: 'Seeing and being seen by the deity; audience with the Lord', category: 'devotion' },
  { word: 'śraddhā', devanagari: 'श्रद्धा', meaning: 'Faith; the beginning stage of devotional service', category: 'devotion' },
  { word: 'arcana', devanagari: 'अर्चन', meaning: 'Deity worship; one of the nine processes of bhakti', category: 'devotion' },
  { word: 'vandana', devanagari: 'वन्दन', meaning: 'Offering prayers; one of the nine processes of bhakti', category: 'devotion' },
  { word: 'smaraṇa', devanagari: 'स्मरण', meaning: 'Remembrance of the Lord; one of the nine processes of bhakti', category: 'devotion' },
  { word: 'śravaṇa', devanagari: 'श्रवण', meaning: 'Hearing about the Lord; the first process of bhakti', category: 'devotion' },
  { word: 'ātma-nivedana', devanagari: 'आत्मनिवेदन', meaning: 'Complete surrender of the self to the Lord', category: 'devotion' },
  { word: 'abhiṣeka', devanagari: 'अभिषेक', meaning: 'Bathing ceremony of the deity', category: 'devotion' },

  // ═══ NATURE OF SELF ═══
  { word: 'ātmā', devanagari: 'आत्मा', meaning: 'The self; the soul; the eternal spiritual being', category: 'nature_of_self' },
  { word: 'jīva', devanagari: 'जीव', meaning: 'The individual living entity; the soul embodied in matter', category: 'nature_of_self' },
  { word: 'jīvātmā', devanagari: 'जीवात्मा', meaning: 'The individual soul', category: 'nature_of_self' },
  { word: 'ahaṅkāra', devanagari: 'अहङ्कार', meaning: 'False ego; misidentification of self with the body', category: 'nature_of_self' },
  { word: 'manas', devanagari: 'मनस्', meaning: 'Mind; the thinking faculty', category: 'nature_of_self' },
  { word: 'buddhi', devanagari: 'बुद्धि', meaning: 'Intelligence; the discriminating faculty', category: 'nature_of_self' },
  { word: 'citta', devanagari: 'चित्त', meaning: 'Consciousness; the heart/mind', category: 'nature_of_self' },
  { word: 'indriya', devanagari: 'इन्द्रिय', meaning: 'Sense; sense organ', category: 'nature_of_self' },
  { word: 'deha', devanagari: 'देह', meaning: 'The material body', category: 'nature_of_self' },
  { word: 'prāṇa', devanagari: 'प्राण', meaning: 'Life air; vital breath', category: 'nature_of_self' },
  { word: 'kṣetra', devanagari: 'क्षेत्र', meaning: 'The field (body); field of activities', category: 'nature_of_self' },
  { word: 'kṣetrajña', devanagari: 'क्षेत्रज्ञ', meaning: 'The knower of the field; the soul', category: 'nature_of_self' },

  // ═══ COSMOLOGY ═══
  { word: 'loka', devanagari: 'लोक', meaning: 'World; planet; realm of existence', category: 'cosmology' },
  { word: 'yuga', devanagari: 'युग', meaning: 'Age; cosmic time period (Satya, Tretā, Dvāpara, Kali)', category: 'cosmology' },
  { word: 'Kali-yuga', devanagari: 'कलियुग', meaning: 'The current age of quarrel and hypocrisy', category: 'cosmology' },
  { word: 'kalpa', devanagari: 'कल्प', meaning: 'One day of Brahmā; 4.32 billion years', category: 'cosmology' },
  { word: 'brahmāṇḍa', devanagari: 'ब्रह्माण्ड', meaning: 'The material universe; cosmic egg', category: 'cosmology' },
  { word: 'jagat', devanagari: 'जगत्', meaning: 'The material world; the universe', category: 'cosmology' },
  { word: 'sṛṣṭi', devanagari: 'सृष्टि', meaning: 'Creation of the universe', category: 'cosmology' },
  { word: 'pralaya', devanagari: 'प्रलय', meaning: 'Dissolution; destruction of the universe', category: 'cosmology' },

  // ═══ PRACTICE & SĀDHANA ═══
  { word: 'sādhana', devanagari: 'साधन', meaning: 'Spiritual practice; the means of achieving the goal', category: 'practice' },
  { word: 'sādhu', devanagari: 'साधु', meaning: 'Saintly person; devotee; one who is on the right path', category: 'practice' },
  { word: 'sannyāsa', devanagari: 'सन्न्यास', meaning: 'The renounced order of life; the fourth āśrama', category: 'practice' },
  { word: 'tapas', devanagari: 'तपस्', meaning: 'Austerity; penance; voluntary self-discipline', category: 'practice' },
  { word: 'dīkṣā', devanagari: 'दीक्षा', meaning: 'Spiritual initiation from a bona fide guru', category: 'practice' },
  { word: 'saṅga', devanagari: 'सङ्ग', meaning: 'Association; companionship', category: 'practice' },
  { word: 'satsaṅga', devanagari: 'सत्सङ्ग', meaning: 'Association with saintly persons and devotees', category: 'practice' },
  { word: 'āśrama', devanagari: 'आश्रम', meaning: 'Stage of spiritual life (student, householder, retired, renounced)', category: 'practice' },
  { word: 'varṇāśrama', devanagari: 'वर्णाश्रम', meaning: 'The social system of four orders and four stages of life', category: 'practice' },
  { word: 'upavāsa', devanagari: 'उपवास', meaning: 'Fasting; sitting near the Lord', category: 'practice' },
  { word: 'parikramā', devanagari: 'परिक्रमा', meaning: 'Circumambulation of holy places or the deity', category: 'practice' },
  { word: 'dhyāna', devanagari: 'ध्यान', meaning: 'Meditation; focused contemplation', category: 'practice' },
  { word: 'samādhi', devanagari: 'समाधि', meaning: 'Complete absorption in the Supreme; spiritual trance', category: 'practice' },

  // ═══ RELATIONSHIPS ═══
  { word: 'guru', devanagari: 'गुरु', meaning: 'Spiritual master; one who dispels darkness of ignorance', category: 'relationships' },
  { word: 'ācārya', devanagari: 'आचार्य', meaning: 'One who teaches by example; spiritual preceptor', category: 'relationships' },
  { word: 'śiṣya', devanagari: 'शिष्य', meaning: 'Disciple; student of a spiritual master', category: 'relationships' },
  { word: 'bhakta', devanagari: 'भक्त', meaning: 'Devotee; one engaged in devotional service', category: 'relationships' },
  { word: 'Vaiṣṇava', devanagari: 'वैष्णव', meaning: 'A devotee of Viṣṇu or Kṛṣṇa', category: 'relationships' },
  { word: 'gosvāmī', devanagari: 'गोस्वामी', meaning: 'Master of the senses; title for renounced devotees', category: 'relationships' },
  { word: 'sannyāsī', devanagari: 'सन्न्यासी', meaning: 'One in the renounced order of life', category: 'relationships' },
  { word: 'gṛhastha', devanagari: 'गृहस्थ', meaning: 'Householder; one in the married order', category: 'relationships' },
  { word: 'brahmacārī', devanagari: 'ब्रह्मचारी', meaning: 'Celibate student; one in the first āśrama', category: 'relationships' },
  { word: 'vānaprastha', devanagari: 'वानप्रस्थ', meaning: 'Retired person; one in the third āśrama', category: 'relationships' },
  { word: 'paramparā', devanagari: 'परम्परा', meaning: 'Disciplic succession; chain of spiritual masters', category: 'relationships' },
  { word: 'dāsa', devanagari: 'दास', meaning: 'Servant; one who serves the Lord', category: 'relationships' },
  { word: 'gopī', devanagari: 'गोपी', meaning: 'Cowherd girl of Vṛndāvana; topmost devotee of Kṛṣṇa', category: 'relationships' },
  { word: 'rasa', devanagari: 'रस', meaning: 'Transcendental mellow; relationship with God', category: 'relationships' },

  // ═══ QUALITIES & VIRTUES ═══
  { word: 'dayā', devanagari: 'दया', meaning: 'Mercy; compassion', category: 'qualities' },
  { word: 'kṛpā', devanagari: 'कृपा', meaning: 'Grace; mercy (especially of the Lord or guru)', category: 'qualities' },
  { word: 'kṣamā', devanagari: 'क्षमा', meaning: 'Forgiveness; tolerance', category: 'qualities' },
  { word: 'śānti', devanagari: 'शान्ति', meaning: 'Peace; tranquility', category: 'qualities' },
  { word: 'sukha', devanagari: 'सुख', meaning: 'Happiness; pleasure', category: 'qualities' },
  { word: 'duḥkha', devanagari: 'दुःख', meaning: 'Suffering; misery; distress', category: 'qualities' },
  { word: 'ānanda', devanagari: 'आनन्द', meaning: 'Bliss; transcendental joy', category: 'qualities' },
  { word: 'sat-cit-ānanda', devanagari: 'सच्चिदानन्द', meaning: 'Eternity, knowledge, and bliss — nature of the Absolute', category: 'qualities' },
  { word: 'nirmala', devanagari: 'निर्मल', meaning: 'Pure; spotless; without contamination', category: 'qualities' },
  { word: 'karuṇā', devanagari: 'करुणा', meaning: 'Compassion; empathy for others\' suffering', category: 'qualities' },
  { word: 'tyāga', devanagari: 'त्याग', meaning: 'Renunciation; sacrifice; giving up', category: 'qualities' },

  // ═══ SCRIPTURE & TEXT ═══
  { word: 'śāstra', devanagari: 'शास्त्र', meaning: 'Scripture; revealed knowledge; authoritative text', category: 'scripture' },
  { word: 'śloka', devanagari: 'श्लोक', meaning: 'Verse; a metrical unit of Sanskrit poetry', category: 'scripture' },
  { word: 'sūtra', devanagari: 'सूत्र', meaning: 'Aphorism; concise philosophical statement', category: 'scripture' },
  { word: 'Veda', devanagari: 'वेद', meaning: 'Original revealed scriptures; knowledge from God', category: 'scripture' },
  { word: 'Upaniṣad', devanagari: 'उपनिषद्', meaning: 'Philosophical section of the Vedas; sitting near the teacher', category: 'scripture' },
  { word: 'Purāṇa', devanagari: 'पुराण', meaning: 'Ancient historical narration; supplementary Vedic literature', category: 'scripture' },
  { word: 'Itihāsa', devanagari: 'इतिहास', meaning: 'History; epic narrative (Mahābhārata, Rāmāyaṇa)', category: 'scripture' },
  { word: 'stuti', devanagari: 'स्तुति', meaning: 'Prayers of glorification', category: 'scripture' },
  { word: 'stotra', devanagari: 'स्तोत्र', meaning: 'Hymn of praise', category: 'scripture' },
  { word: 'purport', meaning: 'Commentary/explanation by the ācārya on a verse', category: 'scripture' },

  // ═══ GENERAL TERMS ═══
  { word: 'oṁ', devanagari: 'ॐ', meaning: 'The sacred syllable; sound representation of the Absolute', category: 'general' },
  { word: 'namaḥ', devanagari: 'नमः', meaning: 'Obeisances; I bow down', category: 'general' },
  { word: 'hare', devanagari: 'हरे', meaning: 'O Hari! O energy of the Lord! (vocative)', category: 'general' },
  { word: 'hari', devanagari: 'हरि', meaning: 'The Lord who removes suffering; name of Viṣṇu/Kṛṣṇa', category: 'general' },
  { word: 'deva', devanagari: 'देव', meaning: 'Demigod; a powerful being in the heavenly planets', category: 'general' },
  { word: 'devī', devanagari: 'देवी', meaning: 'Goddess; divine feminine energy', category: 'general' },
  { word: 'maṅgala', devanagari: 'मङ्गल', meaning: 'Auspiciousness; that which brings good fortune', category: 'general' },
  { word: 'paṇḍita', devanagari: 'पण्डित', meaning: 'A learned person; scholar', category: 'general' },
  { word: 'mahātmā', devanagari: 'महात्मा', meaning: 'A great soul; one of broad-minded spiritual vision', category: 'general' },
  { word: 'prabhu', devanagari: 'प्रभु', meaning: 'Master; Lord; respectful address among devotees', category: 'general' },
  { word: 'mātājī', devanagari: 'माताजी', meaning: 'Respectful address for a mother or senior woman', category: 'general' },
  { word: 'maṇḍira', devanagari: 'मन्दिर', meaning: 'Temple; house of God', category: 'general' },
  { word: 'tīrtha', devanagari: 'तीर्थ', meaning: 'Holy place of pilgrimage', category: 'general' },
  { word: 'yajña', devanagari: 'यज्ञ', meaning: 'Sacrifice; worship; offering', category: 'general' },
  { word: 'dāna', devanagari: 'दान', meaning: 'Charity; giving in devotion', category: 'general' },
  { word: 'saṅkalpa', devanagari: 'सङ्कल्प', meaning: 'Solemn vow or intention; determination', category: 'general' },
  { word: 'vāṇī', devanagari: 'वाणी', meaning: 'Words; instructions (especially of the guru)', category: 'general' },
  { word: 'vapu', devanagari: 'वपु', meaning: 'Physical form; personal presence (especially of the guru)', category: 'general' },
  { word: 'sampradāya', devanagari: 'सम्प्रदाय', meaning: 'Authorized lineage; school of spiritual tradition', category: 'general' },
  { word: 'gaura', devanagari: 'गौर', meaning: 'Golden; referring to Lord Caitanya Mahāprabhu', category: 'general' },
  { word: 'nitya', devanagari: 'नित्य', meaning: 'Eternal; perpetual', category: 'general' },
]

const CUSTOM_WORDS_KEY = 'sloka_custom_word_bank'

export function loadCustomWords(): WordBankEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_WORDS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveCustomWords(words: WordBankEntry[]) {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words))
}

export function addCustomWord(word: string, meaning: string, category: WordCategory = 'general'): WordBankEntry[] {
  const custom = loadCustomWords()
  if (custom.some(w => w.word.toLowerCase() === word.toLowerCase().trim())) return custom
  const entry: WordBankEntry = { word: word.trim(), meaning, category }
  const updated = [...custom, entry]
  saveCustomWords(updated)
  return updated
}

export function removeCustomWord(word: string): WordBankEntry[] {
  const custom = loadCustomWords().filter(w => w.word.toLowerCase() !== word.toLowerCase().trim())
  saveCustomWords(custom)
  return custom
}

export function getAllWords(): WordBankEntry[] {
  return [...WORD_BANK, ...loadCustomWords()]
}
