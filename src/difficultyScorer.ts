// Per-user pronunciation difficulty scorer for Sanskrit verses
// Difficulty is dynamic — it adapts based on the user's known words and sound mastery

import { type KnownWord, type SoundScore, extractSoundsFromWord, isWordKnown, getAccuracy } from './sanskritSounds'
import { type Difficulty } from './slokaLibrary'

export interface UserDifficulty {
  score: number                    // 0-100, lower = easier FOR THIS USER
  difficulty: Difficulty
  knownWordCount: number           // how many words in the verse the user already knows
  totalWords: number
  knownRatio: number               // 0-1
  weakSoundCount: number           // how many sounds in the verse the user is weak at
  strongSoundCount: number         // how many sounds the user has mastered
  newSoundCount: number            // sounds the user hasn't practiced at all
}

// Get all unique words from a verse (split on whitespace and hyphens)
function getVerseWords(text: string): string[] {
  return text
    .replace(/[।॥\n]/g, ' ')
    .split(/[\s]+/)
    .filter(w => w.length > 0)
    .flatMap(w => w.includes('-') ? [w, ...w.split('-').filter(p => p.length > 0)] : [w])
}

// Score how difficult a verse is FOR THIS SPECIFIC USER
export function getUserDifficulty(
  text: string,
  knownWords: KnownWord[],
  soundScores: Record<string, SoundScore>
): UserDifficulty {
  const words = getVerseWords(text)
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))]

  // How many words does the user already know?
  let knownCount = 0
  for (const w of uniqueWords) {
    if (isWordKnown(knownWords, w)) knownCount++
  }
  const knownRatio = uniqueWords.length > 0 ? knownCount / uniqueWords.length : 0

  // What sound categories appear in this verse?
  const verseSounds = new Set<string>()
  for (const w of uniqueWords) {
    for (const catId of extractSoundsFromWord(w)) {
      verseSounds.add(catId)
    }
  }

  // Classify each sound category as strong (≥70% accuracy), weak (<50%), or new (no data)
  let strongCount = 0
  let weakCount = 0
  let newCount = 0
  for (const catId of verseSounds) {
    const score = soundScores[catId]
    if (!score || (score.correct + score.close + score.wrong) === 0) {
      newCount++
    } else {
      const acc = getAccuracy(score)
      if (acc >= 70) strongCount++
      else if (acc < 50) weakCount++
    }
  }

  // Compute user-specific difficulty score (0-100)
  // Start at 50 (neutral), adjust based on user's strengths
  let score = 50

  // Known words make it easier (up to -30 points)
  score -= knownRatio * 30

  // Strong sounds make it easier (up to -15 points)
  const soundTotal = verseSounds.size || 1
  score -= (strongCount / soundTotal) * 15

  // Weak sounds make it harder (+20 points)
  score += (weakCount / soundTotal) * 20

  // New/unpracticed sounds add moderate difficulty (+10 points)
  score += (newCount / soundTotal) * 10

  // Intrinsic phonetic complexity — count hard-to-pronounce features
  const lower = text.toLowerCase()
  const intrinsicHard = countIntrinsicDifficulty(lower)
  // Intrinsic difficulty adds up to +25 points but is reduced by user mastery
  const intrinsicContribution = intrinsicHard * (1 - knownRatio * 0.5)
  score += Math.min(intrinsicContribution, 25)

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  // Map to difficulty label
  let difficulty: Difficulty
  if (score <= 35) difficulty = 'easy'
  else if (score <= 48) difficulty = 'easy-medium'
  else if (score <= 60) difficulty = 'medium'
  else if (score <= 75) difficulty = 'medium-hard'
  else difficulty = 'hard'

  return {
    score: Math.round(score),
    difficulty,
    knownWordCount: knownCount,
    totalWords: uniqueWords.length,
    knownRatio: Math.round(knownRatio * 100) / 100,
    weakSoundCount: weakCount,
    strongSoundCount: strongCount,
    newSoundCount: newCount,
  }
}

// Count intrinsic phonetic features that are hard regardless of user
function countIntrinsicDifficulty(lower: string): number {
  let score = 0
  // Retroflexes
  for (const ch of ['ṭ', 'ḍ', 'ṇ']) {
    score += countChar(lower, ch) * 1.5
  }
  // Conjuncts
  for (const pat of ['kṣ', 'jñ', 'ṣṭ', 'ṣṇ', 'dbh', 'ṅk', 'ñc', 'ñj']) {
    score += countChar(lower, pat) * 2
  }
  // Sibilant distinctions
  for (const ch of ['ś', 'ṣ']) {
    score += countChar(lower, ch) * 0.8
  }
  // Visarga
  score += countChar(lower, 'ḥ') * 1
  // Special vowels
  for (const ch of ['ṛ', 'ṝ', 'ḷ']) {
    score += countChar(lower, ch) * 1.2
  }
  // Normalize by verse length (per 100 chars)
  const len = lower.replace(/[\s\n]/g, '').length || 1
  return (score / len) * 40
}

function countChar(text: string, pattern: string): number {
  let count = 0
  let idx = 0
  while ((idx = text.indexOf(pattern, idx)) !== -1) {
    count++
    idx += pattern.length
  }
  return count
}
