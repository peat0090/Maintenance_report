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

// Industrial Dark palette
const C = {
  bg:        "#0f1115",
  bg2:       "#1a1d23",
  bg3:       "#0a0c10",
  border:    "#27272a",
  borderHi:  "#3f3f46",
  text:      "#e5e7eb",
  text2:     "#a1a1aa",
  text3:     "#71717a",
  text4:     "#52525b",
  accent:    "#ff7a1a",
  accentDim: "rgba(255,122,26,0.15)",
  success:   "#34d399",
  successBg: "rgba(52,211,153,0.12)",
  danger:    "#f87171",
  dangerBg:  "rgba(248,113,113,0.12)",
  info:      "#60a5fa",
  mono:      "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
  sans:      "'Prompt', system-ui, sans-serif",
  radius:    "2px",
}

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
      return <span style={{ color: C.text4, fontStyle: "italic", fontFamily: C.mono }}>null</span>
    if (typeof v === "object")
      return <span style={{ color: C.info, fontFamily: C.mono, fontSize: 11 }}>{JSON.stringify(v)}</span>
    if (typeof v === "boolean")
      return <span style={{ color: v ? C.success : C.danger, fontFamily: C.mono }}>{String(v)}</span>
    const s = String(v)
    if (s.match(/^\d{4}-\d{2}-\d{2}T/))
      return <span style={{ color: C.text2, fontFamily: C.mono, fontSize: 12 }}>{new Date(s).toLocaleString("th-TH")}</span>
    if (s.length > 80) return <span title={s}>{s.slice(0, 80)}…</span>
    return s
  }

  return (
    <div style={{
      fontFamily: C.sans, fontSize: 14, color: C.text,
      padding: "1rem", background: C.bg, minHeight: "100%",
    }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        .sql-btn { transition: all .15s ease; }
        .sql-btn:hover { border-color: ${C.borderHi} !important; color: ${C.text} !important; }
        .sql-row:hover { background: ${C.bg2} !important; }
        .sql-sample:hover { border-color: ${C.accent} !important; color: ${C.accent} !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          width: 34, height: 34, borderRadius: C.radius,
          background: C.accentDim, border: `1px solid ${C.accent}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            SQL <span style={{ color: C.accent }}>/</span> Editor
          </div>
          <div style={{ fontSize: 10, color: C.text4, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2, fontFamily: C.mono }}>
            Maintenance_request_1 · service_role
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg2 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, animation: "pulse 2s infinite" }}/>
          <span style={{ fontSize: 10, color: C.success, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: C.mono }}>connected</span>
        </div>
      </div>

      {/* Sample queries */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.text4, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6, fontFamily: C.mono }}>
          // snippets
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SAMPLE_QUERIES.map(q => (
            <button
              key={q.label}
              className="sql-sample"
              onClick={() => { setSql(q.sql); setResult(null); setError(null); setElapsed(null) }}
              style={{
                fontFamily: C.sans, fontSize: 12, padding: "5px 12px", borderRadius: C.radius,
                border: `1px solid ${C.border}`, background: C.bg2, color: C.text2,
                cursor: "pointer",
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ position: "relative", marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg3, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderBottom: `1px solid ${C.border}`,
          background: C.bg2, fontSize: 10, color: C.text4,
          fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#52525b" }}/>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#52525b" }}/>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }}/>
          <span style={{ marginLeft: 10 }}>query.sql</span>
        </div>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={8}
          spellCheck={false}
          placeholder="SELECT * FROM users LIMIT 10;"
          style={{
            width: "100%", boxSizing: "border-box",
            fontFamily: C.mono, fontSize: 13, lineHeight: 1.7,
            padding: "12px 14px 30px",
            border: "none", background: "transparent",
            color: C.text, resize: "vertical", outline: "none",
          }}
        />
        <div style={{
          position: "absolute", bottom: 8, right: 12, fontSize: 10,
          color: C.text4, pointerEvents: "none", fontFamily: C.mono,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          ctrl+enter · tab indent
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <button
          onClick={runQuery}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 20px", borderRadius: C.radius,
            border: "none", background: loading ? C.bg2 : C.accent,
            color: loading ? C.text4 : C.bg,
            fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12, fontFamily: C.sans, letterSpacing: "0.15em", textTransform: "uppercase",
            boxShadow: loading ? "none" : `0 8px 24px -8px ${C.accent}80`,
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 11, height: 11, border: `2px solid ${C.text4}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
              กำลังรัน
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><polygon points="2,1 11,6 2,11"/></svg>
              Run query
            </>
          )}
        </button>

        {elapsed !== null && (
          <span style={{
            fontSize: 11, color: C.text2, background: C.bg2,
            padding: "5px 10px", borderRadius: C.radius,
            border: `1px solid ${C.border}`, fontFamily: C.mono,
            letterSpacing: "0.05em",
          }}>
            {elapsed}ms
          </span>
        )}

        {result !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: C.radius,
            background: result.length === 0 ? C.bg2 : C.successBg,
            color: result.length === 0 ? C.text4 : C.success,
            border: `1px solid ${result.length === 0 ? C.border : C.success + '40'}`,
            fontFamily: C.mono, letterSpacing: "0.05em",
          }}>
            {result.length} rows
          </span>
        )}

        <button
          className="sql-btn"
          onClick={() => { setSql(""); setResult(null); setError(null); setElapsed(null) }}
          style={{
            fontFamily: C.sans, fontSize: 11, padding: "6px 12px", borderRadius: C.radius,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.text3, cursor: "pointer", marginLeft: "auto",
            letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600,
          }}
        >
          ⌦ ล้าง
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: C.dangerBg, border: `1px solid ${C.danger}40`,
          color: C.danger, borderRadius: C.radius,
          padding: "12px 14px", fontSize: 12, marginBottom: 14,
          fontFamily: C.mono, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6, opacity: 0.7 }}>
            ⚠ error
          </div>
          {error}
        </div>
      )}

      {/* Results */}
      {result !== null && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: "hidden", background: C.bg3 }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg2 }}>
            {[
              { key: "table",   label: "Table" },
              { key: "json",    label: "JSON" },
              { key: "history", label: `History (${history.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 18px", fontSize: 11,
                  fontFamily: C.sans, border: "none",
                  borderBottom: activeTab === tab.key ? `2px solid ${C.accent}` : "2px solid transparent",
                  background: "transparent",
                  color: activeTab === tab.key ? C.text : C.text3,
                  cursor: "pointer",
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table view */}
          {activeTab === "table" && (
            result.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.text4, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: C.mono }}>
                ∅ ไม่มีข้อมูล (0 rows)
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: C.bg2 }}>
                      <th style={{ padding: "9px 12px", textAlign: "right", color: C.text4, fontWeight: 600, borderBottom: `1px solid ${C.border}`, width: 42, fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em" }}>#</th>
                      {columns.map(col => (
                        <th key={col} style={{
                          padding: "9px 14px", textAlign: "left",
                          fontWeight: 600, borderBottom: `1px solid ${C.border}`,
                          whiteSpace: "nowrap", color: C.accent,
                          fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "lowercase",
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.map((row, i) => (
                      <tr
                        key={i}
                        className="sql-row"
                        style={{ borderBottom: `1px solid ${C.border}`, background: "transparent", transition: "background .1s" }}
                      >
                        <td style={{ padding: "8px 12px", textAlign: "right", color: C.text4, fontSize: 10, fontFamily: C.mono }}>{i + 1}</td>
                        {columns.map(col => (
                          <td key={col} style={{
                            padding: "8px 14px", maxWidth: 320,
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap", color: C.text,
                          }}>
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
              <pre style={{
                background: C.bg3, padding: "16px 18px", fontSize: 12,
                fontFamily: C.mono, overflowX: "auto", maxHeight: 440, overflowY: "auto",
                margin: 0, color: C.text, lineHeight: 1.6,
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
              <button
                onClick={copyJson}
                style={{
                  position: "absolute", top: 10, right: 10,
                  fontSize: 10, padding: "5px 12px", borderRadius: C.radius,
                  border: `1px solid ${C.border}`, background: C.bg2,
                  color: copiedJson ? C.success : C.text2, cursor: "pointer",
                  fontFamily: C.mono, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600,
                }}
              >
                {copiedJson ? "✓ copied" : "⧉ copy"}
              </button>
            </div>
          )}

          {/* History view */}
          {activeTab === "history" && (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {history.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", color: C.text4, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: C.mono }}>
                  ∅ ยังไม่มีประวัติ
                </div>
              ) : history.map((h, i) => (
                <div
                  key={i}
                  className="sql-row"
                  onClick={() => { setSql(h.sql); setActiveTab("table"); setResult(null); setError(null) }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", background: "transparent", transition: "background .1s",
                  }}
                >
                  <span style={{ color: C.text4, fontSize: 10, fontFamily: C.mono, paddingTop: 2, minWidth: 24 }}>
                    {String(history.length - i).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <pre style={{
                      margin: 0, fontSize: 12, fontFamily: C.mono,
                      whiteSpace: "pre-wrap", wordBreak: "break-all", color: C.text,
                    }}>
                      {h.sql.length > 100 ? h.sql.slice(0, 100) + "…" : h.sql}
                    </pre>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, fontSize: 10, color: C.text4, fontFamily: C.mono, letterSpacing: "0.05em" }}>
                    <div>{h.time}</div>
                    <div style={{ marginTop: 2, color: C.text3 }}>{h.rows}r · {h.ms}ms</div>
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
