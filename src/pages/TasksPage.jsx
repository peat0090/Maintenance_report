import { Link } from 'react-router-dom'

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">หน้ารายการงาน</h2>
        <p className="text-slate-400 mb-6">จะสร้างในขั้นตอนถัดไป</p>
        <Link to="/" className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-400 transition">
          ← กลับ Dashboard
        </Link>
      </div>
    </div>
  )
}