import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useTranslation } from 'react-i18next'

export default function AddBorrowPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    item_name: '',
    quantity:  1,
    borrower:  user.fullname || '',
    section:   user.section || 'Hydraulic',
    purpose:   '',
    due_date:  '',
  })

  const [photos, setPhotos]         = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }))
  }

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files)
    setPhotos(prev => [...prev, ...files.map(file => ({
      file, url: URL.createObjectURL(file), name: file.name,
    }))])
    e.target.value = ''
  }

  const removePhoto = (index) => setPhotos(prev => prev.filter((_, i) => i !== index))

  const uploadPhoto = async (photo, borrowId) => {
    const ext = photo.file.name.split('.').pop()
    const fileName = `${borrowId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('borrow-photos').upload(fileName, photo.file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('borrow-photos').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { data: borrow, error: insertError } = await supabase
        .from('borrowed_items')
        .insert([{
          item_name:   form.item_name,
          quantity:    form.quantity || 1,
          borrower:    form.borrower,
          section:     form.section,
          purpose:     form.purpose || null,
          due_date:    form.due_date || null,
          borrow_date: new Date().toISOString(),
          status:      'borrowed',
          created_by:  user.id,
        }]).select().single()
      if (insertError) throw insertError

      if (photos.length > 0) {
        const uploaded = await Promise.all(
          photos.map(async (photo) => ({
            borrow_id: borrow.id, photo_url: await uploadPhoto(photo, borrow.id),
          }))
        )
        const { error: photoError } = await supabase.from('borrow_photos').insert(uploaded)
        if (photoError) throw photoError
      }

      setSubmitted(true)
      setTimeout(() => navigate('/borrow'), 1500)
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
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">{t('borrow_recorded')}</h2>
          <p className="text-zinc-500 text-sm tracking-wider uppercase">{t('redirecting')}</p>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif]">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
        <Link to="/borrow" className="text-zinc-500 hover:text-orange-400 transition text-sm tracking-wider">← {t('back')}</Link>
        <div className="h-5 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-600 tracking-widest hidden sm:inline">[BORROW]</span>
          <h1 className="font-medium text-sm sm:text-base tracking-tight">{t('new_borrow_record')}</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-sm px-4 py-3 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
              <h2 className="font-medium flex items-center gap-3 text-sm">
                <span className="w-6 h-6 bg-orange-500 text-zinc-950 rounded-sm flex items-center justify-center text-xs font-bold">1</span>
                <span className="tracking-wider uppercase text-zinc-300">{t('item_info')}</span>
              </h2>
              <span className="text-[10px] font-mono text-zinc-600">// BORROW</span>
            </div>
            <div className="p-5 sm:p-6 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('item_name')} <span className="text-orange-500">*</span>
                  </label>
                  <input type="text" name="item_name" value={form.item_name} onChange={handleChange} required
                    placeholder={t('item_name')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('quantity')} <span className="text-orange-500">*</span>
                  </label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min={1}
                    className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('borrower')} <span className="text-orange-500">*</span>
                  </label>
                  <input type="text" name="borrower" value={form.borrower} onChange={handleChange} required
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">
                    {t('section')} <span className="text-orange-500">*</span>
                  </label>
                  <select name="section" value={form.section} onChange={handleChange} className={inputCls}>
                    <option value="Hydraulic">Hydraulic</option>
                    <option value="Mechatronic">Mechatronic</option>
                    <option value="Mechanic">Mechanic</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('purpose')}</label>
                <textarea name="purpose" value={form.purpose} onChange={handleChange} rows={3}
                  placeholder={t('purpose')} className={inputCls + " resize-none"} />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('due_date')}</label>
                <input type="datetime-local" name="due_date" value={form.due_date} onChange={handleChange} className={inputCls + " scheme-dark"} />
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

              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-orange-500 rounded-sm py-6 text-center cursor-pointer hover:bg-orange-500/5 transition group">
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotos} className="hidden" />
                  <div className="text-2xl text-zinc-600 group-hover:text-orange-500 group-hover:scale-110 transition">📷</div>
                  <p className="text-zinc-300 text-xs tracking-wider uppercase">{t('take_photo')}</p>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-orange-500 rounded-sm py-6 text-center cursor-pointer hover:bg-orange-500/5 transition group">
                  <input type="file" multiple accept="image/*" onChange={handlePhotos} className="hidden" />
                  <div className="text-2xl text-zinc-600 group-hover:text-orange-500 group-hover:scale-110 transition">◫</div>
                  <p className="text-zinc-300 text-xs tracking-wider uppercase">{t('choose_from_gallery')}</p>
                </label>
              </div>
              <p className="text-zinc-600 text-[11px] font-mono mb-1">JPG · PNG · WEBP — MAX 10MB</p>

              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] tracking-wider uppercase text-zinc-500 mb-3">{t('selected_images')} ({photos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative group rounded-sm overflow-hidden aspect-square bg-zinc-950 border border-zinc-800">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
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
            <Link to="/borrow" className="flex-1 py-3 rounded-sm border border-zinc-800 text-zinc-400 font-semibold text-center text-sm uppercase tracking-wider hover:bg-zinc-900 hover:text-zinc-200 transition">
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
