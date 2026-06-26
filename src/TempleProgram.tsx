import { useState, useRef } from 'react'
import { slokaLibrary, type SlokaEntry } from './slokaLibrary'
import { loadTempleProgram, saveTempleProgram, type TempleProgram as TProg, type TempleService, type CustomMantra, type SlokaProgress } from './sanskritSounds'

interface Props {
  slokaProgress: Record<string, SlokaProgress>
  onSelectMantra: (entry: SlokaEntry | null, text: string) => void
  onUpdateProgress: (id: string, update: Partial<SlokaProgress>) => void
}

export default function TempleProgram({ slokaProgress, onSelectMantra, onUpdateProgress }: Props) {
  const [program, setProgram] = useState<TProg>(() => loadTempleProgram())
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null) // service id being added to
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddService, setShowAddService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceTime, setNewServiceTime] = useState<'morning' | 'evening'>('morning')
  const [addingCustom, setAddingCustom] = useState<string | null>(null) // service id
  const [customTitle, setCustomTitle] = useState('')
  const [customText, setCustomText] = useState('')
  const [customTranslation, setCustomTranslation] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const save = (p: TProg) => {
    setProgram(p)
    saveTempleProgram(p)
  }

  // Resolve a mantra id to its display info
  const resolveMantra = (id: string): { title: string; text: string; translation: string; entry: SlokaEntry | null } => {
    // Check custom mantras first
    const custom = program.customMantras.find(m => m.id === id)
    if (custom) return { title: custom.title, text: custom.text, translation: custom.translation || '', entry: null }
    // Library entry
    const entry = slokaLibrary.find(s => s.id === id)
    if (entry) return { title: entry.reference, text: entry.text, translation: entry.translation, entry }
    return { title: id, text: '', translation: '', entry: null }
  }

  const getProgress = (id: string): { status: 'mastered' | 'practicing' | 'not-started'; perfectCount: number } => {
    const sp = slokaProgress[id]
    if (!sp) return { status: 'not-started', perfectCount: 0 }
    // Manual override takes priority
    if (sp.manualStatus) return { status: sp.manualStatus, perfectCount: sp.perfectCount }
    if (sp.completed) return { status: 'mastered', perfectCount: sp.perfectCount }
    return { status: sp.perfectCount > 0 ? 'practicing' : 'not-started', perfectCount: sp.perfectCount }
  }

  const cycleStatus = (id: string) => {
    const current = getProgress(id).status
    const next = current === 'not-started' ? 'practicing' : current === 'practicing' ? 'mastered' : 'not-started'
    onUpdateProgress(id, { manualStatus: next })
  }

  const statusColors = {
    'mastered': 'bg-green-100 text-green-700 border-green-300',
    'practicing': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'not-started': 'bg-gray-100 text-gray-500 border-gray-200',
  }
  const statusLabels = { 'mastered': '✓ Mastered', 'practicing': '⏳ Practicing', 'not-started': '○ Not started' }

  const addMantraToService = (serviceId: string, mantraId: string) => {
    const updated = { ...program, services: program.services.map(s =>
      s.id === serviceId && !s.mantraIds.includes(mantraId)
        ? { ...s, mantraIds: [...s.mantraIds, mantraId] }
        : s
    )}
    save(updated)
    setAddingTo(null)
    setSearchQuery('')
  }

  const addGroupToService = (serviceId: string, groupName: string) => {
    const groupEntries = slokaLibrary.filter(s => s.group === groupName)
    const updated = { ...program, services: program.services.map(s => {
      if (s.id !== serviceId) return s
      const newIds = groupEntries.map(e => e.id).filter(id => !s.mantraIds.includes(id))
      return { ...s, mantraIds: [...s.mantraIds, ...newIds] }
    })}
    save(updated)
  }

  const removeMantraFromService = (serviceId: string, mantraId: string) => {
    const updated = { ...program, services: program.services.map(s =>
      s.id === serviceId ? { ...s, mantraIds: s.mantraIds.filter(id => id !== mantraId) } : s
    )}
    save(updated)
  }

  const addCustomService = () => {
    if (!newServiceName.trim()) return
    const id = `custom-svc-${Date.now()}`
    const maxOrder = Math.max(0, ...program.services.filter(s => s.timeOfDay === newServiceTime).map(s => s.order))
    const newService: TempleService = { id, name: newServiceName.trim(), timeOfDay: newServiceTime, order: maxOrder + 1, mantraIds: [] }
    save({ ...program, services: [...program.services, newService] })
    setNewServiceName('')
    setShowAddService(false)
  }

  const removeService = (serviceId: string) => {
    save({ ...program, services: program.services.filter(s => s.id !== serviceId) })
  }

  const addCustomMantra = (serviceId: string) => {
    if (!customTitle.trim() || !customText.trim()) return
    const id = `custom-${Date.now()}`
    const newMantra: CustomMantra = { id, title: customTitle.trim(), text: customText.trim(), translation: customTranslation.trim() || undefined }
    const updated = {
      ...program,
      customMantras: [...program.customMantras, newMantra],
      services: program.services.map(s => s.id === serviceId ? { ...s, mantraIds: [...s.mantraIds, id] } : s)
    }
    save(updated)
    setAddingCustom(null)
    setCustomTitle('')
    setCustomText('')
    setCustomTranslation('')
  }

  const moveMantra = (serviceId: string, mantraId: string, direction: -1 | 1) => {
    const updated = { ...program, services: program.services.map(s => {
      if (s.id !== serviceId) return s
      const idx = s.mantraIds.indexOf(mantraId)
      if (idx < 0) return s
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= s.mantraIds.length) return s
      const arr = [...s.mantraIds]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return { ...s, mantraIds: arr }
    })}
    save(updated)
  }

  // Filter library for the add-mantra search
  const searchResults = searchQuery.trim().length >= 2
    ? slokaLibrary.filter(s => {
        const q = searchQuery.toLowerCase()
        return s.reference.toLowerCase().includes(q) || s.text.toLowerCase().includes(q) || s.source.toLowerCase().includes(q) || s.translation.toLowerCase().includes(q)
      }).slice(0, 15)
    : []

  // Stats
  const allMantraIds = new Set(program.services.flatMap(s => s.mantraIds))
  const totalQueued = allMantraIds.size
  const masteredCount = [...allMantraIds].filter(id => getProgress(id).status === 'mastered').length
  const practicingCount = [...allMantraIds].filter(id => getProgress(id).status === 'practicing').length

  const morningServices = program.services.filter(s => s.timeOfDay === 'morning').sort((a, b) => a.order - b.order)
  const eveningServices = program.services.filter(s => s.timeOfDay === 'evening').sort((a, b) => a.order - b.order)

  const renderServiceBlock = (services: TempleService[], label: string, emoji: string) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
        <span>{emoji}</span> {label}
      </h3>
      <div className="space-y-2">
        {services.map(service => {
          const isExpanded = expandedService === service.id
          const serviceProgress = service.mantraIds.length > 0
            ? service.mantraIds.filter(id => getProgress(id).status === 'mastered').length
            : 0

          return (
            <div key={service.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Service header */}
              <button
                onClick={() => setExpandedService(isExpanded ? null : service.id)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-800">{service.name}</span>
                  {service.mantraIds.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                      {serviceProgress}/{service.mantraIds.length}
                    </span>
                  )}
                  {service.mantraIds.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic">No mantras yet</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {service.mantraIds.length > 0 && (
                    <div className="flex gap-0.5">
                      {service.mantraIds.map(id => {
                        const p = getProgress(id)
                        return <span key={id} className={`w-2 h-2 rounded-full ${p.status === 'mastered' ? 'bg-green-400' : p.status === 'practicing' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                      })}
                    </div>
                  )}
                  <span className="text-gray-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                </div>
              </button>

              {/* Expanded: mantra list */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-3 py-2 space-y-1.5">
                  {service.mantraIds.map((id, idx) => {
                    const m = resolveMantra(id)
                    const p = getProgress(id)
                    return (
                      <div key={id} className="flex items-start gap-2 group">
                        <button
                          onClick={(e) => { e.stopPropagation(); cycleStatus(id) }}
                          className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${statusColors[p.status]}`}
                          title="Tap to change status"
                        >
                          {statusLabels[p.status]}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onSelectMantra(m.entry, m.text)}
                            className="text-sm font-medium text-purple-700 hover:text-purple-900 text-left truncate block w-full"
                            title="Open for practice"
                          >
                            {m.title}
                          </button>
                          <p className="text-[10px] text-gray-400 truncate">{m.text.split('\n')[0]}</p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => moveMantra(service.id, id, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs px-0.5">▲</button>
                          <button onClick={() => moveMantra(service.id, id, 1)} disabled={idx === service.mantraIds.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs px-0.5">▼</button>
                          <button onClick={() => removeMantraFromService(service.id, id)} className="text-red-400 hover:text-red-600 text-xs px-0.5" title="Remove">✕</button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add mantra buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => { setAddingTo(addingTo === service.id ? null : service.id); setAddingCustom(null); setTimeout(() => searchRef.current?.focus(), 100) }}
                      className="text-[10px] text-purple-500 hover:text-purple-700 font-medium flex items-center gap-0.5"
                    >
                      + From library
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => { setAddingCustom(addingCustom === service.id ? null : service.id); setAddingTo(null) }}
                      className="text-[10px] text-purple-500 hover:text-purple-700 font-medium flex items-center gap-0.5"
                    >
                      + Custom mantra
                    </button>
                    {service.id.startsWith('custom-svc-') && (
                      <>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => removeService(service.id)} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Remove service</button>
                      </>
                    )}
                  </div>

                  {/* Library search panel */}
                  {addingTo === service.id && (
                    <div className="mt-2 p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search mantras & verses..."
                        className="w-full text-xs px-2 py-1.5 rounded border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                      {searchResults.length > 0 && (() => {
                        // Collect unique groups from search results
                        const seenGroups = new Set<string>()
                        const groupHeaders: { group: string; count: number; label: string }[] = []
                        for (const entry of searchResults) {
                          if (entry.group && !seenGroups.has(entry.group)) {
                            seenGroups.add(entry.group)
                            const all = slokaLibrary.filter(s => s.group === entry.group)
                            groupHeaders.push({ group: entry.group, count: all.length, label: all[0]?.source || entry.group })
                          }
                        }
                        return (
                          <div className="mt-1.5 max-h-52 overflow-y-auto space-y-0.5">
                            {/* Group "add all" buttons */}
                            {groupHeaders.map(gh => {
                              const groupIds = slokaLibrary.filter(s => s.group === gh.group).map(s => s.id)
                              const allAdded = groupIds.every(id => service.mantraIds.includes(id))
                              return (
                                <button
                                  key={`grp-${gh.group}`}
                                  onClick={() => !allAdded && addGroupToService(service.id, gh.group)}
                                  disabled={allAdded}
                                  className={`w-full text-left px-2 py-2 rounded text-xs bg-purple-100/60 hover:bg-purple-200/60 transition-colors flex items-center justify-between ${allAdded ? 'opacity-40' : ''}`}
                                >
                                  <span>
                                    <span className="font-semibold text-purple-800">📜 {gh.label}</span>
                                    <span className="text-purple-500 ml-1">— all {gh.count} verses</span>
                                  </span>
                                  {allAdded ? <span className="text-purple-500">✓ Added</span> : <span className="text-purple-600 font-medium">+ Add all</span>}
                                </button>
                              )
                            })}
                            {/* Individual results */}
                            {searchResults.map(entry => {
                              const alreadyAdded = service.mantraIds.includes(entry.id)
                              return (
                                <button
                                  key={entry.id}
                                  onClick={() => !alreadyAdded && addMantraToService(service.id, entry.id)}
                                  disabled={alreadyAdded}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-purple-100 transition-colors ${alreadyAdded ? 'opacity-40' : ''}`}
                                >
                                  <span className="font-medium text-gray-800">{entry.reference}</span>
                                  <span className="text-gray-400 ml-1.5">— {entry.source}</span>
                                  {entry.group && <span className="text-purple-400 ml-1 text-[9px]">({slokaLibrary.filter(s => s.group === entry.group).length}v)</span>}
                                  {alreadyAdded && <span className="text-purple-500 ml-1">✓</span>}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })()}
                      {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                        <p className="text-[10px] text-gray-400 mt-1 italic">No matches found</p>
                      )}
                    </div>
                  )}

                  {/* Custom mantra form */}
                  {addingCustom === service.id && (
                    <div className="mt-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1.5">
                      <input
                        type="text"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        placeholder="Name (e.g. 'Jaya Rādhā-Mādhava verse 2')"
                        className="w-full text-xs px-2 py-1.5 rounded border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <textarea
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        placeholder="Sanskrit text (IAST)..."
                        rows={3}
                        className="w-full text-xs px-2 py-1.5 rounded border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 font-serif"
                      />
                      <input
                        type="text"
                        value={customTranslation}
                        onChange={e => setCustomTranslation(e.target.value)}
                        placeholder="Translation (optional)"
                        className="w-full text-xs px-2 py-1.5 rounded border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => addCustomMantra(service.id)}
                          disabled={!customTitle.trim() || !customText.trim()}
                          className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 font-medium"
                        >Add</button>
                        <button onClick={() => setAddingCustom(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">🙏 My Temple Program</h2>
          <button
            onClick={() => setShowAddService(!showAddService)}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
          >+ Add service</button>
        </div>

        {/* Progress summary */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-gray-600"><b>{masteredCount}</b> mastered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="text-gray-600"><b>{practicingCount}</b> practicing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="text-gray-600"><b>{totalQueued - masteredCount - practicingCount}</b> to learn</span>
          </div>
        </div>

        {totalQueued > 0 && (
          <div className="mt-2 w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full flex">
              <div className="bg-green-400 transition-all" style={{ width: `${(masteredCount / totalQueued) * 100}%` }} />
              <div className="bg-yellow-400 transition-all" style={{ width: `${(practicingCount / totalQueued) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Add custom service form */}
        {showAddService && (
          <div className="mt-3 p-2 bg-purple-50/50 rounded-lg border border-purple-100 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 font-medium">Service name</label>
              <input
                type="text"
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="e.g. Rādhā-Dāmodara Āratī"
                className="w-full text-xs px-2 py-1.5 rounded border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400 mt-0.5"
              />
            </div>
            <select
              value={newServiceTime}
              onChange={e => setNewServiceTime(e.target.value as 'morning' | 'evening')}
              className="text-xs px-2 py-1.5 rounded border border-purple-200"
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
            <button
              onClick={addCustomService}
              disabled={!newServiceName.trim()}
              className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 font-medium"
            >Add</button>
          </div>
        )}
      </div>

      {/* Morning program */}
      {renderServiceBlock(morningServices, 'Morning Program', '🌅')}

      {/* Evening program */}
      {renderServiceBlock(eveningServices, 'Evening Program', '🌙')}
    </div>
  )
}
