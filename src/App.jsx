import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage         from './pages/LoginPage'
import DashboardPage     from './pages/DashboardPage'
import TasksPage         from './pages/TasksPage'
import AddTaskPage       from './pages/AddTaskPage'
import TaskDetailPage    from './pages/TaskDetailPage'
import BorrowItemsPage   from './pages/BorrowItemsPage'
import AddBorrowPage     from './pages/AddBorrowPage'
import SupabaseSQLEditor from './pages/SupabaseSQLEditor'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function CanCreateRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const allowed = ['admin', 'manager', 'planner']
  return allowed.includes(user.role) ? children : <Navigate to="/" replace />
}

function CanBorrowRoute({ children }) {
  const { user, can } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return can('create') ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/"          element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/tasks"     element={<PrivateRoute><TasksPage /></PrivateRoute>} />
        <Route path="/tasks/:id" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
        <Route path="/add-task"  element={<CanCreateRoute><AddTaskPage /></CanCreateRoute>} />
        <Route path="/borrow"     element={<PrivateRoute><BorrowItemsPage /></PrivateRoute>} />
        <Route path="/borrow/add" element={<CanBorrowRoute><AddBorrowPage /></CanBorrowRoute>} />
        <Route path="/sql"       element={<PrivateRoute><SupabaseSQLEditor /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App