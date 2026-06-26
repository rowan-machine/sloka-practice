import { useState, useEffect } from 'react'

const API_KEY_STORAGE = 'sloka_elevenlabs_key'
const VOICE_STORAGE = 'sloka_voice_id'
const MASTERY_THRESHOLD_KEY = 'sloka_mastery_threshold'
const DEFAULT_MASTERY_THRESHOLD = 80

export function getMasteryThreshold(): number {
  const v = localStorage.getItem(MASTERY_THRESHOLD_KEY)
  return v ? Number(v) : DEFAULT_MASTERY_THRESHOLD
}

export interface VoiceOption {
  id: string
  name: string
  gender: 'female' | 'male'
  description: string
}

export const VOICES: VoiceOption[] = [
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female', description: 'Clear & expressive — great for melodic chanting' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Warm & smooth — gentle, meditative tone' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', description: 'Deep & resonant — strong, traditional feel' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', description: 'Calm & steady — balanced, clear pronunciation' },
]

const DEFAULT_VOICE = VOICES[0].id

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

export function hasApiKey(): boolean {
  return getStoredApiKey().length > 0
}

export function getStoredVoiceId(): string {
  return localStorage.getItem(VOICE_STORAGE) || DEFAULT_VOICE
}

export default function Settings({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE)
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const [masteryThreshold, setMasteryThreshold] = useState(DEFAULT_MASTERY_THRESHOLD)

  useEffect(() => {
    setApiKey(getStoredApiKey())
    setSelectedVoice(getStoredVoiceId())
    setMasteryThreshold(getMasteryThreshold())
  }, [])

  const selectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId)
    localStorage.setItem(VOICE_STORAGE, voiceId)
  }

  const previewVoice = async (voice: VoiceOption) => {
    const key = apiKey.trim() || getStoredApiKey()
    if (!key) return
    setPreviewingVoice(voice.id)
    try {
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
        body: JSON.stringify({
          text: 'oṁ namo bhagavate vāsudevāya',
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.75 }
        })
      })
      if (resp.ok) {
        const blob = await resp.blob()
        const audio = new Audio(URL.createObjectURL(blob))
        audio.onended = () => setPreviewingVoice(null)
        await audio.play()
      } else {
        setPreviewingVoice(null)
      }
    } catch {
      setPreviewingVoice(null)
    }
  }

  const handleSave = () => {
    const trimmed = apiKey.trim()
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed)
    } else {
      localStorage.removeItem(API_KEY_STORAGE)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE)
    setApiKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    const key = apiKey.trim()
    if (!key) return
    setTestStatus('testing')
    try {
      const resp = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': key }
      })
      setTestStatus(resp.ok ? 'success' : 'error')
    } catch {
      setTestStatus('error')
    }
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  const hasKey = apiKey.trim().length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50 safe-top">
      <header className="sticky top-0 z-30 glass-nav border-b border-gray-200/60 px-3 py-2 md:px-6 md:py-3 safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button onClick={onBack} className="chip chip-inactive">← Back</button>
          <h1 className="text-lg font-bold text-purple-900">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 pb-24 space-y-4">
        {/* TTS API Key */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-1">ElevenLabs API Key</h2>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            For high-quality Sanskrit pronunciation. Without a key, the app uses your browser's
            built-in speech synthesis (lower quality but free).
          </p>

          <div className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="chip chip-active text-sm"
              >
                {saved ? '✓ Saved' : 'Save Key'}
              </button>
              <button
                onClick={handleTest}
                disabled={!hasKey || testStatus === 'testing'}
                className="chip chip-inactive text-sm disabled:opacity-40"
              >
                {testStatus === 'testing' ? 'Testing...'
                  : testStatus === 'success' ? '✓ Valid!'
                  : testStatus === 'error' ? '✗ Invalid'
                  : 'Test Key'}
              </button>
              {hasKey && (
                <button
                  onClick={handleClear}
                  className="chip chip-inactive text-sm text-red-500"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>How to get a key:</strong><br />
              1. Go to <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" className="underline">elevenlabs.io</a> and create a free account<br />
              2. Click your profile icon → "Profile + API key"<br />
              3. Copy your API key and paste it above<br /><br />
              <strong>Cost:</strong> The free tier gives you ~10,000 characters/month (~50-100 word
              pronunciations + ~5 full verse chantings). The $5/month Starter plan gives 30,000 characters,
              enough for daily practice.
            </p>
          </div>

          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-xs text-purple-800 leading-relaxed">
              <strong>Privacy:</strong> Your API key is stored only on this device in your browser's
              local storage. It is sent directly to ElevenLabs for pronunciation — never to any
              other server. Clearing your browser data removes it.
            </p>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-1">Voice</h2>
          <p className="text-xs text-gray-500 mb-3">
            Choose a voice for Sanskrit pronunciation. Tap the play button to preview (requires API key).
          </p>

          <div className="space-y-2">
            {VOICES.map(voice => {
              const isSelected = selectedVoice === voice.id
              const isPreviewing = previewingVoice === voice.id
              return (
                <button
                  key={voice.id}
                  onClick={() => selectVoice(voice.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-lg ${voice.gender === 'female' ? '' : ''}`}>
                        {voice.gender === 'female' ? '👩' : '👨'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-gray-800">{voice.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            voice.gender === 'female'
                              ? 'bg-pink-100 text-pink-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {voice.gender}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-700 font-medium">
                              selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{voice.description}</p>
                      </div>
                    </div>
                    {hasKey && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); previewVoice(voice) }}
                        className={`shrink-0 ml-2 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                          isPreviewing
                            ? 'bg-purple-200 text-purple-700 animate-pulse'
                            : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                        title={`Preview ${voice.name}`}
                      >
                        {isPreviewing ? '⏳' : '▶'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {!hasKey && (
            <p className="text-[11px] text-gray-400 mt-2 italic">
              Add your API key above to preview voices and hear high-quality pronunciation.
            </p>
          )}
        </div>

        {/* Mastery Threshold */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-1">Mastery Threshold</h2>
          <p className="text-xs text-gray-500 mb-3">
            Words at or above this accuracy are considered mastered and won't appear in "Needs Work".
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range" min="50" max="100" step="5"
              value={masteryThreshold}
              onChange={e => { const v = Number(e.target.value); setMasteryThreshold(v); localStorage.setItem(MASTERY_THRESHOLD_KEY, String(v)) }}
              className="flex-1 accent-purple-600"
            />
            <span className="text-lg font-bold text-purple-700 w-14 text-right">{masteryThreshold}%</span>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-1">Your Data</h2>
          <p className="text-xs text-gray-500 mb-3">
            All progress, recordings, and settings are stored locally on this device.
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <div>• Śloka progress & completion → localStorage</div>
            <div>• Word statistics & known words → localStorage</div>
            <div>• Sound scores → localStorage</div>
            <div>• Recordings → in-memory (cleared on refresh)</div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-1">About</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Śloka Practice helps you learn to chant Sanskrit verses with correct pronunciation,
            meter awareness, and word-by-word understanding. Built with devotion.
          </p>
        </div>
      </div>
    </div>
  )
}
