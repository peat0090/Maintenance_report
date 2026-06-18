import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useTranslation } from 'react-i18next'

export default function AddTaskPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title:       '',
    description: '',
    section:     user.section || 'Hydraulic',
    assigned_to: '',
    priority:    'medium',
    start_date:  '',
    end_date:    '',
  })

  const [photos, setPhotos]         = useState([])
  const [photoType, setPhotoType]   = useState('before')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)
  const [members, setMembers]               = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true)
      setForm(prev => ({ ...prev, assigned_to: '' }))
      const { data } = await supabase
        .from('users').select('id, fullname, role')
        .eq('section', form.section).ilike('role', 'technician')
        .order('fullname', { ascending: true })
      setMembers(data || [])
      setLoadingMembers(false)
    }
    fetchMembers()
  }, [form.section])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files)
    setPhotos(prev => [...prev, ...files.map(file => ({
      file, url: URL.createObjectURL(file), name: file.name, type: photoType,
    }))])
    e.target.value = ''
  }

  const removePhoto = (index) => setPhotos(prev => prev.filter((_, i) => i !== index))

  const uploadPhoto = async (photo, taskId) => {
    const ext = photo.file.name.split('.').pop()
    const fileName = `${taskId}/${Date.now()}_${photo.type}.${ext}`
    const { error } = await supabase.storage.from('task-photos').upload(fileName, photo.file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: form.title, description: form.description || null,
          section: form.section, assigned_to: form.assigned_to,
          priority: form.priority, start_date: form.start_date || null,
          end_date: form.end_date || null, status: 'pending', created_by: user.id,
        }]).select().single()
      if (taskError) throw taskError

      if (photos.length > 0) {
        const uploaded = await Promise.all(
          photos.map(async (photo) => ({
            task_id: task.id, photo_url: await uploadPhoto(photo, task.id), photo_type: photo.type,
          }))
        )
        const { error: photoError } = await supabase.from('task_photos').insert(uploaded)
        if (photoError) throw photoError
      }

      // ส่งแจ้งเตือนเข้า Telegram (ไม่บล็อกการบันทึก ถ้าแจ้งเตือนพลาดก็ไม่ทำให้บันทึก task ล้มเหลว)
      supabase.functions.invoke('notify-new-task', {
        body: { task_id: task.id, event: 'created' },
      }).catch(err => console.warn('Telegram notify failed:', err))

      setSubmitted(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-sm bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl">✓</div>
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">{t('task_added')}</h2>
          <p className="text-zinc-500 text-sm tracking-wider uppercase">{t('redirecting')}</p>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"

  const photoTypeLabel = (type) =>
    type === 'before' ? t('photo_before') : type === 'after' ? t('photo_after') : t('photo_progress')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif]">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
        <Link to="/" className="text-zinc-500 hover:text-orange-400 transition text-sm tracking-wider">← {t('back')}</Link>
        <div className="h-5 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-600 tracking-widest hidden sm:inline">[NEW]</span>
          <h1 className="font-medium text-sm sm:text-base tracking-tight">{t('new_task')}</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-sm px-4 py-3 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Section 1: Task Information */}
          <div className="bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
              <h2 className="font-medium flex items-center gap-3 text-sm">
                <span className="w-6 h-6 bg-orange-500 text-zinc-950 rounded-sm flex items-center justify-center text-xs font-bold">1</span>
                <span className="tracking-wider uppercase text-zinc-300">{t('section_info')}</span>
              </h2>
              <span className="text-[10px] font-mono text-zinc-600">// TASK</span>
            </div>
            <div className="p-5 sm:p-6 space-y-4">

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                  {t('lbl_task_name')} <span className="text-orange-500">*</span>
                </label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required
                  placeholder={t('ph_task_name')} className={inputCls} />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('description')}</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                  placeholder={t('ph_description')} className={inputCls + " resize-none"} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('section')} <span className="text-orange-500">*</span>
                  </label>
                  <select name="section" value={form.section} onChange={handleChange} className={inputCls}>
                    <option value="Hydraulic">Hydraulic</option>
                    <option value="Mechatronic">Mechatronic</option>
                    <option value="Mechanic">Mechanic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('assigned_to')} <span className="text-orange-500">*</span>
                  </label>
                  <select name="assigned_to" value={form.assigned_to} onChange={handleChange} required
                    disabled={loadingMembers} className={inputCls + " disabled:opacity-60"}>
                    <option value="">{loadingMembers ? t('loading') : `— ${t('select_tech')} —`}</option>
                    {members.map(m => <option key={m.id} value={m.fullname}>{m.fullname}</option>)}
                    {!loadingMembers && members.length === 0 && (
                      <option disabled>{t('no_tech_in')} {form.section}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('priority')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'low',      label: t('pri_low'),    active: 'bg-zinc-700 text-zinc-100 border-zinc-600' },
                    { value: 'medium',   label: t('pri_medium'), active: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
                    { value: 'high',     label: t('pri_high'),   active: 'bg-orange-500/20 text-orange-300 border-orange-500/60' },
                    { value: 'critical', label: t('pri_urgent'), active: 'bg-red-500/20 text-red-300 border-red-500/60' },
                  ].map(p => (
                    <button type="button" key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                      className={`px-3 py-2.5 rounded-sm text-xs font-semibold tracking-wider uppercase transition border ${
                        form.priority === p.value ? p.active : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('start_date')}</label>
                  <input type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} className={inputCls + " scheme-dark"} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('end_date')}</label>
                  <input type="datetime-local" name="end_date" value={form.end_date} onChange={handleChange} className={inputCls + " scheme-dark"} />
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Photos */}
          <div className="bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
              <h2 className="font-medium flex items-center gap-3 text-sm">
                <span className="w-6 h-6 bg-orange-500 text-zinc-950 rounded-sm flex items-center justify-center text-xs font-bold">2</span>
                <span className="tracking-wider uppercase text-zinc-300">{t('section_photos')}</span>
              </h2>
              <span className="text-[10px] font-mono text-zinc-600">// MEDIA</span>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {[
                  { value: 'before',   label: t('photo_before'),   color: 'border-orange-500 bg-orange-500/15 text-orange-300' },
                  { value: 'progress', label: t('photo_progress'), color: 'border-sky-500 bg-sky-500/15 text-sky-300' },
                  { value: 'after',    label: t('photo_after'),    color: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
                ].map(tp => (
                  <button type="button" key={tp.value} onClick={() => setPhotoType(tp.value)}
                    className={`px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap shrink-0 border ${
                      photoType === tp.value ? tp.color : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >{tp.label}</button>
                ))}
              </div>
              <label className="block border border-dashed border-zinc-700 hover:border-orange-500 rounded-sm p-8 text-center cursor-pointer hover:bg-orange-500/5 transition group">
                <input type="file" multiple accept="image/*" onChange={handlePhotos} className="hidden" />
                <div className="text-3xl mb-2 text-zinc-600 group-hover:text-orange-500 group-hover:scale-110 transition">◫</div>
                <p className="text-zinc-300 text-sm tracking-wider uppercase">{t('tap_to_select')}</p>
                <p className="text-zinc-600 text-[11px] font-mono mt-1">JPG · PNG · WEBP — MAX 10MB</p>
              </label>
              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] tracking-wider uppercase text-zinc-500 mb-3">{t('selected_images')} ({photos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative group rounded-sm overflow-hidden aspect-square bg-zinc-950 border border-zinc-800">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                        <div className={`absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm text-zinc-950 ${
                          photo.type === 'before' ? 'bg-orange-400' : photo.type === 'after' ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}>{photoTypeLabel(photo.type)}</div>
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-sm text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        >✕</button>
                        <div className="absolute bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur text-zinc-300 text-[10px] font-mono p-1 truncate">{photo.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pb-8">
            <Link to="/" className="flex-1 py-3 rounded-sm border border-zinc-800 text-zinc-400 font-semibold text-center text-sm uppercase tracking-wider hover:bg-zinc-900 hover:text-zinc-200 transition">
              {t('cancel')}
            </Link>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-bold text-sm uppercase tracking-wider transition shadow-[0_8px_24px_-8px_rgba(255,122,26,0.5)] flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />{t('saving')}</>
                : t('save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
