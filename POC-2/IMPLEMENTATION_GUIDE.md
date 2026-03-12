# POC-2 Implementation Guide

## Resumen Ejecutivo

Motor de formularios MVP basado en **Windmill + SurveyJS** para IIBB, implementando el flujo completo de declaración jurada (DDJJ) con:

- ✅ Persistencia en PostgreSQL
- ✅ Workflows de orquestación (init, validate, submit)
- ✅ Plugins específicos de dominio (DDJJ IIBB)
- ✅ API REST consumible por frontend
- ✅ Ejemplo de frontend React + SurveyJS

## Arquitectura

```
┌─────────────┐
│   Frontend  │ (React + SurveyJS)
│  (Browser)  │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────────────────────┐
│         Windmill API                │
│  Workspace: formularios             │
├─────────────────────────────────────┤
│  API Endpoints (Python)             │
│  - get_form_init.py                 │
│  - post_form_validate.py            │
│  - post_form_submit.py              │
├─────────────────────────────────────┤
│  Workflows (YAML)                   │
│  - init_flow                        │
│  - validate_flow                    │
│  - submit_flow                      │
├─────────────────────────────────────┤
│  Core Scripts (TypeScript)          │
│  - forms/create_form                │
│  - forms/get_runtime                │
│  - forms/execute_hooks              │
│  - forms/save_submission            │
├─────────────────────────────────────┤
│  Plugins DDJJ (TypeScript)          │
│  - fetch_padron (preload)           │
│  - fetch_periodos (preload)         │
│  - validate_business_rules          │
│  - send_to_backend (submit)         │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      PostgreSQL Database            │
│  - forms                            │
│  - form_versions                    │
│  - form_submissions                 │
└─────────────────────────────────────┘
```

## Componentes Implementados

### 1. Base de Datos (`windmill/db/schema.sql`)

**Ubicación:** Base de datos `datatable_db` (Instance database de Windmill)

**Acceso:** Vía **Data Tables API** (`wmill.datatable()`)

**Tablas:**
- `forms`: Definiciones de formularios
- `form_versions`: Schemas versionados (SurveyJS JSON)
- `form_submissions`: Envíos de usuarios

**Ventajas de usar Data Tables:**
- ✅ Integración automática con sistema de assets
- ✅ Visualización en Database Explorer
- ✅ Detección automática de dependencias en flows
- ✅ Gestión de credenciales por Windmill
- ✅ Workspace-scoped automáticamente

### 2. Scripts Core (`windmill/scripts/forms/`)

Todos los scripts usan **Data Tables API** para acceso a base de datos:

```typescript
import * as wmill from "windmill-client";

// Acceso a Data Tables
const sql = wmill.datatable();

// Query con template strings (seguro contra SQL injection)
const form = await sql`SELECT * FROM forms WHERE slug = ${slug}`.fetchOne();
```

**Scripts implementados:**
- **`create_form.ts`**: Crear nuevo formulario con schema inicial
- **`get_form.ts`**: Obtener definición de formulario
- **`get_runtime.ts`**: Obtener schema + config activa
- **`execute_hooks.ts`**: Ejecutar lista de hooks en secuencia
- **`save_submission.ts`**: Guardar/actualizar submission

### 3. Workflows (`windmill/workflows/form_lifecycle/`)

#### `init_flow.yaml`
1. Obtiene runtime (schema + config)
2. Ejecuta hooks de preload
3. Merge datos precargados
4. Crea submission en estado `draft`
5. Retorna schema + datos + submission_id

#### `validate_flow.yaml`
1. Valida contra schema SurveyJS
2. Ejecuta hooks de validación
3. Retorna errores consolidados

#### `submit_flow.yaml`
1. Valida datos
2. Guarda submission como `submitted`
3. Ejecuta hooks de submit
4. Actualiza estado a `completed` o `failed`

### 4. Plugins DDJJ (`windmill/scripts/plugins/ddjj/`)

**Preload:**
- `fetch_padron.ts`: Consulta datos del contribuyente
- `fetch_periodos.ts`: Obtiene períodos disponibles

**Validate:**
- `validate_business_rules.ts`: Reglas de negocio específicas

**Submit:**
- `send_to_backend.ts`: Envía a backend IIBB

### 5. API Endpoints (`windmill/scripts/api/`)

- **`get_form_init.py`**: `POST /api/w/formularios/jobs/run/f/formularios/api/get_form_init`
- **`post_form_validate.py`**: `POST /api/w/formularios/jobs/run/f/formularios/api/post_form_validate`
- **`post_form_submit.py`**: `POST /api/w/formularios/jobs/run/f/formularios/api/post_form_submit`

### 6. Frontend Example (`frontend-example/`)

React + SurveyJS con:
- Componente `FormRenderer` reutilizable
- Integración completa con API Windmill
- Validación en tiempo real
- Manejo de estados (loading, error, success)

## Flujo de Datos

### Inicialización
```
Usuario → Frontend → API (get_form_init)
                   ↓
              init_flow workflow
                   ↓
         1. get_runtime (schema + config)
         2. execute_hooks (preload)
         3. create_submission (draft)
                   ↓
         Frontend ← { schema, data, submission_id }
```

### Validación
```
Usuario → Frontend → API (post_form_validate)
                   ↓
            validate_flow workflow
                   ↓
         1. validate_schema
         2. execute_hooks (validate)
         3. merge_errors
                   ↓
         Frontend ← { valid, errors[] }
```

### Envío
```
Usuario → Frontend → API (post_form_submit)
                   ↓
             submit_flow workflow
                   ↓
         1. validate_data
         2. save_submission (submitted)
         3. execute_hooks (submit)
         4. update_status (completed/failed)
                   ↓
         Frontend ← { success, submission_id }
```

## Deployment

### Requisitos
- Windmill instalado
- Node.js 22 (con nvm)
- PostgreSQL
- wmill CLI

### Pasos

1. **Crear workspace `formularios` en Windmill**

2. **Configurar Data Tables:**
   - Ir a `Workspace Settings → Data Tables`
   - Crear 3 Data Tables: `forms`, `form_versions`, `form_submissions`
   - Usar Instance database (`datatable_db`)

3. **Desplegar base de datos:**
   ```bash
   # Con Docker Compose
   docker compose exec -T db psql -U postgres -d datatable_db < windmill/db/schema.sql
   
   # O directo
   psql -h <host> -U postgres -d datatable_db -f windmill/db/schema.sql
   ```

4. **Configurar variables en Windmill:**
   - `u/admin/IIBB_BACKEND_URL`
   - `u/admin/IIBB_API_KEY`

5. **Desplegar scripts y workflows:**
   ```bash
   cd windmill
   nvm use 22
   wmill sync push
   ```

5. **Crear formulario DDJJ:**
   ```bash
   wmill script run f/formularios/setup/create_ddjj_form
   ```

6. **Probar API:**
   ```bash
   export WINDMILL_URL="http://localhost:8000"
   export WINDMILL_TOKEN="<token>"
   ./setup/test_api.sh
   ```

## Configuración del Formulario DDJJ

El formulario se crea con el siguiente schema SurveyJS:

**Páginas:**
1. **Datos del Contribuyente**: CUIT, Razón Social, Domicilio
2. **Período de Declaración**: Período, Fecha de Vencimiento
3. **Datos de la Declaración**: Ingresos, Deducciones, Actividades
4. **Confirmación**: Declaración jurada, Observaciones

**Hooks configurados:**
- Preload: `fetch_padron`, `fetch_periodos`
- Validate: `validate_business_rules`
- Submit: `send_to_backend`

## Extensibilidad

### Agregar nuevo formulario

1. Crear schema SurveyJS
2. Definir hooks específicos en `plugins/<nombre>/`
3. Ejecutar `create_form.ts` con el nuevo schema
4. Configurar hooks en el campo `config.hooks`

### Agregar nuevo hook

1. Crear script TypeScript en `plugins/<dominio>/`
2. Implementar función `main(input)` que retorne resultado
3. Agregar path del hook en config del formulario

### Personalizar validación

Modificar `validate_business_rules.ts` o crear nuevo hook de validación.

## Próximos Pasos (Etapa 2)

- [ ] Editor visual de formularios (SurveyJS Creator)
- [ ] UI administrativa completa
- [ ] Sistema de borradores con expiración
- [ ] Hooks post_submit asíncronos
- [ ] Permisos y roles granulares
- [ ] SDK JavaScript empaquetado
- [ ] Auditoría detallada

## Soporte

Para más detalles, ver:
- `SETUP.md` - Guía de instalación paso a paso
- `windmill/README.md` - Estructura del proyecto
- `frontend-example/README.md` - Integración frontend
