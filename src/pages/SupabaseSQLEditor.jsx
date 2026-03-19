import { useState, useRef } from "react"

const SUPABASE_URL = "https://eqgtyveijshkljffnrvf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ3R5dmVpanNoa2xqZmZucnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNTIwMywiZXhwIjoyMDg5MzgxMjAzfQ.0koKoVW-l7wrBfcgbI8a39fOXPh82m60ybcYZCZ2Cmw"

const SAMPLE_QUERIES = [
  { label: "users ทั้งหมด",       sql: "SELECT id, name, email, role, section\nFROM users\nORDER BY role, name;" },
  { label: "tasks ล่าสุด",        sql: "SELECT id, title, section, status, priority, created_at\nFROM tasks\nORDER BY created_at DESC\nLIMIT 20;" },
  { label: "นับตาม status",       sql: "SELECT status, COUNT(*) AS total\nFROM tasks\nGROUP BY status\nORDER BY total DESC;" },
  { label: "pending / section",   sql: "SELECT section, COUNT(*) AS pending_count\nFROM tasks\nWHERE status = 'pending'\nGROUP BY section\nORDER BY pending_count DESC;" },
  { label: "รูปภาพต่องาน",        sql: "SELECT t.id, t.title, COUNT(p.id) AS photo_count\nFROM tasks t\nLEFT JOIN task_photos p ON p.task_id = t.id\nGROUP BY t.id, t.title\nORDER BY photo_count DESC\nLIMIT 10;" },
  { label: "เสร็จสัปดาห์นี้",     sql: "SELECT id, title, assigned_to, section\nFROM tasks\nWHERE status = 'done'\n  AND created_at >= date_trunc('week', now())\nORDER BY created_at DESC;" },
]

export default function SupabaseSQLEditor() {
  const [sql, setSql]           = useState(SAMPLE_QUERIES[0].sql)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [elapsed, setElapsed]   = useState(null)
  const [activeTab, setActiveTab] = useState("table")
  const [history, setHistory]   = useState([])
  const [copiedJson, setCopiedJson] = useState(false)
  const textareaRef = useRef(null)

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      runQuery()
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = textareaRef.current
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      const newVal = sql.substring(0, start) + "  " + sql.substring(end)
      setSql(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
  }

  const runQuery = async () => {
    const trimmed = sql.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = performance.now()
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ query: trimmed }),
      })
      const text = await res.text()
      const ms   = Math.round(performance.now() - t0)
      setElapsed(ms)
      let data
      try { data = JSON.parse(text) } catch { data = text }
      if (!res.ok) {
        setError(data?.message || data?.error || JSON.stringify(data))
      } else {
        const rows = Array.isArray(data) ? data : (data ? [data] : [])
        setResult(rows)
        setActiveTab("table")
        setHistory(prev => [
          { sql: trimmed, rows: rows.length, ms, time: new Date().toLocaleTimeString("th-TH") },
          ...prev.slice(0, 19),
        ])
      }
    } catch (err) {
      setError("เชื่อมต่อไม่ได้: " + err.message)
      setElapsed(Math.round(performance.now() - t0))
    }
    setLoading(false)
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1500)
  }

  const columns = result && result.length > 0 ? Object.keys(result[0]) : []

  const formatCell = (v) => {
    if (v === null || v === undefined)
      return <span style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>null</span>
    if (typeof v === "object")
      return <span style={{ color: "var(--color-text-info)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{JSON.stringify(v)}</span>
    if (typeof v === "boolean")
      return <span style={{ color: v ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{String(v)}</span>
    const s = String(v)
    if (s.match(/^\d{4}-\d{2}-\d{2}T/))
      return <span style={{ color: "var(--color-text-secondary)" }}>{new Date(s).toLocaleString("th-TH")}</span>
    if (s.length > 80) return <span title={s}>{s.slice(0, 80)}…</span>
    return s
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-text-primary)", padding: "1rem 0" }}>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--color-background-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.2 }}>SQL Editor</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Maintenance_request_1 · service_role</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-text-success)" }}/>
          <span style={{ fontSize: 12, color: "var(--color-text-success)" }}>connected</span>
        </div>
      </div>

      {/* Sample queries */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {SAMPLE_QUERIES.map(q => (
          <button
            key={q.label}
            onClick={() => { setSql(q.sql); setResult(null); setError(null); setElapsed(null) }}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer" }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={7}
          spellCheck={false}
          placeholder="SELECT * FROM users LIMIT 10;"
          style={{
            width: "100%", boxSizing: "border-box",
            fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.65,
            padding: "12px 14px 28px",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-lg)",
            background: "var(--color-background-secondary)",
            color: "var(--color-text-primary)",
            resize: "vertical", outline: "none",
          }}
        />
        <div style={{ position: "absolute", bottom: 9, right: 12, fontSize: 11, color: "var(--color-text-tertiary)", pointerEvents: "none" }}>
          Ctrl+Enter รัน · Tab indent
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={runQuery}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 18px",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)",
            color: loading ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
            fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontSize: 13,
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 12, height: 12, border: "1.5px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
              กำลังรัน
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><polygon points="2,1 11,6 2,11"/></svg>
              Run
            </>
          )}
        </button>

        {elapsed !== null && (
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "3px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
            {elapsed} ms
          </span>
        )}

        {result !== null && (
          <span style={{
            fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: "var(--border-radius-md)",
            background: result.length === 0 ? "var(--color-background-secondary)" : "var(--color-background-success)",
            color: result.length === 0 ? "var(--color-text-tertiary)" : "var(--color-text-success)",
          }}>
            {result.length} rows
          </span>
        )}

        <button
          onClick={() => { setSql(""); setResult(null); setError(null); setElapsed(null) }}
          style={{ fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", marginLeft: "auto" }}
        >
          ล้าง
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)",
          color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)",
          padding: "10px 14px", fontSize: 12, marginBottom: 14,
          fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result !== null && (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {[
              { key: "table",   label: "Table" },
              { key: "json",    label: "JSON" },
              { key: "history", label: `History (${history.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px", fontSize: 13,
                  border: "none",
                  borderBottom: activeTab === tab.key ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                  background: "transparent",
                  color: activeTab === tab.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  cursor: "pointer", fontWeight: activeTab === tab.key ? 500 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table view */}
          {activeTab === "table" && (
            result.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>ไม่มีข้อมูล (0 rows)</div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 440, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-text-tertiary)", fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)", width: 36, fontSize: 11 }}>#</th>
                      {columns.map(col => (
                        <th key={col} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 500, borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</td>
                        {columns.map(col => (
                          <td key={col} style={{ padding: "7px 14px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* JSON view */}
          {activeTab === "json" && (
            <div style={{ position: "relative" }}>
              <pre style={{ background: "var(--color-background-secondary)", padding: "14px 16px", fontSize: 12, fontFamily: "var(--font-mono)", overflowX: "auto", maxHeight: 420, overflowY: "auto", margin: 0, color: "var(--color-text-primary)" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
              <button
                onClick={copyJson}
                style={{ position: "absolute", top: 10, right: 10, fontSize: 11, padding: "3px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: copiedJson ? "var(--color-text-success)" : "var(--color-text-secondary)", cursor: "pointer" }}
              >
                {copiedJson ? "copied!" : "copy"}
              </button>
            </div>
          )}

          {/* History view */}
          {activeTab === "history" && (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {history.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>ยังไม่มีประวัติ</div>
              ) : history.map((h, i) => (
                <div
                  key={i}
                  onClick={() => { setSql(h.sql); setActiveTab("table"); setResult(null); setError(null) }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <pre style={{ margin: 0, fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--color-text-primary)" }}>
                      {h.sql.length > 100 ? h.sql.slice(0, 100) + "…" : h.sql}
                    </pre>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    <div>{h.time}</div>
                    <div>{h.rows} rows · {h.ms}ms</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
