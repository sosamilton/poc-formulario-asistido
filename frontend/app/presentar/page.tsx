"use client"

import { HelpCircle, User, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SurveyForm } from "@/components/survey-form"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { useWindmillForm } from "@/hooks/use-windmill-form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function PresentarPage() {
  const router = useRouter()
  const { isLoading, error, formData, token, loadDeclaration } = useWindmillForm()

  const handleComplete = (data: Record<string, unknown>, metadata?: any, submissionId?: string) => {
    console.log("Declaración enviada:", data)
    console.log("Metadata:", metadata)
    console.log("Submission ID:", submissionId)
    
    toast.success("Declaración jurada presentada correctamente", {
      description: `Período: ${data.periodo}`,
    })
    router.push("/")
  }

  const handleLoadDeclaration = async () => {
    await loadDeclaration()
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

        {/* Load Declaration Button */}
        {!formData && !isLoading && (
          <div className="text-center py-8">
            <Button
              onClick={handleLoadDeclaration}
              className="bg-[#00a0af] hover:bg-[#008a99] text-white px-6 py-3"
            >
              Cargar declaración jurada
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Al hacer clic, generaremos tu declaración jurada de forma dinámica
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" className="text-[#00a0af]" />
            <p className="text-sm text-muted-foreground mt-4">
              Generando tu declaración jurada...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-destructive font-medium mb-2">
              Error al cargar el formulario
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {error}
            </p>
            <Button
              onClick={handleLoadDeclaration}
              variant="outline"
              size="sm"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Survey Form */}
        {formData && !isLoading && (
          <div>
            {/* Debug Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Token:</strong> {token?.substring(0, 20)}...
              </p>
              <p className="text-xs text-blue-800">
                <strong>Submission ID:</strong> {formData.submission_id}
              </p>
              <p className="text-xs text-blue-800">
                <strong>CUIT:</strong> {formData.metadata.cuit}
              </p>
            </div>

            <SurveyForm 
              json={formData.schema} 
              onComplete={handleComplete}
              metadata={formData.metadata}
              submissionId={formData.submission_id}
            />
          </div>
        )}
      </main>
    </div>
  )
}
