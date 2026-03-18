import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function AddTaskPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title:       '',
    description: '',
    section:     user.section || 'hydraulic',
    assigned_to: '',
    priority:    'medium',
    start_date:  '',
    end_date:    '',
  })

  const [photos, setPhotos]       = useState([])
  const [photoType, setPhotoType] = useState('before')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)

  const members = {
    hydraulic:   ['ประสิทธิ์ มานะ', 'สมศักดิ์ แก้วใส', 'รัตนา พรมดี'],
    mechatronic: ['วิชัย สุขสันต์', 'กมล รุ่งเรือง', 'นภา ท้าวมา'],
    mechanic:    ['อนันต์ ดีงาม', 'ธนา ศรีสุข', 'พิมพ์ ใจงาม'],
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files)
    const newPhotos = files.map(file => ({
      file,
      url:  URL.createObjectURL(file),
      name: file.name,
      type: photoType,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ========================================
  // อัปโหลดรูปภาพไปยัง Supabase Storage
  // ========================================
  const uploadPhoto = async (photo, taskId) => {
    const ext      = photo.file.name.split('.').pop()
    const fileName = `${taskId}/${Date.now()}_${photo.type}.${ext}`

    const { error } = await supabase.storage
  .from('task-photos')
  .upload(fileName, photo.file, { cacheControl: '3600', upsert: false })

    if (error) throw error

    // ดึง public URL
    const { data: urlData } = supabase.storage
      .from('task-photos')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  // ========================================
  // Submit: บันทึกงาน + รูปภาพ
  // ========================================
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // 1. Insert task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title:       form.title,
          description: form.description || null,
          section:     form.section,
          assigned_to: form.assigned_to,
          priority:    form.priority,
          start_date:  form.start_date  || null,
          end_date:    form.end_date    || null,
          status:      'pending',
        }])
        .select()
        .single()

      if (taskError) throw taskError

      // 2. อัปโหลดรูปภาพ (ถ้ามี)
      if (photos.length > 0) {
        const uploadedPhotos = await Promise.all(
          photos.map(async (photo) => {
            const photoUrl = await uploadPhoto(photo, task.id)
            return {
              task_id:    task.id,
              photo_url:  photoUrl,
              photo_type: photo.type,
            }
          })
        )

        const { error: photoError } = await supabase
          .from('task_photos')
          .insert(uploadedPhotos)

        if (photoError) throw photoError
      }

      // 3. สำเร็จ
      setSubmitted(true)
      setTimeout(() => navigate('/'), 2000)

    } catch (err) {
      console.error('Error saving task:', err)
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  // ========================================
  // หน้าสำเร็จ
  // ========================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">บันทึกงานสำเร็จ!</h2>
          <p className="text-slate-400">กำลังกลับไปหน้า Dashboard...</p>
        </div>
      </div>
    )
  }

  // ========================================
  // UI
  // ========================================
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
        <Link to="/" className="text-slate-400 hover:text-slate-600 transition">
          ← กลับ
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h1 className="font-bold text-slate-800">เพิ่มงานใหม่</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* แสดง Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ข้อมูลงาน */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm">1</span>
              ข้อมูลงาน
            </h2>

            <div className="space-y-4">
              {/* ชื่องาน */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ชื่องาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="เช่น ซ่อมปั๊มไฮดรอลิก Line A"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
              </div>

              {/* รายละเอียด */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รายละเอียด</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="อธิบายปัญหา วิธีการซ่อม อุปกรณ์ที่ใช้ ฯลฯ"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                />
              </div>

              {/* แผนก + ผู้รับผิดชอบ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    แผนก <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="section"
                    value={form.section}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white"
                  >
                    <option value="hydraulic">💧 Hydraulic</option>
                    <option value="mechatronic">⚡ Mechatronic</option>
                    <option value="mechanic">⚙️ Mechanic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ผู้รับผิดชอบ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="assigned_to"
                    value={form.assigned_to}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white"
                  >
                    <option value="">-- เลือกช่าง --</option>
                    {members[form.section].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ความเร่งด่วน</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'low',      label: 'ต่ำ',        bg: 'bg-slate-100',  active: 'bg-slate-500 text-white',  text: 'text-slate-600' },
                    { value: 'medium',   label: 'ปานกลาง',    bg: 'bg-blue-50',    active: 'bg-blue-500 text-white',   text: 'text-blue-600' },
                    { value: 'high',     label: 'สูง',         bg: 'bg-orange-50',  active: 'bg-orange-500 text-white', text: 'text-orange-600' },
                    { value: 'critical', label: '🚨 เร่งด่วน', bg: 'bg-red-50',     active: 'bg-red-500 text-white',    text: 'text-red-600' },
                  ].map(p => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                        form.priority === p.value
                          ? p.active + ' border-transparent shadow-sm'
                          : p.bg + ' ' + p.text + ' border-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* วันที่ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">วันที่เริ่ม</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">วันที่คาดว่าเสร็จ</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* อัปโหลดรูปภาพ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm">2</span>
              รูปภาพประกอบ
            </h2>

            {/* เลือกประเภทรูป */}
            <div className="flex gap-2 mb-4">
              {[
                { value: 'before',   label: '📷 ก่อนซ่อม',         color: 'bg-orange-500' },
                { value: 'progress', label: '🔧 ระหว่างดำเนินการ',  color: 'bg-blue-500' },
                { value: 'after',    label: '✅ หลังซ่อม',          color: 'bg-green-500' },
              ].map(t => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setPhotoType(t.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                    photoType === t.value
                      ? t.color + ' text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotos}
                className="hidden"
              />
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🖼️</div>
              <p className="text-slate-500 text-sm">คลิกเพื่อเลือกรูป หรือลากวางไฟล์ที่นี่</p>
              <p className="text-slate-300 text-xs mt-1">รองรับ JPG, PNG, WEBP — สูงสุด 10MB ต่อไฟล์</p>
            </label>

            {/* Preview รูปที่เลือก */}
            {photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-600 mb-3">รูปที่เลือก ({photos.length} รูป)</p>
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <div className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
                        photo.type === 'before'   ? 'bg-orange-500' :
                        photo.type === 'after'    ? 'bg-green-500'  : 'bg-blue-500'
                      }`}>
                        {photo.type === 'before' ? 'ก่อน' : photo.type === 'after' ? 'หลัง' : 'ระหว่าง'}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                        {photo.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ปุ่ม Submit */}
          <div className="flex gap-3">
            <Link
              to="/"
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-center hover:bg-slate-50 transition"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-semibold transition shadow-lg"
            >
              {submitting ? '⏳ กำลังบันทึก...' : '✅ บันทึกงาน'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
