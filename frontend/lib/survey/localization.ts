import "survey-core/i18n/spanish"
import { surveyLocalization } from "survey-core"

let initialized = false

export function initSurveyLocalization() {
  if (initialized) return

  surveyLocalization.defaultLocale = "es"
  surveyLocalization.currentLocale = "es"

  surveyLocalization.locales["es"] = {
    ...surveyLocalization.locales["es"],
    pageNextText: "Continuar",
    pagePrevText: "Anterior",
    completeText: "Presentar declaración",
    previewText: "Revisar",
    editText: "Editar",
    startSurveyText: "Comenzar",
    exitSurvey: "Salir",
    requiredError: "Este campo es obligatorio",
    numericError: "Debe ingresar un número válido",
    requiredInAllRowsError: "Complete todos los campos obligatorios",
    loadingSurvey: "Cargando…",
    emptySurvey: "El formulario está vacío",
    noPreview: "No hay vista previa disponible",
    progressText: "Página {0} de {1}",
    answeredQuestionsText: "Respondidas {0} de {1}",
    progressBarButton: "Progreso",
    progressBarType: {
      pages: "Páginas",
      questions: "Preguntas",
      requiredQuestions: "Obligatorias",
      correctQuestions: "Correctas",
      buttons: "Botones",
    },
  }

  initialized = true
}
