import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const roleColor = {
  admin:      'text-red-500',
  manager:    'text-amber-500',
  planner:    'text-purple-500',
  technician: 'text-blue-500',
  viewer:     'text-slate-400',
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
        .eq('fullname', 'View 1')
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f8f8f8, #ececec, #f8f8f8)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <img
            src="https://eest-es.b-cdn.net/wp-content/uploads/2021/06/eest_logo_maroon.png"
            alt="EEST Logo"
            className="w-48 sm:w-64 mb-4 sm:mb-5 mx-auto drop-shadow-sm"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Maintenance Report</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">ระบบรายงานงานซ่อมบำรุง</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-5 sm:mb-6 text-center">เข้าสู่ระบบ</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5 sm:mb-2">อีเมล</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5 sm:mb-2">รหัสผ่าน</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 sm:py-3 text-sm sm:text-base transition-all shadow-md mt-1 sm:mt-2"
              style={{ backgroundColor: '#6b2444' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#4a0000'}
              onMouseLeave={e => e.target.style.backgroundColor = '#6b2444'}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Test users */}
          <div className="mt-5 sm:mt-6 border-t border-slate-100 pt-3 sm:pt-4">
            <p className="text-slate-400 text-xs mb-2 sm:mb-3">👤 บัญชีทดสอบ (password: 1234)</p>
            <div className="space-y-0.5 sm:space-y-1">
              {testUsers.length === 0 ? (
                <p className="text-slate-300 text-xs animate-pulse">กำลังโหลด...</p>
              ) : (
                testUsers.map(u => (
                  <div
                    key={u.email}
                    onClick={() => { setEmail(u.email); setPassword('1234') }}
                    className="flex justify-between items-center text-xs cursor-pointer group rounded-lg px-2 py-1.5 hover:bg-slate-50 transition active:bg-slate-100"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-slate-700 group-hover:text-slate-900 transition truncate font-medium">
                        {u.fullname}
                      </span>
                      <span className="text-slate-400 truncate text-xs">{u.email}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                      <span className={`font-semibold ${roleColor[u.role?.toLowerCase()] ?? 'text-slate-400'}`}>
                        {u.role}
                      </span>
                      {u.section && (
                        <span className="text-slate-400">{u.section}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-slate-300 text-xs mt-2 sm:mt-3">💡 แตะที่แถวเพื่อกรอกอัตโนมัติ</p>
          </div>
        </div>

      </div>
    </div>
  )
}
