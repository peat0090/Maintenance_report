import { Link } from 'react-router-dom'

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Prompt',sans-serif] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-sm border border-zinc-800 bg-zinc-900 text-[10px] tracking-[0.25em] uppercase text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          WORK IN PROGRESS
        </div>
        <div className="text-6xl mb-5 text-zinc-700">⚙</div>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2 tracking-tight">Tasks</h2>
        <p className="text-zinc-500 text-sm mb-8">Will be created in the next step — pending update</p>
        <Link
          to="/"
          className="inline-block bg-orange-500 hover:bg-orange-400 text-zinc-950 px-6 py-3 rounded-sm font-semibold text-sm tracking-wider uppercase transition shadow-[0_8px_24px_-8px_rgba(255,122,26,0.5)]"
        >
          ← Dashboard
        </Link>
      </div>
    </div>
  )
}
