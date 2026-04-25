# APIs — DDJJ Simple (Mockoon + Contratos)

Este directorio contiene:
- **Mocks Mockoon** para desarrollo local (`iibb-simple.json`, `iibb.json`).
- **Contrato REST** (`contrato-ddjj-simple.md`) con requests/responses de cada endpoint.
- **OpenAPI de referencia** (`openapi-alicuota.json`) del servicio real de alícuotas de ARBA.

> **Nota**: `iibb.json` contiene endpoints genéricos legacy (padrón, alícuota, historial). `iibb-simple.json` es el mock específico del flujo DDJJ Simple con escenarios de elegibilidad, preview y confirmación.

---

## 📋 Archivos

| Archivo | Propósito | Puerto |
|---|---|---|
| `iibb-simple.json` | Mock DDJJ Simple (`/me`, `/elegibilidad`, `/preview`, `/confirmar`) | 3002 |
| `iibb.json` | Mock genérico IIBB (padrón, alícuota, historial, períodos adeudados) | 3001 |
| `contrato-ddjj-simple.md` | Contrato REST con request/response examples de cada endpoint | — |
| `openapi-alicuota.json` | OpenAPI descubierto del servicio real de alícuotas (Host/Natural) | — |
| `compose.yml` | Docker Compose para levantar ambos mocks automáticamente | 3001, 3002 |

---

## 🚀 Levantar mocks (Docker Compose)

```bash
# Desde la raíz del proyecto
docker compose up -d mock-apis
```

O levantar solo los mocks:

```bash
docker compose -f apis/compose.yml up -d
```

Servicios:

| Servicio | URL | Mock |
|---|---|---|
| Mock DDJJ Simple | `http://localhost:3002` | `iibb-simple.json` |
| Mock IIBB Genérico | `http://localhost:3001` | `iibb.json` |

---

## 📡 Endpoints DDJJ Simple (`iibb-simple.json`)

Ver contrato completo en [`contrato-ddjj-simple.md`](contrato-ddjj-simple.md).

### `GET /api/v1/contribuyente/me`

```bash
curl http://localhost:3002/api/v1/contribuyente/me \
  -H "Authorization: Bearer <token>"
```

### `GET /api/v1/contribuyente/me/elegibilidad-ddjj-simple`

```bash
# Happy path (elegible)
curl http://localhost:3002/api/v1/contribuyente/me/elegibilidad-ddjj-simple \
  -H "Authorization: Bearer <token>"

# No elegible: múltiples actividades
curl "http://localhost:3002/api/v1/contribuyente/me/elegibilidad-ddjj-simple?scenario=multi-actividad" \
  -H "Authorization: Bearer <token>"
```

### `POST /api/v1/ddjj-simple/preview`

```bash
curl -X POST http://localhost:3002/api/v1/ddjj-simple/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"periodo":"2026-02","montoImponible":180000}'
```

### `POST /api/v1/ddjj-simple/confirmar`

```bash
curl -X POST http://localhost:3002/api/v1/ddjj-simple/confirmar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "periodo": "2026-02",
    "montoImponible": 180000,
    "idContexto": "f6f3b119-4b8e-4b2f-9c3d-2a8e4f5d6c7b",
    "idempotencyKey": "c09c7dd8-e5f6-7890-abcd-ef1234567890"
  }'
```

---

## 📡 Endpoints IIBB Genérico (`iibb.json`) — legacy

| Endpoint | Descripción | Ejemplo |
|---|---|---|
| `GET /api/padron/:cuit` | Datos del contribuyente | `curl http://localhost:3001/api/padron/20345534234` |
| `GET /api/alicuota/:codigo` | Alícuota por actividad | `curl http://localhost:3001/api/alicuota/620` |
| `GET /api/historial/:cuit` | Historial de DDJJ | `curl http://localhost:3001/api/historial/20345534234` |
| `GET /api/periodos-adeudados/:cuit` | Períodos sin presentar | `curl http://localhost:3001/api/periodos-adeudados/20345534234` |

---

## 📝 Modificar mocks

### Con Mockoon Desktop

1. Abrir Mockoon Desktop App.
2. File → Open environment → seleccionar `iibb-simple.json` (o `iibb.json`).
3. Modificar rutas, responses, rules.
4. Guardar (File → Save).
5. Commitear cambios.

### Con Mockoon CLI

```bash
# Instalar CLI
npm install -g @mockoon/cli

# Levantar con watch
mockoon-cli start --data apis/iibb-simple.json --port 3002 --watch
```

### Agregar respuesta condicional

En Mockoon Desktop:
1. Seleccionar endpoint → "Add response".
2. Configurar **Rules** (ej: si query `scenario` equals `multi-actividad`).
3. Guardar.

---

## � Referencias

- **Contrato REST**: [`contrato-ddjj-simple.md`](contrato-ddjj-simple.md) — requests/responses completos por endpoint.
- **Análisis de elegibilidad**: [`docs/propuesta-flujo-elegibilidad.md`](../docs/propuesta-flujo-elegibilidad.md) — Opción A/B/C para la puerta de elegibilidad.
- **Preguntas arquitectónicas**: [`docs/preguntas-criticas-arquitectura.md`](../docs/preguntas-criticas-arquitectura.md) — decisiones pendientes que afectan el contrato.

---

**Última actualización**: Abril 2026
