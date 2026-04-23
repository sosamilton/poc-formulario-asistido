"use client"

import { useCallback, useEffect, useState } from "react"
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
import { createSurveyModel } from "@/lib/survey/model"

interface SurveyFormProps {
  json: object
  onComplete?: (data: Record<string, unknown>, metadata?: any, submissionId?: string) => void
  metadata?: any
  submissionId?: string
}

export function SurveyForm({ json, onComplete, metadata, submissionId }: SurveyFormProps) {
  const [showRectifyModal, setShowRectifyModal] = useState(false)
  const defaultPeriodo = metadata?.defaultPeriod ?? "2026-02"
  const [survey] = useState(() => {
    return createSurveyModel(json)
  })

  const handleComplete = useCallback((sender: Model) => {
    const results = sender.data
    onComplete?.(results, metadata, submissionId)
  }, [onComplete, metadata, submissionId])

  const handleValueChanged = useCallback((sender: Model, options: { name: string; value: string }) => {
    if (options.name === "periodo") {
      const rectificationPeriods = metadata?.rectificationPeriods ?? ["2025-12", "2025-11", "2025-10"]
      if (rectificationPeriods.includes(options.value)) {
        setShowRectifyModal(true)
        sender.setValue("periodo", defaultPeriodo)
      }
    }
  }, [metadata, defaultPeriodo])

  useEffect(() => {
    survey.onComplete.add(handleComplete)
    survey.onValueChanged.add(handleValueChanged)

    return () => {
      survey.onComplete.remove(handleComplete)
      survey.onValueChanged.remove(handleValueChanged)
    }
  }, [survey, handleComplete, handleValueChanged])

  return (
    <>
      <style jsx global>{`
        /* =========================
          Layout / estructura
          ========================= */

        .sd-root-modern {
          background: transparent;
        }

        .sd-body {
          padding: 0;
          background: transparent;
        }

        .sd-page {
          padding: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .sd-row {
          background: transparent;
          border: none;
        }

        /* =========================
          Limpieza de estilos default
          ========================= */

        .sd-element,
        .sd-question,
        .sd-row__question,
        .sd-element--with-frame {
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .sd-question__content,
        .sd-element__content {
          background: transparent;
          border: none;
        }

        /* eliminar focus azul default */
        .sd-question:focus,
        .sd-element:focus,
        .sd-row__question:focus {
          outline: none;
          box-shadow: none;
        }

        /* =========================
          Título (estructura, no tipografía)
          ========================= */

        .sd-header__text {
          display: block;
        }

        .sd-title.sd-container-modern__title {
          margin-bottom: 16px;
        }

        /* =========================
          Panel dinámico (no fully themeable)
          ========================= */

        .sd-paneldynamic__add-btn {
          border: 1px dashed currentColor;
        }

        .sd-paneldynamic__remove-btn {
          /* solo estructura, color ya lo maneja el theme si querés */
        }

        /* =========================
          Boolean (switch base)
          ========================= */

        .sd-boolean__switch {
          /* fallback estructural por si el theme no aplica */
          background-color: #e0e0e0;
        }

        /* =========================
          Custom UI
          ========================= */

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
      `}</style>
      
      <Survey model={survey} />
      
      {/* Rectify Modal 
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
      */}
    </>
  )
}
