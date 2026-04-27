# Documentación del Proyecto — DDJJ Simple (Formularios Dinámicos IIBB)

Este directorio contiene el análisis, decisiones y preguntas abiertas para el proyecto de formularios dinámicos de DDJJ Simple de ARBA (IIBB).

---

## Estructura de documentos

| Documento | Propósito | Estado | Audiencia |
|---|---|---|---|
| `ddjj-simple.md` | **Hoja de ruta consolidada**. Decisiones tomadas, alcance v1 IN/OUT, contrato de endpoints, mapeo Frontend → `Dj` legacy, diagrama de arquitectura, riesgos y plan de fases. | ✅ Actualizado (post-análisis legacy) | Equipo completo |
| `preguntas-generales-por-temas.md` | **Preguntas abiertas por área** (Negocio, Legacy, Seguridad, DBA, Infra, Frontend, Legales). Cada pregunta tiene respuestas verificadas por análisis de código legacy cuando aplica. | ✅ Actualizado con respuestas de análisis de código | Stakeholders y equipo técnico |
| `preguntas-criticas-arquitectura.md` | **Preguntas cuyas respuestas definen la arquitectura**. Derivado de `preguntas-generales-por-temas.md`, solo incluye las que cambian el diseño o stack técnico. Ordenadas por impacto. | ✅ Creado (post-análisis legacy) | Arquitectos, PM, líderes técnicos |
| `ibpresentaciones-convivencia-frontend-windmill.md` | **Opciones de convivencia entre IBPresentaciones, el nuevo frontend y Windmill**. Resume escenarios, pros/contras, dependencias de auth y preguntas que faltan cerrar para decidir el encaje final. | ✅ Creado | Arquitectura, frontend, backend, seguridad |
| `host-oracle-analisis-inicial.md` | **Análisis de llamadas Host ↔ Oracle**. Qué rutinas Natural (`IBWNACTC`, `IBWNPAD`, etc.) se invocan, qué devuelven, y qué se persiste en Oracle. | ✅ Verificado con código legacy | Devs backend |
| `propuesta-flujo-elegibilidad.md` | **Análisis de alternativas para la puerta de elegibilidad**. Compara Opción A (`/elegibilidad` API dedicada), Opción B (redirect opaco), y Opción C (`/iniciar` híbrida, recomendada). Incluye contratos, pros/contras, y decisión pendiente. | ✅ Creado (análisis arquitectónico) | Arquitectos, PM |
| `analisis-datos-endpoint-ddjj.md` | **Borrador arquitectónico inicial (v0)**. Contiene modelos A/B, endpoints hipotéticos, y diagramas de integración previos al análisis profundo de código. | ⚠️ Obsoleto — ver `../apis/contrato-ddjj-simple.md` y `preguntas-criticas-arquitectura.md` para decisiones actuales | Referencia histórica |

---

## Documentos relacionados en otros directorios

| Ubicación | Documento | Propósito |
|---|---|---|
| `../apis/contrato-ddjj-simple.md` | Contrato de servicio REST para DDJJ Simple. Incluye endpoints `/me`, `/elegibilidad`, `/preview`, `/confirmar` con requests/responses basados en OpenAPI real del servicio de alícuotas. | ✅ Actualizado |
| `../apis/iibb-simple.json` | Mock server (JSON) con escenarios: elegible, no elegible, errores de cierre, etc. | ✅ Actualizado |
| `../apis/openapi-alicuota.json` | OpenAPI del servicio real de alícuotas de ARBA (descubierto en análisis legacy). | ✅ Referencia |

---

## Cómo usar esta documentación

1. **Para entender el alcance y decisiones**: leer `ddjj-simple.md` (sección "Decisiones tomadas" y "Alcance v1").
2. **Para saber qué falta decidir**: leer `preguntas-criticas-arquitectura.md` y priorizar las preguntas 🔴.
3. **Para analizar alternativas de flujo de elegibilidad**: leer `propuesta-flujo-elegibilidad.md` (Opción A/B/C con contratos y comparativa).
4. **Para ver respuestas verificadas de código legacy**: leer `preguntas-generales-por-temas.md` (buscar "✅ Respuesta").
5. **Para entender integración Host/Oracle**: leer `host-oracle-analisis-inicial.md`.
6. **Para implementar el contrato REST**: usar `../apis/contrato-ddjj-simple.md` + `../apis/iibb-simple.json` como mock.

---

## Hallazgos clave del análisis de código legacy (resumen)

- **Autenticación**: No se requiere JWT si frontend y backend comparten cookie SSO (`Domain=.arba.gov.ar`). `SessionFilter` ya maneja sesiones sin `HttpSession` para URLs tipo `/servicios`.
- **Framework REST**: Spring MVC 4.3.9 ya está en `pom.xml`. Struts 1.1 atiende solo `*.do`. REST puede coexistir sin dependencias nuevas.
- **PDF**: `PDFManager` es stateless, thread-safe, y genera `byte[]` sin depender de Struts.
- **Transacciones**: Legacy tiene modo sincronizado (`@Transactional` Oracle + Host con rollback automático) y modo 2 transacciones (riesgo de inconsistencia). Recomendado: modo sincronizado.
- **Auditoría**: Subtipos de gestión son constantes Java (no requieren seed en base). Agregar `SUBTIPO_OPERACION_DDJJ_SIMPLE` es trivial.
- **Elegibilidad**: Reglas propuestas (mono-actividad + alícuota estándar + sin tratamiento fiscal + LOCAL) son viables pero **pendiente de validación con negocio**.

---

*Última actualización: Abr 2026*
