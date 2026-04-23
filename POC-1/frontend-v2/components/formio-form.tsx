"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface InitData {
  formUrl: string
  submissionId?: string
  prefillData?: Record<string, any>
  dynamicOptions?: Record<string, any[]>
}

interface FormioFormProps {
  initData: InitData
  onComplete?: (data: Record<string, unknown>, metadata?: any, submissionId?: string) => void
  metadata?: any
  submissionId?: string
}

// Componente wrapper que contiene toda la lógica de Form.io
function FormioFormWrapper({ initData, onComplete, metadata, submissionId }: FormioFormProps) {
  const [showRectifyModal, setShowRectifyModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const initializeForm = async () => {
      if (!formContainerRef.current) return

      try {
        setIsLoading(true)
        setError(null)

        // Import dinámico de Formio solo en el cliente
        const { Formio } = await import("@formio/js")

        // Destruir instancia anterior si existe
        if (formInstanceRef.current) {
          formInstanceRef.current.destroy()
          formInstanceRef.current = null
        }

        console.log('[DEBUG] initData recibido:', initData)

        // 1. Cargar schema del formulario desde Form.io
        const formioInstance = new Formio(initData.formUrl)
        const formSchema = await formioInstance.loadForm()

        console.log('[DEBUG] formSchema cargado:', formSchema)

        // 2. Inyectar opciones dinámicas en el schema
        if (initData.dynamicOptions) {
          console.log('[DEBUG] Inyectando dynamicOptions:', initData.dynamicOptions)
          
          const injectDynamicOptions = (components: any[]) => {
            if (!components) return
            
            components.forEach((component: any) => {
              if (component.dataSrc === 'custom' && initData.dynamicOptions && initData.dynamicOptions[component.key]) {
                console.log(`[DEBUG] Inyectando opciones para campo: ${component.key}`)
                component.data = {
                  custom: `values = ${JSON.stringify(initData.dynamicOptions[component.key])}`
                }
              }
              
              if (component.components) {
                injectDynamicOptions(component.components)
              }
              if (component.columns) {
                component.columns.forEach((col: any) => injectDynamicOptions(col.components))
              }
            })
          }
          
          injectDynamicOptions(formSchema.components)
        }

        // 3. Preparar submission data
        const submissionData: any = {
          data: initData.prefillData || {}
        }

        if (initData.submissionId) {
          submissionData._id = initData.submissionId
        }

        console.log('[DEBUG] Submission data preparada:', submissionData)

        // 4. Crear nueva instancia del formulario con schema cargado
        const formInstance = await Formio.createForm(
          formContainerRef.current,
          formSchema,
          {
            submission: submissionData,
            readOnly: false,
            breadcrumb: {
              clickable: false
            },
            button: {
              showCancel: false,
              showPrevious: true,
              showNext: true,
              showSubmit: true
            },
            template: 'bootstrap',
            language: 'es'
          }
        )

        // Aplicar tema ARBA personalizado
        formInstance.form.display = 'form'
        formInstance.form.components = applyArbaTheme(formInstance.form.components)

        // Configurar event handlers
        formInstance.on('submit', (submission: any) => {
          if (isMounted) {
            onComplete?.(submission.data, metadata, submissionId)
          }
        })

        formInstance.on('change', (changed: any) => {
          if (isMounted && changed.changed) {
            // Manejar cambios específicos como el período
            if (changed.changed === 'periodo') {
              const pastPeriods = ["2025-12", "2025-11", "2025-10"]
              if (pastPeriods.includes(changed.data.periodo)) {
                setShowRectifyModal(true)
                // Resetear a período actual
                formInstance.setValue('periodo', '2026-02')
              }
            }
          }
        })

        formInstanceRef.current = formInstance
        setIsLoading(false)
      } catch (err) {
        if (isMounted) {
          console.error('Error initializing Form.io form:', err)
          setError(err instanceof Error ? err.message : 'Error al cargar el formulario')
          setIsLoading(false)
        }
      }
    }

    initializeForm()

    return () => {
      isMounted = false
      if (formInstanceRef.current) {
        formInstanceRef.current.destroy()
        formInstanceRef.current = null
      }
    }
  }, [initData, onComplete, metadata, submissionId])

  const applyArbaTheme = (components: any[]): any[] => {
    if (!components) return []

    return components.map(component => {
      // Aplicar tema base a todos los componentes
      const themedComponent = {
        ...component,
        customClass: component.customClass ? `${component.customClass} arba-form-component` : 'arba-form-component',
        hideLabel: component.hideLabel || false,
        labelPosition: component.labelPosition || 'top'
      }

      // Personalizar según tipo de componente
      switch (component.type) {
        case 'textfield':
        case 'textarea':
        case 'number':
          return {
            ...themedComponent,
            inputFormat: component.inputFormat || 'plain',
            validate: {
              ...component.validate,
              required: component.validate?.required || false
            }
          }

        case 'select':
        case 'selectboxes':
        case 'radio':
          return {
            ...themedComponent,
            inputType: component.inputType || 'select',
            inline: component.inline || false,
            values: component.values || []
          }

        case 'checkbox':
          return {
            ...themedComponent,
            inputType: 'checkbox'
          }

        case 'button':
          return {
            ...themedComponent,
            theme: component.theme || 'primary',
            block: component.block || false,
            size: component.size || 'md'
          }

        case 'panel':
          return {
            ...themedComponent,
            components: applyArbaTheme(component.components || [])
          }

        case 'columns':
          return {
            ...themedComponent,
            columns: component.columns?.map((col: any) => ({
              ...col,
              components: applyArbaTheme(col.components || [])
            }))
          }

        default:
          // Recursivo para componentes con hijos
          if (component.components) {
            themedComponent.components = applyArbaTheme(component.components)
          }
          if (component.columns) {
            themedComponent.columns = component.columns.map((col: any) => ({
              ...col,
              components: applyArbaTheme(col.components || [])
            }))
          }
          return themedComponent
      }
    })
  }

  return (
    <>
      <style jsx global>{`
        /* Tema ARBA para Form.io */
        .formio-form {
          font-family: inherit;
        }

        .formio-form .form-group {
          margin-bottom: 1.5rem;
        }

        .formio-form label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .formio-form .form-control {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .formio-form .form-control:focus {
          border-color: #00a0af;
          box-shadow: 0 0 0 2px rgba(0, 160, 175, 0.1);
          outline: none;
        }

        .formio-form .form-control.is-invalid {
          border-color: #dc2626;
        }

        .formio-form .invalid-feedback {
          color: #dc2626;
          font-size: 14px;
          margin-top: 0.25rem;
        }

        .formio-form .btn {
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 500;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .formio-form .btn-primary {
          background-color: #00a0af;
          border-color: #00a0af;
          color: white;
        }

        .formio-form .btn-primary:hover {
          background-color: #008a99;
          border-color: #008a99;
        }

        .formio-form .btn-secondary {
          background-color: #ffffff;
          border-color: #e0e0e0;
          color: #1a1a1a;
        }

        .formio-form .btn-secondary:hover {
          background-color: #f8f9fa;
        }

        .formio-form .form-check-input {
          border-color: #e0e0e0;
        }

        .formio-form .form-check-input:checked {
          background-color: #00a0af;
          border-color: #00a0af;
        }

        .formio-form select.form-control {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }

        .formio-form .panel {
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .formio-form .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 1rem;
        }

        .contribuyente-info {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid #e9ecef;
        }

        .contribuyente-info .info-row {
          margin-bottom: 12px;
        }

        .contribuyente-info .info-row:last-child {
          margin-bottom: 0;
        }

        .contribuyente-info .label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 4px;
        }

        .contribuyente-info .value {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .warning-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background-color: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .warning-box svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .warning-box p {
          font-size: 14px;
          color: #e65100;
          margin: 0;
          line-height: 1.5;
        }

        .formio-form .formio-component-datetime {
          position: relative;
        }

        .formio-form .formio-component-datetime .input-group-text {
          background-color: #f8f9fa;
          border-color: #e0e0e0;
        }

        /* Progress bar */
        .formio-form .formio-wizard-nav {
          background-color: #e0e0e0;
          height: 4px;
          border-radius: 2px;
          margin-bottom: 1rem;
        }

        .formio-form .formio-wizard-nav .progress-bar {
          background-color: #00a0af;
        }

        /* Remove default Form.io styling that conflicts */
        .formio-form .has-error .form-control {
          border-color: #dc2626;
        }

        .formio-form .col-form-label {
          font-weight: 500;
        }
      `}</style>

      {isLoading && (
        <div className="text-center py-5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a0af] mx-auto"></div>
          <p className="mt-3 text-gray-600">Cargando formulario...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={formContainerRef} style={{ display: isLoading || error ? 'none' : 'block' }} />

      {/* Rectify Modal */}
      <Dialog open={showRectifyModal} onOpenChange={setShowRectifyModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Rectificar declaraciones no está disponible en esta versión
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              <span className="block mb-4">
                La nueva versión de la declaración jurada no permite rectificar declaraciones anteriores.
              </span>
              <span className="block">
                Para poder completar la rectificación, utilizá la versión anterior.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              className="w-full bg-[#00a0af] hover:bg-[#008a99] text-white"
              onClick={() => window.open("https://arba.gob.ar", "_blank")}
            >
              Ir a la versión anterior
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowRectifyModal(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Componente dinámico principal que evita SSR
const FormioFormComponent = dynamic(() => Promise.resolve(FormioFormWrapper), {
  ssr: false,
  loading: () => (
    <div className="text-center py-5">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a0af] mx-auto"></div>
      <p className="mt-3 text-gray-600">Cargando formulario...</p>
    </div>
  )
})

// Export principal
export function FormioForm({ initData, onComplete, metadata, submissionId }: FormioFormProps) {
  return <FormioFormComponent initData={initData} onComplete={onComplete} metadata={metadata} submissionId={submissionId} />
}
