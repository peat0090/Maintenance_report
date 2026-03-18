import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage     from './pages/TasksPage'
import AddTaskPage   from './pages/AddTaskPage'
import TaskDetailPage from './pages/TaskDetailPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// เฉพาะ admin, manager, planner เท่านั้น
function CanCreateRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const allowed = ['admin', 'manager', 'planner']
  return allowed.includes(user.role) ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/"         element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/tasks"    element={<PrivateRoute><TasksPage /></PrivateRoute>} />
        <Route path="/add-task" element={<CanCreateRoute><AddTaskPage /></CanCreateRoute>} />
        <Route path="*"         element={<Navigate to="/" />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App