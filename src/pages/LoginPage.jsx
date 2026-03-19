import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// role ใน DB มีทั้ง Admin/Manager/Technician/Planner/viewer (ไม่สม่ำเสมอ)
// แสดงสีตาม lowercase
const roleColor = {
  admin:      'text-red-300',
  manager:    'text-amber-300',
  planner:    'text-purple-300',
  technician: 'text-blue-300',
  viewer:     'text-slate-300',
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [testUsers, setTestUsers] = useState([])

  useEffect(() => {
const fetchUsers = async () => {
  const { data } = await supabase
    .from('users')
    .select('email, fullname, role, section')
    .eq('fullname', 'View 1')   // ← เพิ่มบรรทัดนี้

  if (data) setTestUsers(data)
}
    fetchUsers()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Maintenance Report</h1>
          <p className="text-slate-400 text-sm mt-1">ระบบรายงานงานซ่อมบำรุง</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">เข้าสู่ระบบ</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg px-4 py-3 text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">อีเมล</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">รหัสผ่าน</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-all shadow-lg"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-slate-400 text-xs mb-3">👤 บัญชีทดสอบ (password: 1234)</p>
            <div className="space-y-2">
              {testUsers.length === 0 ? (
                <p className="text-slate-500 text-xs animate-pulse">กำลังโหลด...</p>
              ) : (
                testUsers.map(u => (
                  <div
                    key={u.email}
                    onClick={() => { setEmail(u.email); setPassword('1234') }}
                    className="flex justify-between items-center text-xs cursor-pointer group rounded-lg px-2 py-1 hover:bg-white/5 transition"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-slate-300 group-hover:text-white transition truncate font-medium">
                        {u.fullname}
                      </span>
                      <span className="text-slate-500 truncate">{u.email}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                      <span className={`font-semibold ${roleColor[u.role?.toLowerCase()] ?? 'text-slate-300'}`}>
                        {u.role}
                      </span>
                      {u.section && (
                        <span className="text-slate-600">{u.section}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-slate-500 text-xs mt-2">💡 คลิกที่แถวเพื่อกรอกอัตโนมัติ</p>
          </div>
        </div>
      </div>
    </div>
  )
}
