import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useTranslation } from 'react-i18next'

const roleColor = {
  admin:      'text-red-400',
  manager:    'text-amber-400',
  planner:    'text-fuchsia-400',
  technician: 'text-orange-400',
  viewer:     'text-zinc-500',
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()
  const { t, i18n } = useTranslation()

  const [testUsers, setTestUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users').select('email, fullname, role, section').eq('fullname', 'View 1')
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

  const toggleLang = () => {
    const next = i18n.language === 'th' ? 'en' : 'th'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-['Prompt',sans-serif] relative overflow-hidden"
      style={{
        background: 'radial-gradient(1200px 600px at 10% -10%, #1a1d23 0%, transparent 60%), radial-gradient(900px 500px at 110% 110%, #2a1d12 0%, transparent 55%), #0f1115',
      }}
    >
      {/* grid bg */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ปุ่มสลับภาษา มุมขวาบน */}
      <button onClick={toggleLang}
        className="absolute top-4 right-4 text-[10px] font-mono font-bold tracking-widest px-2.5 py-1.5 rounded-sm border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400 transition uppercase z-10"
      >
        {i18n.language === 'th' ? 'EN' : 'ไทย'}
      </button>

      <div className="w-full max-w-md relative">

        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-sm border border-zinc-700/70 bg-zinc-900/60 text-[10px] tracking-[0.25em] uppercase text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            EEST · Maintenance OS
          </div>
          <img
            src="https://eest-es.b-cdn.net/wp-content/uploads/2021/06/eest_logo_maroon.png"
            alt="EEST Logo"
            className="w-44 sm:w-56 mb-4 sm:mb-5 mx-auto drop-shadow-[0_0_24px_rgba(255,122,26,0.15)]"
            style={{ filter: 'brightness(0) invert(1) opacity(0.92)' }}
          />
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
            Maintenance <span className="text-orange-500">Report</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1.5 tracking-wide">Maintenance Report · v2.0</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-sm p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-zinc-300 tracking-[0.2em] uppercase">{t('login')}</h2>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-sm px-4 py-3 text-sm mb-4 flex items-start gap-2">
              <span className="text-red-400 mt-0.5">⚠</span> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-2 tracking-wider uppercase">{t('password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full disabled:opacity-60 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-zinc-950 font-semibold rounded-sm py-3 text-sm tracking-wider uppercase transition-all shadow-[0_8px_30px_-8px_rgba(255,122,26,0.6)] mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />{t('logging_in')}</>
              ) : (
                <>{t('login')} <span className="text-base">→</span></>
              )}
            </button>
          </form>

          {/* Test users */}
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-[11px] tracking-wider uppercase">{t('test_accounts')}</p>
              <span className="text-[10px] font-mono text-zinc-600">password: 1234</span>
            </div>
            <div className="space-y-1">
              {testUsers.length === 0 ? (
                <p className="text-zinc-600 text-xs animate-pulse">{t('loading')}...</p>
              ) : (
                testUsers.map(u => (
                  <div key={u.email} onClick={() => { setEmail(u.email); setPassword('1234') }}
                    className="flex justify-between items-center text-xs cursor-pointer group rounded-sm border border-transparent hover:border-zinc-800 px-3 py-2 hover:bg-zinc-950 transition active:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-zinc-200 group-hover:text-orange-400 transition truncate font-medium">{u.fullname}</span>
                      <span className="text-zinc-500 truncate text-[11px] font-mono">{u.email}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                      <span className={`font-semibold uppercase tracking-wider text-[10px] ${roleColor[u.role?.toLowerCase()] ?? 'text-zinc-500'}`}>{u.role}</span>
                      {u.section && <span className="text-zinc-500 text-[10px] font-mono">{u.section}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-zinc-600 text-[11px] mt-3">{t('click_to_fill')}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
