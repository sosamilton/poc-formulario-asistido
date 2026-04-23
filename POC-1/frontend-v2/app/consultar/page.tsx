"use client"

import { HelpCircle, User, ArrowLeft } from "lucide-react"
import Link from "next/link"

const DECLARATIONS = [
  { period: "Enero 2026", amount: "$15.250,00", status: "Presentada", date: "15/01/2026" },
  { period: "Diciembre 2025", amount: "$18.300,00", status: "Presentada", date: "10/12/2025" },
  { period: "Noviembre 2025", amount: "$12.450,00", status: "Presentada", date: "08/11/2025" },
]

export default function ConsultarPage() {
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
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[#00a0af] text-sm mb-4 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <h2 className="text-xl font-semibold text-foreground mb-6">
          Consultar declaraciones juradas
        </h2>

        {/* Declarations List */}
        <div className="space-y-3">
          {DECLARATIONS.map((declaration, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-foreground">{declaration.period}</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  {declaration.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">{declaration.amount}</span>
                <span className="text-xs text-muted-foreground">{declaration.date}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
