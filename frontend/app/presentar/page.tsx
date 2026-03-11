"use client"

import { HelpCircle, User, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SurveyForm } from "@/components/survey-form"
import surveyJson from "@/lib/surveys/ddjj-simple.json"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function PresentarPage() {
  const router = useRouter()

  const handleComplete = (data: Record<string, unknown>) => {
    console.log("Declaración enviada:", data)
    toast.success("Declaración jurada presentada correctamente", {
      description: `Período: ${data.periodo}`,
    })
    router.push("/")
  }

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
          Presentar declaración jurada mensual
        </h2>

        {/* Survey Form */}
        <SurveyForm json={surveyJson} onComplete={handleComplete} />
      </main>
    </div>
  )
}
