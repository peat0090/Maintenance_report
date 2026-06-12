import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const priorityOptions = [
  { value: 'low',      label: 'Low',       active: 'bg-zinc-700 text-zinc-100 border-zinc-600' },
  { value: 'medium',   label: 'Medium',    active: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { value: 'high',     label: 'High',         active: 'bg-orange-500/20 text-orange-300 border-orange-500/60' },
  { value: 'critical', label: 'Urgent',    active: 'bg-red-500/20 text-red-300 border-red-500/60' },
]

const statusOptions = [
  { value: 'pending',     label: 'Pending', active: 'bg-zinc-700 text-zinc-100 border-zinc-600' },
  { value: 'in_progress', label: 'In Progress',     active: 'bg-orange-500/20 text-orange-300 border-orange-500/60' },
  { value: 'done',        label: 'Done',   active: 'bg-emerald-500/2<PASSWORD> text-emerald-3<PASSWORD> border-emerald-5<PASSWORD>' },
]

const canEditTask = (user, task) => {
  if (!user || !task) return false
  const role        = user.role?.toLowerCase()
  const userSection = user.section?.toLowerCase()
  const taskSection = task.section?.toLowerCase()
  if (role === 'admin')      return true
  if (role === 'viewer')     return false
  if (role === 'planner') return userSection === taskSection
  if (userSection !== taskSection) return false
  if (role === 'manager')    return true
  if (role === 'technician') return user.fullname === task.assigned_to || user.id === task.created_by
  return false
}

const getEditBlockReason = (user, task) => {
  if (!user || !task) return 'No user or task data available'
  const role        = user.role?.toLowerCase()
  const userSection = user.section?.toLowerCase()
  const taskSection = task.section?.toLowerCase()
  if (role === 'viewer')  return 'Your account has read-only access'
  if (role === 'planner') return `You are in the ${user.section} department and cannot edit tasks from the ${task.section} department`
  if (userSection !== taskSection) return `You are in the ${user.section} department and cannot edit tasks from the ${task.section} department`
  if (role === 'technician') return 'You can only edit tasks assigned to you'
  return 'You do not have permission to edit this task'
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, can } = useAuth()

  const [task, setTask]         = useState(null)
  const [photos, setPhotos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)
  const [form, setForm]         = useState({})
  const [newPhotos, setNewPhotos]       = useState([])
  const [newPhotoType, setNewPhotoType] = useState('progress')

  const [members, setMembers]               = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    if (!editing || !form.section) return
    const fetchMembers = async () => {
      setLoadingMembers(true)
      const { data } = await supabase
        .from('users')
        .select('id, fullname')
        .eq('section', form.section)
        .ilike('role', 'technician')
        .order('fullname', { ascending: true })
      setMembers(data || [])
      setLoadingMembers(false)
    }
    fetchMembers()
  }, [editing, form.section])

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true)
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks').select('*').eq('id', id).single()
      if (taskErr) { setError(taskErr.message); setLoading(false); return }

      const { data: photoData } = await supabase
        .from('task_photos').select('*').eq('task_id', id)
        .order('created_at', { ascending: true })

      setTask(taskData)
      setForm({
        title:       taskData.title,
        description: taskData.description || '',
        section:     taskData.section,
        assigned_to: taskData.assigned_to,
        priority:    taskData.priority,
        status:      taskData.status,
        start_date:  taskData.start_date || '',
        end_date:    taskData.end_date   || '',
      })
      setPhotos(photoData || [])
      setLoading(false)
    }
    fetchTask()
  }, [id])

  const handleSave = async () => {
    if (!canEditTask(user, task)) { setError('You do not have permission to edit this task'); return }
    setSaving(true)
    setError(null)
    try {
      const { error: updateErr } = await supabase.from('tasks').update({
        title: form.title, description: form.description || null,
        section: form.section, assigned_to: form.assigned_to,
        priority: form.priority, status: form.status,
        start_date: form.start_date || null, end_date: form.end_date || null,
      }).eq('id', id)
      if (updateErr) throw updateErr

      if (newPhotos.length > 0) {
        const uploaded = await Promise.all(newPhotos.map(async (photo) => {
          const ext      = photo.file.name.split('.').pop()
          const fileName = `${id}/${Date.now()}_${photo.type}.${ext}`
          const { error: uploadErr } = await supabase.storage
            .from('task-photos').upload(fileName, photo.file, { cacheControl: '3600', upsert: false })
          if (uploadErr) throw uploadErr
          const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(fileName)
          return { task_id: id, photo_url: urlData.publicUrl, photo_type: photo.type }
        }))
        const { error: photoErr } = await supabase.from('task_photos').insert(uploaded)
        if (photoErr) throw photoErr
      }

      const { data: refreshedPhotos } = await supabase
        .from('task_photos').select('*').eq('task_id', id)
        .order('created_at', { ascending: true })

      setPhotos(refreshedPhotos || [])
      setTask(prev => ({ ...prev, ...form }))
      setNewPhotos([])
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Confirm delete this task?')) return
    setDeleting(true)
    if (photos.length > 0) {
      const paths = photos.map(p => p.photo_url.split('/task-photos/')[1]).filter(Boolean)
      if (paths.length > 0) await supabase.storage.from('task-photos').remove(paths)
    }
    await supabase.from('task_photos').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    navigate('/')
  }

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('Confirm delete this photo?')) return
    const path = photo.photo_url.split('/task-photos/')[1]
    if (path) await supabase.storage.from('task-photos').remove([path])
    await supabase.from('task_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  const handleNewPhotos = (e) => {
    const files = Array.from(e.target.files)
    setNewPhotos(prev => [...prev, ...files.map(file => ({
      file, url: URL.createObjectURL(file), name: file.name, type: newPhotoType,
    }))])
    e.target.value = ''
  }

  const photoTypeBadge = (type) => type === 'before' ? 'bg-orange-400' : type === 'after' ? 'bg-emerald-400' : 'bg-sky-400'
  const photoTypeLabel = (type) => type === 'before' ? 'Before' : type === 'after' ? 'After' : 'In Progress'
  const formatDate = (d) => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
  }) : '-'

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif] flex items-center justify-center">
      <div className="text-zinc-500 animate-pulse text-sm tracking-widest uppercase">◌ Loading...</div>
    </div>
  )
  if (error && !task) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif] flex items-center justify-center px-4">
      <div className="text-red-400 text-sm text-center">⚠ {error}</div>
    </div>
  )

  const statusInfo = statusOptions.find(s => s.value === (editing ? form.status : task.status))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif]">

      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
        <Link to="/" className="text-zinc-500 hover:text-orange-400 transition text-sm tracking-wider shrink-0">← Back</Link>
        <div className="h-5 w-px bg-zinc-800" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-mono text-zinc-600 tracking-widest hidden sm:inline">[TASK]</span>
          <h1 className="font-medium truncate text-sm sm:text-base">{task.title}</h1>
        </div>

        {canEditTask(user, task) ? (
          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); setNewPhotos([]) }}
                  className="px-3 sm:px-4 py-2 rounded-sm border border-zinc-800 text-zinc-400 text-xs tracking-wider uppercase hover:bg-zinc-900 transition"
                >Cancel</button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="px-3 sm:px-4 py-2 rounded-sm bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold tracking-wider uppercase disabled:opacity-60 transition"
                >
                  {saving ? '...' : '✓ Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-3 sm:px-4 py-2 rounded-sm bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold tracking-wider uppercase transition"
              >✎ Edit</button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-900/60 text-red-400 rounded-sm px-2.5 py-1.5 text-[11px] font-medium shrink-0">
            <span>⛔</span>
            <span className="hidden sm:inline truncate max-w-xs">{getEditBlockReason(user, task)}</span>
          </div>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 rounded-sm px-4 py-3 text-sm flex items-center gap-2">
            ✓ Save successful
          </div>
        )}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-sm px-4 py-3 text-sm">⚠ {error}</div>
        )}

        {/* Task Information */}
        <div className="bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <h2 className="font-medium flex items-center gap-3 text-sm">
              <span className="w-6 h-6 bg-orange-500 text-zinc-950 rounded-sm flex items-center justify-center text-xs font-bold">1</span>
              <span className="tracking-wider uppercase text-zinc-300">Task Information</span>
            </h2>
            {!editing && statusInfo && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm ${
                task.status === 'done' ? 'bg-emerald-500/15 text-emerald-400' :
                task.status === 'in_progress' ? 'bg-orange-500/15 text-orange-400' : 'bg-zinc-800 text-zinc-400'
              }`}>● {statusInfo.label}</span>
            )}
          </div>

          <div className="p-5 sm:p-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Task Name <span className="text-orange-500">*</span></label>
                <input type="text" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}/>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Description</label>
                <textarea value={form.description} rows={3}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={inputCls + " resize-none"}/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Section</label>
                  <select value={form.section}
                    onChange={e => setForm(p => ({ ...p, section: e.target.value, assigned_to: '' }))}
                    className={inputCls}
                  >
                    <option value="Hydraulic">Hydraulic</option>
                    <option value="Mechatronic">Mechatronic</option>
                    <option value="Mechanic">Mechanic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Assigned To</label>
                  <select value={form.assigned_to} disabled={loadingMembers}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                    className={inputCls + " disabled:opacity-60"}
                  >
                    <option value="">{loadingMembers ? 'Loading...' : '— Select Technician —'}</option>
                    {members.map(m => (
                      <option key={m.id} value={m.fullname}>{m.fullname}</option>
                    ))}
                    {!loadingMembers && members.length === 0 && (
                      <option disabled>No technicians found in {form.section}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {priorityOptions.map(p => (
                    <button type="button" key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                      className={`px-3 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition border ${
                        form.priority === p.value ? p.active : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map(s => (
                    <button type="button" key={s.value}
                      onClick={() => setForm(prev => ({ ...prev, status: s.value }))}
                      className={`px-3 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition border ${
                        form.status === s.value ? s.active : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">Start Date</label>
                  <input type="datetime-local" value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className={inputCls + " [color-scheme:dark]"}/>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">End Date</label>
                  <input type="datetime-local" value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className={inputCls + " [color-scheme:dark]"}/>
                </div>
              </div>
            </div>

          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Task Name</p>
                <p className="text-zinc-100 font-medium text-base sm:text-lg">{task.title}</p>
              </div>
              {task.description && (
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Description</p>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{task.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-zinc-800">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Section</p>
                  <p className="text-zinc-200 text-sm font-medium">{task.section}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Assigned To</p>
                  <p className="text-zinc-200 text-sm font-medium">{task.assigned_to}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Priority</p>
                  <p className="text-zinc-200 text-sm font-medium">{priorityOptions.find(p => p.value === task.priority)?.label || task.priority}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Created Date</p>
                  <p className="text-zinc-200 text-sm font-mono">{formatDate(task.created_at)}</p>
                </div>
                {task.start_date && (
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">Start Date</p>
                    <p className="text-zinc-200 text-sm font-mono">{formatDate(task.start_date)}</p>
                  </div>
                )}
                {task.end_date && (
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-zinc-600 mb-1">End Date</p>
                    <p className="text-zinc-200 text-sm font-mono">{formatDate(task.end_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* รูปภาพ */}
        <div className="bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <h2 className="font-medium flex items-center gap-3 text-sm">
              <span className="w-6 h-6 bg-orange-500 text-zinc-950 rounded-sm flex items-center justify-center text-xs font-bold">2</span>
              <span className="tracking-wider uppercase text-zinc-300">Image Gallery</span>
            </h2>
            <span className="text-[10px] font-mono text-zinc-600">{photos.length} ITEMS</span>
          </div>
          <div className="p-5 sm:p-6">
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-sm overflow-hidden aspect-square bg-zinc-950 border border-zinc-800">
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover"/>
                  <div className={`absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm text-zinc-950 ${photoTypeBadge(photo.photo_type)}`}>
                    {photoTypeLabel(photo.photo_type)}
                  </div>
                  {editing && (
                    <button onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-sm text-xs opacity-0 group-hover:opacity-100 active:opacity-100 transition flex items-center justify-center"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !editing && <p className="text-zinc-600 text-sm text-center py-6 tracking-wider uppercase">No images available</p>
          )}

          {editing && (
            <div className="mt-2">
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {[
                  { value: 'before',   label: 'Before',   color: 'border-orange-500 bg-orange-500/15 text-orange-300' },
                  { value: 'progress', label: 'In Progress',  color: 'border-sky-500 bg-sky-500/15 text-sky-300' },
                  { value: 'after',    label: 'After',   color: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
                ].map(t => (
                  <button type="button" key={t.value} onClick={() => setNewPhotoType(t.value)}
                    className={`px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap shrink-0 border ${
                      newPhotoType === t.value ? t.color : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
              <label className="block border border-dashed border-zinc-700 hover:border-orange-500 rounded-sm p-6 text-center cursor-pointer hover:bg-orange-500/5 transition group">
                <input type="file" multiple accept="image/*" onChange={handleNewPhotos} className="hidden"/>
                <div className="text-3xl mb-1 text-zinc-600 group-hover:text-orange-500 group-hover:scale-110 transition">◫</div>
                <p className="text-zinc-300 text-sm tracking-wider uppercase">Tap to add images</p>
              </label>
              {newPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
                  {newPhotos.map((p, i) => (
                    <div key={i} className="relative group rounded-sm overflow-hidden aspect-square bg-zinc-950 border border-zinc-800">
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover"/>
                      <div className={`absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm text-zinc-950 ${photoTypeBadge(p.type)}`}>
                        {photoTypeLabel(p.type)}
                      </div>
                      <button onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-sm text-xs opacity-0 group-hover:opacity-100 active:opacity-100 transition flex items-center justify-center"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {can('delete') && !editing && (
          <div className="flex justify-end pb-8">
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 rounded-sm bg-red-950/40 text-red-300 border border-red-900/60 text-xs font-bold uppercase tracking-wider hover:bg-red-900/40 disabled:opacity-60 transition"
            >{deleting ? '◌ Deleting...' : '⌦ Delete Task'}</button>
          </div>
        )}

      </div>
    </div>
  )
}
