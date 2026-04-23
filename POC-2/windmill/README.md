# Windmill Forms Engine - POC-2 MVP

Motor de formularios basado en Windmill + SurveyJS para IIBB.

## Estructura del proyecto

```
windmill/
├── db/
│   └── schema.sql              # Schema de base de datos
├── scripts/
│   ├── forms/                  # Scripts core de formularios (usando Data Tables)
│   ├── api/                    # Endpoints REST
│   └── plugins/                # Plugins específicos por formulario
└── workflows/
    └── form_lifecycle/         # Workflows de orquestación
```

## Workspace Windmill

**Nombre del workspace:** `formularios`

## Instalación

### 1. Configurar Data Tables en Windmill

Desde la UI de Windmill:
1. Ir a `Workspace Settings → Data Tables`
2. Crear las siguientes Data Tables apuntando a la **Instance database** (`datatable_db`):
   - `forms`
   - `form_versions`
   - `form_submissions`

### 2. Crear schema de base de datos

Ejecutar el schema en la base de datos `datatable_db`:

```bash
# Desde el directorio de Windmill con docker-compose
docker compose exec -T db psql -U postgres -d datatable_db < /ruta/a/POC-2/windmill/db/schema.sql
```

O si tienes acceso directo a PostgreSQL:

```bash
psql -h <host> -U postgres -d datatable_db -f db/schema.sql
```

### 3. Desplegar scripts y workflows

Usar Windmill CLI (requiere Node.js 22):

```bash
nvm use 22
wmill sync push
```

## Endpoints API

- `GET /api/forms/{slug}/init` - Inicializar formulario
- `POST /api/forms/{slug}/validate` - Validar datos
- `POST /api/forms/{slug}/submit` - Enviar formulario

## Formularios MVP

- **DDJJ IIBB**: Declaración Jurada de Ingresos Brutos
