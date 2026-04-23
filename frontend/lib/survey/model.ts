import { Model, type ITheme } from "survey-core"

import { initSurveyLocalization } from "./localization"

export const ARBA_SURVEY_THEME: ITheme = {
  themeName: "arba-theme",
  colorPalette: "light",
  isPanelless: true,
  cssVariables: {
    "--sjs-font-family": "inherit",
    "--sjs-font-size": "16px",
    "--sjs-font-surveytitle-size": "20px",
    "--sjs-font-surveytitle-weight": "600",
    "--sjs-font-surveytitle-color": "#1a1a1a",
    "--sjs-font-questiontitle-size": "14px",
    "--sjs-font-questiontitle-weight": "500",
    "--sjs-font-questiontitle-color": "#666666",
    "--sjs-font-questiondescription-color": "#666666",
    "--sjs-base-unit": "8px",
    "--sjs-corner-radius": "8px",
    "--sjs-general-backcolor": "#ffffff",
    "--sjs-general-backcolor-dark": "transparent",
    "--sjs-general-backcolor-dim": "transparent",
    "--sjs-general-forecolor": "#1a1a1a",
    "--sjs-general-forecolor-light": "#666666",
    "--sjs-primary-backcolor": "#00a0af",
    "--sjs-primary-backcolor-dark": "#008a99",
    "--sjs-primary-backcolor-light": "rgba(0, 160, 175, 0.1)",
    "--sjs-primary-forecolor": "#ffffff",
    "--sjs-secondary-backcolor": "#ffffff",
    "--sjs-secondary-forecolor": "#1a1a1a",
    "--sjs-border-default": "#e0e0e0",
    "--sjs-border-light": "#f0f0f0",
    "--sjs-border-inside": "transparent",
    "--sjs-editorpanel-backcolor": "transparent",
    "--sjs-questionpanel-hovercolor": "#f5f7fa",
    "--sjs-shadow-small": "none",
    "--sjs-shadow-medium": "none",
    "--sjs-shadow-large": "none",
    "--sjs-editor-background": "#ffffff",
    "--sjs-question-title-font-size": "14px",
    "--sjs-question-title-font-weight": "500",
    "--sjs-editor-border": "1px solid #e0e0e0",
    "--sjs-editor-border-radius": "8px",
    "--sjs-editor-padding": "12px",
    "--sjs-editor-focus-border": "#00a0af",
    "--sjs-editor-focus-box-shadow": "0 0 0 2px rgba(0,160,175,0.1)",
    "--sjs-progressbar-backcolor": "#e0e0e0",
    "--sjs-progressbar-foreground": "#00a0af",
    "--sjs-button-border-radius": "8px",
    "--sjs-button-padding": "12px 24px",
    "--sjs-button-font-weight": "500",
  },
}

export interface CreateSurveyModelOptions {
  locale?: string
  applyHooks?: boolean
}

export function createSurveyModel(json: object, options: CreateSurveyModelOptions = {}) {
  initSurveyLocalization()

  const surveyModel = new Model(json)
  surveyModel.applyTheme(ARBA_SURVEY_THEME)
  surveyModel.locale = options.locale ?? "es"

  return surveyModel
}
