## 1. Datos que necesita el frontend vs. origen en el backend legacy

### A. Cabecera del contribuyente (siempre visible)

| Campo UI | Origen legacy | Campo/Metodo legacy | Notas |
|---|---|---|---|
| **CUIT** | JWT claim `identifier` / `UsuarioDTO.cuit` | [UsuarioDTO.getCuit()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dto/UsuarioDTO.java:76:2-78:3) | No se pide, se deriva de auth |
| **Razón social** | JWT claim `fullname` / `UsuarioDTO.nombre` | [UsuarioDTO.getNombre()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dto/UsuarioDTO.java:93:2-95:3) | Mismo origen |
| **Autorizado (si aplica)** | `UsuarioDTO.autorizado` | [usuario.isUsuarioConAutorizado()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dto/UsuarioDTO.java:109:2-111:3) | v2+ |

### B. Períodos a mostrar (dropdown)

El frontend necesita una lista de períodos con su **estado** para decidir qué mostrar:

```json
{
  "periodo": "2026-02",
  "periodoDisplay": "Febrero 2026",
  "estado": "NO_PRESENTADO",
  "vencimiento": "2026-02-28",
  "esPresentable": true,
  "motivoNoPresentable": null
}
```

**Origen en backend:**

| Estado UI | Cálculo backend | Fuentes |
|---|---|---|
| `NO_PRESENTADO` | No existe [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) para ese período en Oracle/host | [IHostDAO.getDDJJConDeuda(params)](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dao/host/IHostDAO.java:55:1-55:93) → lista vacía o `nroComprobante==0` |
| `PENDIENTE` | Existe [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) con `fechaCierreWeb==null` | [Dj.isPendiente()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:206:1-208:2) |
| `CERRADA` | Existe [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) con `fechaCierreWeb!=null` | [Dj.isCerrada()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:209:1-211:2) |
| `VENCIDA` | `fechaVencimiento < hoy` | [Dj.isVencida()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:227:1-242:2) |
| `RECTIFICADA` | `rectificativa > 0` | [Dj.getRectificativa()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:596:1-598:2) |

**Dato clave del legacy:** en `AnualDDJJAction:163` y [BusquedaDDJJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/BusquedaDDJJAction.java:51:0-1304:1), si `nroComprobante==0` significa que **no hay datos en host** para ese período.

### C. Actividad / Alícuota (precargada o editable)

El [ddjj-simple.json](cci:7://file:///c:/Users/milton.sosa/sistemas/iibb/poc-formulario-asistido/frontend/lib/surveys/ddjj-simple.json:0:0-0:0) muestra una sola actividad hardcodeada. En producción viene del host:

| Campo UI | Origen legacy | Campo/Metodo |
|---|---|---|
| **Código NAIIBB** | `Actividad.codigo` | [getActividadesDJ_HOST(dj, rol)](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1025:1-1031:2) → `Actividad.getCodigo()` |
| **Descripción** | No está en `Actividad.java` | Se busca en `NaiibbTitulo`/`NaiibbCodigo` (vía `CollectionProviderFacade`) |
| **Alícuota vigente** | `Alicuota.alicuota` | `Actividad.getAlicuotas().get(0).getAlicuota()` (secuencia=1) |
| **Alícuota modificada** | `Alicuota.alicuotaModificada` | Solo si el usuario la cambió en legacy |
| **Tipo host** | `Alicuota.tipoHost` | `"ESTANDAR"` vs `"NOMINAL"` |
| **Tratamiento fiscal** | `Alicuota.codigoTratamientoFiscal` | `0`=normal, otros=especiales |
| **Rango ingreso año ant.** | `Alicuota.rangoInfIngresoAnioAnt` / `rangoSupIngresoAnioAnt` | Para actividades nominales |

**Reglas de elegibilidad v1** (a validar en backend antes de devolver):
- `Actividad.getAlicuotas().size() == 1` → una sola alícuota
- `codigoTratamientoFiscal == 0` → sin tratamiento especial
- `tipoHost != "NOMINAL"` → alícuota fija (no depende de ingresos año anterior)

### D. Monto / Base imponible

| Campo UI | Origen/Destino | Campo legacy |
|---|---|---|
| **Monto a declarar** (input) | Request POST → backend | `Alicuota.importeMontoImponible` |
| **Impuesto determinado** | Cálculo frontend/backend | `Alicuota.calcularImpDeterminado()` (en modelo) |
| **Total a pagar** | [djConLiquicion](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1394:4-1497:5) o suma | `Dj.impuestoTotalDeterminado` |

### E. Deducciones / Retenciones / SAF (pantalla de confirmación)

Estos datos **no se editan** en v1, se precargan:

| Campo UI | Origen legacy | Campo/Metodo |
|---|---|---|
| **Retenciones sufridas** | Oracle DFE / Host | `Dj.importeTotalRetenciones` |
| **Percepciones sufridas** | Oracle DFE / Host | `Dj.importeTotalPercepciones` |
| **Retenciones bancarias** | Oracle DFE / Host | `Dj.importeTotalRetencionesBanco` |
| **SIRTAC** | Oracle DFE / Host | `Dj.importeTotalRetencionesSirtac` |
| **SAF período anterior** | Oracle DJ anterior | `Dj.importeSAFAnterior` (vía [setearSaldosSAFDJAnterior](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1232:1-1309:2)) |
| **COPRET** | Host / Oracle | `Dj.importeArt208` o campo específico COPRET |

**Proceso de carga legacy:** `CerrarDJAction:115` → [facade.cargarImportesCreditos(dj, rol, reAsignarSaldoSAF)](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:2341:1-2359:2) y `CargarDeduccionesAction` → [importarDeduccionesORACLE_HOST_cargandoEnDJ](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:2668:1-2683:2).

### F. Estados del workflow del frontend

Basado en [ddjj-mensual.json](cci:7://file:///c:/Users/milton.sosa/sistemas/iibb/poc-formulario-asistido/frontend/lib/surveys/ddjj-mensual.json:0:0-0:0) (4 páginas/pasos):

```
Página 1: datos_contribuyente → muestra CUIT+razón social, selecciona período
Página 2: detalle_actividades → muestra actividades (panel dinámico) + alícuotas
Página 3: retenciones_percepciones → precargadas, opcionalmente editables (v2+)
Página 4: confirmacion → resumen + checkbox juramento
```

Para v1 (simple), esto se condensa en:
- Paso único: seleccionar período + ingresar monto
- Confirmación: preview de liquidación

---

## 2. Mapeo de estados legacy → estados API

El backend legacy no tiene un campo `estado` explícito en [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1). Se infiere:

```java
// Dj.java
public boolean isPendiente() { return this.getFechaCierreWeb()==null; }
public boolean isCerrada()   { return this.getFechaCierreWeb()!=null; }
public boolean isVencida()   { return fechaVencimiento < hoy; }
```

**Propuesta de estados normalizados para la API:**

```java
public enum EstadoPeriodo {
    NO_PRESENTADO,   // no existe Dj para el período
    PENDIENTE,       // existe, fechaCierreWeb == null
    CERRADA,         // existe, fechaCierreWeb != null, rectificativa == 0
    RECTIFICADA,     // existe, rectificativa > 0
    VENCIDA,         // fechaVencimiento < hoy (flag adicional)
    BLOQUEADA        // hay Dj pendiente del canal legacy con datos complejos
}
```

---

## 3. Contrato de datos propuesto (evolutivo)

### `GET /api/v1/contribuyente/me/ddjj-contexto`

```json
{
  "contribuyente": {
    "cuit": "30-3456736-8",
    "razonSocial": "Blabla S.A",
    "regimen": "LOCAL",
    "esConvenioMultilateral": false
  },
  "elegible": true,
  "motivoNoElegible": null,
  "actividadesVigentes": [
    {
      "codigo": "741000",
      "descripcion": "Servicios de diseño especializado",
      "alicuotaVigente": 3.50,
      "tipoHost": "ESTANDAR",
      "codigoTratamientoFiscal": 0,
      "esNominal": false
    }
  ],
  "periodos": [
    {
      "periodo": "2026-02",
      "periodoDisplay": "Febrero 2026",
      "vencimiento": "2026-02-28",
      "estado": "NO_PRESENTADO",
      "esPresentable": true,
      "nroComprobante": null,
      "esVencido": false
    },
    {
      "periodo": "2026-01",
      "periodoDisplay": "Enero 2026",
      "vencimiento": "2026-01-31",
      "estado": "CERRADA",
      "esPresentable": false,
      "nroComprobante": 123450,
      "fechaCierre": "2026-01-15T10:30:00Z",
      "esVencido": false,
      "linkRectificar": "/IBPresentaciones/..."
    },
    {
      "periodo": "2025-12",
      "periodoDisplay": "Diciembre 2025",
      "vencimiento": "2025-12-31",
      "estado": "PENDIENTE",
      "esPresentable": false,
      "nroComprobante": 123440,
      "motivoNoPresentable": "DJ_PENDIENTE_LEGACY",
      "esVencido": true
    }
  ],
  "alertas": [
    {
      "tipo": "PERIODO_FALTANTE",
      "periodo": "2025-12",
      "mensaje": "Tenés una DDJJ previa sin presentar",
      "bloqueante": false
    }
  ]
}
```

**Notas de diseño:**
- `actividadesVigentes[]` siempre devuelve el array completo. En v1, si `size > 1` → `elegible=false` con `motivoNoElegible=MULTIPLES_ACTIVIDADES`.
- `periodos[]` se construye mergeando [IHostDAO.getDDJJConDeuda()](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dao/host/IHostDAO.java:55:1-55:93) (DJ cerradas/pendientes) + períodos teóricos mensuales de la ventana de elegibilidad (3 meses por defecto).
- `esPresentable=false` con `motivoNoPresentable` permite que el frontend muestre el período "gris" con tooltip explicativo.

### `POST /api/v1/ddjj/preview`

**Request v1:**
```json
{
  "periodo": "2026-02",
  "actividades": [
    {
      "codigo": "741000",
      "montoImponible": 168817.00
    }
  ]
}
```

**Request v2+ (mismo endpoint, backward-compatible):**
```json
{
  "periodo": "2026-02",
  "actividades": [
    { "codigo": "741000", "montoImponible": 168817.00 },
    { "codigo": "620100", "montoImponible": 50000.00 }
  ],
  "regimen": "MENSUAL",
  "esRectificativa": false
}
```

**Response:**
```json
{
  "periodo": "2026-02",
  "periodoDisplay": "Febrero 2026",
  "vencimiento": "2026-02-28",
  
  "contribuyente": {
    "cuit": "30-3456736-8",
    "razonSocial": "Blabla S.A"
  },
  
  "actividadesCalculadas": [
    {
      "codigo": "741000",
      "descripcion": "Servicios de diseño especializado",
      "montoImponible": 168817.00,
      "alicuotaAplicada": 3.50,
      "impuestoDeterminado": 5908.60,
      "minimoImponible": 0
    }
  ],
  
  "deducciones": {
    "retencionesSufridas": 1200.00,
    "percepcionesSufridas": 800.00,
    "retencionesBancarias": 0.00,
    "sirtac": 0.00,
    "saldoFavorAnterior": 100.00,
    "creditoFiscalCopret": 1400.00,
    "totalDeducciones": 3500.00
  },
  
  "totales": {
    "impuestoTotalDeterminado": 5908.60,
    "totalAPagar": 2408.60,
    "saldoFavorPeriodo": 0
  },
  
  "ingresoAnioAnterior": 163200.00,
  "fechaVencimiento": "2026-02-28",
  "esVencida": false,
  "intereses": 0
}
```

**Mapping a modelo legacy:**
- `impuestoDeterminado` = `Alicuota.getImpuestoDeterminado()` (ya calculado en `Alicuota.java:454`)
- `totalDeducciones` = suma de `Dj.importeTotalRetenciones + importeTotalPercepciones + importeTotalRetencionesBanco + importeTotalRetencionesSirtac + importeSAFAnterior + importeArt208`
- `totalAPagar` = `impuestoTotalDeterminado - totalDeducciones` (mínimo 0)

### `POST /api/v1/ddjj`

**Request v1:**
```json
{
  "periodo": "2026-02",
  "actividades": [
    { "codigo": "741000", "montoImponible": 168817.00 }
  ],
  "idempotencyKey": "uuid-v4"
}
```

**Response 201:**
```json
{
  "nroComprobante": 123456,
  "estado": "CERRADA",
  "fechaCierre": "2026-02-22T14:35:00Z",
  "periodo": "2026-02",
  "pdfUrl": "/api/v1/ddjj/123456/comprobante",
  "impuestoPagado": 2408.60,
  "linkLegacy": "/IBPresentaciones/verDJ.do?nro=123456"
}
```

**Mapeo al modelo [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) legacy (flujo de [CerrarDJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/CerrarDJAction.java:38:0-448:1) + [InicioDDJJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/InicioDDJJAction.java:45:0-733:1)):**

| Campo Request API | Campo [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) legacy | Cómo se obtiene |
|---|---|---|
| `periodo` (split) | `periodoAño`, `periodoNro` | `"2026-02"` → `2026`, `2` |
| `actividades[].codigo` | `Actividad.codigo` | De [getActividadesDJ_HOST](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1025:1-1031:2) |
| `actividades[].montoImponible` | `Alicuota.importeMontoImponible` | Directo del request |
| — | `Dj.cuit` | JWT claim |
| — | `Dj.razonSocial` | JWT claim |
| — | `Dj.formulario` | `SingletonUtils.getValor(PARAM_CODIGO_FORM_MENSUAL)` |
| — | `Dj.regimen` | `REGIMEN_MENSUAL` |
| — | `Dj.fechaInicio` / `fechaActualizacion` | `new Date()` |
| — | `Dj.rectificativa` | `0` (siempre original v1) |
| — | `Alicuota.alicuotaModificada` | `= Alicuota.alicuota` (sin cambio) |
| — | `Alicuota.motivoCambioAlicuota` | `0` |
| — | `Dj.importeIngresoAñoAnterior` | [validarInicioDJ](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:855:1-857:2) (host) |
| — | `Dj.importeSAFAnterior` | [setearSaldosSAFDJAnterior](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1232:1-1309:2) |
| — | Retenciones/Percepciones | [importarDeduccionesORACLE_HOST_cargandoEnDJ](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:2668:1-2683:2) |
| — | `Dj.nroComprobante` | `getID_DJ_FormSecuence()` (Oracle sequence) |

---

## 4. Estados especiales que manejar

### A. DJ pendiente pre-existente (C13 del roadmap)

Si al consultar [getDDJJConDeuda](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:3027:1-3030:2) o Oracle existe un [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) con `estado=PENDIENTE`:

```json
{
  "periodo": "2026-02",
  "estado": "PENDIENTE",
  "esPresentable": false,
  "motivoNoPresentable": "DJ_PENDIENTE_EXISTENTE",
  "canalOrigen": "LEGACY",  // o "SIMPLE" si tiene marca
  "nroComprobante": 123440,
  "linkContinuarLegacy": "/IBPresentaciones/...",
  "mensaje": "Ya iniciaste una DDJJ para este período en el sistema anterior."
}
```

**Lógica backend:**
- Si `canalOrigen == "SIMPLE"` (o no tiene deducciones manuales ni multi-actividad): precargar monto y saltar a confirmación.
- Si `canalOrigen == "LEGACY"` o tiene datos complejos: redirect a legacy.

### B. Período vencido

Si `fechaVencimiento < hoy`, el backend debe calcular intereses (si aplica) o simplemente permitir cerrar con leyenda. El legacy ya lo hace:

```java
// Dj.isVencida()
if(fechaVencimiento.getTime() < hoy.getTime()) return true;
```

### C. Alícuota cambió entre preview y confirmar

El backend **recalcula siempre** en `POST /ddjj`. Si la alícuota vigente del host difiere de la usada en preview:

```json
{
  "errorCode": "ALICUOTA_CAMBIO",
  "message": "La alícuota vigente cambió desde la última vista previa",
  "nuevaPreview": { ... }  // Devuelve nuevo preview para que el frontend lo muestre
}
```

---

## 5. Resumen: campos mínimos para v1

Para que el frontend de la DDJJ simple funcione, el backend debe devolver en el contexto:

| Campo | Obligatorio v1 | Origen |
|---|---|---|
| `cuit` | Sí | JWT |
| `razonSocial` | Sí | JWT |
| `periodos[].periodo` | Sí | Ventana calculada + [getDDJJConDeuda](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:3027:1-3030:2) |
| `periodos[].estado` | Sí | Oracle/host |
| `periodos[].esPresentable` | Sí | Lógica de negocio |
| `actividadesVigentes[].codigo` | Sí | `IBWNACTC` |
| `actividadesVigentes[].descripcion` | Sí | NaiibbTitulo |
| `actividadesVigentes[].alicuotaVigente` | Sí | `IBWNACTC` |
| `actividadesVigentes[].tipoHost` | Sí | `IBWNACTC` |
| `elegible` / `motivoNoElegible` | Sí | Reglas v1 |
| `deducciones.*` | Preview | Oracle/DFE |
| `ingresoAnioAnterior` | Preview | `IBWNPAD` |
