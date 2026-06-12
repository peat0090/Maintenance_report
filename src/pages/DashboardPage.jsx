import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const sectionColor = {
  Hydraulic:   { bg: 'bg-sky-500/10',     text: 'text-sky-400',     ring: 'ring-sky-500/30',     label: 'Hydraulic' },
  Mechatronic: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500/30', label: 'Mechatronic' },
  Mechanic:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-amber-500/30',   label: 'Mechanic' },
}

const priorityColor = {
  low:      { bg: 'bg-zinc-800',         text: 'text-zinc-400',   label: 'Low' },
  medium:   { bg: 'bg-sky-500/10',       text: 'text-sky-400',    label: 'Medium' },
  high:     { bg: 'bg-orange-500/15',    text: 'text-orange-400', label: 'High' },
  critical: { bg: 'bg-red-500/15',       text: 'text-red-400',    label: 'Urgent' },
}

const roleColor = {
  admin:      'bg-red-500',
  manager:    'bg-amber-500',
  technician: 'bg-orange-500',
  viewer:     'bg-zinc-600',
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
  })
}

export default function DashboardPage() {
  const [filter, setFilter] = useState('all')
  const { user, logout, can } = useAuth()

  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      setError(null)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasksError) {
        setError(tasksError.message)
        setLoading(false)
        return
      }

      const { data: photosData } = await supabase
        .from('task_photos')
        .select('task_id')

      const photoCount = {}
      if (photosData) {
        photosData.forEach(p => {
          photoCount[p.task_id] = (photoCount[p.task_id] || 0) + 1
        })
      }

      const merged = tasksData.map(t => ({
        ...t,
        photos: photoCount[t.id] || 0,
      }))

      setTasks(merged)
      setLoading(false)
    }

    fetchTasks()
  }, [])

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.section === filter)

  const now        = new Date()
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const completedThisWeek = tasks.filter(t =>
    t.status === 'done' && new Date(t.created_at) >= weekStart
  ).length

  const ongoing = tasks.filter(t => t.status !== 'done').length

  const thisMonth = tasks.filter(t =>
    new Date(t.created_at) >= monthStart
  ).length

  const successRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
    : 0

  return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif]">

      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-orange-500 text-zinc-950 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_-2px_rgba(255,122,26,0.6)]">
            M
          </div>
          <div>
            <h1 className="font-semibold leading-tight text-sm sm:text-base tracking-tight">
              Maintenance <span className="text-orange-500">/</span> OS
            </h1>
            <p className="text-[10px] text-zinc-500 hidden sm:block tracking-[0.2em] uppercase">Operations Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/borrow"
            className="bg-zinc-900 hover:border-orange-500 hover:text-orange-400 text-zinc-300 border border-zinc-800 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-sm transition tracking-wider uppercase"
          >
            <span className="sm:hidden">⇄</span>
            <span className="hidden sm:inline">⇄ Borrow</span>
          </Link>

          {can('create') && (
            <Link
              to="/add-task"
              className="bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-sm transition tracking-wider uppercase shadow-[0_8px_24px_-8px_rgba(255,122,26,0.5)]"
            >
              <span className="sm:hidden">+ Add</span>
              <span className="hidden sm:inline">+ New Task</span>
            </Link>
          )}

          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-zinc-800">
            <div className={`w-8 h-8 ${roleColor[user.role]} rounded-sm flex items-center justify-center text-zinc-950 text-xs font-bold shrink-0`}>
              {user.fullname?.charAt(0)}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-zinc-200 leading-tight">{user.fullname}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="text-xs text-zinc-500 hover:text-red-400 transition whitespace-nowrap px-2 py-1">
            <span className="hidden sm:inline">⏻ Logout</span>
            <span className="sm:hidden">⏻</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header strip */}
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-500 tracking-[0.25em] uppercase mb-1">Overview</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Hi, <span className="text-orange-500">{user.fullname?.split(' ')[0]}</span>
            </h2>
          </div>
          <div className="hidden sm:block text-right text-xs text-zinc-500 font-mono">
          <div className="hidden sm:block text-right text-xs  text-zinc-500 font-mono">
     {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-sm overflow-hidden mb-8">
          {[
            { label: 'Completed This Week', value: completedThisWeek, accent: 'text-emerald-400',  hint: 'COMPLETED · WK' },
            { label: 'In Progress',      value: ongoing,           accent: 'text-orange-400',   hint: 'IN PROGRESS' },
            { label: 'Tasks This Month',        value: thisMonth,         accent: 'text-zinc-100',     hint: 'MTD TASKS' },
            { label: 'Success Rate',         value: `${successRate}%`, accent: 'text-sky-400',      hint: 'SUCCESS RATE' },
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
          <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2 hidden sm:inline">Filter</span>
          {[
            { key: 'all',         label: 'All' },
            { key: 'Hydraulic',   label: 'Hydraulic' },
            { key: 'Mechatronic', label: 'Mechatronic' },
            { key: 'Mechanic',    label: 'Mechanic' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 sm:px-4 py-1.5 rounded-sm text-xs font-medium tracking-wider uppercase transition border ${
                filter === f.key
                  ? 'bg-orange-500 text-zinc-950 border-orange-500 shadow-[0_0_20px_-6px_rgba(255,122,26,0.7)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task List */}
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
            ⚠ Failed to load data: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-sm text-center py-16 text-zinc-500">
            <div className="text-3xl mb-3 opacity-40">∅</div>
            <p className="text-sm tracking-wider uppercase">No tasks in this department</p>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-sm overflow-hidden divide-y divide-zinc-800">
            {filtered.map((task, idx) => {
              const sec  = sectionColor[task.section]   || { bg: 'bg-zinc-800', text: 'text-zinc-400', ring: 'ring-zinc-700', label: task.section }
              const pri  = priorityColor[task.priority] || { bg: 'bg-zinc-800', text: 'text-zinc-400', label: task.priority }
              const done = task.status === 'done'
              return (
                <Link
                  to={`/tasks/${task.id}`}
                  key={task.id}
                  className="bg-zinc-900 hover:bg-zinc-900/40 transition flex items-start sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 group"
                >
                  <span className="text-[10px] font-mono text-zinc-600 w-6 tabular-nums shrink-0 hidden sm:inline">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className={`w-2 h-10 rounded-sm shrink-0 ${done ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-100 truncate text-sm sm:text-base group-hover:text-orange-400 transition">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500 font-mono">
                      <span>▸ {task.assigned_to}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{formatDate(task.created_at)}</span>
                      {task.photos > 0 && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span>◫ {task.photos}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-sm ring-1 ${sec.bg} ${sec.text} ${sec.ring}`}>{sec.label}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-sm ${pri.bg} ${pri.text} hidden md:inline`}>{pri.label}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm ${done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
                      {done ? '● DONE' : '○ ACTIVE'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
