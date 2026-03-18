import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600)) // จำลอง loading
    const result = login(email, password)
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

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Maintenance Report</h1>
          <p className="text-slate-400 text-sm mt-1">ระบบรายงานงานซ่อมบำรุง</p>
        </div>

        {/* Card */}
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
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-all shadow-lg"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* ตารางแสดง users ทดสอบ */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-slate-400 text-xs mb-3">👤 บัญชีทดสอบ (password ทุกคน: 1234)</p>
            <div className="space-y-1">
              {[
  { email: 'puttipong.peat@gmail.com', role: 'Admin',    color: 'text-red-300' },
  { email: 'prasit@maintenance.com',   role: 'Manager',  color: 'text-amber-300' },
  { email: 'Pitchayanan@mechatronics.com',  role: 'planner',  color: 'text-purple-300' },  // ← เพิ่ม
  { email: 'wichai@maintenance.com',   role: 'Technician', color: 'text-blue-300' },
  { email: 'kamon@maintenance.com',    role: 'Viewer',   color: 'text-slate-300' },
].map(u => (
  <div key={u.email} className="flex justify-between text-xs">
    <span
      className="text-slate-400 cursor-pointer hover:text-white transition"
      onClick={() => { setEmail(u.email); setPassword('1234') }}
    >
      {u.email}
    </span>
    <span className={`font-semibold ${u.color}`}>{u.role}</span>
  </div>
))}
            </div>
            <p className="text-slate-500 text-xs mt-2">💡 คลิกที่อีเมลเพื่อกรอกอัตโนมัติ</p>
          </div>
        </div>
      </div>
    </div>
  )
}