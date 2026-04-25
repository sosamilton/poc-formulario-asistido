# Contratos de API propuestos para DDJJ Simple

## 1. Objetivo y Alcance

Este documento resume los contratos técnicos para exponer la DDJJ Simple a un frontend moderno, reutilizando la lógica legacy de `IBPresentaciones`. Incluye:

- Contratos base definidos en `apis/iibb-simple.json` (Mockoon).
- Flujos de datos y responsabilidades por endpoint.
- Alternativas para abastecer la **alícuota vigente** de la actividad principal:
  1. **Opción Host legacy** (actual).
  2. **Opción nuevo servicio de alícuotas** (en construcción).

El foco es describir inputs/outputs, fuentes de datos y mecanismos de seguridad/idempotencia sin detallar implementación de backend.

---

## 2. Contratos Base (Mock Tier v1)

### 2.1 `GET /api/v1/contribuyente/me`

- **Uso**: Perfil mínimo para header y auditoría.
- **Autenticación**: JWT ARBA (Authorization: Bearer).
- **Respuesta**:

  ```json
  {
    "cuit": "20345534234",
    "razonSocial": "Juan Perez",
    "regimen": "LOCAL",
    "email": "juan.perez@example.com"
  }
  ```

- **Fuente de datos**: `UsuarioDTO` en sesión (Oracle).

### 2.2 `GET /api/v1/contribuyente/me/elegibilidad-ddjj-simple`

> **Nota arquitectónica**: este endpoint representa la **Opción A** (API de elegibilidad dedicada, donde el frontend decide el flujo). Existe una alternativa en análisis: **Opción C** (`POST /ddjj-simple/iniciar`, donde el backend decide y devuelve `{modo: SIMPLE|LEGACY}`). Ver comparativa completa en [`docs/propuesta-flujo-elegibilidad.md`](../docs/propuesta-flujo-elegibilidad.md) y pregunta **A7.1** en `docs/preguntas-criticas-arquitectura.md`.

- **Uso**: Gatekeeper de la experiencia (Opción A). El frontend consulta y decide si muestra el formulario simplificado o redirige al legacy.
- **Query opcional**: `scenario` (solo para mock/testing).
- **Autenticación**: JWT ARBA (`Authorization: Bearer <token>`). El CUIT se extrae del token; no va en la URL.

#### Response 200 — Elegible (happy path)

```json
{
  "elegible": true,
  "motivoNoElegible": null,
  "ventanaMeses": 3,
  "actividadUnica": {
    "codigo": "620100",
    "descripcion": "Servicios profesionales",
    "alicuotaVigente": 3.50,
    "fuenteAlicuota": "ALICUOTAS_SERVICE",
    "nroConstancia": "12345678",
    "fechaVigenciaDesde": "2026-02-01",
    "fechaVigenciaHasta": "2026-02-28",
    "tipoHost": "G",
    "codigoTratamientoFiscal": 0
  },
  "periodosPresentables": [
    {
      "periodo": "2026-02",
      "periodoDisplay": "Febrero 2026",
      "vencimiento": "2026-02-28",
      "estado": "NO_PRESENTADA",
      "esVencido": false
    }
  ],
  "historialReciente": [
    {
      "periodo": "2025-12",
      "periodoDisplay": "Diciembre 2025",
      "estado": "PRESENTADA",
      "nroComprobante": 987654,
      "fechaCierre": "2026-01-10T14:22:00Z",
      "montoDeclarado": 150000.00,
      "impuestoPagado": 5250.00,
      "canalOrigen": "LEGACY",
      "linkLegacy": "/IBPresentaciones/verDJ.do?nroComprobante=987654"
    }
  ]
}
```

#### Response 200 — No elegible: ejemplo genérico

```json
{
  "elegible": false,
  "motivoNoElegible": "MULTIPLES_ACTIVIDADES",
  "mensajeUsuario": "Tu caso requiere la presentacion completa porque registras mas de una actividad en los ultimos 3 meses.",
  "linkLegacy": "/IBPresentaciones/preInicioDDJJ.do",
  "ventanaMeses": 3,
  "actividadUnica": null,
  "periodosPresentables": [],
  "historialReciente": []
}
```

Otros motivos posibles: `DJ_PENDIENTE_EXISTENTE`, `TRATAMIENTO_FISCAL_ESPECIAL`, `DEDUCCIONES_MANUALES`. Ver detalle en [`docs/propuesta-flujo-elegibilidad.md`](../docs/propuesta-flujo-elegibilidad.md).

#### Campos clave

| Campo | Descripción | Fuente |
| --- | --- | --- |
| `elegible` | Booleano principal | Reglas en backend legacy (actividades, deducciones, estados) |
| `motivoNoElegible` | Código de rechazo (null si elegible) | Backend |
| `mensajeUsuario` | Copy para pantalla de bloqueo | Backend |
| `actividadUnica` | Actividad candidata, incluye `alicuotaVigente`, `fuenteAlicuota`, `ultimaActualizacion` | Host / nuevo servicio (ver sección 3) |
| `periodosPresentables[]` | Períodos con estado `NO_PRESENTADA` o `PENDIENTE` + flag `esVencido` | Host (`IBWNPAD`) + Oracle |
| `historialReciente[]` | Últimas DJ cerradas o pendientes, con `canalOrigen` y `linkLegacy` | Oracle (`Dj`) |
| `alertaPeriodosFaltantes[]` | Períodos vencidos sin presentar, opcional `linkRegularizar` | Oracle + Host |
| `linkLegacy` | URL Struts para fallback | Configuración legacy |

### 2.3 `POST /api/v1/ddjj-simple/preview`

- **Uso**: Simular la liquidación sin persistir.
- **Autenticación**: JWT ARBA (`Authorization: Bearer <token>`).

#### Request

```json
{
  "periodo": "2026-02",
  "montoImponible": 180000.00,
  "idContexto": "f6f3b119-4b8e-4b2f-9c3d-2a8e4f5d6c7b"
}
```

#### Response 200 — Preview estándar

```json
{
  "periodo": "2026-02",
  "periodoDisplay": "Febrero 2026",
  "idContexto": "f6f3b119-4b8e-4b2f-9c3d-2a8e4f5d6c7b",
  "montoDeclarado": 180000.00,
  "ingresoAnioAnterior": 163200.00,
  "alicuota": 3.50,
  "fuenteAlicuota": "ALICUOTAS_SERVICE",
  "subtotalAPagar": 6304.50,
  "descuentos": {
    "creditoFiscalCopret": 1400.00,
    "deducciones": 3000.00,
    "saldoAFavor": 100.00,
    "detalleDeducciones": [
      {
        "tipo": "RETENCION",
        "agente": "Banco Provincia",
        "importe": 1200.00,
        "fecha": "2026-02-10"
      },
      {
        "tipo": "PERCEPCION",
        "agente": "Proveedor XYZ SA",
        "importe": 1800.00,
        "fecha": "2026-02-18"
      }
    ]
  },
  "impuestoAPagar": 5908.50,
  "fechaVencimiento": "2026-02-28",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567894"
}
```

#### Response 422 — Monto inválido

```json
{
  "error": "MONTO_INVALIDO",
  "mensaje": "El monto imponible debe ser mayor o igual a 0."
}
```

#### Consideraciones

- `idContexto` asegura que el preview use las mismas actividades y deducciones cargadas durante la sesión.
- `fuenteAlicuota` y `traceId` se propagan para observabilidad.
- Deducciones/SAF se leen de Oracle/Host, no del request.

### 2.4 `POST /api/v1/ddjj-simple/confirmar`

- **Uso**: Cierra la DJ simple (persiste en Oracle y Host).
- **Autenticación**: JWT ARBA (`Authorization: Bearer <token>`).

#### Request

```json
{
  "periodo": "2026-02",
  "montoImponible": 180000.00,
  "idContexto": "f6f3b119-4b8e-4b2f-9c3d-2a8e4f5d6c7b",
  "idempotencyKey": "c09c7dd8-e5f6-7890-abcd-ef1234567890"
}
```

#### Response 201 — Cierre exitoso

```json
{
  "nroComprobante": 123456789,
  "estado": "CERRADA",
  "periodo": "2026-02",
  "montoDeclarado": 180000.00,
  "impuestoPagado": 5908.50,
  "fechaCierre": "2026-02-24T14:35:00Z",
  "fechaVencimiento": "2026-02-28",
  "fuenteAlicuota": "ALICUOTAS_SERVICE",
  "nroConstancia": "12345678",
  "pdfUrl": "/api/v1/ddjj-simple/123456789/comprobante.pdf",
  "linkLegacy": "/IBPresentaciones/verDJ.do?nroComprobante=123456789",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567895"
}
```

#### Response 409 — DDJJ ya existente

```json
{
  "error": "DDJJ_YA_EXISTENTE",
  "mensaje": "Ya existe una DDJJ presentada para este periodo. Si queres rectificarla debes hacerlo desde la aplicacion completa.",
  "nroComprobanteExistente": 987654,
  "linkLegacy": "/IBPresentaciones/verDJ.do?nroComprobante=987654",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567896"
}
```

#### Response 502 — Host no disponible (queda pendiente)

```json
{
  "error": "HOST_NO_DISPONIBLE",
  "mensaje": "No se pudo impactar la presentacion en el host. La DDJJ quedo en estado PENDIENTE y se reintentara. Podes volver a intentar el cierre.",
  "nroComprobantePendiente": 123456790,
  "reintentable": true,
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567897"
}
```

#### Notas

- `idempotencyKey` se valida contra Oracle.
- `fuenteAlicuota` y `traceId` permiten auditar la fuente de cálculo y correlacionar con Host.
- `502` indica que Oracle quedó persistido pero el Host no respondió; la DJ queda en estado `PENDIENTE` con flag `reintentable`.

---

## 3. Abastecimiento de la alícuota de actividad principal

La alícuota vigente alimenta `actividadUnica.alicuotaVigente` (elegibilidad) y los cálculos de preview/confirmación. Se proponen dos modelos.

### 3.1 Opción A (Actual) — Host Legacy `IBWNACTC`

**Flujo:**

1. `GET /elegibilidad`: backend llama a `Facade.getActividadesDJ_HOST(dj, rol)`.
2. Se filtra la actividad principal (`tipoActividad == "P"`).
3. Se usa `Actividad.alicuotas[0].alicuota`.
4. En preview/confirmar se reutiliza la misma alícuota guardada en el `Dj` en sesión.

**Ventajas:**
- Cero cambios de infraestructura inmediata.
- Misma lógica que legacy (garantiza consistencia).

**Desventajas:**
- Requiere consulta al Host para cada sesión.
- Depende de disponibilidad Natural.

**Fallback:** Si la respuesta del Host trae varias alícuotas o tratamiento especial → `elegible=false`.

### 3.2 Opción B — Servicio de Alícuotas (`ServiciosAlicuotasAPI`)

**Referencia:** @apis/openapi-alicuota.json (OpenAPI 3.0.1, v0.0.1).  
Base: `/ServiciosAlicuotasAPI` | Auth: `bearerAuth` (JWT).

#### 3.2.1 Endpoints disponibles

| Endpoint | Uso DDJJ | Parámetros |
|---|---|---|
| `GET /alicuotas` | Alícuota actual | `cuitAR`, `actividadAR` (13/14/15), `regimenAR` ('R'/'P'), `cuitContribuyente` |
| `GET /alicuotas/manual` | **Recomendado**: alícuota por período | `month`, `year`, `cuitContribuyente`, `actividadAR`, `regimenAR` |
| `GET /alicuotas/fechaExacta` | Alícuota en fecha específica | `fecha` (yyyy-MM-dd), `cuitContribuyente`, `actividadAR`, `regimenAR` |
| `GET /alicuotas/regimen/consultar` | Régimen vigente | `actividadAR` |

#### 3.2.2 Respuesta `/alicuotas/manual` y `/fechaExacta`

```json
{
  "nroConstancia": "12345678",
  "cuitContribuyente": 27123456789,
  "fechaEmision": "2026-02-15",
  "regimenAR": "R",
  "alicuota": "3.50",
  "mensaje": "Consulta procesada correctamente",
  "fechaVigenciaDesde": "2026-02-01",
  "fechaVigenciaHasta": "2026-02-28",
  "mensajePeriodo": "Período válido"
}
```

Campos clave: `alicuota` (string → parsear a BigDecimal), `fechaVigenciaDesde/Hasta` (validación legal), `nroConstancia` (auditoría).

#### 3.2.3 Respuesta `/alicuotas` (consulta simple)

```json
{"alicuota":"3.50","mensaje":"...","actividadAR":13,"regimenAR":"R","fecha":20260215,"hora":143052}
```

> Sin vigencia ni constancia. Menos adecuado para DDJJ que requiere trazabilidad de período.

#### 3.2.4 Mapeo legacy → API

| Legacy | Parámetro API | Nota |
|---|---|---|
| `Dj.cuit` | `cuitContribuyente` | Directo |
| `Actividad` / `regimen` | `actividadAR` (13,14,15) + `regimenAR` ('R','P') | **Mapeo pendiente**: actividad económica → código AR. Define capa de integración. |
| `periodoNro/Año` | `month`, `year` | Para `/manual` |
| Último día período | `fecha` | Para `/fechaExacta` |

#### 3.2.5 Integración en la API DDJJ Simple

1. **Elegibilidad** (`GET /elegibilidad-ddjj-simple`):
   - Validar en Oracle si hay DJ pendiente para el período.
   - Si no hay DJ, consultar Host para confirmar actividad única y régimen ('R'/'P').
   - Mapear actividad económica → `actividadAR` (13/14/15).
   - Invocar `GET /alicuotas/manual?month={mes}&year={año}&actividadAR={id}&regimenAR={r}&cuitContribuyente={cuit}`.
   - Si respuesta válida (HTTP 200 + `alicuota` presente), incluir en `actividadUnica.alicuotaVigente`.

2. **Preview** (`POST /ddjj-simple/preview`):
   - Reutilizar alícuota obtenida en elegibilidad (guardada en `idContexto`).
   - Revalidar con `/fechaExacta` solo si la fecha de cierre difiere de la fecha de consulta original.

3. **Confirmar** (`POST /ddjj-simple/confirmar`):
   - Persistir `nroConstancia` y `fechaVigenciaDesde/Hasta` en Oracle para trazabilidad.
   - `fuenteAlicuota`: `"ALICUOTAS_SERVICE"`.

4. **Caching**:
   - Cachear por clave compuesta `(cuit, actividadAR, regimenAR, month, year)` TTL 24h.
   - Invalidar ante cambio de régimen o actividad.

5. **Tolerancia a fallos**:
   - Si `ServiciosAlicuotasAPI` responde `500` o timeout → fallback a Host (`IBWNACTC`).
   - Si responde `400` (`RestFullErrorDTO` con `status=400`) → marcar `elegible=false`, `motivoNoElegible=TRATAMIENTO_FISCAL_ESPECIAL`.
   - Métrica: `alicuota_source={SERVICE|HOST|CACHE}`.

**Ventajas:**
- Reduce consultas al Host legacy (`IBWNACTC`).
- Expone vigencia formal (`fechaVigenciaDesde/Hasta`) para validaciones legales.
- Genera constancia (`nroConstancia`) trazable.
- Servicio ya en implementación (v0.0.1).

**Riesgos / mitigación:**
- **Mapeo actividad económica → `actividadAR`**: requiere tabla/código de traducción. Definir en capa de integración; versionar.
- **`alicuota` como `string`**: riesgo de parseo. Usar `BigDecimal` con locale `ENGLISH` (punto decimal).
- **Desalineación con Host**: si Host sigue calculando con fuente propia, pueden divergir. Coordinar release.
- **Latencia extra**: usar cache; invocar solo en elegibilidad.

#### 3.2.6 Impacto en contratos existentes

- `actividadUnica` incluye metadato extendido cuando la fuente es `ALICUOTAS_SERVICE`:

  ```json
  "actividadUnica": {
    "codigo": "620100",
    "descripcion": "Servicios profesionales",
    "alicuotaVigente": 3.50,
    "fuenteAlicuota": "ALICUOTAS_SERVICE",
    "nroConstancia": "12345678",
    "fechaVigenciaDesde": "2026-02-01",
    "fechaVigenciaHasta": "2026-02-28",
    "tipoHost": "G",
    "codigoTratamientoFiscal": 0
  }
  ```

- En `preview` y `confirmar`, propagar `fuenteAlicuota` para auditoría.
- Agregar `actividadAR` y `regimenAR` al contexto interno (no expuesto al frontend).

---

## 4. Secuencia end-to-end (Modelo B como Form Renderer)

```
Usuario ── JWT ──▶ /elegibilidad
                │        │
                │        ├─▶ Oracle: DJ pendiente?
                │        ├─▶ Host: actividades (validación única)
                │        └─▶ ServiciosAlicuotasAPI (opción B)
                │
                └─▶ Recibe contexto (periodos, alícuota, deducciones)

POST /preview ──▶ Usa contexto + cache deducciones
POST /confirmar ─▶ Persistencia Oracle + batch Host
```

---

## 5. Recomendaciones operativas

1. **Versionado**: empaquetar estos endpoints bajo `/api/v1/ddjj-simple` y mantener backward compatibility.
2. **Observabilidad**:
   - Registrar en logs y métricas la fuente de alícuota (`HOST`, `SERVICE`, `CACHE`).
   - Trazas distribuidas (`traceId`) compartidas con Host y nuevo servicio.
3. **Idempotencia**: `idempotencyKey` obligatorio en confirmar; expiración 24 h en Oracle.
4. **Seguridad**: Propagar scopes del JWT; validar que el cuit del token coincida con el recurso `/me`.
5. **Pruebas**: mocks actualizados (`apis/iibb-simple.json`) cubren escenarios Host/servicio nuevo, DJ pendiente, deducciones manuales y devuelven `traceId` para contract tests.

---

## 6. Próximos pasos

1. **Acordar con equipo del nuevo servicio** el SLA de `ServiciosAlicuotasAPI` (latencia, caducidad, política de versiones).
2. **Implementar cache** (Redis/Oracle) para alícuotas y actividades, apoyado por TTL acordado.
3. **Documentar fallback** en caso de divergencia Host vs servicio nuevo (prioridad para cierre de DJ).
4. **Publicar el mock** actualizado en los entornos de QA para pruebas integradas con el legacy.

---

*Documento generado para presentar el contrato técnico propuesto y la alternativa de obtención de alícuotas. Basado en los mocks @apis/iibb-simple.json y el análisis del backend legacy `IBPresentaciones`.*
