import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useTranslation } from 'react-i18next'

const sectionColor = {
  Hydraulic:   { bg: 'bg-sky-500/10',     text: 'text-sky-400',     ring: 'ring-sky-500/30',     label: 'Hydraulic' },
  Mechatronic: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500/30', label: 'Mechatronic' },
  Mechanic:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-amber-500/30',   label: 'Mechanic' },
  General:     { bg: 'bg-zinc-700/30',    text: 'text-zinc-300',    ring: 'ring-zinc-600/40',     label: 'General' },
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
  })
}

const isOverdue = (item) =>
  item.status === 'borrowed' && item.due_date && new Date(item.due_date) < new Date()

const canMarkReturned = (user, item) => {
  if (!user) return false
  const role = user.role?.toLowerCase()
  if (role === 'admin' || role === 'manager') return true
  if (item.created_by === user.id) return true
  if (item.borrower === user.fullname) return true
  return false
}

export default function BorrowItemsPage() {
  const { user, logout, can } = useAuth()
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [returningId, setReturningId] = useState(null)

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)
      setError(null)
      const { data, error: itemsError } = await supabase
        .from('borrowed_items').select('*').order('created_at', { ascending: false })
      if (itemsError) { setError(itemsError.message); setLoading(false); return }
      setItems(data || [])
      setLoading(false)
    }
    fetchItems()
  }, [])

  const handleReturn = async (item) => {
    if (!window.confirm(`Confirm return of "${item.item_name}"?`)) return
    setReturningId(item.id)
    const { error: returnError } = await supabase
      .from('borrowed_items')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', item.id)
    if (!returnError) {
      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: 'returned', returned_at: new Date().toISOString() } : i
      ))
    }
    setReturningId(null)
  }

  const filtered = items.filter(item => {
    if (filter === 'all')      return true
    if (filter === 'borrowed') return item.status === 'borrowed' && !isOverdue(item)
    if (filter === 'overdue')  return isOverdue(item)
    if (filter === 'returned') return item.status === 'returned'
    return true
  })

  const activeCount   = items.filter(i => i.status === 'borrowed' && !isOverdue(i)).length
  const overdueCount  = items.filter(isOverdue).length
  const returnedCount = items.filter(i => i.status === 'returned').length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif]">

      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className="text-zinc-500 hover:text-orange-400 transition text-sm tracking-wider shrink-0">← {t('back')}</Link>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <div>
            <h1 className="font-semibold leading-tight text-sm sm:text-base tracking-tight">
              {t('borrow_title')}
            </h1>
            <p className="text-[10px] text-zinc-500 hidden sm:block tracking-[0.2em] uppercase">{t('borrow_log')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {can('create') && (
            <Link
              to="/borrow/add"
              className="bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-sm transition tracking-wider uppercase shadow-[0_8px_24px_-8px_rgba(255,122,26,0.5)]"
            >
              <span className="sm:hidden">+ {t('nav_add')}</span>
              <span className="hidden sm:inline">{t('new_borrow')}</span>
            </Link>
          )}
          <button onClick={logout} className="text-xs text-zinc-500 hover:text-red-400 transition whitespace-nowrap px-2 py-1">
            <span className="hidden sm:inline">⏻ {t('nav_logout')}</span>
            <span className="sm:hidden">⏻</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 rounded-sm overflow-hidden mb-8">
          {[
            { label: t('stat_active'),   value: activeCount,   accent: 'text-orange-400',  hint: 'ACTIVE' },
            { label: t('stat_overdue'),  value: overdueCount,  accent: 'text-red-400',     hint: 'OVERDUE' },
            { label: t('stat_returned'), value: returnedCount, accent: 'text-emerald-400', hint: 'RETURNED' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900 p-4 sm:p-5 relative group hover:bg-zinc-900/60 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono text-zinc-600 tracking-widest">{stat.hint}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition" />
              </div>
              <div className={`text-2xl sm:text-4xl font-semibold ${stat.accent} tabular-nums tracking-tight`}>{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2 hidden sm:inline">{t('filter')}</span>
          {[
            { key: 'all',      label: t('filter_all') },
            { key: 'borrowed', label: t('filter_borrowed') },
            { key: 'overdue',  label: t('filter_overdue') },
            { key: 'returned', label: t('filter_returned') },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 sm:px-4 py-1.5 rounded-sm text-xs font-medium tracking-wider uppercase transition border ${
                filter === f.key
                  ? 'bg-orange-500 text-zinc-950 border-orange-500 shadow-[0_0_20px_-6px_rgba(255,122,26,0.7)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >{f.label}</button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-sm p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                    <div className="h-3 bg-zinc-800/70 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-sm px-4 py-3 text-sm">
            ⚠ {t('load_error')}: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-sm text-center py-16 text-zinc-500">
            <div className="text-3xl mb-3 opacity-40">∅</div>
            <p className="text-sm tracking-wider uppercase">{t('no_items')}</p>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-sm overflow-hidden divide-y divide-zinc-800">
            {filtered.map((item, idx) => {
              const sec      = sectionColor[item.section] || { bg: 'bg-zinc-800', text: 'text-zinc-400', ring: 'ring-zinc-700', label: item.section }
              const overdue  = isOverdue(item)
              const returned = item.status === 'returned'
              return (
                <div key={item.id} className="bg-zinc-900 hover:bg-zinc-900/40 transition flex items-start sm:items-center gap-3 sm:gap-5 p-4 sm:p-5">
                  <span className="text-[10px] font-mono text-zinc-600 w-6 tabular-nums shrink-0 hidden sm:inline">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className={`w-2 h-10 rounded-sm shrink-0 ${returned ? 'bg-emerald-500' : overdue ? 'bg-red-500' : 'bg-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-100 truncate text-sm sm:text-base">
                      {item.item_name} <span className="text-zinc-500 text-xs">× {item.quantity}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500 font-mono">
                      <span>▸ {item.borrower}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{formatDate(item.borrow_date)}</span>
                      {item.due_date && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className={overdue ? 'text-red-400' : ''}>↩ {formatDate(item.due_date)}</span>
                        </>
                      )}
                    </div>
                    {item.purpose && <p className="text-zinc-500 text-xs mt-1.5 truncate">{item.purpose}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-sm ring-1 ${sec.bg} ${sec.text} ${sec.ring}`}>{sec.label}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm ${
                      returned ? 'bg-emerald-500/15 text-emerald-400' : overdue ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'
                    }`}>
                      {returned ? t('status_returned') : overdue ? t('status_overdue') : t('status_borrowed')}
                    </span>
                    {!returned && canMarkReturned(user, item) && (
                      <button onClick={() => handleReturn(item)} disabled={returningId === item.id}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm border border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition"
                      >{returningId === item.id ? '...' : t('btn_return')}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
