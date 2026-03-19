import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const priorityOptions = [
  { value: 'low',      label: 'ต่ำ',        bg: 'bg-slate-100',  active: 'bg-slate-500 text-white',  text: 'text-slate-600' },
  { value: 'medium',   label: 'ปานกลาง',    bg: 'bg-blue-50',    active: 'bg-blue-500 text-white',   text: 'text-blue-600' },
  { value: 'high',     label: 'สูง',         bg: 'bg-orange-50',  active: 'bg-orange-500 text-white', text: 'text-orange-600' },
  { value: 'critical', label: '🚨 เร่งด่วน', bg: 'bg-red-50',     active: 'bg-red-500 text-white',    text: 'text-red-600' },
]

const statusOptions = [
  { value: 'pending',     label: '📋 รอดำเนินการ', bg: 'bg-slate-100',  active: 'bg-slate-500 text-white', text: 'text-slate-600' },
  { value: 'in_progress', label: '⏳ กำลังทำ',     bg: 'bg-amber-50',   active: 'bg-amber-500 text-white', text: 'text-amber-600' },
  { value: 'done',        label: '✅ เสร็จแล้ว',   bg: 'bg-green-50',   active: 'bg-green-500 text-white', text: 'text-green-600' },
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
  if (!user || !task) return 'ไม่พบข้อมูล'
  const role        = user.role?.toLowerCase()
  const userSection = user.section?.toLowerCase()
  const taskSection = task.section?.toLowerCase()
  if (role === 'viewer')  return 'บัญชีของคุณมีสิทธิ์ดูข้อมูลอย่างเดียว'
  if (role === 'planner') return `คุณอยู่ฝ่าย ${user.section} ไม่สามารถแก้ไขงานฝ่าย ${task.section} ได้`
  if (userSection !== taskSection) return `คุณอยู่ฝ่าย ${user.section} ไม่สามารถแก้ไขงานฝ่าย ${task.section} ได้`
  if (role === 'technician') return 'คุณสามารถแก้ไขได้เฉพาะงานที่ได้รับมอบหมายให้คุณเท่านั้น'
  return 'ไม่มีสิทธิ์แก้ไขงานนี้'
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

  // ─── ดึง Technician ตาม section จาก Supabase ─────────────
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
        .ilike('role', 'technician')        // เฉพาะ Technician
        .order('fullname', { ascending: true })
      setMembers(data || [])
      setLoadingMembers(false)
    }
    fetchMembers()
  }, [editing, form.section])
  // ────────────────────────────────────────────────────────

  // โหลดข้อมูล task
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
    if (!canEditTask(user, task)) { setError('คุณไม่มีสิทธิ์แก้ไขงานนี้'); return }
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
    if (!window.confirm('ยืนยันลบงานนี้?')) return
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
    if (!window.confirm('ลบรูปนี้?')) return
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

  const photoTypeBadge = (type) => type === 'before' ? 'bg-orange-500' : type === 'after' ? 'bg-green-500' : 'bg-blue-500'
  const photoTypeLabel = (type) => type === 'before' ? 'ก่อน' : type === 'after' ? 'หลัง' : 'ระหว่าง'
  const formatDate = (d) => d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric',hour: '2-digit', minute: '2-digit',timeZone: 'Asia/Bangkok'}):'-'

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 animate-pulse text-lg">⏳ กำลังโหลด...</div>
    </div>
  )
  if (error && !task) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-red-500">⚠️ {error}</div>
    </div>
  )

  const statusInfo = statusOptions.find(s => s.value === (editing ? form.status : task.status))

  return (
    <div className="min-h-screen bg-slate-50">

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
        <Link to="/" className="text-slate-400 hover:text-slate-600 transition">← กลับ</Link>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">📋</span>
          <h1 className="font-bold text-slate-800 truncate">{task.title}</h1>
        </div>
        {canEditTask(user, task) ? (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setNewPhotos([]) }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
                >ยกเลิก</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 disabled:opacity-60 transition"
                >{saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition"
              >✏️ แก้ไข</button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-xs font-medium">
            <span>⛔</span><span>{getEditBlockReason(user, task)}</span>
          </div>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ✅ บันทึกเรียบร้อยแล้ว
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
        )}

        {/* ข้อมูลงาน */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm">1</span>
              ข้อมูลงาน
            </h2>
            {!editing && statusInfo && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                task.status === 'done' ? 'bg-green-100 text-green-700' :
                task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>{statusInfo.label}</span>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่องาน <span className="text-red-500">*</span></label>
                <input type="text" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รายละเอียด</label>
                <textarea value={form.description} rows={3}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"/>
              </div>

              {/* แผนก + ผู้รับผิดชอบ — ดึงจาก Supabase */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">แผนก</label>
                  <select value={form.section}
                    onChange={e => setForm(p => ({ ...p, section: e.target.value, assigned_to: '' }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition"
                  >
                    <option value="Hydraulic">💧 Hydraulic</option>
                    <option value="Mechatronic">⚡ Mechatronic</option>
                    <option value="Mechanic">⚙️ Mechanic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ผู้รับผิดชอบ</label>
                  <select value={form.assigned_to} disabled={loadingMembers}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white disabled:opacity-60 transition"
                  >
                    <option value="">
                      {loadingMembers ? '⏳ กำลังโหลด...' : '-- เลือกช่าง --'}
                    </option>
                    {members.map(m => (
                      <option key={m.id} value={m.fullname}>{m.fullname}</option>
                    ))}
                    {!loadingMembers && members.length === 0 && (
                      <option disabled>ไม่พบช่างใน {form.section}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ความเร่งด่วน</label>
                <div className="flex gap-2 flex-wrap">
                  {priorityOptions.map(p => (
                    <button type="button" key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                        form.priority === p.value ? p.active + ' border-transparent shadow-sm' : p.bg + ' ' + p.text + ' border-slate-200'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">สถานะ</label>
                <div className="flex gap-2 flex-wrap">
                  {statusOptions.map(s => (
                    <button type="button" key={s.value}
                      onClick={() => setForm(prev => ({ ...prev, status: s.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                        form.status === s.value ? s.active + ' border-transparent shadow-sm' : s.bg + ' ' + s.text + ' border-slate-200'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              {/* วันที่ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">วันที่เริ่ม</label>
                  <input type="datetime-local" value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">วันที่คาดว่าเสร็จ</label>
                  <input type="datetime-local" value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>
                </div>
              </div>
            </div>

          ) : (
            /* View Mode */
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">ชื่องาน</p>
                <p className="text-slate-800 font-semibold">{task.title}</p>
              </div>
              {task.description && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">รายละเอียด</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{task.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">แผนก</p>
                  <p className="text-slate-700">{task.section}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ผู้รับผิดชอบ</p>
                  <p className="text-slate-700">{task.assigned_to}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ความเร่งด่วน</p>
                  <p className="text-slate-700">{priorityOptions.find(p => p.value === task.priority)?.label || task.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">วันที่บันทึก</p>
                  <p className="text-slate-700">{formatDate(task.created_at)}</p>
                </div>
                {task.start_date && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">วันที่เริ่ม</p>
                    <p className="text-slate-700">{formatDate(task.start_date)}</p>
                  </div>
                )}
                {task.end_date && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">วันที่คาดว่าเสร็จ</p>
                    <p className="text-slate-700">{formatDate(task.end_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* รูปภาพ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm">2</span>
            รูปภาพประกอบ ({photos.length} รูป)
          </h2>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover"/>
                  <div className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${photoTypeBadge(photo.photo_type)}`}>
                    {photoTypeLabel(photo.photo_type)}
                  </div>
                  {editing && (
                    <button onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !editing && <p className="text-slate-400 text-sm text-center py-6">ไม่มีรูปภาพ</p>
          )}

          {editing && (
            <div className="mt-2">
              <div className="flex gap-2 mb-3">
                {[
                  { value: 'before',   label: '📷 ก่อนซ่อม',        color: 'bg-orange-500' },
                  { value: 'progress', label: '🔧 ระหว่างดำเนินการ', color: 'bg-blue-500' },
                  { value: 'after',    label: '✅ หลังซ่อม',         color: 'bg-green-500' },
                ].map(t => (
                  <button type="button" key={t.value} onClick={() => setNewPhotoType(t.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                      newPhotoType === t.value ? t.color + ' text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group">
                <input type="file" multiple accept="image/*" onChange={handleNewPhotos} className="hidden"/>
                <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🖼️</div>
                <p className="text-slate-500 text-sm">คลิกเพื่อเพิ่มรูป</p>
              </label>
              {newPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {newPhotos.map((p, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover"/>
                      <div className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${photoTypeBadge(p.type)}`}>
                        {photoTypeLabel(p.type)}
                      </div>
                      <button onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {can('delete') && !editing && (
          <div className="flex justify-end">
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 disabled:opacity-60 transition"
            >{deleting ? '⏳ กำลังลบ...' : '🗑️ ลบงานนี้'}</button>
          </div>
        )}

      </div>
    </div>
  )
}
