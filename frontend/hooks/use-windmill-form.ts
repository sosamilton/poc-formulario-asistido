"use client"

import { useState, useCallback } from "react"
import { windmillService, FormData } from "@/lib/services/windmill-service"
import { toast } from "sonner"

interface UseWindmillFormReturn {
  isLoading: boolean
  error: string | null
  formData: FormData | null
  token: string | null
  loadDeclaration: () => Promise<void>
  reset: () => void
}

export function useWindmillForm(): UseWindmillFormReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const loadDeclaration = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await windmillService.loadDeclaration()
      setFormData(result.formData)
      setToken(result.token)
      
      toast.success("Formulario cargado exitosamente", {
        description: "Declaración jurada generada dinámicamente",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      
      toast.error("Error al cargar el formulario", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setFormData(null)
    setToken(null)
  }, [])

  return {
    isLoading,
    error,
    formData,
    token,
    loadDeclaration,
    reset,
  }
}
