"use client"

import { useMemo, useState } from "react"
import { notFound } from "next/navigation"

import { REGISTRY, type UsageStatus } from "./registry"

type FilterMode = "all" | UsageStatus

export default function DevComponentsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  const [filter, setFilter] = useState<FilterMode>("all")
  const [query, setQuery] = useState("")

  const stats = useMemo(() => {
    const total = REGISTRY.length
    const used = REGISTRY.filter((item) => item.status === "used").length
    const orphan = total - used
    return { total, used, orphan, deadPct: Math.round((orphan / total) * 100) }
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return REGISTRY.filter((entry) => {
      if (filter !== "all" && entry.status !== filter) return false
      if (q && !entry.name.toLowerCase().includes(q) && !entry.purpose.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [filter, query])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Inventario actual de UI</h1>
            <p className="text-sm text-muted-foreground">
              Lista de componentes que seguimos manteniendo tras la poda.
            </p>
          </div>
          <Stats {...stats} />
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap gap-2 px-4 pb-4">
          <FilterPill label={`Todos (${stats.total})`} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterPill label={`Usados (${stats.used})`} active={filter === "used"} onClick={() => setFilter("used")} tone="used" />
          <FilterPill
            label={`Huérfanos (${stats.orphan})`}
            active={filter === "orphan"}
            onClick={() => setFilter("orphan")}
            tone="orphan"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción"
            className="min-w-48 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-[#00a0af] focus:ring-2 focus:ring-[#00a0af]/30"
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay componentes que coincidan con ese filtro.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visible.map((entry) => (
              <ComponentCard key={entry.name} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Stats({ total, used, orphan, deadPct }: { total: number; used: number; orphan: number; deadPct: number }) {
  return (
    <div className="flex gap-3 text-xs">
      <StatPill label="Total" value={total} />
      <StatPill label="Usados" value={used} tone="ok" />
      <StatPill label="Huérfanos" value={orphan} tone="bad" />
      <StatPill label="% dead code" value={`${deadPct}%`} tone="bad" />
    </div>
  )
}

function StatPill({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "ok" | "bad" | "neutral" }) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-border bg-muted text-muted-foreground"

  return (
    <div className={`flex flex-col items-center rounded-md border px-3 py-1.5 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="mt-0.5 text-lg font-semibold leading-none">{value}</span>
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
  tone,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone?: "used" | "orphan"
}) {
  const base = "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
  const inactive = "border-border bg-background text-muted-foreground hover:bg-muted"
  const activeCls = tone === "used"
    ? "border-emerald-600 bg-emerald-600 text-white"
    : tone === "orphan"
    ? "border-red-600 bg-red-600 text-white"
    : "border-[#00a0af] bg-[#00a0af] text-white"

  return (
    <button className={`${base} ${active ? activeCls : inactive}`} onClick={onClick}>
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status: UsageStatus }) {
  if (status === "used") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> USADO
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> HUÉRFANO
    </span>
  )
}

function ComponentCard({ entry }: { entry: (typeof REGISTRY)[number] }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <h2 className="font-mono text-sm font-semibold">{entry.name}</h2>
        <StatusBadge status={entry.status} />
      </header>
      <div className="flex min-h-[120px] items-center justify-center bg-background p-4">
        <div className="w-full">{entry.preview}</div>
      </div>
      <footer className="space-y-1 border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        <div>
          <strong className="text-foreground">Archivo:</strong> <code>{entry.file}</code>
        </div>
        {entry.consumers.length > 0 ? (
          <div>
            <strong className="text-foreground">Usado por:</strong>{" "}
            {entry.consumers.map((consumer) => (
              <code key={consumer} className="mr-1 inline-block rounded bg-emerald-100 px-1 py-0.5 text-emerald-800">
                {consumer}
              </code>
            ))}
          </div>
        ) : (
          <div className="text-red-600">Sin consumers. Disponible para futuros usos.</div>
        )}
      </footer>
    </section>
  )
}
