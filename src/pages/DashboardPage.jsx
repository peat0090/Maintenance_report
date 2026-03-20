import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const sectionColor = {
  Hydraulic:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Hydraulic' },
  Mechatronic: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Mechatronic' },
  Mechanic:    { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Mechanic' },
}

const priorityColor = {
  low:      { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'ต่ำ' },
  medium:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'ปานกลาง' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'สูง' },
  critical: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'เร่งด่วน' },
}

const roleColor = {
  admin:      'bg-red-500',
  manager:    'bg-amber-500',
  technician: 'bg-blue-500',
  viewer:     'bg-slate-500',
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('th-TH', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
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
    <div className="min-h-screen bg-slate-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🔧</span>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight text-sm sm:text-base">Maintenance Report</h1>
            <p className="text-xs text-slate-400 hidden sm:block">ระบบรายงานงานซ่อมบำรุง</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {can('create') && (
            <Link
              to="/add-task"
              className="text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition"
              style={{ backgroundColor: '#6b2444' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4a0000'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6b2444'}
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">+ เพิ่มงาน</span>
            </Link>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 ${roleColor[user.role]} rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0`}>
              {user.fullname?.charAt(0)}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-700">{user.fullname}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="text-xs sm:text-sm text-slate-400 hover:text-red-500 transition whitespace-nowrap">
            <span className="hidden sm:inline">ออกจากระบบ</span>
            <span className="sm:hidden">ออก</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'งานเสร็จสัปดาห์นี้', value: completedThisWeek, color: 'text-blue-600',  icon: '✅' },
            { label: 'กำลังดำเนินการ',      value: ongoing,           color: 'text-amber-600', icon: '⏳' },
            { label: 'งานทั้งเดือน',        value: thisMonth,         color: 'text-slate-700', icon: '📋' },
            { label: 'อัตราสำเร็จ',         value: `${successRate}%`, color: 'text-green-600', icon: '📈' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-100">
              <div className="text-lg sm:text-xl mb-0.5 sm:mb-1">{stat.icon}</div>
              <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 sm:mb-5 flex-wrap">
          {[
            { key: 'Hydraulic',   label: '💧 Hydraulic' },
            { key: 'Mechatronic', label: '⚡ Mechatronic' },
            { key: 'Mechanic',    label: '⚙️ Mechanic' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-blue-500 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠️ โหลดข้อมูลไม่สำเร็จ: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 sm:py-16 text-slate-400">
            <div className="text-3xl sm:text-4xl mb-3">📭</div>
            <p className="text-sm sm:text-base">ยังไม่มีงานในแผนกนี้</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filtered.map(task => {
              const sec  = sectionColor[task.section]   || { bg: 'bg-slate-100', text: 'text-slate-600', label: task.section }
              const pri  = priorityColor[task.priority] || { bg: 'bg-slate-100', text: 'text-slate-600', label: task.priority }
              const done = task.status === 'done'
              return (
                <Link
                  to={`/tasks/${task.id}`}
                  key={task.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-start sm:items-center gap-3 sm:gap-4 hover:shadow-md hover:border-blue-200 transition"
                >
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 mt-1.5 sm:mt-0 ${done ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate text-sm sm:text-base">{task.title}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-slate-400">👤 {task.assigned_to}</span>
                      <span className="text-xs text-slate-300 hidden sm:inline">·</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">📅 {formatDate(task.created_at)}</span>
                      {task.photos > 0 && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">🖼️ {task.photos}</span>
                        </>
                      )}
                    </div>
                    {/* Date shown below on mobile */}
                    <div className="text-xs text-slate-400 mt-0.5 sm:hidden">📅 {formatDate(task.created_at)}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${sec.bg} ${sec.text}`}>{sec.label}</span>
                    <span className={`text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${pri.bg} ${pri.text} hidden sm:inline`}>{pri.label}</span>
                    <span className={`text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {done ? '✅ เสร็จ' : '⏳ ทำอยู่'}
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
