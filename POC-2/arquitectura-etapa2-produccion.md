# Arquitectura Motor de Formularios – Etapa 2 (Evolución y Producción)

## Objetivo de la etapa

Convertir el motor de formularios en una **plataforma corporativa de formularios**:

- Soporta múltiples dominios (DDJJ, trámites, consultas, etc.).
- Administra versiones, borradores y hooks complejos.
- Brinda UI de administración y monitoreo.
- Escala en producción con seguridad, observabilidad y resiliencia.

Esta etapa **construye sobre el MVP** (Etapa 1) sin romper sus contratos (API/workflows).

---

## Ampliación de capacidades funcionales

- **Multi-formulario y multi-dominio**
  - Uso intensivo de `forms.category`, `slug` y metadata.
  - Formularios de distintos tipos reutilizando el mismo core.

- **Ciclo de vida completo del formulario**
  - Soporte de:
    - `init`, `validate`, `submit` (ya existentes).
    - `draft_save`, `draft_recover`.
  - Hooks por tipo: `preload`, `validate`, `pre_submit`, `submit`, `post_submit`, `on_draft`.

- **Gestión avanzada de versiones**
  - Publicación de nuevas versiones con `changelog`.
  - Estrategia de compatibilidad con submissions históricas.

- **Administración visual completa**
  - Apps de Windmill para gestionar formularios, hooks y submissions.
  - Integración con SurveyJS Creator como editor visual de formularios.

---

## Componentes técnicos ampliados

### 1. Windmill – Workflows completos

- **Workflows de ciclo de vida**
  - `form_lifecycle/init__flow` (ya en MVP, se enriquece).
  - `form_lifecycle/validate__flow` (más tipos de hooks y manejo de severidad).
  - `form_lifecycle/submit__flow` (manejo robusto de errores y rollback).
  - `form_lifecycle/draft_save__flow`.
  - `form_lifecycle/draft_recover__flow`.

- **Mejoras clave**
  - Ejecución paralela de hooks de `preload` (via `branchall`).
  - Secuenciación configurable de `validate` y `submit` según `execution_order`.
  - Manejo de `on_error` (`fail`, `continue`, `rollback`).

---

### 2. Windmill – Core scripts completos

- **CRUD completo de formularios** (`f/forms/*`)
  - `create_form.ts`
  - `update_form.ts`
  - `delete_form.ts`
  - `list_forms.ts`
  - `publish_version.ts`
  - `get_form.ts`
  - `get_runtime.ts`

- **Submissions**
  - `save_submission.ts`
  - `get_submission.ts`
  - `list_submissions.ts`
  - Manejo completo de estados (`draft`, `submitted`, `processing`, `completed`, `failed`).

- **Drafts**
  - `save_draft.ts`
  - `get_draft.ts`
  - `delete_draft.ts`
  - Política de expiración (`expires_at`).

- **Gestión de hooks**
  - `add_hook.ts`
  - `remove_hook.ts`
  - `list_hooks.ts`
  - `toggle_hook.ts`
  - Lógica genérica para ejecutar hooks según configuración almacenada en BD.

---

### 3. Plugins por dominio y comunes

- **Plugins específicos (ejemplos)**
  - `plugins/ddjj/*`:
    - `fetch_padron.ts`, `fetch_historial.ts`, `fetch_periodos.ts`, `fetch_alicuota.ts`.
    - `validate_business_rules.ts`, `validate_periodo.ts`.
    - `calculate_tax.ts`, `send_to_backend.ts`, `generate_pdf.ts`, `send_notification.ts`.
  - `plugins/tramite_habilitacion/*`:
    - `preload_empresa.ts`, `validate_documentacion.ts`, `submit_to_mesa_entradas.ts`.

- **Plugins reutilizables (`plugins/common/*`)**
  - `validate_cuit.ts`.
  - `validate_email.ts`.
  - `send_email.ts`.
  - `upload_file.ts`.

> La idea es **crecer por dominios** reutilizando el mismo core, con plugins que encapsulan la lógica específica de negocio.

---

## Modelo de datos completo

Además de las tablas usadas en el MVP:

- **`form_hooks`**
  - Define hooks por formulario y tipo (`preload`, `validate`, `pre_submit`, `submit`, `post_submit`, `on_draft`).
  - Campos clave:
    - `form_id` (fk → forms)
    - `hook_type`
    - `hook_path`
    - `execution_order`
    - `config` (jsonb)
    - `enabled`
    - `on_error` (`fail`, `continue`, `rollback`)
  - Índice `idx_form_hooks_form_type (form_id, hook_type, execution_order)`.

- **`form_drafts`**
  - Maneja borradores en curso.
  - Campos clave:
    - `form_id`, `submission_id`, `data`, `last_step`, `expires_at`, `created_by`.
  - Índices por `created_by` y `expires_at`.

- **Optimización de índices en `form_submissions`**
  - Para filtrar por `status`, `created_at`, `created_by`.

---

## API REST completa

### Endpoints públicos (frontend)

- `GET /api/forms/{slug}/init`
- `POST /api/forms/{slug}/validate`
- `POST /api/forms/{slug}/submit`
- `POST /api/forms/{slug}/draft`
- `GET /api/forms/{slug}/draft`

Estos endpoints usan los workflows de `form_lifecycle/*` y los core scripts de `forms/*`.

### Endpoints administrativos

- Formularios:
  - `GET /api/admin/forms`
  - `POST /api/admin/forms`
  - `POST /api/admin/forms/{slug}/publish`

- Hooks:
  - `POST /api/admin/forms/{slug}/hooks`
  - (Opcional) Endpoints adicionales para update/delete de hooks.

- Submissions:
  - `GET /api/admin/forms/{slug}/submissions`

> Todos los endpoints admin requieren autenticación/roles adecuados.

---

## UI Administrativa (Windmill Apps)

- **`admin/forms_list_app`**
  - Lista formularios con filtros.
  - Activa/desactiva formularios.
  - Muestra estadísticas básicas (cantidad de submissions, versión activa).

- **`admin/form_editor_app`**
  - Integra **SurveyJS Creator** para editar formularios visualmente.
  - Permite gestionar metadata (nombre, categoría, flags de drafts, etc.).
  - Publica nuevas versiones llamando a `/api/admin/forms/{slug}/publish`.

- **`admin/hooks_manager_app`**
  - UI para listar, agregar, editar, borrar y reordenar hooks.
  - Permite probar hooks individualmente y ver logs.

- **`admin/submissions_viewer_app`**
  - Tabla de submissions por formulario.
  - Filtros por estado, fecha, usuario.
  - Reintentos para submissions fallidas.
  - Exportación (CSV/Excel) si se requiere.

---

## SDK y guías de integración

- **SDK JS/TS (`windmill-forms-sdk.ts`)**
  - Métodos típicos:
    - `initForm(slug, context?)`
    - `validateForm(slug, submissionId, data)`
    - `submitForm(slug, submissionId, data)`
    - `saveDraft(slug, submissionId, data, lastStep?)`
    - `getDraft(slug)`
  - Manejo centralizado de:
    - `baseUrl` hacia Windmill.
    - Token de autenticación.

- **Guías de integración**
  - Ejemplos para React/Svelte/Vue usando SurveyJS.
  - Recomendaciones de UX (manejo de borradores, mensajes de error, etc.).

---

## Aspectos de producción

### Seguridad

- **Autenticación**
  - Tokens (JWT, OAuth2, o mecanismo corporativo) para consumidores de la API.

- **Autorización**
  - Roles/permisos para:
    - Administración de formularios.
    - Gestión de hooks.
    - Acceso a submissions (datos sensibles).

- **Validación y sanitización**
  - Validación estricta de inputs en endpoints.
  - Límite de tamaño de payload y protección contra abusos.

---

### Observabilidad y monitoreo

- **Logging estructurado**
  - Por cada workflow y hook:
    - `submission_id`, `form_id`, `hook_type`, `hook_path`, tiempos y estado.

- **Métricas clave**
  - Cantidad de submissions por formulario.
  - Tiempos de respuesta de endpoints.
  - Errores por hook y por formulario.

- **Alertas**
  - Sobre tasas de error anómalas.
  - Demoras excesivas en `submit` o `post_submit`.

---

### Escalabilidad y resiliencia

- **Asincronía en `post_submit`**
  - Envío de notificaciones, generación de PDFs pesados, integraciones lentas.

- **Manejo de errores y reintentos**
  - Uso de `on_error = 'rollback'` cuando corresponde.
  - Capacidad de reintentar desde la UI admin (replay de submissions fallidas).

- **Estrategia de versionado**
  - Formularios con estados (`draft`, `published`, `deprecated`).
  - Política para qué versión se usa para nuevos envíos vs consultas históricas.

---

## Relación con la Etapa 1

- La Etapa 2 **no reemplaza** al MVP, sino que lo **amplía**.
- Los contratos base (endpoints `init/validate/submit` y workflows principales) se mantienen.
- Nuevos componentes se agregan de forma compatible:
  - Más tipos de hooks.
  - Más endpoints (draft, admin).
  - Más tablas (`form_hooks`, `form_drafts`) y más índices.

El resultado final es una **plataforma de formularios genérica**, extensible por plugins y administrable visualmente, lista para operación en producción.
