"use client"

import { useState, useCallback } from "react"
import { windmillService, FormData } from "@/lib/services/windmill-service"
import { toast } from "sonner"

interface UseWindmillFormReturn {
  isLoading: boolean
  error: string | null
  formData: FormData | null
  token: string | null
  loadDeclaration: (formId?: string, params?: Record<string, any>) => Promise<void>
  submitDeclaration: (formId: string, submissionId: string, data: Record<string, any>) => Promise<void>
  reset: () => void
}

export function useWindmillForm(): UseWindmillFormReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const loadDeclaration = useCallback(async (formId?: string, params = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await windmillService.loadDeclaration(formId, params)
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

  const submitDeclaration = useCallback(async (formId: string, submissionId: string, data: Record<string, any>) => {
    try {
      if (!token) {
        throw new Error('No hay token de autenticación')
      }

      const result = await windmillService.submitForm(formId, submissionId, data, token)
      
      toast.success("Formulario enviado exitosamente", {
        description: "Declaración jurada presentada correctamente",
      })
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      
      toast.error("Error al enviar el formulario", {
        description: errorMessage,
      })
      
      throw err
    }
  }, [token])

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
    submitDeclaration,
    reset,
  }
}
