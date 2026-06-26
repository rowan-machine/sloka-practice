import { useState } from 'react'

interface Rule {
  id: string
  title: string
  category: string
  rule: string
  examples: { sanskrit: string; pronunciation: string; explanation: string }[]
  tip?: string
}

const rules: Rule[] = [
  // ── Vowels ──
  {
    id: 'short-long',
    category: 'Vowels',
    title: 'Short vs Long Vowels',
    rule: 'Each vowel has a short and long form. Long vowels are held twice as long. Short: a, i, u, ṛ. Long: ā, ī, ū, ṝ. The vowels e, ai, o, au are always long.',
    examples: [
      { sanskrit: 'a vs ā', pronunciation: '"u" in "but" vs "a" in "father"', explanation: 'Short a is the most common vowel. Long ā is held longer.' },
      { sanskrit: 'i vs ī', pronunciation: '"i" in "pin" vs "ee" in "feet"', explanation: 'Short i is quick; long ī is sustained.' },
      { sanskrit: 'u vs ū', pronunciation: '"u" in "put" vs "oo" in "food"', explanation: 'Short u is like "put"; long ū like "food".' },
    ],
    tip: 'In IAST, a macron (line above) marks long vowels: ā, ī, ū. If you see no macron, it\'s short.'
  },
  {
    id: 'diphthongs',
    category: 'Vowels',
    title: 'Compound Vowels (e, ai, o, au)',
    rule: 'These four vowels are always long. "e" = a + i blended. "o" = a + u blended. "ai" = ā + i. "au" = ā + u.',
    examples: [
      { sanskrit: 'deva', pronunciation: 'DAY-va', explanation: '"e" is always long — like "ay" in "day"' },
      { sanskrit: 'kaivalya', pronunciation: 'kai-VAL-ya', explanation: '"ai" is long — like "ai" in "aisle"' },
      { sanskrit: 'go', pronunciation: 'go', explanation: '"o" is long — like "o" in "go"' },
      { sanskrit: 'gauḍīya', pronunciation: 'gau-DEE-ya', explanation: '"au" is long — like "ow" in "how"' },
    ],
  },
  {
    id: 'anusvara-visarga',
    category: 'Vowels',
    title: 'Anusvāra (ṁ) and Visarga (ḥ)',
    rule: 'Anusvāra (ṁ/ṃ) nasalizes the preceding vowel — like humming with lips closed. Visarga (ḥ) adds a soft echo of the preceding vowel with an "h" sound.',
    examples: [
      { sanskrit: 'saṁsāra', pronunciation: 'sam-SAA-ra', explanation: 'The ṁ nasalizes — lips close, sound goes through nose' },
      { sanskrit: 'duḥkha', pronunciation: 'duh-kha', explanation: 'Visarga adds a breathy "h" echo after the vowel' },
      { sanskrit: 'namaḥ', pronunciation: 'na-ma-ha', explanation: 'At end of word, visarga echoes the vowel: "ha"' },
    ],
    tip: 'Anusvāra before consonants takes on that consonant\'s nasal: ṁk = ṅk, ṁc = ñc, ṁt = nt, ṁp = mp.'
  },
  {
    id: 'ri-vowel',
    category: 'Vowels',
    title: 'The Vowel ṛ',
    rule: 'ṛ is a vowel, not a consonant! It\'s pronounced like "ri" in "crisp" — a quick, rolled "ri". Long ṝ is rare but held longer.',
    examples: [
      { sanskrit: 'kṛṣṇa', pronunciation: 'KRISH-ṇa', explanation: 'ṛ = "ri" — so kṛ = "kri"' },
      { sanskrit: 'hṛdaya', pronunciation: 'HRI-da-ya', explanation: 'hṛ = "hri" — the ṛ is a vowel forming its own syllable' },
      { sanskrit: 'ṛṣi', pronunciation: 'RI-shi', explanation: 'ṛ can begin a word — it\'s a full vowel' },
    ],
  },

  // ── Consonants ──
  {
    id: 'aspirates',
    category: 'Consonants',
    title: 'Aspirated Consonants (kh, gh, ch, jh, ...)',
    rule: 'An "h" after a consonant means a burst of air. kh, gh, ch, jh, ṭh, ḍh, th, dh, ph, bh — the "h" is NOT silent. It\'s the consonant + a puff of breath.',
    examples: [
      { sanskrit: 'kha', pronunciation: 'k-ha (like "ink-horn")', explanation: 'NOT "ka" — you must hear the breath after k' },
      { sanskrit: 'gha', pronunciation: 'g-ha (like "dog-house")', explanation: 'The h is a separate puff, not like English "gh"' },
      { sanskrit: 'bha', pronunciation: 'b-ha (like "club-house")', explanation: 'bh in Sanskrit ≠ English "bh" — it\'s b + breath' },
      { sanskrit: 'pha', pronunciation: 'p-ha (like "top-hat")', explanation: 'NOT "fa" — it\'s p with aspiration, not an f sound' },
    ],
    tip: 'English speakers often drop the aspiration. Practice by holding your hand in front of your mouth — you should feel a puff of air on aspirated consonants.'
  },
  {
    id: 'retroflexes',
    category: 'Consonants',
    title: 'Retroflex vs Dental (ṭ/t, ḍ/d, ṇ/n)',
    rule: 'Sanskrit has TWO sets of t/d/n sounds. Dental (t, d, n): tongue touches TEETH (like French/Spanish "t"). Retroflex (ṭ, ḍ, ṇ): tongue curls BACK to touch the roof of the mouth (like English "t" in "water").',
    examples: [
      { sanskrit: 'tava (dental)', pronunciation: 'Tongue tip touches back of upper teeth', explanation: 'Lighter, sharper than English "t"' },
      { sanskrit: 'paṭa (retroflex)', pronunciation: 'Tongue curls back to hard palate', explanation: 'More like the American English "t" in "butter"' },
      { sanskrit: 'kṛṣṇa', pronunciation: 'kṛṣ-ṇa', explanation: 'ṇ is retroflex n — tongue curled back' },
    ],
    tip: 'A dot under the letter (ṭ, ḍ, ṇ) = retroflex = tongue curls back. No dot = dental = tongue touches teeth.'
  },
  {
    id: 'sibilants',
    category: 'Consonants',
    title: 'Three "sh" sounds (ś, ṣ, s)',
    rule: 'Sanskrit has three distinct sibilants: ś (palatal) — like "sh" in "ship", tongue near hard palate. ṣ (retroflex) — tongue curled back, deeper "sh". s (dental) — like English "s" in "sun".',
    examples: [
      { sanskrit: 'śiva', pronunciation: 'SHEE-va (palatal sh)', explanation: 'ś — tongue raised toward palate, softer "sh"' },
      { sanskrit: 'kṛṣṇa', pronunciation: 'kṛṢ-ṇa (retroflex sh)', explanation: 'ṣ — tongue curled back, deeper sound' },
      { sanskrit: 'sarva', pronunciation: 'SAR-va (dental s)', explanation: 's — clean "s" like in English "sun"' },
    ],
    tip: 'ś and ṣ both sound like "sh" to English ears, but ṣ is deeper/heavier. Don\'t confuse either with plain s.'
  },
  {
    id: 'nasals',
    category: 'Consonants',
    title: 'Five Nasal Consonants',
    rule: 'Each mouth position has its own nasal: ṅ (velar, back of throat), ñ (palatal, middle), ṇ (retroflex, curled back), n (dental, teeth), m (labial, lips).',
    examples: [
      { sanskrit: 'aṅga', pronunciation: 'ANG-ga', explanation: 'ṅ before k/kh/g/gh — like "ng" in "sing"' },
      { sanskrit: 'pañca', pronunciation: 'PAN-cha', explanation: 'ñ before c/ch/j/jh — like "ny" in "canyon"' },
      { sanskrit: 'gaṇa', pronunciation: 'GA-ṇa', explanation: 'ṇ — retroflex n, tongue curled back' },
    ],
    tip: 'Each nasal matches its consonant group: ṅ+k-group, ñ+c-group, ṇ+ṭ-group, n+t-group, m+p-group.'
  },

  // ── Syllables & Meter ──
  {
    id: 'syllable-split',
    category: 'Syllables & Meter',
    title: 'How to Split Syllables',
    rule: 'A syllable = one vowel sound + surrounding consonants. When consonants sit between two vowels: the FIRST consonant stays with the preceding syllable (as its coda), and the remaining consonants begin the next syllable.',
    examples: [
      { sanskrit: 'bhakty-upahṛtam', pronunciation: 'bhak-tyu-pa-hṛ-tam', explanation: 'kty: k stays with "bhak", ty goes to next syllable' },
      { sanskrit: 'dharma', pronunciation: 'dhar-ma', explanation: 'rm: r stays with "dhar", m begins "ma"' },
      { sanskrit: 'kṛṣṇa', pronunciation: 'kṛṣ-ṇa', explanation: 'ṣṇ: ṣ stays with first syllable, ṇ begins second' },
    ],
    tip: 'Exception: if only ONE consonant is between two vowels, it always starts the next syllable: de-va, not dev-a.'
  },
  {
    id: 'guru-laghu',
    category: 'Syllables & Meter',
    title: 'Guru (Heavy) vs Laghu (Light) Syllables',
    rule: 'A syllable is GURU (heavy, —) if: (1) it contains a long vowel (ā, ī, ū, e, ai, o, au), or (2) it ends in a consonant before another consonant (position makes heavy), or (3) it ends in anusvāra (ṁ) or visarga (ḥ). Otherwise it is LAGHU (light, ◡).',
    examples: [
      { sanskrit: 'rā-ma', pronunciation: '— ◡', explanation: 'rā = guru (long ā); ma = laghu (short a, open)' },
      { sanskrit: 'dhar-ma', pronunciation: '— ◡', explanation: 'dhar = guru (ends in consonant r before m); ma = laghu' },
      { sanskrit: 'sa-tāṁ', pronunciation: '◡ —', explanation: 'sa = laghu (short a); tāṁ = guru (long ā + anusvāra)' },
    ],
    tip: 'Toggle "Meter marks" (◡—) in the verse display to see guru/laghu under each syllable!'
  },
  {
    id: 'anushtubh',
    category: 'Syllables & Meter',
    title: 'Anuṣṭubh Meter (8 syllables)',
    rule: 'The most common Vedic meter. Each quarter-verse (pāda) has exactly 8 syllables. The 2nd and 3rd pādas have a fixed pattern in positions 5-6-7: pāda 2 = ◡——, pāda 4 = ◡—◡. Bhagavad-gītā is entirely in Anuṣṭubh.',
    examples: [
      { sanskrit: 'sar-va-dhar-mān pa-ri-tya-jya', pronunciation: '8 syllables per pāda', explanation: 'Count: sar(1) va(2) dhar(3) mān(4) pa(5) ri(6) tya(7) jya(8)' },
    ],
    tip: 'When chanting, each pāda gets one melodic phrase. Pause slightly between pādas 2 and 3 (the half-verse break).'
  },

  // ── Sandhi ──
  {
    id: 'sandhi-basics',
    category: 'Sandhi (Sound Joining)',
    title: 'What is Sandhi?',
    rule: 'Sandhi (सन्धि) literally means "joining" or "connection." It\'s the set of rules that govern how sounds change when words or word parts meet. Just like in English we say "don\'t" instead of "do not," Sanskrit systematically merges sounds at word boundaries. This is why a single written word in Sanskrit can contain 2-5 original words fused together.',
    examples: [
      { sanskrit: 'namo namaḥ', pronunciation: 'from namaḥ + namaḥ', explanation: 'The final aḥ of the first word changes to "o" before the "n" of the next word — this IS sandhi in action' },
      { sanskrit: 'māmekam', pronunciation: 'from mām + ekam', explanation: 'When m ends a word and the next starts with a vowel, they flow together' },
      { sanskrit: 'paritrāṇāya', pronunciation: 'pari + trāṇa + āya', explanation: 'INSIDE compounds, the parts fuse: trāṇa + āya → trāṇāya (a + ā = ā)' },
    ],
    tip: 'Sandhi happens at two levels: between separate words (external sandhi) and inside compound words (internal sandhi). The rules are the same — sounds merge when they meet.'
  },
  {
    id: 'sandhi-why',
    category: 'Sandhi (Sound Joining)',
    title: 'Why Does Sandhi Exist?',
    rule: 'Sanskrit was primarily an oral language. Sandhi makes speech flow smoothly — eliminating awkward pauses and clashing sounds between words. When you chant a śloka, the sandhi is what makes it musical and rhythmic rather than choppy. Every śloka you practice already has sandhi applied — understanding it helps you see the original words inside.',
    examples: [
      { sanskrit: 'bhava + arjuna = bhavārjuna', pronunciation: 'bha-VAAR-ju-na', explanation: 'Without sandhi you\'d have to stop between "bhava" and "arjuna" — sandhi makes it flow' },
      { sanskrit: 'iti + uvāca = ityuvāca', pronunciation: 'i-TYU-vaa-cha', explanation: 'The i transforms to y before a vowel, creating smooth flow' },
    ],
    tip: 'When chanting, you\'re already doing sandhi naturally! The written form just reflects what the mouth does automatically.'
  },
  {
    id: 'vowel-sandhi',
    category: 'Sandhi (Sound Joining)',
    title: 'Vowel Sandhi: Same Vowels Merge',
    rule: 'When the same vowel meets itself, short + short or short + long, they merge into the long version. a + a = ā. i + i = ī. u + u = ū. This is the most common sandhi rule.',
    examples: [
      { sanskrit: 'ca + api = cāpi', pronunciation: 'CHAA-pi', explanation: 'a + a = ā — "and also" becomes one flowing word' },
      { sanskrit: 'iti + iha = itīha', pronunciation: 'i-TEE-ha', explanation: 'i + i = ī — two short i\'s merge to one long ī' },
      { sanskrit: 'sādhu + ukta = sādhūkta', pronunciation: 'saa-DHOOK-ta', explanation: 'u + u = ū — "well said"' },
      { sanskrit: 'mahā + ātmā = mahātmā', pronunciation: 'ma-HAAT-maa', explanation: 'ā + ā = ā — the two ā\'s merge into one' },
    ],
    tip: 'This is the easiest sandhi rule: same vowels combine into the long version. Think of it as two sounds melting into one.'
  },
  {
    id: 'vowel-sandhi-diff',
    category: 'Sandhi (Sound Joining)',
    title: 'Vowel Sandhi: Different Vowels',
    rule: 'When "a/ā" meets a different vowel, they transform: a/ā + i/ī = e. a/ā + u/ū = o. a/ā + ṛ = ar. a/ā + e = ai. a/ā + o = au. The "a" absorbs into the other vowel.',
    examples: [
      { sanskrit: 'ca + iti = ceti', pronunciation: 'CHAY-ti', explanation: 'a + i = e — "and thus"' },
      { sanskrit: 'na + iti = neti', pronunciation: 'NAY-ti', explanation: 'a + i = e — "not thus" (the famous neti neti)' },
      { sanskrit: 'mahā + īśvara = maheśvara', pronunciation: 'ma-HAY-shva-ra', explanation: 'ā + ī = e — "great Lord"' },
      { sanskrit: 'sa + uvāca = sovāca', pronunciation: 'so-VAA-cha', explanation: 'a + u = o — "he said"' },
      { sanskrit: 'mama + ṛṣi = mamarṣi', pronunciation: 'ma-MAR-shi', explanation: 'a + ṛ = ar' },
    ],
    tip: 'The pattern: a/ā is a "chameleon" — it blends with whatever vowel comes next. Once you memorize these 5 combinations, you can read most sandhi.'
  },
  {
    id: 'semivowel-sandhi',
    category: 'Sandhi (Sound Joining)',
    title: 'Vowel Sandhi: Semivowel Conversion',
    rule: 'When i/ī, u/ū, or ṛ come before a DIFFERENT vowel, they convert to their semivowel: i/ī → y. u/ū → v. ṛ → r. This lets the next vowel sound clearly.',
    examples: [
      { sanskrit: 'iti + uvāca = ityuvāca', pronunciation: 'i-TYU-vaa-cha', explanation: 'i before u: i → y — "thus he said"' },
      { sanskrit: 'madhu + ari = madhvari', pronunciation: 'madh-VA-ri', explanation: 'u before a: u → v — "enemy of the demon Madhu"' },
      { sanskrit: 'pitṛ + ānām = pitrāṇām', pronunciation: 'pi-TRAA-ṇaam', explanation: 'ṛ before ā: ṛ → r — "of the fathers"' },
    ],
    tip: 'The semivowels y, v, r are the "glide" forms of i, u, ṛ. They let you smoothly slide into the next vowel.'
  },
  {
    id: 'visarga-sandhi',
    category: 'Sandhi (Sound Joining)',
    title: 'Visarga Sandhi (ḥ Changes)',
    rule: 'Visarga (ḥ) is the most changeable sound. Its behavior depends on what follows: Before voiceless k/kh, p/ph → stays as ḥ. Before voiced consonants (g, j, d, b, n, m, y, r, l, v) → aḥ becomes "o", other vowel + ḥ becomes "r". Before a- → aḥ drops, vowels merge. Before ś/ṣ/s → becomes that same sibilant.',
    examples: [
      { sanskrit: 'namaḥ + te = namaste', pronunciation: 'na-MA-stay', explanation: 'aḥ before t (voiceless) → becomes s' },
      { sanskrit: 'devaḥ + gacchati = devo gacchati', pronunciation: 'DAY-vo GACH-cha-ti', explanation: 'aḥ before voiced g → becomes o' },
      { sanskrit: 'śrīḥ + ca = śrīś ca', pronunciation: 'shreeś cha', explanation: 'ḥ before c → becomes ś (palatal sibilant)' },
      { sanskrit: 'guruḥ + vadati = gurur vadati', pronunciation: 'gu-RUR va-da-ti', explanation: 'uḥ before voiced v → becomes ur (r replaces visarga)' },
    ],
    tip: 'The word "namaḥ" is the perfect example: namaḥ alone keeps the ḥ, but in "namo namaḥ" the first one changes to "o" before the voiced "n". That\'s why you see both forms!'
  },
  {
    id: 'consonant-sandhi',
    category: 'Sandhi (Sound Joining)',
    title: 'Consonant Sandhi',
    rule: 'Final consonants change to match what follows. Final t before voiced sounds becomes d (tat + eva = tadeva). Before j/ś it becomes c (tat + śṛṇu = tacchṛṇu). Final n before c/t becomes ṁś/ṁs. These changes make pronunciation smoother.',
    examples: [
      { sanskrit: 'tat + eva = tadeva', pronunciation: 'ta-DAY-va', explanation: 'Final t voices to d before the vowel e' },
      { sanskrit: 'bhagavat + gītā = bhagavad-gītā', pronunciation: 'BHA-ga-vad GEE-taa', explanation: 'Final t voices to d before voiced g — hence "Bhagavad-gītā"!' },
      { sanskrit: 'sat + cit = sac-cit', pronunciation: 'SACH-chit', explanation: 'Final t before c becomes c — doubles to cc' },
    ],
    tip: 'Notice "Bhagavad-gītā" — it\'s bhagavat (the Lord) + gītā (song). The t → d change IS consonant sandhi. You already know this word!'
  },
  {
    id: 'sandhi-reading',
    category: 'Sandhi (Sound Joining)',
    title: 'How to "Undo" Sandhi When Reading',
    rule: 'To find the original words in a sandhi-ed form: (1) Look for hyphens — they mark compound joints. (2) When you see "o" before a voiced consonant, try replacing with "aḥ". (3) When you see e/ai/o/au between consonants, try splitting as a/ā + i/u. (4) Use the word glossary (tap words in the verse) to see individual meanings.',
    examples: [
      { sanskrit: 'nānyat → na + anyat', pronunciation: '"not other"', explanation: 'The ā comes from a + a merging' },
      { sanskrit: 'evaiṣyasi → eva + eṣyasi', pronunciation: '"certainly you will come"', explanation: 'a + e = ai — split the ai back into a + e' },
      { sanskrit: 'māmevaiṣyasi → mām + eva + eṣyasi', pronunciation: '"to Me certainly you will come"', explanation: 'Multiple sandhis chained: m+e flow, a+e=ai' },
    ],
    tip: 'Don\'t try to memorize every rule at once. Start by recognizing sandhi in the verses you practice — over time the patterns become automatic.'
  },

  // ── Practical Tips ──
  {
    id: 'stress',
    category: 'Practical Tips',
    title: 'Where to Put Stress',
    rule: 'Sanskrit doesn\'t have English-style word stress. Instead, keep all syllables relatively even, but naturally heavy (guru) syllables take slightly more time. In chanting, the METER determines the rhythm, not word stress.',
    examples: [
      { sanskrit: 'bhagavān', pronunciation: 'bha-ga-VAAN', explanation: 'The long ā naturally draws more time — this is not "stress" but weight' },
    ],
    tip: 'Don\'t stress syllables like English. Let the length of the vowels create the natural rhythm.'
  },
  {
    id: 'compound-words',
    category: 'Practical Tips',
    title: 'Reading Compound Words',
    rule: 'Sanskrit loves compounds. A long word is often 2-4 smaller words joined. Hyphens in IAST mark the joints. Read each part separately first, then flow them together.',
    examples: [
      { sanskrit: 'sat-cid-ānanda', pronunciation: 'sat + cit + ānanda', explanation: 'Three words: being + consciousness + bliss' },
      { sanskrit: 'sarva-dharmān', pronunciation: 'sarva + dharmān', explanation: 'Two words: all + dharmas' },
      { sanskrit: 'paritrāṇāya', pronunciation: 'pari + trāṇa + āya', explanation: 'Prefix + root + case ending' },
    ],
    tip: 'When you see a long word, look for hyphens first. If none, look for familiar roots inside it.'
  },
  {
    id: 'common-mistakes',
    category: 'Practical Tips',
    title: 'Common English-Speaker Mistakes',
    rule: 'Watch out for these frequent errors: (1) Saying "pha" as "fa" — it\'s p+h, not f. (2) Ignoring retroflex dots — ṭ ≠ t. (3) Making short "a" too long. (4) Dropping aspiration on kh/gh/bh etc. (5) Saying visarga ḥ as hard "h".',
    examples: [
      { sanskrit: 'phala', pronunciation: 'p-ha-la, NOT fa-la', explanation: 'ph = p + breath, never "f"' },
      { sanskrit: 'guru', pronunciation: 'gu-ru (short u\'s!)', explanation: 'NOT "goo-roo" — both u\'s are SHORT' },
      { sanskrit: 'a (in sarva)', pronunciation: 'Like "u" in "but"', explanation: 'Short a is NOT "ah" — it\'s a quick, neutral vowel' },
    ],
    tip: 'The #1 mistake: treating short "a" like English "ah". Sanskrit short "a" is the most reduced vowel — like the "u" in "but".'
  },
]

const categories = [...new Set(rules.map(r => r.category))]

const categoryIcons: Record<string, string> = {
  'Vowels': '🔤',
  'Consonants': '🗣️',
  'Syllables & Meter': '📏',
  'Sandhi (Sound Joining)': '🔗',
  'Practical Tips': '💡',
}

export default function PronunciationGuide({ onBack }: { onBack: () => void }) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0])

  const filteredRules = rules.filter(r => r.category === activeCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-nav border-b border-gray-200/60 px-3 py-2 md:px-6 md:py-3 safe-top">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="chip chip-inactive">← Back</button>
            <h1 className="text-lg font-bold text-purple-900">Pronunciation Rules</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 pb-24">
        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">
            Learn the rules behind Sanskrit pronunciation so you can read <em>any</em> word correctly — not just from memory. 
            Each rule has examples you can study. Use these alongside your śloka practice.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? 'chip-active' : 'chip-inactive'}`}
            >
              {categoryIcons[cat] || '📖'} {cat}
            </button>
          ))}
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {filteredRules.map(rule => {
            const isExpanded = expandedRule === rule.id
            return (
              <div
                key={rule.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{rule.title}</h3>
                    {!isExpanded && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{rule.rule}</p>
                    )}
                  </div>
                  <span className={`text-gray-400 text-xs shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* The rule */}
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <p className="text-sm text-purple-900 leading-relaxed">{rule.rule}</p>
                    </div>

                    {/* Examples */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Examples</h4>
                      {rule.examples.map((ex, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                          <div className="shrink-0 min-w-[90px]">
                            <span className="font-serif text-sm font-semibold text-gray-800">{ex.sanskrit}</span>
                            <div className="text-[11px] text-purple-600 font-medium mt-0.5">{ex.pronunciation}</div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{ex.explanation}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tip */}
                    {rule.tip && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-amber-600 shrink-0">💡</span>
                        <p className="text-xs text-amber-800 leading-relaxed">{rule.tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
