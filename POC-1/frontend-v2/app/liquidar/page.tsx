"use client"

import { HelpCircle, User, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const PENDING_DECLARATIONS = [
  { period: "Enero 2026", amount: "$152,50", dueDate: "20/02/2026" },
  { period: "Diciembre 2025", amount: "$183,00", dueDate: "20/01/2026", overdue: true },
]

export default function LiquidarPage() {
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
          Liquidar declaraciones
        </h2>

        {/* Pending Declarations List */}
        <div className="space-y-3">
          {PENDING_DECLARATIONS.map((declaration, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                declaration.overdue ? "border-red-300 bg-red-50" : "border-border"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-foreground">{declaration.period}</span>
                {declaration.overdue && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                    Vencida
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-semibold text-foreground">{declaration.amount}</span>
                <span className="text-xs text-muted-foreground">
                  Vence: {declaration.dueDate}
                </span>
              </div>
              <Button
                className="w-full bg-[#00a0af] hover:bg-[#008a99] text-white"
                size="sm"
              >
                Pagar
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
