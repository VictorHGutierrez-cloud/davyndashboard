'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Activity, DollarSign,
  Search, RefreshCw, LogOut, ChevronDown, ChevronUp,
  X, MessageSquare, Filter,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
interface Deal {
  id: string
  name: string
  company: string
  amount: number | null
  currency: string
  stage: string
  pipeline: string
  closeDate: string | null
  owner: string
  createdBy: string
  status: 'won' | 'lost' | 'open'
  notes: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  won:  'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-700',
  open: 'bg-blue-100 text-blue-800',
}
const STATUS_LABEL: Record<string, string> = { won: 'Won', lost: 'Lost', open: 'Em Aberto' }
const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4']

function fmt(n: number | null, cur: string) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(n)
}

function KPICard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4 items-start">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [deals, setDeals]   = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // filters
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPipeline, setFilterPipeline] = useState<string>('all')
  const [sortKey, setSortKey]     = useState<keyof Deal>('name')
  const [sortAsc, setSortAsc]     = useState(true)

  // expanded notes
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/deals', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar dados')
      setDeals(await res.json())
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const pipelines = useMemo(() => ['all', ...Array.from(new Set(deals.map(d => d.pipeline))).sort()], [deals])

  const filtered = useMemo(() => {
    let d = deals
    if (filterStatus !== 'all') d = d.filter(x => x.status === filterStatus)
    if (filterPipeline !== 'all') d = d.filter(x => x.pipeline === filterPipeline)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.company.toLowerCase().includes(q) ||
        x.stage.toLowerCase().includes(q) ||
        x.notes.toLowerCase().includes(q)
      )
    }
    return [...d].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [deals, filterStatus, filterPipeline, search, sortKey, sortAsc])

  const won  = deals.filter(d => d.status === 'won')
  const lost = deals.filter(d => d.status === 'lost')
  const open = deals.filter(d => d.status === 'open')

  const totalValue = deals.reduce((s, d) => s + (d.amount ?? 0), 0)
  const wonValue   = won.reduce((s, d) => s + (d.amount ?? 0), 0)

  // Pipeline bar chart
  const pipelineData = useMemo(() => {
    const m = new Map<string, number>()
    deals.forEach(d => m.set(d.pipeline, (m.get(d.pipeline) ?? 0) + 1))
    return Array.from(m.entries()).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [deals])

  // Stage pie chart
  const stageData = useMemo(() => {
    const m = new Map<string, number>()
    deals.forEach(d => m.set(d.stage, (m.get(d.stage) ?? 0) + 1))
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8)
  }, [deals])

  // Status pie
  const statusPie = [
    { name: 'Won',      value: won.length,  color: '#10b981' },
    { name: 'Lost',     value: lost.length, color: '#ef4444' },
    { name: 'Em Aberto',value: open.length, color: '#3b82f6' },
  ]

  function toggleSort(key: keyof Deal) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortIcon({ k }: { k: keyof Deal }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">Davyn Dashboard</h1>
              <p className="text-xs text-slate-400">Factorial · Partner Opportunities</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={<Activity className="w-5 h-5 text-blue-600" />}
            label="Total de Deals" value={String(deals.length)}
            sub={`${filtered.length} filtrados`} color="bg-blue-50" />
          <KPICard icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            label="Closed Won" value={String(won.length)}
            sub={`${deals.length ? Math.round(won.length / deals.length * 100) : 0}% win rate`}
            color="bg-emerald-50" />
          <KPICard icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            label="Closed Lost" value={String(lost.length)}
            sub={`${open.length} em aberto`} color="bg-red-50" />
          <KPICard icon={<DollarSign className="w-5 h-5 text-amber-600" />}
            label="Valor Total (Won)" value={fmt(wonValue, 'USD')}
            sub={`Pipeline: ${fmt(totalValue - wonValue, 'USD')}`} color="bg-amber-50" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline bar */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-4 text-sm">Deals por Pipeline</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} deals`, 'Qtd.']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-4 text-sm">Status Geral</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false} fontSize={10}>
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stage breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4 text-sm">Top Stages</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageData} margin={{ left: 8, right: 24 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} deals`, 'Qtd.']} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table header / filters */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
            <h2 className="font-semibold text-slate-800 text-sm mr-auto">
              Oportunidades
              <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} de {deals.length})</span>
            </h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar deal, empresa, notas…"
                className="pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-2">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Todos os status</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="open">Em Aberto</option>
              </select>
            </div>

            {/* Pipeline filter */}
            <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]">
              {pipelines.map(p => (
                <option key={p} value={p}>{p === 'all' ? 'Todos os pipelines' : p}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {([
                    ['name', 'Deal'],
                    ['company', 'Empresa'],
                    ['pipeline', 'Pipeline'],
                    ['stage', 'Stage'],
                    ['amount', 'Valor'],
                    ['closeDate', 'Close Date'],
                    ['owner', 'Owner'],
                    ['status', 'Status'],
                  ] as [keyof Deal, string][]).map(([k, label]) => (
                    <th key={k}
                      className="px-4 py-3 text-left font-medium text-slate-500 cursor-pointer hover:text-slate-800 whitespace-nowrap"
                      onClick={() => toggleSort(k)}>
                      <span className="flex items-center gap-1">{label} <SortIcon k={k} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Carregando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Nenhum deal encontrado</td></tr>
                ) : filtered.map(d => (
                  <>
                    <tr key={d.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        d.status === 'won' ? 'bg-emerald-50/30' :
                        d.status === 'lost' ? 'bg-red-50/30' : ''
                      }`}>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate">{d.name}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{d.company}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{d.pipeline}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{d.stage}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">
                        {d.amount !== null ? fmt(d.amount, d.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.closeDate ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{d.owner}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.notes ? (
                          <button onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px]">
                              {expandedId === d.id ? 'Fechar' : 'Ver notas'}
                            </span>
                          </button>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                    {expandedId === d.id && (
                      <tr key={`${d.id}-notes`} className="bg-amber-50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {d.notes}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
