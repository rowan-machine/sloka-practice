import React, { useState, useRef, useEffect } from 'react'
import { soundCategories, extractSoundsFromWord, type SoundCategory, type SoundScore, type KnownWord, type WordStats, saveScores, getAccuracy, recordResult, addKnownWord, removeKnownWord, isWordKnown, getKnownSoundCoverage, devanagariToRoman } from './sanskritSounds'
import { getStoredApiKey, getStoredVoiceId } from './Settings'

interface SoundPracticeProps {
  scores: Record<string, SoundScore>
  setScores: (scores: Record<string, SoundScore>) => void
  knownWords: KnownWord[]
  setKnownWords: (words: KnownWord[]) => void
  wordStats: Record<string, WordStats>
}

// Highlight the parts of a word that match sounds in a given category
function highlightWordForCategory(word: string, cat: SoundCategory): React.ReactElement {
  const lower = word.toLowerCase()
  const highlights = new Set<number>()
  for (const sound of cat.sounds) {
    let idx = 0
    while ((idx = lower.indexOf(sound, idx)) !== -1) {
      for (let i = 0; i < sound.length; i++) highlights.add(idx + i)
      idx += sound.length
    }
  }
  if (highlights.size === 0) return <>{word}</>

  const spans: React.ReactElement[] = []
  let i = 0
  while (i < word.length) {
    if (highlights.has(i)) {
      let j = i
      while (j < word.length && highlights.has(j)) j++
      spans.push(
        <span key={i} className="bg-purple-200 text-purple-900 rounded px-0.5 font-bold">
          {word.slice(i, j)}
        </span>
      )
      i = j
    } else {
      let j = i
      while (j < word.length && !highlights.has(j)) j++
      spans.push(<span key={i} className="text-gray-600">{word.slice(i, j)}</span>)
      i = j
    }
  }
  return <>{spans}</>
}

export default function SoundPractice({ scores, setScores, knownWords, setKnownWords, wordStats }: SoundPracticeProps) {
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | null>(null)
  const [practiceWord, setPracticeWord] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [wordResult, setWordResult] = useState<'green' | 'yellow' | 'red' | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingWord, setSpeakingWord] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  useEffect(() => { isListeningRef.current = isListening }, [isListening])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognition.onresult = (event: any) => {
      const rawResult = event.results[0][0].transcript.trim().toLowerCase()
      // Also try the romanized version if browser returned Devanagari
      const romanResult = devanagariToRoman(rawResult).toLowerCase()
      const result = romanResult !== rawResult ? romanResult : rawResult
      setTranscript(result)
      if (practiceWord) {
        // Compare against both raw and romanized transcripts, take the best
        const sim1 = compareSimple(practiceWord, rawResult)
        const sim2 = romanResult !== rawResult ? compareSimple(practiceWord, romanResult) : 0
        const similarity = Math.max(sim1, sim2)
        const status = similarity >= 0.65 ? 'green' : similarity >= 0.35 ? 'yellow' : 'red'
        setWordResult(status)
        const updated = recordResult(scores, practiceWord, status)
        setScores(updated)
        saveScores(updated)
        if (status === 'green') {
          setKnownWords(addKnownWord(knownWords, practiceWord))
        }
      }
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => { try { recognition.stop() } catch (_) {} }
  }, [practiceWord, scores, setScores, knownWords, setKnownWords, wordStats])

  const normalize = (s: string) => s.toLowerCase()
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

  // Phonetic normalization — collapse sounds that speech recognition confuses
  const phoneticNorm = (s: string) => s
    .replace(/sh/g, 's').replace(/ch/g, 'c').replace(/th/g, 't').replace(/ph/g, 'p')
    .replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/dh/g, 'd').replace(/bh/g, 'b')
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')
    .replace(/y/g, 'i').replace(/w/g, 'v')
    .replace(/[aeiou]+/g, m => m[0]) // collapse repeated vowels to one

  const compareSimple = (expected: string, spoken: string): number => {
    const a = normalize(expected)
    const b = normalize(spoken)
    if (a === b) return 1
    const dist = levenshtein(a, b)
    const maxLen = Math.max(a.length, b.length)
    const basicSim = maxLen > 0 ? 1 - dist / maxLen : 1

    // Also try phonetic comparison for better tolerance of speech recognition quirks
    const pa = phoneticNorm(a)
    const pb = phoneticNorm(b)
    const pDist = levenshtein(pa, pb)
    const pMax = Math.max(pa.length, pb.length)
    const phoneticSim = pMax > 0 ? 1 - pDist / pMax : 1

    // Also try if spoken text contains the expected word (speech recognition sometimes adds extra words)
    const words = b.split(/\s+/)
    let bestWordSim = 0
    for (const w of words) {
      const wDist = levenshtein(a, w)
      const wMax = Math.max(a.length, w.length)
      const wSim = wMax > 0 ? 1 - wDist / wMax : 1
      if (wSim > bestWordSim) bestWordSim = wSim
      // Also phonetic per-word
      const pw = phoneticNorm(w)
      const pwDist = levenshtein(pa, pw)
      const pwMax = Math.max(pa.length, pw.length)
      const pwSim = pwMax > 0 ? 1 - pwDist / pwMax : 1
      if (pwSim > bestWordSim) bestWordSim = pwSim
    }

    return Math.max(basicSim, phoneticSim, bestWordSim)
  }

  const startPractice = (word: string) => {
    setPracticeWord(word)
    setWordResult(null)
    setTranscript('')
  }

  const speakWord = async (word: string) => {
    setIsSpeaking(true)
    setSpeakingWord(word)
    const done = () => { setIsSpeaking(false); setSpeakingWord(null) }

    // Try user's local ElevenLabs key first
    const userKey = getStoredApiKey()
    if (userKey) {
      try {
        const voiceId = getStoredVoiceId()
        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': userKey },
          body: JSON.stringify({ text: word, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.75 } })
        })
        if (resp.ok) {
          const blob = await resp.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.onended = done
          await audio.play()
          return
        }
      } catch { /* try server */ }
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
        audio.onended = done
        await audio.play()
        return
      }
    } catch { /* server unavailable */ }

    // Browser fallback
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word)
      utter.lang = 'hi-IN'
      utter.rate = 0.8
      utter.onend = done
      speechSynthesis.speak(utter)
    } else { done() }
  }

  const listen = () => {
    if (recognitionRef.current) {
      setIsListening(true); setWordResult(null); setTranscript('')
      try { recognitionRef.current.start() } catch (_) {}
    }
  }

  const getScoreColor = (accuracy: number) => {
    if (accuracy < 0) return 'text-gray-400'
    if (accuracy >= 80) return 'text-green-600'
    if (accuracy >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }
  const getScoreBg = (accuracy: number) => {
    if (accuracy < 0) return 'bg-gray-50 border-gray-200'
    if (accuracy >= 80) return 'bg-green-50 border-green-200'
    if (accuracy >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-green-500'
    if (accuracy >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getKnownWordsForCategory = (cat: SoundCategory): KnownWord[] => {
    return knownWords.filter(kw => extractSoundsFromWord(kw.word).includes(cat.id))
  }

  const coverage = getKnownSoundCoverage(knownWords)

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 px-3 pt-3 pb-24 md:p-8 md:pb-24">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-purple-900 leading-tight">Sanskrit Sounds <span className="text-base font-normal text-gray-400">वर्णमाला</span></h1>
            <p className="text-xs text-gray-400 mt-0.5">Tap a category to practice pronunciation</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-purple-700">{soundCategories.filter(c => { const s = scores[c.id]; return s && getAccuracy(s) >= 80 }).length}/{soundCategories.length}</div>
            <div className="text-[10px] text-gray-400">mastered</div>
          </div>
        </header>

        {/* ═══════ OVERVIEW ═══════ */}
        {!selectedCategory && (
          <div>
            {/* Sound category cards */}
            <div className="grid gap-3 md:grid-cols-2">
              {soundCategories.map(cat => {
                const score = scores[cat.id]
                const accuracy = score ? getAccuracy(score) : -1
                const total = score ? score.correct + score.close + score.wrong : 0
                const catKnown = getKnownWordsForCategory(cat)
                const knownCount = coverage[cat.id] || 0

                return (
                  <div key={cat.id} className={`rounded-2xl border overflow-hidden transition-all active:scale-[0.98] ${getScoreBg(accuracy)}`}>
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full text-left p-3.5 hover:bg-white/50 transition-colors"
                    >
                      {/* Top row: devanagari badge + name + score */}
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xl w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-800 rounded-xl font-bold shrink-0">{cat.devanagari.split(' ')[0]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-800 text-sm truncate">{cat.name}</span>
                            {total > 0 ? (
                              <span className={`text-sm font-bold shrink-0 ${getScoreColor(accuracy)}`}>{accuracy}%</span>
                            ) : (
                              <span className="text-[10px] text-gray-300 shrink-0">NEW</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${getBarColor(accuracy)}`} style={{ width: `${accuracy < 0 ? 0 : accuracy}%` }} />
                            </div>
                            {knownCount > 0 && (
                              <span className="text-[10px] text-green-600 font-medium shrink-0">✓{knownCount}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Practice CTA */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-gray-400 truncate pr-2">{total > 0 ? `${total} attempts` : 'Tap to start'}</span>
                        <span className="shrink-0 px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg">Practice</span>
                      </div>
                    </button>

                    {/* Known words preview */}
                    {catKnown.length > 0 && (
                      <div className="px-3.5 pb-2.5 border-t border-gray-100/50">
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {catKnown.slice(0, 6).map((kw, i) => (
                            <button
                              key={i}
                              onClick={() => speakWord(kw.word)}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-serif border transition-all cursor-pointer ${
                                speakingWord === kw.word ? 'bg-purple-100 border-purple-300 scale-105' : 'bg-white/80 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                              }`}
                              title={`Click to hear "${kw.word}"`}
                            >
                              <span className="text-[10px] opacity-40">🔊</span>
                              {highlightWordForCategory(kw.word, cat)}
                            </button>
                          ))}
                          {catKnown.length > 6 && (
                            <span className="self-center text-[10px] text-gray-400">+{catKnown.length - 6}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════ CATEGORY DETAIL ═══════ */}
        {selectedCategory && (
          <div>
            <button
              onClick={() => { setSelectedCategory(null); setPracticeWord(null); setWordResult(null) }}
              className="mb-4 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >← All Categories</button>

            {/* Category header */}
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedCategory.name}
                    <span className="ml-2 text-2xl">{selectedCategory.devanagari}</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedCategory.description}</p>
                </div>
                {(() => {
                  const score = scores[selectedCategory.id]
                  const accuracy = score ? getAccuracy(score) : -1
                  const total = score ? score.correct + score.close + score.wrong : 0
                  if (total === 0) return null
                  return (
                    <div className={`text-center px-4 py-2 rounded-xl ${getScoreBg(accuracy)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(accuracy)}`}>{accuracy}%</div>
                      <div className="text-xs text-gray-500">{total} attempts</div>
                    </div>
                  )
                })()}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <span className="text-amber-800 text-sm font-medium">💡 Common Mistake: </span>
                <span className="text-amber-700 text-sm">{selectedCategory.commonConfusions}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs text-gray-500 self-center">Sounds:</span>
                {selectedCategory.sounds.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-mono font-bold text-lg">{s}</span>
                ))}
              </div>
            </section>

            {/* Known words for this category */}
            {(() => {
              const catKnown = getKnownWordsForCategory(selectedCategory)
              if (catKnown.length === 0) return null
              return (
                <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">
                    Your Known Words <span className="text-sm font-normal text-green-600">({catKnown.length})</span>
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    <span className="bg-purple-200 text-purple-900 rounded px-1 font-bold">Highlighted</span> parts show the sounds from this category. Click to hear.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catKnown.map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => speakWord(kw.word)}
                        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-serif border transition-all ${
                          speakingWord === kw.word ? 'bg-purple-100 border-purple-300 scale-105' : 'bg-green-50 border-green-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <span className="text-xs opacity-40 group-hover:opacity-70">🔊</span>
                        {highlightWordForCategory(kw.word, selectedCategory)}
                        <button
                          onClick={e => { e.stopPropagation(); setKnownWords(removeKnownWord(knownWords, kw.word)) }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-xs"
                          title="Remove"
                        >✕</button>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })()}

            {/* Practice words — both example words and any unknown words to learn */}
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Practice Words</h4>
              <div className="space-y-3">
                {selectedCategory.exampleWords.map((ew, idx) => {
                  const isActive = practiceWord === ew.word
                  const known = isWordKnown(knownWords, ew.word)
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isActive ? 'border-purple-400 bg-purple-50' :
                        known ? 'border-green-200 bg-green-50/50' :
                        'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-2xl font-serif font-bold">
                            {highlightWordForCategory(ew.word, selectedCategory)}
                          </span>
                          {known && <span className="ml-2 text-xs text-green-600 font-medium">✓ known</span>}
                          <span className="ml-3 text-sm text-gray-500 italic">{ew.meaning}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => speakWord(ew.word)}
                            disabled={isSpeaking}
                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                          >{isSpeaking && speakingWord === ew.word ? '⏳' : '🔊'} Listen</button>
                          <button
                            onClick={() => { startPractice(ew.word); listen() }}
                            disabled={isListening}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                              isListening && isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >🎤 Say it</button>
                        </div>
                      </div>

                      {isActive && wordResult && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          wordResult === 'green' ? 'bg-green-100 text-green-800' :
                          wordResult === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <span className="font-bold">
                            {wordResult === 'green' ? '✓ Correct! Added to known words.' :
                             wordResult === 'yellow' ? '≈ Close — try again' :
                             '✗ Not quite — listen and try again'}
                          </span>
                          {transcript && <span className="ml-2 text-sm opacity-75">(heard: "{devanagariToRoman(transcript)}")</span>}
                        </div>
                      )}

                      {isActive && isListening && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> Listening...
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Score history */}
            {(() => {
              const score = scores[selectedCategory.id]
              if (!score || score.correct + score.close + score.wrong === 0) return null
              return (
                <section className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">Score Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-xl"><div className="text-xl font-bold text-green-600">{score.correct}</div><div className="text-xs text-gray-500">Correct</div></div>
                    <div className="text-center p-3 bg-yellow-50 rounded-xl"><div className="text-xl font-bold text-yellow-600">{score.close}</div><div className="text-xs text-gray-500">Close</div></div>
                    <div className="text-center p-3 bg-red-50 rounded-xl"><div className="text-xl font-bold text-red-600">{score.wrong}</div><div className="text-xs text-gray-500">Incorrect</div></div>
                  </div>
                  {score.history.length > 1 && (() => {
                    const points = score.history.slice().reverse() // oldest first
                    const chartW = 280
                    const chartH = 80
                    const padX = 30
                    const padY = 14
                    const w = chartW - padX * 2
                    const h = chartH - padY * 2
                    const coords = points.map((p, i) => ({
                      x: padX + (points.length > 1 ? (i / (points.length - 1)) * w : w / 2),
                      y: padY + h - (p.score / 100) * h,
                      score: p.score,
                      date: new Date(p.date).toLocaleDateString()
                    }))
                    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
                    const areaPath = linePath + ` L${coords[coords.length - 1].x},${padY + h} L${coords[0].x},${padY + h} Z`
                    const latest = points[points.length - 1].score
                    const first = points[0].score
                    const trend = latest - first
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-sm font-medium text-gray-500">Accuracy Over Time</h5>
                          <span className={`text-xs font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% {trend > 0 ? 'improvement' : trend < 0 ? 'decline' : 'stable'}
                          </span>
                        </div>
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: '100px' }}>
                          {/* Grid lines */}
                          {[0, 25, 50, 75, 100].map(v => {
                            const y = padY + h - (v / 100) * h
                            return (
                              <g key={v}>
                                <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray={v === 0 || v === 100 ? '' : '2,2'} />
                                <text x={padX - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#9ca3af">{v}%</text>
                              </g>
                            )
                          })}
                          {/* Area fill */}
                          <path d={areaPath} fill="url(#accuracyGrad)" opacity="0.3" />
                          {/* Line */}
                          <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          {/* Dots */}
                          {coords.map((c, i) => (
                            <g key={i}>
                              <circle cx={c.x} cy={c.y} r="3" fill={c.score >= 80 ? '#22c55e' : c.score >= 50 ? '#eab308' : '#ef4444'} stroke="white" strokeWidth="1" />
                              {(i === 0 || i === coords.length - 1 || points.length <= 6) && (
                                <text x={c.x} y={c.y - 6} textAnchor="middle" fontSize="7" fill="#6b7280" fontWeight="bold">{c.score}%</text>
                              )}
                            </g>
                          ))}
                          <defs>
                            <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex justify-between text-[9px] text-gray-400 -mt-1 px-1">
                          <span>{coords[0].date}</span>
                          {coords.length > 2 && <span>Latest: {latest}%</span>}
                          <span>{coords[coords.length - 1].date}</span>
                        </div>
                      </div>
                    )
                  })()}
                </section>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }
  return matrix[b.length][a.length]
}
