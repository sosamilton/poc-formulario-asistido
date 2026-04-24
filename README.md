# Formularios Dinámicos IIBB — POC-2

POC de formularios dinámicos para ARBA (IIBB). Stack: **Windmill** (orquestación + backend) + **Next.js** (frontend con SurveyJS) + **Mockoon** (APIs mock).

> **POCs descartados**: Se evaluaron previamente Form.io + Svelte (POC-1) y otras plataformas (Orbeon, OpenForm, Formbricks, n8n). POC-2 fue elegido por su balance entre control del código, familiaridad del stack (TypeScript/Python) y capacidad de orquestación de Windmill.

---

## Stack

| Capa | Tecnología | Puerto |
|---|---|---|
| Orquestación + Backend | Windmill (self-hosted) | 8000 |
| Frontend | Next.js + SurveyJS | 3014 |
| APIs Mock | Mockoon | 3001, 3002 |
| Base de datos | PostgreSQL (Windmill) | 5432 (interno) |

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js 22](https://nodejs.org/) (solo para sincronizar código Windmill)
- [Windmill CLI](https://www.windmill.dev/docs/advanced/cli) (`wmill`) — `npm install -g windmill-cli`

---

## Levantar el stack

```bash
# 1. Todo el stack (Windmill + Frontend + APIs mock)
docker compose up -d
```

Servicios disponibles tras `docker compose up -d`:

| Servicio | URL | Descripción |
|---|---|---|
| Windmill UI | http://localhost:8000 | Orquestación, scripts, workflows |
| Frontend | http://localhost:3014 | Formulario DDJJ (SurveyJS) |
| Mock APIs | http://localhost:3001, http://localhost:3002 | Endpoints mock de IIBB |

---

## Configuración de Windmill (una vez)

> Estos pasos requieren la UI de Windmill. No pueden ser dockerizados porque dependen de la instancia inicializada.

### 1. Crear workspace

En Windmill UI (http://localhost:8000), crear workspace **`formularios`**.

### 2. Configurar Data Tables

Ir a `Workspace Settings → Data Tables` y crear (apuntando a **Instance database** `datatable_db`):

- `forms`
- `form_versions`
- `form_submissions`

### 3. Crear schema de base de datos

```bash
# Windmill expone PostgreSQL internamente
docker compose exec -T windmill-db psql -U postgres -d datatable_db -f /dev/stdin < windmill-code/db/schema.sql
```

> Si el path no funciona, copiar `windmill-code/db/schema.sql` al contenedor o ejecutar con `psql` local apuntando al puerto expuesto de PostgreSQL.

### 4. Configurar workspace en CLI

```bash
# Requiere Node.js 22 + Windmill CLI
nvm use 22

# Login (token de Windmill UI → Settings → CLI Token)
wmill login

# Agregar workspace (ejecutar una sola vez)
wmill workspace add formularios http://localhost:8000

# Verificar workspace activo
wmill workspace
```

### 5. Sincronizar código

```bash
cd windmill-code
wmill sync push
```

---

## Estructura del proyecto

```
.
├── compose.yml              # Orquesta windmill/ + frontend/ + apis/
├── windmill/                # Docker compose de Windmill (PostgreSQL, server, worker)
│   ├── compose.yml
│   └── .env
├── windmill-code/           # Scripts, flows y recursos Windmill (sincronizados con wmill CLI)
│   ├── f/api/              # Endpoints REST
│   ├── f/forms/            # Scripts de formularios
│   ├── f/form_lifecycle/    # Workflows de orquestación
│   ├── f/plugins/           # Plugins DDJJ IIBB
│   └── db/schema.sql       # Schema de Data Tables
├── frontend/                # Next.js + SurveyJS (Dockerfile + compose.yml)
│   ├── app/
│   ├── components/
│   └── compose.yml
├── apis/                    # Mocks Mockoon para desarrollo
│   ├── compose.yml
│   ├── iibb.json            # Mock API general
│   └── iibb-simple.json     # Mock API DDJJ Simple
└── docs/                    # Análisis, decisiones y preguntas abiertas
    ├── README.md            # Índice de documentos
    ├── ddjj-simple.md       # Hoja de ruta y contrato de API
    ├── preguntas-criticas-arquitectura.md  # Preguntas que definen el diseño
    └── preguntas-por-stakeholder.md       # Preguntas detalladas por área
```

---

## Documentación

- **[docs/README.md](docs/README.md)** — Índice de documentos y hallazgos del análisis legacy
- **[docs/ddjj-simple.md](docs/ddjj-simple.md)** — Hoja de ruta, alcance v1, contrato de endpoints, riesgos
- **[docs/preguntas-criticas-arquitectura.md](docs/preguntas-criticas-arquitectura.md)** — Decisiones arquitectónicas pendientes (ordenadas por impacto)
- **[ARQUITECTURA.md](ARQUITECTURA.md)** — Diagrama y flujo de la solución
- **[apis/contrato-ddjj-simple.md](apis/contrato-ddjj-simple.md)** — Contrato REST actualizado (OpenAPI)

---

## Comandos útiles

```bash
# Ver logs
docker compose logs -f windmill_server
docker compose logs -f frontend-surveyjs

# Rebuild frontend tras cambios
docker compose up -d --build frontend-surveyjs

# Bajar todo
docker compose down
```
