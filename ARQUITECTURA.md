# Arquitectura — Formularios Dinámicos IIBB

## Diagrama general

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario (navegador)                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Next.js + SurveyJS                                │
│  Puerto: 3014                                               │
│  • Renderiza formularios dinámicos (JSON Schema)              │
│  • Consume API de Windmill para precarga de datos           │
│  • Envía submissions a Windmill workflows                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Windmill (self-hosted)                                     │
│  Puerto: 8000                                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Server          │  │ Worker          │                  │
│  │ • Scripts (TS/  │  │ • Ejecuta flows │                  │
│  │   Python)       │  │ • Hooks         │                  │
│  │ • REST API      │  │ • Plugins       │                  │
│  │ • Workflows     │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐                                       │
│  │ PostgreSQL      │  Datos: scripts, flows, submissions,   │
│  │ (db interna)    │  Data Tables (forms, form_versions,    │
│  └─────────────────┘  form_submissions)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│  APIs Mock (Mockoon) │   │  APIs Reales ARBA    │
│  • iibb.json:3001    │   │  (futuro)            │
│  • iibb-simple:3002  │   │  • Servicio alícuotas │
└─────────────────────┘   │  • IBPresentaciones   │
                          │    (legacy)           │
                          └─────────────────────┘
```

---

## Flujo de una DDJJ Simple

### 1. Inicialización (`GET /init`)

```
Frontend → Windmill API (f/api/get_form_init)
         → Ejecuta workflow form_lifecycle/init_flow
         → Precarga: datos del contribuyente (padrón), períodos disponibles
         → Retorna: JSON Schema del formulario + datos precargados
```

### 2. Validación (`POST /validate`)

```
Frontend → Windmill API (f/api/post_form_validate)
         → Valida schema SurveyJS
         → Ejecuta reglas de negocio (f/plugins/ddjj/validate_business_rules)
         → Retorna: errores de validación o OK
```

### 3. Envío (`POST /submit`)

```
Frontend → Windmill API (f/api/post_form_submit)
         → Workflow form_lifecycle/submit_flow
         → 1. Guarda submission (form_submissions)
         → 2. Ejecuta hooks de submit (f/plugins/ddjj/send_to_backend)
         → 3. Marca submission como completed / failed
         → Retorna: comprobante, PDF, o error
```

---

## Capas y responsabilidades

| Capa | Responsabilidad | Tecnología |
|---|---|---|
| **Presentación** | Renderizar formularios, manejar estado UI, mostrar loaders/errores | Next.js + SurveyJS |
| **Orquestación** | Coordinar pasos del flujo (init → validate → submit), ejecutar hooks | Windmill workflows |
| **Lógica de negocio** | Validaciones DDJJ, precarga de datos padrón, cálculo de alícuotas | Windmill scripts (TS/Python) |
| **Persistencia** | Guardar definiciones de formularios, versiones y submissions | PostgreSQL (Windmill) |
| **Integración** | Consumir APIs externas (alícuotas, IBPresentaciones legacy) | Windmill scripts + HTTP |

---

## Estados de una submission

```
[DRAFT] ──▶ [VALIDATED] ──▶ [SUBMITTED] ──▶ [COMPLETED]
                              │
                              └──▶ [FAILED] ──▶ [RETRY] ──▶ [COMPLETED]
```

- **DRAFT**: Submission creada al inicializar el formulario
- **VALIDATED**: Pasó validación de schema + reglas de negocio
- **SUBMITTED**: Enviada al backend legacy (IBPresentaciones)
- **COMPLETED**: Cierre exitoso, comprobante generado
- **FAILED**: Error en backend, permite reintento

---

## Decisiones arquitectónicas

| Decisión | Opción elegida | Justificación |
|---|---|---|
| Motor de formularios | SurveyJS | JSON Schema maduro, buena UX, integrable con React |
| Orquestador | Windmill | Code-first (Python/TS), self-hosted, workflows visuales |
| Frontend | Next.js | Framework React estándar, SSR opcional, equipo familiarizado |
| APIs mock | Mockoon | Ligero, JSON-based, fácil de versionar en Git |
| Auth | JWT ARBA / Cookie SSO | Pendiente decisión de dominio (ver `docs/preguntas-criticas-arquitectura.md` A1-A2) |

---

## Roadmap hacia producción

| Fase | Alcance | Integración legacy |
|---|---|---|
| **v0 (POC)** | Windmill + Mock APIs + SurveyJS | Solo mocks |
| **v1 (MVP)** | DDJJ Simple (mono-actividad, mensual, LOCAL) | Integración real con IBPresentaciones (`/api/v1/*`) |
| **v2** | Multi-actividad ≤ N, rectificativas simples | Más endpoints legacy |
| **v3+** | Anuales, cooperativas, CM | Legacy como "modo avanzado" |

*Ver `docs/ddjj-simple.md` para detalle de alcance IN/OUT v1.*
