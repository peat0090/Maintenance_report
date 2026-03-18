import { createContext, useContext, useState } from 'react'

const USERS = [
  { id: 1, name: 'Mr.Puttiphong Buala',     email: 'puttipong.peat@gmail.com', password: '1234', role: 'admin',      section: null },
  { id: 2, name: 'Pitchayanan Thanawatsanti',  email: 'Pitchayanan@mechatronics.com',  password: '1234', role: 'planner',    section: 'mechatronic' },
  { id: 3, name: 'Prasit Mana',  email: 'prasit@maintenance.com',  password: '1234', role: 'manager', section: 'mechatronic' },
  { id: 4, name: 'วิชัย สุขสันต์',    email: 'wichai@maintenance.com',   password: '1234', role: 'technician', section: 'mechanic' },
  { id: 5, name: 'กมล รุ่งเรือง',   email: 'kamon@maintenance.com',   password: '1234', role: 'viewer',     section: null },
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const { password: _pw, ...safeUser } = found
      setUser(safeUser)
      localStorage.setItem('currentUser', JSON.stringify(safeUser))
      return { success: true, user: safeUser }
    }
    return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
  }

  const can = (action) => {
    const permissions = {
      admin:      ['create', 'edit', 'delete', 'manage_users', 'view_all'],
      manager:    ['create', 'edit', 'delete', 'view_all'],
      planner:    ['create', 'edit', 'delete','view_all'],
      technician: [ 'edit'],
      viewer:     [],
    }
    return permissions[user?.role]?.includes(action) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)