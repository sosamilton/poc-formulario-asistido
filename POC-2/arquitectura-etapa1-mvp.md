# Arquitectura Motor de Formularios – Etapa 1 (MVP)

## Objetivo de la etapa

Implementar un **MVP funcional** del motor de formularios sobre Windmill + SurveyJS para 1–2 formularios reales (por ejemplo DDJJ IIBB), con:

- **Flujo de punta a punta**: init → validate → submit.
- **Persistencia básica** de formularios y submissions.
- **Plugins mínimos de dominio** para preload, validación y envío.
- **API REST básica** consumible por un frontend con SurveyJS.

---

## Componentes incluidos en el MVP

### 1. Windmill como Core Engine

- **Workflows genéricos (orquestación mínima)**
  - `form_lifecycle/init__flow`
  - `form_lifecycle/validate__flow`
  - `form_lifecycle/submit__flow`

- **Core scripts (lógica genérica mínima)**
  - CRUD básico de formularios:
    - `forms/create_form.ts`
    - `forms/get_form.ts`
  - Runtime:
    - `forms/get_runtime.ts` (schema + config activa).
    - `forms/execute_hooks.ts` (versión simple para ejecutar una lista de hooks en orden).
  - Submissions:
    - `forms/save_submission.ts`.

- **Plugins específicos del formulario MVP (ejemplo DDJJ IIBB)**
  - Carpeta `plugins/ddjj/` con:
    - Preload:
      - `fetch_padron.ts`
      - `fetch_periodos.ts`
    - Validate:
      - `validate_business_rules.ts`
    - Submit:
      - `send_to_backend.ts`

> El foco es tener un set mínimo de hooks que permitan un formulario real, no la librería completa.

---

### 2. Modelo de datos mínimo (PostgreSQL Windmill)

Se aprovecha el Postgres interno de Windmill con un **subset de tablas** del diseño completo.

- **Tabla `forms`**
  - Campos principales:
    - `id` (uuid)
    - `slug` (text, unique)
    - `name` (text)
    - `description` (text)
    - `category` (text)
    - `active_version` (int)
    - `is_public` (boolean)
  - Índices básicos:
    - `idx_forms_slug`.

- **Tabla `form_versions`**
  - Campos principales:
    - `id` (uuid)
    - `form_id` (fk → forms)
    - `version` (int)
    - `schema_json` (jsonb) – Schema SurveyJS.
  - Índice único `(form_id, version)`.

- **Tabla `form_submissions`**
  - Campos principales:
    - `id` (uuid)
    - `form_id` (fk → forms)
    - `version` (int)
    - `data` (jsonb)
    - `status` (al menos: `draft` | `submitted` | `completed` | `failed`)
    - `created_at`, `updated_at`, `created_by`.

> Para el MVP se pueden simplificar algunos campos/estados siempre que no rompa la evolución a Etapa 2.

---

### 3. API REST para el Frontend

Endpoints expuestos por scripts Python en Windmill (`f/api/*`):

- **Inicializar formulario**
  - `GET /api/forms/{slug}/init`
  - Implementado por `api/get_form_init.py`.
  - Flujo:
    - Valida autenticación (si aplica).
    - Obtiene schema y configuración (`forms/get_runtime.ts`).
    - Ejecuta hooks de preload básicos.
    - Crea/actualiza `submission` en estado `draft`.
    - Devuelve `{ schema, data, submission_id, config }`.

- **Validar datos**
  - `POST /api/forms/{slug}/validate`
  - Implementado por `api/post_form_validate.py`.
  - Flujo:
    - Valida datos contra schema SurveyJS.
    - Ejecuta hooks de validación.
    - Devuelve `{ valid, errors[] }`.

- **Enviar formulario**
  - `POST /api/forms/{slug}/submit`
  - Implementado por `api/post_form_submit.py`.
  - Flujo:
    - Reusa el workflow de validación.
    - Guarda el envío (`forms/save_submission.ts`).
    - Ejecuta hook de `submit` (envío a backend).
    - Marca la submission como `completed` o `failed`.

> En el MVP **no se incluyen** aún endpoints de borrador dedicados ni endpoints admin avanzados.

---

### 4. Frontend del formulario (cliente)

- Cliente web (React/Svelte/etc.) que renderiza SurveyJS usando el schema devuelto.
- Interacción básica:
  - `init` → carga schema y datos precargados.
  - `validate` → se dispara antes de permitir el envío.
  - `submit` → envía respuestas al backend Windmill.

El frontend puede vivir en un proyecto Vite independiente (como el `frontend` existente en el repo), consumiendo los endpoints definidos arriba.

---

### 5. Administración mínima en MVP

- **Creación/edición de formularios** vía:
  - Scripts/API (por ahora) para cargar/actualizar `schema_json` en `form_versions`.
  - No se requiere todavía un editor visual integrado (SurveyJS Creator se deja para Etapa 2).

- **Visualización de submissions**
  - Se puede empezar con:
    - Consultas directas (SQL) o
    - Un script simple en Windmill que liste submissions por formulario.

---

## Fuera de alcance en Etapa 1 (se delega a Etapa 2)

- Borradores avanzados (`form_drafts` con expiración y multi-step).
- Librería completa de hooks por dominio y `post_submit` asíncronos.
- UI administrativa completa (forms list, editor visual, hooks manager, submissions viewer).
- SDK oficial JS/TS empaquetado.
- Gobernanza avanzada (roles, permisos finos, auditoría detallada).

El objetivo es **llegar rápido a producción interna** con un formulario real, validando el diseño de core (workflows + plugins + modelo de datos) con el mínimo de piezas necesarias.
