import React, { useState, useRef, useEffect } from 'react'
import { soundCategories, extractSoundsFromWord, type SoundCategory, type SoundScore, type KnownWord, type WordStats, saveScores, getAccuracy, recordResult, addKnownWord, removeKnownWord, isWordKnown, getKnownSoundCoverage, getWordAccuracy, getWordsNeedingWork } from './sanskritSounds'
import { getStoredApiKey } from './Settings'

interface SoundPracticeProps {
  onBack: () => void
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

export default function SoundPractice({ onBack, scores, setScores, knownWords, setKnownWords, wordStats }: SoundPracticeProps) {
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | null>(null)
  const [newWord, setNewWord] = useState('')
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
      const result = event.results[0][0].transcript.trim().toLowerCase()
      setTranscript(result)
      if (practiceWord) {
        const similarity = compareSimple(practiceWord, result)
        const status = similarity >= 0.65 ? 'green' : similarity >= 0.35 ? 'yellow' : 'red'
        setWordResult(status)
        const updated = recordResult(scores, practiceWord, status)
        setScores(updated)
        saveScores(updated)
        if (status === 'green') setKnownWords(addKnownWord(knownWords, practiceWord))
      }
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => { try { recognition.stop() } catch (_) {} }
  }, [practiceWord, scores, setScores, knownWords, setKnownWords])

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

  const compareSimple = (expected: string, spoken: string): number => {
    const a = normalize(expected)
    const b = normalize(spoken)
    if (a === b) return 1
    const dist = levenshtein(a, b)
    const maxLen = Math.max(a.length, b.length)
    return maxLen > 0 ? 1 - dist / maxLen : 1
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
        const resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech/XB0fDUnXU5powFXDhCwa', {
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <button
            onClick={onBack}
            className="absolute top-4 left-4 md:top-8 md:left-8 px-4 py-2 bg-white text-purple-700 rounded-lg shadow hover:bg-purple-50 transition-colors border border-purple-200 font-medium"
          >
            ← Back to Practice
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-purple-900 mb-1">वर्णमाला अभ्यास</h1>
          <h2 className="text-lg text-gray-600">Sanskrit Sound Practice</h2>
          <p className="text-sm text-gray-400 mt-1">Click any category to practice • Your known words are highlighted per sound type</p>
        </header>

        {/* ═══════ OVERVIEW ═══════ */}
        {!selectedCategory && (
          <div>
            {/* Stats + add word */}
            <section className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-700">
                  Your Progress
                  {knownWords.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-green-600">✓ {knownWords.length} known word{knownWords.length !== 1 ? 's' : ''}</span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text" value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newWord.trim()) { setKnownWords(addKnownWord(knownWords, newWord)); setNewWord('') } }}
                    placeholder="Add known word..."
                    className="px-3 py-1.5 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm font-serif w-40"
                  />
                  <button
                    onClick={() => { if (newWord.trim()) { setKnownWords(addKnownWord(knownWords, newWord)); setNewWord('') } }}
                    disabled={!newWord.trim()}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-40"
                  >+ Add</button>
                </div>
              </div>
              {Object.values(scores).some(s => s.correct + s.close + s.wrong > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const t = Object.values(scores).reduce((a, s) => ({ c: a.c + s.correct, cl: a.cl + s.close, w: a.w + s.wrong }), { c: 0, cl: 0, w: 0 })
                    const total = t.c + t.cl + t.w
                    const acc = total > 0 ? Math.round((t.c / total) * 100) : 0
                    return (<>
                      <div className="text-center p-2 bg-purple-50 rounded-xl"><div className="text-xl font-bold text-purple-700">{total}</div><div className="text-xs text-gray-500">Attempts</div></div>
                      <div className="text-center p-2 bg-green-50 rounded-xl"><div className="text-xl font-bold text-green-600">{acc}%</div><div className="text-xs text-gray-500">Accuracy</div></div>
                      <div className="text-center p-2 bg-green-50 rounded-xl"><div className="text-xl font-bold text-green-600">{t.c}</div><div className="text-xs text-gray-500">Correct</div></div>
                      <div className="text-center p-2 bg-red-50 rounded-xl"><div className="text-xl font-bold text-red-600">{t.w}</div><div className="text-xs text-gray-500">Needs Work</div></div>
                    </>)
                  })()}
                </div>
              )}
            </section>

            {/* ═══ NEEDS WORK — ranked word list with recordings ═══ */}
            {(() => {
              const wordsToWork = getWordsNeedingWork(wordStats)
              if (wordsToWork.length === 0) return null
              return (
                <section className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Needs Work</h3>
                  <p className="text-xs text-gray-400 mb-4">Words ranked by accuracy. Click 🔊 to hear the correct pronunciation. Click ▶ on recordings to hear your attempt.</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {wordsToWork.map((ws, idx) => {
                      const acc = getWordAccuracy(ws)
                      const accColor = acc >= 80 ? 'text-green-600' : acc >= 50 ? 'text-yellow-600' : acc < 30 ? 'text-red-600' : 'text-orange-500'
                      const accBg = acc >= 80 ? 'bg-green-50 border-green-200' : acc >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                      const recordings = ws.history.filter(h => h.recordingUrl)
                      const known = isWordKnown(knownWords, ws.word)

                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${accBg}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Rank */}
                              <span className="text-xs text-gray-400 font-mono w-6 text-right shrink-0">#{idx + 1}</span>
                              {/* Word + listen */}
                              <button
                                onClick={() => speakWord(ws.word)}
                                className={`font-serif text-lg font-bold truncate hover:text-purple-700 transition-colors ${
                                  speakingWord === ws.word ? 'text-purple-600' : 'text-gray-800'
                                }`}
                                title="Click to hear correct pronunciation"
                              >
                                <span className="text-xs mr-1 opacity-50">🔊</span>
                                {ws.word}
                              </button>
                              {known && <span className="text-xs text-green-600 shrink-0">✓</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Accuracy */}
                              <div className="text-right">
                                <div className={`text-lg font-bold ${accColor}`}>{acc}%</div>
                                <div className="text-xs text-gray-400">{ws.attempts} attempt{ws.attempts !== 1 ? 's' : ''}</div>
                              </div>
                              {/* Mini bar */}
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${acc >= 80 ? 'bg-green-500' : acc >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${acc}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Attempt history dots */}
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-gray-400 mr-1">History:</span>
                            {ws.history.slice(0, 15).map((h, hi) => (
                              <span
                                key={hi}
                                className={`w-3 h-3 rounded-full shrink-0 ${
                                  h.status === 'green' ? 'bg-green-400' : h.status === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                title={`${h.status} — heard: "${h.transcript}" — ${new Date(h.date).toLocaleString()}`}
                              />
                            ))}
                          </div>

                          {/* Recordings — play your wrong attempts */}
                          {recordings.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs text-gray-400 self-center">Your recordings:</span>
                              {recordings.map((rec, ri) => (
                                <button
                                  key={ri}
                                  onClick={() => { if (rec.recordingUrl) new Audio(rec.recordingUrl).play() }}
                                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                    rec.status === 'red' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                                  }`}
                                  title={`Heard: "${rec.transcript}" — ${new Date(rec.date).toLocaleString()}`}
                                >
                                  ▶ {rec.status === 'red' ? '✗' : '≈'} "{rec.transcript.slice(0, 15)}"
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* Sound category cards with inline known words */}
            <div className="grid gap-4 md:grid-cols-2">
              {soundCategories.map(cat => {
                const score = scores[cat.id]
                const accuracy = score ? getAccuracy(score) : -1
                const total = score ? score.correct + score.close + score.wrong : 0
                const catKnown = getKnownWordsForCategory(cat)
                const knownCount = coverage[cat.id] || 0

                return (
                  <div key={cat.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${getScoreBg(accuracy)}`}>
                    {/* Header — click to drill in */}
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full text-left p-4 hover:bg-white/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-bold text-gray-800">{cat.name}</span>
                          <span className="ml-2 text-lg">{cat.devanagari}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {knownCount > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ {knownCount}</span>
                          )}
                          {total > 0 && (
                            <span className={`text-lg font-bold ${getScoreColor(accuracy)}`}>{accuracy}%</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{cat.description}</p>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getBarColor(accuracy)}`} style={{ width: `${accuracy < 0 ? 0 : accuracy}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">{total > 0 ? `${total} attempts` : 'Not practiced yet'}</span>
                        <span className="text-xs text-purple-500 font-medium">Practice →</span>
                      </div>
                    </button>

                    {/* Known words for this category — highlighted inline */}
                    {catKnown.length > 0 && (
                      <div className="px-4 pb-3 border-t border-gray-100/50">
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {catKnown.slice(0, 10).map((kw, i) => (
                            <button
                              key={i}
                              onClick={() => speakWord(kw.word)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-serif border transition-all cursor-pointer ${
                                speakingWord === kw.word ? 'bg-purple-100 border-purple-300 scale-105' : 'bg-white/80 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                              }`}
                              title={`Click to hear "${kw.word}"`}
                            >
                              <span className="text-xs opacity-50">🔊</span>
                              {highlightWordForCategory(kw.word, cat)}
                            </button>
                          ))}
                          {catKnown.length > 10 && (
                            <span className="self-center text-xs text-gray-400">+{catKnown.length - 10} more</span>
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
                          {transcript && <span className="ml-2 text-sm opacity-75">(heard: "{transcript}")</span>}
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
                  {score.history.length > 1 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-2">Accuracy Over Time</h5>
                      <div className="flex items-end gap-1 h-16">
                        {score.history.map((h, i) => (
                          <div key={i} className={`flex-1 rounded-t ${getBarColor(h.score)} opacity-80`}
                            style={{ height: `${Math.max(4, h.score)}%` }}
                            title={`${h.score}% — ${new Date(h.date).toLocaleDateString()}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
