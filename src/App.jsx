import { useMemo, useState, useRef, useEffect } from 'react'
import { TENANT, USERS, GROUPS, GO_LIVE_STR, TODAY_STR } from './mockData.js'

const fmt = (n) => n.toLocaleString('en-IN')
const fmtUSD = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ---------- Column definitions ----------

export const ALL_COLUMNS = [
  { key: 'name',        label: 'Name',               locked: true },
  { key: 'employeeId',  label: 'Employee ID' },
  { key: 'role',        label: 'Designation / Role' },
  { key: 'group',       label: 'User group' },
  { key: 'superGroup',  label: 'Super group' },
  { key: 'department',  label: 'Department' },
  { key: 'location',    label: 'Location' },
  { key: 'manager',     label: 'Manager' },
  { key: 'dateJoined',  label: 'Date joined' },
  { key: 'consumed',    label: 'Interactions' },
  { key: 'pct',         label: '% of total usage' },
  { key: 'lastUsed',    label: 'Last used' },
]

const DEFAULT_VISIBLE = ['name', 'group', 'consumed', 'pct', 'lastUsed']
const STORAGE_KEY = 'ph_agent_usage_cols'

function loadCols() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // validate: must be array of known keys
      if (Array.isArray(saved) && saved.every(k => ALL_COLUMNS.some(c => c.key === k))) return saved
    }
  } catch {}
  return DEFAULT_VISIBLE
}

// ---------- Column chooser ----------

function ColumnChooser({ visible, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key) => {
    const next = visible.includes(key) ? visible.filter(k => k !== key) : [...visible, key]
    // preserve column order from ALL_COLUMNS
    onChange(ALL_COLUMNS.map(c => c.key).filter(k => next.includes(k)))
  }

  return (
    <div className="col-chooser" ref={ref}>
      <button className="btn col-chooser-btn" onClick={() => setOpen(o => !o)}>
        Columns <span className="col-count">{visible.length - 1}</span> ▾
      </button>
      {open && (
        <div className="col-panel">
          <div className="col-panel-head">Show / hide columns</div>
          {ALL_COLUMNS.map(col => (
            <label key={col.key} className={`col-row${col.locked ? ' locked' : ''}`}>
              <input
                type="checkbox"
                checked={visible.includes(col.key)}
                disabled={col.locked}
                onChange={() => toggle(col.key)}
              />
              {col.label}
              {col.locked && <span className="col-locked-tag">always on</span>}
            </label>
          ))}
          <button className="col-reset" onClick={() => onChange(DEFAULT_VISIBLE)}>Reset to default</button>
        </div>
      )}
    </div>
  )
}

// ---------- shared computation ----------

function useFilteredUsers(filters) {
  return useMemo(() => {
    return USERS.map((u) => {
      const inWindow = u.events.filter((d) => d >= filters.from && d <= filters.to)
      return {
        ...u,
        consumed: inWindow.length,
        lastUsed: inWindow[inWindow.length - 1] || null,
        lifetimeConsumed: u.events.length,
      }
    }).filter((u) => {
      if (filters.superGroup !== 'All' && u.superGroup !== filters.superGroup) return false
      if (filters.group !== 'All' && u.group !== filters.group) return false
      if (filters.user !== 'All' && String(u.id) !== filters.user) return false
      return true
    })
  }, [filters])
}

// ---------- KPI tiles ----------

function KpiTiles({ users }) {
  const active = users.filter((u) => u.consumed > 0).length
  const consumed = users.reduce((s, u) => s + u.consumed, 0)
  const lifetimeConsumed = USERS.reduce((s, u) => s + u.events.length, 0)
  const pct = Math.round((lifetimeConsumed / TENANT.pool) * 1000) / 10
  const band = pct > TENANT.redBand ? 'red' : pct >= TENANT.amberBand ? 'amber' : ''
  const avg = active ? Math.round(consumed / active) : 0
  const dollarSpent = Math.round((lifetimeConsumed / TENANT.pool) * TENANT.budgetUSD)
  const dollarRemaining = TENANT.budgetUSD - dollarSpent

  return (
    <div className="tiles">
      <div className="tile">
        <span className="prio">P0 · US-1.1</span>
        <div className="label">Active users / licenses bought</div>
        <div className="value">{active} <small>/ {TENANT.licensedSeats}</small> <span className="pct-big">({Math.round((active / TENANT.licensedSeats) * 100)}%)</span></div>
        <div className="sub">Adoption breadth — share of licensed seats active in scope</div>
        <div className="meter"><div style={{ width: `${(active / TENANT.licensedSeats) * 100}%` }} /></div>
      </div>
      <div className={`tile ${band}`}>
        <span className="prio">P0 · US-1.2</span>
        <div className="label">Budget consumed</div>
        <div className="value">{fmtUSD(dollarSpent)} <small>/ {fmtUSD(TENANT.budgetUSD)}</small> <span className="pct-big">({Math.round(pct)}%)</span></div>
        <div className="sub tile-sub-detail">
          <span>{fmtUSD(dollarRemaining)} remaining · colour shifts at {TENANT.amberBand}% / {TENANT.redBand}%</span>
          <span className="interactions-sub">{fmt(lifetimeConsumed)} / {fmt(TENANT.pool)} interactions</span>
        </div>
        <div className="meter"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="tile">
        <span className="prio">P1 · US-1.3</span>
        <div className="label">Avg interactions per active user</div>
        <div className="value">{avg}</div>
        <div className="sub">Usage depth · denominator = active users (confirm) · {fmt(consumed)} interactions in scope</div>
      </div>
    </div>
  )
}

// ---------- Filters ----------

function FilterBar({ filters, setFilters }) {
  const superGroups = [...new Set(GROUPS.map((g) => g.superGroup))]
  const groups = GROUPS.filter((g) => filters.superGroup === 'All' || g.superGroup === filters.superGroup).map((g) => g.group)
  const isDefault = filters.from === GO_LIVE_STR && filters.to === TODAY_STR && filters.superGroup === 'All' && filters.group === 'All' && filters.user === 'All'
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, ...(k === 'superGroup' ? { group: 'All', user: 'All' } : {}), ...(k === 'group' ? { user: 'All' } : {}) }))

  return (
    <div className="filterbar">
      <label>From
        <input type="date" value={filters.from} min={GO_LIVE_STR} max={filters.to} onChange={(e) => set('from', e.target.value)} />
      </label>
      <label>To
        <input type="date" value={filters.to} min={filters.from} max={TODAY_STR} onChange={(e) => set('to', e.target.value)} />
      </label>
      <label>Super group
        <select value={filters.superGroup} onChange={(e) => set('superGroup', e.target.value)}>
          <option>All</option>
          {superGroups.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label>User group
        <select value={filters.group} onChange={(e) => set('group', e.target.value)}>
          <option>All</option>
          {groups.map((g) => <option key={g}>{g}</option>)}
        </select>
      </label>
      <label>Individual user
        <select value={filters.user} onChange={(e) => set('user', e.target.value)}>
          <option value="All">All</option>
          {USERS.filter((u) => (filters.group === 'All' || u.group === filters.group) && (filters.superGroup === 'All' || u.superGroup === filters.superGroup))
            .map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      {!isDefault && (
        <button className="clear" onClick={() => setFilters({ from: GO_LIVE_STR, to: TODAY_STR, superGroup: 'All', group: 'All', user: 'All' })}>
          Reset filters
        </button>
      )}
    </div>
  )
}

// ---------- Main table ----------

const PIVOTS = [
  { key: 'user',       label: 'User' },
  { key: 'group',      label: 'User group' },
  { key: 'superGroup', label: 'Super group' },
]

const PAGE_SIZES = [25, 50, 100]

// Render a cell value for a given column key on a user-pivot row
function cellValue(col, r) {
  switch (col) {
    case 'name':       return <>{r.name}{r.email && <span className="email">{r.email}</span>}</>
    case 'employeeId': return <span className="chip gray">{r.employeeId}</span>
    case 'role':       return r.role
    case 'group':      return <span className="chip">{r.group}</span>
    case 'superGroup': return <span className="chip gray">{r.superGroup}</span>
    case 'department': return r.department
    case 'location':   return r.location
    case 'manager':    return r.manager
    case 'dateJoined': return r.dateJoined
    case 'consumed':
      return r.consumed === 0
        ? <span className="tag-zero">0 — not used</span>
        : <span className="interactions-val">{fmt(r.consumed)}</span>
    case 'pct':        return `${r.pct}%`
    case 'lastUsed':   return r.lastUsed || '—'
    default:           return '—'
  }
}

function exportCsv(rows, pivot, visibleCols) {
  const isUser = pivot === 'user'
  let header, lines
  if (isUser) {
    const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))
    header = cols.map(c => c.label)
    lines = rows.map(r => cols.map(c => {
      const v = c.key === 'pct' ? r.pct + '%' : (r[c.key] ?? '')
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(','))
  } else {
    const groupCols = pivot === 'group'
      ? ['Name', 'Super group', 'Licences bought', 'Active users', 'Interactions', '% of total usage', 'Last used']
      : ['Name', 'Licences bought', 'Active users', 'Interactions', '% of total usage', 'Last used']
    header = groupCols
    lines = rows.map(r => {
      const base = pivot === 'group'
        ? [r.name, r.groups[0], r.licences, r.activeUsers, r.consumed, r.pct + '%', r.lastUsed || '']
        : [r.name, r.licences, r.activeUsers, r.consumed, r.pct + '%', r.lastUsed || '']
      return base.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
  }
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `agent-usage-by-${pivot}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function MainTable({ users }) {
  const [pivot, setPivotRaw] = useState('user')
  const [sort, setSort] = useState({ col: 'consumed', dir: 'desc' })
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [visibleCols, setVisibleCols] = useState(loadCols)

  const setPivot = (p) => { setPivotRaw(p); setPage(0) }

  const onColChange = (cols) => {
    setVisibleCols(cols)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)) } catch {}
  }

  const totalConsumed = users.reduce((s, u) => s + u.consumed, 0)

  const rows = useMemo(() => {
    let r
    if (pivot === 'user') {
      r = users.map((u) => ({ ...u, consumed: u.consumed }))
    } else {
      const map = new Map()
      for (const u of users) {
        const k = u[pivot]
        if (!map.has(k)) map.set(k, { key: k, name: k, groups: pivot === 'group' ? [u.superGroup] : [], licences: 0, activeUsers: 0, consumed: 0, lastUsed: null })
        const row = map.get(k)
        row.licences++
        if (u.consumed > 0) row.activeUsers++
        row.consumed += u.consumed
        if (u.lastUsed && (!row.lastUsed || u.lastUsed > row.lastUsed)) row.lastUsed = u.lastUsed
      }
      r = [...map.values()]
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    r.sort((a, b) => {
      const va = a[sort.col], vb = b[sort.col]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir
    })
    return r.map((row) => ({ ...row, pct: totalConsumed ? Math.round((row.consumed / totalConsumed) * 1000) / 10 : 0 }))
  }, [users, pivot, sort, totalConsumed])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const onSort = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))
  const arrow = (col) => sort.col === col ? (sort.dir === 'desc' ? ' ▾' : ' ▴') : ''

  // Columns to render for the current pivot
  const activeCols = pivot === 'user'
    ? ALL_COLUMNS.filter(c => visibleCols.includes(c.key))
    : null // group pivots use fixed columns

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Usage by {PIVOTS.find((p) => p.key === pivot).label.toLowerCase()} <span className="spec-ref">US-2 · P0</span></h2>
          <p className="desc">Every licensed {pivot === 'user' ? 'user' : 'entity'} in scope, including zero-usage rows. Click a column header to sort.</p>
        </div>
        <div className="hero-actions">
          <div className="pivot">
            {PIVOTS.map((p) => (
              <button key={p.key} className={pivot === p.key ? 'active' : ''} onClick={() => setPivot(p.key)}>{p.label}</button>
            ))}
          </div>
          {pivot === 'user' && (
            <ColumnChooser visible={visibleCols} onChange={onColChange} />
          )}
          <button className="btn" onClick={() => exportCsv(rows, pivot, visibleCols)}>Export CSV</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            {pivot === 'user' ? (
              activeCols.map(col => (
                <th key={col.key}
                  className={col.key === 'consumed' ? 'interactions-col' : col.key === 'pct' ? 'num' : ''}
                  onClick={() => onSort(col.key)}>
                  {col.label}{arrow(col.key)}
                </th>
              ))
            ) : (
              <>
                <th onClick={() => onSort('name')}>Name{arrow('name')}</th>
                {pivot === 'group' && <th>Super group</th>}
                <th className="num" onClick={() => onSort('licences')}>Licences bought{arrow('licences')}</th>
                <th className="num" onClick={() => onSort('activeUsers')}>Active users{arrow('activeUsers')}</th>
                <th className="interactions-col" onClick={() => onSort('consumed')}>Interactions{arrow('consumed')}</th>
                <th className="num" onClick={() => onSort('pct')}>% of total usage{arrow('pct')}</th>
                <th onClick={() => onSort('lastUsed')}>Last used{arrow('lastUsed')}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => (
            <tr key={r.key ?? r.id} className={r.consumed === 0 ? 'zero' : ''}>
              {pivot === 'user' ? (
                activeCols.map(col => (
                  <td key={col.key}
                    className={col.key === 'name' ? 'name-cell' : col.key === 'consumed' ? 'interactions-col' : col.key === 'pct' ? 'num' : ''}>
                    {cellValue(col.key, r)}
                  </td>
                ))
              ) : (
                <>
                  <td className="name-cell">{r.name}</td>
                  {pivot === 'group' && <td>{r.groups.map(g => <span key={g} className="chip gray">{g}</span>)}</td>}
                  <td className="num">{r.licences}</td>
                  <td className="num">{r.activeUsers}</td>
                  <td className="interactions-col">
                    {r.consumed === 0 ? <span className="tag-zero">0 — not used</span> : <span className="interactions-val">{fmt(r.consumed)}</span>}
                  </td>
                  <td className="num">{r.pct}%</td>
                  <td>{r.lastUsed || '—'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <span className="count-note">
          Showing {rows.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length} · {fmt(totalConsumed)} interactions in scope
        </span>
        <div className="pager">
          <label>Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className="btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
          <span>Page {safePage + 1} / {pageCount}</span>
          <button className="btn" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next ›</button>
        </div>
      </div>
    </div>
  )
}

// ---------- V2 preview ----------

function V2Preview() {
  const sample = USERS.slice(0, 10).map((u) => ({ ...u, consumed: u.events.length }))
  const [caps, setCaps] = useState(() => Object.fromEntries(sample.map((u) => [u.id, u.id === 2 ? 150 : ''])))
  const [enabled, setEnabled] = useState(() => Object.fromEntries(sample.map((u) => [u.id, u.id !== 5])))
  const [blockMsg, setBlockMsg] = useState('Agent access has been paused by your administrator. Please contact admin@acme.example.')

  return (
    <>
      <div className="v2-banner">
        <strong>V2 preview — not in V1 scope.</strong> Per-user interaction limits (US-4) and enable/disable per user or group (US-5). Threshold alerts (US-6) TBD.
      </div>
      <div className="card">
        <h2>Per-user controls <span className="spec-ref">US-4 · US-5 — V2</span></h2>
        <p className="desc">When a user hits their cap, their access blocks while others continue. Toggling a user off denies access with the admin-set message below.</p>
        <table>
          <thead>
            <tr><th>Name</th><th>User group</th><th className="num">Consumed</th><th className="num">Per-user cap</th><th>Agent enabled</th><th>Status</th></tr>
          </thead>
          <tbody>
            {sample.map((u) => {
              const cap = Number(caps[u.id]) || null
              const status = !enabled[u.id] ? 'disabled' : cap && u.consumed >= cap ? 'blocked' : 'ok'
              return (
                <tr key={u.id}>
                  <td className="name-cell">{u.name}</td>
                  <td><span className="chip">{u.group}</span></td>
                  <td className="num">{fmt(u.consumed)}</td>
                  <td className="num">
                    <input className="cap-input" type="number" min="0" placeholder="No cap"
                      value={caps[u.id]} onChange={(e) => setCaps((c) => ({ ...c, [u.id]: e.target.value }))} />
                  </td>
                  <td>
                    <button className={`toggle ${enabled[u.id] ? 'on' : ''}`} aria-label="toggle agent"
                      onClick={() => setEnabled((s) => ({ ...s, [u.id]: !s[u.id] }))} />
                  </td>
                  <td>
                    {status === 'ok' && <span className="status-pill ok">Active</span>}
                    {status === 'blocked' && <span className="status-pill blocked">Cap reached — blocked</span>}
                    {status === 'disabled' && <span className="status-pill disabled">Disabled by admin</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>End-user blocked-state message</h2>
        <p className="desc">What a disabled/capped user sees when they open the Agent. Message is admin-configurable (US-5).</p>
        <input style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7 }}
          value={blockMsg} onChange={(e) => setBlockMsg(e.target.value)} />
        <div className="blocked-demo">
          <strong>🛡️ ProHance Agent</strong>
          <div className="msg">{blockMsg}</div>
        </div>
      </div>
    </>
  )
}

// ---------- App ----------

export default function App() {
  const [tab, setTab] = useState('v1')
  const [filters, setFilters] = useState({ from: GO_LIVE_STR, to: TODAY_STR, superGroup: 'All', group: 'All', user: 'All' })
  const users = useFilteredUsers(filters)

  return (
    <div className="app">
      <div className="topbar">
        <h1>ProHance Agent Usage</h1>
        <span className="tenant">{TENANT.name} · Customer Admin view · pool: {fmt(TENANT.pool)} interactions · {fmtUSD(TENANT.budgetUSD)} budget</span>
      </div>
      <p className="subtitle">Prototype for spec walkthrough — mock data. Flow: KPI tiles → full user list.</p>
      <div className="tabs">
        <button className={tab === 'v1' ? 'active' : ''} onClick={() => setTab('v1')}>Usage<span className="badge">V1</span></button>
        <button className={tab === 'v2' ? 'active' : ''} onClick={() => setTab('v2')}>Controls<span className="badge v2">V2 preview</span></button>
      </div>
      {tab === 'v1' ? (
        <>
          <FilterBar filters={filters} setFilters={setFilters} />
          <p className="filter-note">Tiles and the list recompute within the filtered scope (US-2.2). Budget tile always shows lifetime pool position.</p>
          <KpiTiles users={users} />
          <MainTable users={users} />
        </>
      ) : (
        <V2Preview />
      )}
    </div>
  )
}
