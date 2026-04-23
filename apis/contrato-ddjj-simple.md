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

- **Uso**: Gatekeeper de la experiencia. Determina si se ofrece el formulario simplificado o se redirige al legacy.
- **Query opcional**: `scenario` (solo para mock/testing).
- **Caso elegible (alícuota Host)** @apis/iibb-simple.json#101-155
- **Caso elegible (alícuota servicio nuevo)** @apis/iibb-simple.json#185-209
- **No elegible**: multiactividad @apis/iibb-simple.json#130-156, tratamiento fiscal @apis/iibb-simple.json#104-129, DJ pendiente legacy @apis/iibb-simple.json#76-102, deducciones manuales @apis/iibb-simple.json#103-129

#### Campos clave

| Campo | Descripción | Fuente |
| --- | --- | --- |
| `elegible` | Booleano principal | Reglas en backend legacy (actividades, deducciones, estados) |
| `actividadUnica` | Actividad candidata, incluye `alicuotaVigente`, `fuenteAlicuota`, `ultimaActualizacion` | Host / nuevo servicio (ver sección 3) |
| `periodosPresentables[]` | Períodos con estado `NO_PRESENTADA` o `PENDIENTE` + flag `esVencido` | Host (`IBWNPAD`) + Oracle |
| `historialReciente[]` | Últimas DJ cerradas o pendientes, con `canalOrigen` y `linkLegacy` | Oracle (`Dj`) |
| `alertaPeriodosFaltantes[]` | Períodos vencidos sin presentar, opcional `linkRegularizar` | Oracle + Host |
| `traceId` | Identificador para trazabilidad cross-sistema | Generado por API (propagado a logs/Host) |
| `linkLegacy` | URL Struts para fallback | Configuración legacy |

### 2.3 `POST /api/v1/ddjj-simple/preview`

- **Uso**: Simular la liquidación sin persistir.
- **Request**:

  ```json
  {
    "periodo": "2026-02",
    "montoImponible": 180000.00,
    "idContexto": "f6f3b119-..."
  }
  ```

- **Respuesta (mock)** @apis/iibb-simple.json#170-214
- **Consideraciones**:
  - `idContexto` asegura que el preview use las mismas actividades y deducciones cargadas durante la sesión.
  - `fuenteAlicuota` y `traceId` se propagan para observabilidad.
  - Deducciones/SAF se leen de Oracle/Host, no del request.

### 2.4 `POST /api/v1/ddjj-simple/confirmar`

- **Uso**: Cierra la DJ simple (persiste en Oracle y Host).
- **Request mínimo**:

  ```json
  {
    "periodo": "2026-02",
    "montoImponible": 180000.00,
    "idContexto": "f6f3b119-...",
    "idempotencyKey": "c09c7dd8-..."
  }
  ```

- **Respuesta exitosa** @apis/iibb-simple.json#228-245
- **Errores manejados**: DJ existente (`409`), Host no disponible (`502`).
- **Notas**:
  - `idempotencyKey` se valida contra Oracle.
  - `fuenteAlicuota` y `traceId` permiten auditar la fuente de cálculo y correlacionar con Host.

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
