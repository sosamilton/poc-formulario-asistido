"use client"

import { HelpCircle, User, FileText, Search, Calculator } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-2xl font-bold text-[#00a0af]">ARBA</h1>
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full bg-[#00a0af] flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-white" />
          </button>
          <button className="w-8 h-8 rounded-full bg-[#00a0af] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Declaración jurada de ingresos brutos
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          🎉 Simplificamos la declaración jurada para que puedas completarla más fácil.
        </p>

        {/* Menu Options */}
        <div className="space-y-3">
          <Link
            href="/presentar"
            className="flex items-center gap-4 p-4 border-2 border-[#00a0af] rounded-lg bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="text-[#00a0af]">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-medium text-[#00a0af]">Nuevo</span>
              <p className="text-foreground font-medium">Presentá la declaración jurada</p>
            </div>
          </Link>

          <Link
            href="/consultar"
            className="flex items-center gap-4 p-4 border border-border rounded-lg bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="text-[#00a0af]">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <p className="text-foreground font-medium">Consultá tus declaraciones juradas</p>
            </div>
          </Link>

          <Link
            href="/liquidar"
            className="flex items-center gap-4 p-4 border border-border rounded-lg bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="text-[#00a0af]">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <p className="text-foreground font-medium">Liquidá tus declaraciones</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
