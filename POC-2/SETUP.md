# POC-2 Setup Guide - Windmill Forms Engine

## Prerequisitos

- Windmill instalado y funcionando
- PostgreSQL (incluido con Windmill)
- Node.js 22 (instalado con nvm)
- Windmill CLI (`wmill`)

## Paso 1: Configurar Workspace

El workspace de Windmill debe llamarse **`formularios`**.

Si aún no existe, créalo desde la UI de Windmill o usando el CLI.

## Paso 2: Configurar Data Tables

Desde la UI de Windmill:

1. Ir a `Workspace Settings → Data Tables`
2. Crear las siguientes Data Tables:
   - **Nombre:** `forms` | **Database:** Instance | **Database name:** `datatable_db`
   - **Nombre:** `form_versions` | **Database:** Instance | **Database name:** `datatable_db`
   - **Nombre:** `form_submissions` | **Database:** Instance | **Database name:** `datatable_db`

Esto configura las tablas para usar la **Instance database** de Windmill, que permite acceso directo vía `wmill.datatable()`.

## Paso 3: Desplegar Base de Datos

Ejecutar el schema SQL en la base de datos `datatable_db`:

```bash
# Si usas Docker Compose (desde el directorio de Windmill)
cd /ruta/a/windmill
docker compose exec -T db psql -U postgres -d datatable_db < /ruta/a/POC-2/windmill/db/schema.sql
```

O con acceso directo a PostgreSQL:

```bash
psql -h <host> -U postgres -d datatable_db -f windmill/db/schema.sql
```

Esto creará las siguientes tablas en `datatable_db`:
- `forms` - Definiciones de formularios
- `form_versions` - Versiones de schemas
- `form_submissions` - Envíos de formularios

## Paso 3: Configurar Variables de Entorno en Windmill

Desde la UI de Windmill, crear las siguientes variables:

1. **`u/admin/IIBB_BACKEND_URL`**
   - Valor: URL del backend de IIBB (ej: `https://backend.iibb.gob.ar`)

2. **`u/admin/IIBB_API_KEY`**
   - Valor: API Key para autenticación con el backend

## Paso 4: Desplegar Scripts y Workflows

```bash
cd /home/msosa/iibb/POC-2/windmill

# Usar Node.js 22
nvm use 22

# Desplegar usando el script
WINDMILL_WORKSPACE=formularios ./setup/deploy.sh
```

O manualmente:

```bash
nvm use 22
wmill sync push
```

## Paso 5: Crear Formulario DDJJ IIBB

Ejecutar el script de creación del formulario desde Windmill UI:

1. Ir a Scripts → `setup/create_ddjj_form.ts`
2. Ejecutar el script
3. Verificar que el formulario se creó correctamente

O desde CLI:

```bash
wmill script run f/formularios/setup/create_ddjj_form
```

## Paso 6: Probar API

```bash
# Configurar variables
export WINDMILL_URL="http://localhost:8000"
export WINDMILL_TOKEN="<tu-token>"

# Ejecutar tests
./setup/test_api.sh
```

## Estructura del Proyecto

```
windmill/
├── db/
│   └── schema.sql                          # Schema de base de datos
├── scripts/
│   ├── forms/                              # Scripts core
│   │   ├── create_form.ts                  # Crear formulario
│   │   ├── get_form.ts                     # Obtener formulario
│   │   ├── get_runtime.ts                  # Obtener schema + config
│   │   ├── execute_hooks.ts                # Ejecutar hooks
│   │   └── save_submission.ts              # Guardar submission
│   ├── api/                                # Endpoints REST
│   │   ├── get_form_init.py                # GET /init
│   │   ├── post_form_validate.py           # POST /validate
│   │   └── post_form_submit.py             # POST /submit
│   └── plugins/
│       └── ddjj/                           # Plugins DDJJ IIBB
│           ├── fetch_padron.ts             # Preload: datos padrón
│           ├── fetch_periodos.ts           # Preload: períodos
│           ├── validate_business_rules.ts  # Validación negocio
│           └── send_to_backend.ts          # Submit: envío backend
├── workflows/
│   └── form_lifecycle/                     # Workflows orquestación
│       ├── init_flow.yaml                  # Inicializar formulario
│       ├── validate_flow.yaml              # Validar datos
│       └── submit_flow.yaml                # Enviar formulario
└── setup/
    ├── deploy.sh                           # Script de deployment
    ├── create_ddjj_form.ts                 # Crear form DDJJ
    └── test_api.sh                         # Tests de API
```

## Endpoints API

Una vez desplegado, los endpoints estarán disponibles en:

### Inicializar Formulario
```
POST /api/w/formularios/jobs/run/f/formularios/api/get_form_init
Body: {
  "slug": "ddjj-iibb",
  "created_by": "user-id"
}
```

### Validar Datos
```
POST /api/w/formularios/jobs/run/f/formularios/api/post_form_validate
Body: {
  "slug": "ddjj-iibb",
  "data": { ... }
}
```

### Enviar Formulario
```
POST /api/w/formularios/jobs/run/f/formularios/api/post_form_submit
Body: {
  "slug": "ddjj-iibb",
  "data": { ... },
  "submission_id": "uuid",
  "metadata": { ... }
}
```

## Flujo de Trabajo

1. **Init**: Frontend llama a `get_form_init`
   - Obtiene schema SurveyJS
   - Ejecuta hooks de preload (fetch_padron, fetch_periodos)
   - Crea submission en estado `draft`
   - Retorna schema + datos precargados

2. **Validate**: Frontend valida antes de submit
   - Valida contra schema SurveyJS
   - Ejecuta hooks de validación (validate_business_rules)
   - Retorna errores si los hay

3. **Submit**: Frontend envía formulario
   - Revalida datos
   - Guarda submission en estado `submitted`
   - Ejecuta hooks de submit (send_to_backend)
   - Marca submission como `completed` o `failed`

## Próximos Pasos

1. **Frontend**: Crear aplicación React/Svelte con SurveyJS
2. **Integración**: Conectar frontend con API de Windmill
3. **Testing**: Probar flujo completo end-to-end
4. **Producción**: Configurar autenticación y permisos

## Troubleshooting

### Error: "Form not found"
- Verificar que el formulario fue creado correctamente
- Revisar que el slug es correcto

### Error: "Hook failed"
- Verificar que las tablas auxiliares existen (padron_contribuyentes, periodos_ddjj)
- Revisar logs en Windmill UI

### Error de conexión a base de datos
- Verificar resource `g/all/windmill-postgresql` en Windmill
- Verificar permisos de base de datos
