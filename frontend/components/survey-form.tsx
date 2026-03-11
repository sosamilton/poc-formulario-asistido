"use client"

import { useCallback, useState } from "react"
import { Model } from "survey-core"
import { Survey } from "survey-react-ui"
import "survey-core/defaultV2.min.css"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SurveyFormProps {
  json: object
  onComplete?: (data: Record<string, unknown>) => void
}

export function SurveyForm({ json, onComplete }: SurveyFormProps) {
  const [showRectifyModal, setShowRectifyModal] = useState(false)
  const [survey] = useState(() => {
    const surveyModel = new Model(json)
    
    // Custom theme to match ARBA colors
    surveyModel.applyTheme({
      cssVariables: {
        "--sjs-primary-backcolor": "#00a0af",
        "--sjs-primary-backcolor-light": "rgba(0, 160, 175, 0.1)",
        "--sjs-primary-backcolor-dark": "#008a99",
        "--sjs-primary-forecolor": "#ffffff",
        "--sjs-secondary-backcolor": "#f5f5f5",
        "--sjs-general-backcolor": "#ffffff",
        "--sjs-general-backcolor-dim": "#f8f9fa",
        "--sjs-general-forecolor": "#1a1a1a",
        "--sjs-general-forecolor-light": "#666666",
        "--sjs-border-default": "#e0e0e0",
        "--sjs-border-light": "#f0f0f0",
        "--sjs-corner-radius": "8px",
        "--sjs-base-unit": "8px",
        "--sjs-font-family": "inherit",
      },
    })
    
    return surveyModel
  })

  const handleComplete = useCallback((sender: Model) => {
    const results = sender.data
    onComplete?.(results)
  }, [onComplete])

  const handleValueChanged = useCallback((sender: Model, options: { name: string; value: string }) => {
    if (options.name === "periodo") {
      const pastPeriods = ["2025-12", "2025-11", "2025-10"]
      if (pastPeriods.includes(options.value)) {
        setShowRectifyModal(true)
        // Reset to current period
        sender.setValue("periodo", "2026-02")
      }
    }
  }, [])

  survey.onComplete.add(handleComplete)
  survey.onValueChanged.add(handleValueChanged)

  return (
    <>
      <style jsx global>{`
        .sd-root-modern {
          --sd-base-padding: 16px;
        }
        
        .sd-title {
          font-weight: 600 !important;
        }
        
        .sd-header__text {
          display: none;
        }
        
        .sd-body {
          padding: 0 !important;
        }
        
        .sd-page {
          padding: 0 !important;
        }
        
        .sd-question__title {
          font-size: 14px !important;
          color: #666 !important;
          font-weight: 500 !important;
        }
        
        .sd-input {
          border: 1px solid #e0e0e0 !important;
          border-radius: 8px !important;
          padding: 12px !important;
          font-size: 16px !important;
        }
        
        .sd-input:focus {
          border-color: #00a0af !important;
          box-shadow: 0 0 0 2px rgba(0, 160, 175, 0.1) !important;
        }
        
        .sd-dropdown {
          border: 2px solid #00a0af !important;
          border-radius: 8px !important;
        }
        
        .sd-btn {
          border-radius: 8px !important;
          padding: 12px 24px !important;
          font-weight: 500 !important;
        }
        
        .sd-btn--action {
          background-color: #00a0af !important;
        }
        
        .sd-btn--action:hover {
          background-color: #008a99 !important;
        }
        
        .sd-progress {
          background-color: #e0e0e0 !important;
          height: 4px !important;
          border-radius: 2px !important;
        }
        
        .sd-progress__bar {
          background-color: #00a0af !important;
        }
        
        .contribuyente-info {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
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
        
        .sd-paneldynamic__add-btn {
          color: #00a0af !important;
          border: 1px dashed #00a0af !important;
          border-radius: 8px !important;
        }
        
        .sd-paneldynamic__remove-btn {
          color: #dc2626 !important;
        }
        
        .sd-expression {
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #1a1a1a !important;
        }
        
        .sd-boolean__switch {
          background-color: #e0e0e0 !important;
        }
        
        .sd-boolean--checked .sd-boolean__switch {
          background-color: #00a0af !important;
        }
      `}</style>
      
      <Survey model={survey} />
      
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
