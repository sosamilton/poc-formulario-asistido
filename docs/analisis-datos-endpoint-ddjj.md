> **⚠️ NOTA**: Este documento es un **borrador arquitectónico inicial** (v0). El contrato de API actualizado basado en el OpenAPI real del servicio de alícuotas y los análisis de código legacy se encuentra en `../apis/contrato-ddjj-simple.md`. Las decisiones de arquitectura pendientes están en `preguntas-criticas-arquitectura.md`.

# Análisis de Datos para Endpoint Escalable de DDJJ

## 1. Resumen Ejecutivo

El objetivo es diseñar un endpoint REST (`/api/v1/contribuyente/me/ddjj-contexto`) que, a partir de los datos ya disponibles en el sistema legacy `IBPresentaciones`, alimente al nuevo frontend de DDJJ simple sin romper la arquitectura actual ni perder casos límite.

### ¿Qué necesita el frontend?

| Necesidad UI | Origen real en legacy |
|---|---|
| Mostrar CUIT y razón social | JWT / `UsuarioDTO` (autenticación ARBA) |
| Listar períodos mensuales disponibles | Merge de ventana de elegibilidad + consulta a Host (`IBWNPAD`) + estado en Oracle |
| Indicar si un período está "presentado", "en curso" o "pendiente" | `Dj.fechaCierreWeb` + `rectificativa` + origen DJ |
| Precargar actividad, alícuota y monto imponible | Rutina Host `IBWNACTC` → modelo `Actividad` / `Alicuota` |
| Calcular impuesto determinado y deducciones | Cálculo sobre `Alicuota.impuestoDeterminado` + deducciones DFE/Oracle |
| Cerrar la declaración y devolver comprobante | Flujo `InicioDDJJAction` → `CerrarDJAction` → Oracle + Host |

### Principio clave

> **No se crean nuevas tablas ni se replica lógica de negocio.** Se expone una vista REST sobre el modelo `Dj`/`Actividad`/`Alicuota` existente, con una capa de normalización de estados y filtros de elegibilidad.

---

## 2. Arquitectura de Integración: IBPresentaciones Legacy como Entry Point

### 2.1. Principio de Gatekeeping en el Sistema Actual

El flujo de presentación de DDJJ hoy comienza en `InicioDDJJAction` o `BusquedaDDJJAction`. El contribuyente selecciona un período, el sistema valida que no haya una DJ pendiente, carga actividades desde el Host (`IBWNACTC`) y presenta el formulario Struts/JSP.

Para integrar el nuevo frontend **sin romper la experiencia actual**, se propone que el mismo punto de entrada (el backend legacy o un pequeño filtro/advisor previo al Action Struts) ejecute las reglas de elegibilidad v1:

1. **Actividad única** (`Actividad.size == 1`)
2. **Alícuota estándar** (no nominal, no tratamiento fiscal especial)
3. **Sin DJ pendiente** en el período seleccionado
4. **Período no vencido** (o vencido pero permitido por parámetro)
5. **Sin deducciones manuales** ni archivos adjuntos requeridos

Si todas las condiciones se cumplen, la JSP/Action actual muestra un **banner o call-to-action**:
> *"Este período es elegible para la presentación simplificada. [Usar formulario nuevo]"*

El link redirige al nuevo frontend con un **token de contexto seguro** (ver 2.3).

### 2.2. Flujo de Redirección y Deep Linking

El nuevo frontend es una aplicación separada (ej. React/Vue desplegada en `/ddjj-simple/`). Para que no pierda el contexto de autenticación y los datos precargados:

| Mecanismo | Detalle | Responsable |
|---|---|---|
| **JWT compartido** | El token ARBA SSO que usa `IBPresentaciones` es válido también para el nuevo frontend (mismo realm Keycloak / mismo issuer). | Infraestructura / Seguridad |
| **Context Token (deep link)** | Un token de corta duración (5 min, single-use) generado por el backend legacy con: CUIT, periodo pre-seleccionado, actividad precargada, alícuota, deducciones resumen. Se pasa por query param `?ctx=BASE64_JWT_SIGNED`. | Nuevo endpoint REST en `IBPresentaciones` (Spring MVC) |
| **Precarga de datos** | El nuevo frontend llama a `/api/v1/contribuyente/me/ddjj-contexto` usando el JWT normal. El `ctx` solo acelera la UX marcando el período y actividad. | Nuevo frontend + API REST |

**Ventaja:** Si el usuario refresca la página o comparte el link, el `ctx` expiró, pero como tiene el JWT válido, puede re-llamar `ddjj-contexto` y rearmar la vista. No hay estado en el URL que no sea descartable.

### 2.3. Modelo A: Nuevo Frontend como Sistema Principal (Big Bang Gradual)

En este modelo, `IBPresentaciones` legacy se reduce progresivamente a un **backend de orquestación** (API + Host), mientras que el nuevo frontend toma todas las interacciones de usuario.

```
┌─────────────────┐      ┌──────────────────────────┐      ┌─────────────┐
│   Usuario       │─────▶│  Nuevo Frontend (React)  │─────▶│  API REST   │
│   (navegador)   │      │  /ddjj-simple/            │      │  (Spring)   │
└─────────────────┘      └──────────────────────────┘      └──────┬──────┘
                                                                   │
                                                          ┌────────┴────────┐
                                                          │  IBPresentaciones │
                                                          │  (Facade, Host)   │
                                                          └─────────────────┘
```

- **Ventajas:** UX moderna unificada, desacopla presentación de negocio, permite iterar rápido.
- **Desventajas:** Mayor inversión inicial en frontend, riesgo de feature parity con legacy (cooperativas, nominales, anuales).
- **Mitigación:** Mantener el legacy accesible por URL directa (`/IBPresentaciones/...`) como "modo avanzado" para casos no cubiertos.

### 2.4. Modelo B: Nuevo Frontend como Capa de Presentación Agnóstica (Form Renderer)

En este modelo, el nuevo frontend no reemplaza a `IBPresentaciones`; simplemente actúa como un **motor de formularios especializado** que se invoca para casos simples.

```
┌─────────────────────────┐
│  IBPresentaciones Legacy │
│  (JSP / Struts)          │
│  ┌─────────────────┐    │
│  │  Pantalla de    │    │
│  │  Inicio /       │    │
│  │  Selección      │    │
│  │  de período     │    │
│  └────────┬────────┘    │
│           │ Elegible?   │
│           ▼             │
│  ┌─────────────────┐    │
│  │  Redirige a     │───────▶  /ddjj-simple/?ctx=...
│  │  form nuevo     │    │
│  └─────────────────┘    │
│           │ No elegible  │
│           ▼             │
│  ┌─────────────────┐    │
│  │  Flujo legacy   │    │
│  │  completo       │    │
│  └─────────────────┘    │
└─────────────────────────┘
```

- **Ventajas:** Menor riesgo, inversión controlada, el legacy sigue siendo el "dueño" del proceso.
- **Desventajas:** Dos frontends coexisten, posible confusión de usuario, doble mantenimiento de navegación/headers.
- **Mitigación:** Unificar la barra de navegación (header/footer) vía Web Components o iframes, o al menos compartir el mismo CSS/diseño de ARBA.

### 2.5. Decisión Recomendada

**Arrancar con Modelo B (Form Renderer), evolucionar hacia Modelo A.**

| Fase | Modelo | Alcance |
|---|---|---|
| **v1 (MVP)** | B | Nuevo frontend solo para DDJJ simple mensual con 1 actividad. Legacy es entry point. |
| **v2** | B+ | Se amplía a multi-actividad y edición de deducciones básicas. Legacy sigue siendo principal. |
| **v3** | Transición | Nuevo frontend cubre >80% de casos mensuales. Legacy queda para cooperativas, anuales, rectificativas complejas. |
| **v4+** | A | Nuevo frontend es el principal. Legacy se accede solo por "modo avanzado". |

**Implicación en la API:** En ambos modelos, los endpoints REST (`/api/v1/ddjj-contexto`, `/api/v1/ddjj/preview`, `/api/v1/ddjj`) son los mismos. La diferencia es quién los consume:
- Modelo B: el nuevo frontend los consume directamente.
- Modelo A: eventualmente el propio legacy JSP podría consumirlos vía AJAX interno.

**Implicación en los datos:** No cambia. La fuente de verdad sigue siendo `Dj`, `Actividad`, `Alicuota` en Oracle/Host. El nuevo frontend solo consume una vista simplificada.

---

## 3. Introducción: Conceptos Fundamentales

### 3.1. Entidades Legacy Relevantes

| Entidad | Rol | Ubicación |
|---|---|---|
| `Dj` | Declaración Jurada en curso o cerrada. Tiene CUIT, período, régimen, fecha de cierre, lista de actividades y deducciones. | `ar.gov.arba.ibpresentaciones.model.Dj` |
| `Actividad` | Actividad económica asociada a una DJ. Contiene código NAIIBB, tipo (principal/secundaria) y lista de alícuotas. | `ar.gov.arba.ibpresentaciones.model.Actividad` |
| `Alicuota` | Porcentaje de alícuota aplicado a una actividad. Puede ser fija (estándar) o nominal (según rango de ingresos del año anterior). | `ar.gov.arba.ibpresentaciones.model.Alicuota` |
| `PeriodoAnual` | Resumen de períodos de una DJ anual. Usado para mostrar totales por período en consultas. | `ar.gov.arba.ibpresentaciones.model.PeriodoAnual` |
| `UsuarioDTO` | Datos del usuario autenticado. CUIT, nombre, rol, autorizado. | `ar.gov.arba.ibpresentaciones.dto.UsuarioDTO` |
| `DjConDeuda` / `ParamGetDJConDeuda` | DTOs para consulta de DJs cerradas o pendientes con el Host. | `ar.gov.arba.ibpresentaciones.dto` |

### 3.2. Estados en el Sistema Actual

El backend legacy **no tiene un campo `estado` explícito** en la entidad `Dj`. Se deduce por combinación de campos:

| Estado UI propuesto | Condición legacy | Método/Campo |
|---|---|---|
| `NO_PRESENTADO` | No existe registro `Dj` para el período en Oracle ni Host (`nroComprobante == 0`) | `IHostDAO.getDDJJConDeuda` |
| `PENDIENTE` | Existe `Dj` con `fechaCierreWeb == null` | `Dj.isPendiente()` |
| `CERRADA` | Existe `Dj` con `fechaCierreWeb != null` y `rectificativa == 0` | `Dj.isCerrada()` |
| `RECTIFICADA` | `rectificativa > 0` | `Dj.getRectificativa()` |
| `VENCIDA` | `fechaVencimiento < hoy` (adicional sobre los anteriores) | `Dj.isVencida()` |
| `BLOQUEADA` | DJ iniciada en legacy con deducciones manuales, multi-actividad o actividad nominal | Lógica de elegibilidad v1 |

---

## 4. Mapeo Detallado: Datos del Frontend vs. Backend

### 4.1. Cabecera del Contribuyente (Siempre Visible)

| Campo UI | Origen Legacy | Campo/Método | Observaciones |
|---|---|---|---|
| **CUIT** | JWT claim `identifier` o `UsuarioDTO.cuit` | `UsuarioDTO.getCuit()` | No se solicita al usuario; se extrae de la sesión SSO |
| **Razón social** | JWT claim `fullname` o `UsuarioDTO.nombre` | `UsuarioDTO.getNombre()` | Idem |
| **Autorizado (si aplica)** | `UsuarioDTO.autorizado` / `autorizadoNombre` | `isUsuarioConAutorizado()` | v2+: permite operar por un contador/representante |
| **Regimen** | Parámetro de aplicación o `UsuarioDTO` | `rolActual` / `inscripcion` | `LOCAL` vs `CONVENIO_MULTILATERAL` |

### 4.2. Períodos a Declarar (Selector del Frontend)

El frontend necesita una lista de períodos mensuales con metadatos para decidir qué mostrar y si se permite interactuar.

**Estructura de respuesta API (por período):**

```json
{
  "periodo": "2026-02",
  "periodoDisplay": "Febrero 2026",
  "estado": "NO_PRESENTADO",
  "vencimiento": "2026-02-28",
  "esPresentable": true,
  "motivoNoPresentable": null,
  "nroComprobante": null,
  "fechaCierre": null,
  "esVencido": false,
  "linkRectificar": null
}
```

| Campo JSON | Origen/Regla | Detalle Técnico |
|---|---|---|
| `periodo` | Ventana de elegibilidad calculada | Por defecto últimos 3 meses habilitados (configurable) |
| `estado` | Merge Oracle + Host | `getDDJJConDeuda` trae cerradas/pendientes; períodos sin resultado = `NO_PRESENTADO` |
| `vencimiento` | Parámetro de aplicación o cálculo según calendario fiscal | `SingletonUtils.getValor(PARAM_FECHA_VENCIMIENTO)` |
| `esPresentable` | Lógica de elegibilidad v1 | Solo `true` si: estado=`NO_PRESENTADO`, actividad única, alícuota estándar, no vencido, sin DJ pendiente compleja |
| `motivoNoPresentable` | Enumerado de rechazo | `DJ_PENDIENTE_EXISTENTE`, `MULTIPLES_ACTIVIDADES`, `ACTIVIDAD_NOMINAL`, `PERIODO_VENCIDO`, `TRATAMIENTO_ESPECIAL` |
| `nroComprobante` | `Dj.nroComprobante` o Host | `0` o `null` si no hay DJ cerrada/pendiente |
| `fechaCierre` | `Dj.fechaCierreWeb` | Solo poblado si estado=`CERRADA` |
| `esVencido` | `fechaVencimiento < hoy` | Calculado en backend; útil para alertas de intereses |
| `linkRectificar` | URL legacy o endpoint REST v2+ | Si estado=`CERRADA`, link a flujo rectificativa |

#### Proceso de Construcción de la Lista de Períodos

1. **Calcular ventana teórica:** meses habilitados para declarar (ej. `[2026-02, 2026-01, 2025-12]`).
2. **Consultar Host/Oracle:** invocar `IHostDAO.getDDJJConDeuda(ParamGetDJConDeuda)` con CUIT del JWT.
3. **Merge:**
   - Si el Host devuelve una DJ para el período → usar `estado` según `fechaCierreWeb`.
   - Si no devuelve nada → estado=`NO_PRESENTADO`.
4. **Validar elegibilidad:** aplicar reglas v1 sobre actividades y alícuotas (ver sección 3.3).
5. **Marcar `esPresentable` y `motivoNoPresentable`** según resultado.

### 4.3. Actividad y Alícuota (Pantalla de Carga)

El `ddjj-simple.json` muestra actividad y alícuota precargadas. En producción, provienen del Host vía `IBWNACTC`.

**Estructura de respuesta API (por actividad):**

```json
{
  "codigo": "741000",
  "descripcion": "Servicios de diseño especializado",
  "alicuotaVigente": 3.50,
  "tipoHost": "ESTANDAR",
  "codigoTratamientoFiscal": 0,
  "esNominal": false,
  "rangoIngresoAnterior": {
    "desde": null,
    "hasta": null
  }
}
```

| Campo JSON | Origen Legacy | Campo/Método | Notas de Evolución |
|---|---|---|---|
| `codigo` | `Actividad.codigo` | `getCodigo()` | NAIIBB |
| `descripcion` | No está en `Actividad.java`; se busca en `NaiibbTitulo` o `NaiibbCodigo` | `CollectionProviderFacade.getObject(NaiibbCodigo.class, codigo)` | Necesario para mostrar texto al usuario |
| `alicuotaVigente` | `Alicuota.alicuota` (primera de la lista, secuencia=1) | `getAlicuotas().get(0).getAlicuota()` | Si `alicuotaModificada` existe y es distinta, mostrar warning |
| `tipoHost` | `Alicuota.tipoHost` | `getTipoHost()` | `"ESTANDAR"` o `"NOMINAL"` |
| `codigoTratamientoFiscal` | `Alicuota.codigoTratamientoFiscal` | `getCodigoTratamientoFiscal()` | `0`=normal; otro valor indica régimen especial (ej. exenciones) |
| `esNominal` | Derivado de `tipoHost` o rangos | `rangoSupIngresoAnioAnt != null` | Nominal = alícuota depende de ingreso año anterior |
| `rangoIngresoAnterior` | `Alicuota.rangoInfIngresoAnioAnt` / `rangoSupIngresoAnioAnt` | Solo para nominales | v2+ |

#### Reglas de Elegibilidad v1 (Deciden si el contribuyente puede usar la DDJJ simple)

```java
public boolean isElegible(Contribuyente c, Dj dj) {
    List<Actividad> acts = facade.getActividadesDJ_HOST(dj, rol);
    if (acts == null || acts.isEmpty()) return false; // SIN_ACTIVIDAD
    if (acts.size() > 1) return false;                // MULTIPLES_ACTIVIDADES
    
    Actividad act = acts.get(0);
    List<Alicuota> alics = act.getAlicuotas();
    if (alics == null || alics.isEmpty()) return false; // SIN_ALICUOTA
    if (alics.size() > 1) return false;                  // MULTIPLES_ALICUOTAS
    
    Alicuota a = alics.get(0);
    if (a.getCodigoTratamientoFiscal() != 0) return false; // TRATAMIENTO_ESPECIAL
    if ("NOMINAL".equals(a.getTipoHost())) return false;   // ACTIVIDAD_NOMINAL
    
    return true;
}
```

### 4.4. Monto Imponible e Impuesto Determinado (Preview)

**Request `POST /api/v1/ddjj/preview`:**

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

**Mapeo al modelo legacy:**

| Campo Request | Campo Legacy | Cómo se asigna |
|---|---|---|
| `periodo` (año/mes) | `Dj.periodoAño`, `Dj.periodoNro` | Parse `"2026-02"` → `2026`, `2` |
| `actividades[].codigo` | `Actividad.codigo` | Se busca en lista precargada del Host |
| `actividades[].montoImponible` | `Alicuota.importeMontoImponible` | `BigDecimal` directo |

**Response `POST /api/v1/ddjj/preview`:**

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
      "minimoImponible": 0.00
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
    "saldoFavorPeriodo": 0.00
  },
  "ingresoAnioAnterior": 163200.00,
  "fechaVencimiento": "2026-02-28",
  "esVencida": false,
  "intereses": 0.00
}
```

| Campo Response | Cálculo Legacy | Fórmula / Método |
|---|---|---|
| `impuestoDeterminado` | `Alicuota.impuestoDeterminado` | `montoImponible * (alicuota / 100)` (ya calculado en modelo `Alicuota.java:454`) |
| `minimoImponible` | `Alicuota.importeMinimo` | Si aplica, puede modificar `impuestoDeterminado` |
| `retencionesSufridas` | `Dj.importeTotalRetenciones` | Cargado desde Oracle DFE vía `importarDeduccionesORACLE_HOST_cargandoEnDJ` |
| `percepcionesSufridas` | `Dj.importeTotalPercepciones` | Idem |
| `retencionesBancarias` | `Dj.importeTotalRetencionesBanco` | Idem |
| `sirtac` | `Dj.importeTotalRetencionesSirtac` | Idem |
| `saldoFavorAnterior` | `Dj.importeSAFAnterior` | `setearSaldosSAFDJAnterior(dj)` (consulta DJ anterior) |
| `creditoFiscalCopret` | `Dj.importeArt208` | COPRET / ART208 (vía `cargarImportesCreditos`) |
| `totalDeducciones` | Suma de todas las deducciones | `suma de retenciones + percepciones + bancarias + sirtac + SAF + COPRET` |
| `totalAPagar` | `impuestoTotalDeterminado - totalDeducciones` | Mínimo `0` |
| `ingresoAnioAnterior` | `Dj.importeIngresoAñoAnterior` | Host devuelve en `validarInicioDJ` o `IBWNPAD` |

#### Caso Especial: Alícuota cambió entre Preview y Confirmar

Si entre la preview y el POST final la alícuota del Host cambia (raro, posible), el backend debe detectarlo al recalcular y devolver error controlado:

```json
{
  "errorCode": "ALICUOTA_CAMBIO",
  "message": "La alícuota vigente cambió desde la última vista previa",
  "nuevaPreview": { ... }
}
```

### 3.5. Cierre y Comprobante (`POST /api/v1/ddjj`)

**Request v1:**

```json
{
  "periodo": "2026-02",
  "actividades": [
    { "codigo": "741000", "montoImponible": 168817.00 }
  ],
  "idempotencyKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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

**Mapeo al flujo legacy de cierre:**

| Paso Legacy | Mapeo al nuevo endpoint |
|---|---|
| `InicioDDJJAction` crea `Dj` vacío | API crea `Dj` en memoria con datos del request + JWT |
| Asigna `cuit`, `razonSocial` desde sesión | Del JWT claim |
| Asigna `periodoAño`, `periodoNro`, `regimen` | Del request `periodo` |
| Asigna `formulario` desde parámetro | `SingletonUtils.getValor(PARAM_CODIGO_FORM_MENSUAL)` |
| `getActividadesDJ_HOST` precarga actividades | Se valida que el código enviado coincida con el precargado |
| Usuario carga montos imponibles | Del request `actividades[].montoImponible` → `Alicuota.importeMontoImponible` |
| `CerrarDJAction` valida minimo original | `facade.controlarMinimoOriginal(dj, rol, usuario, request)` |
| `validacionesCierre` controla deducciones | `facade.getDeduccionesOracle(dj)` + `actualizarTotalesDeducciones(dj)` |
| `cargarImportesCreditos` trae SAF y COPRET | `facade.cargarImportesCreditos(dj, rol, reAsignarSaldoSAF)` |
| Cierra en Host/Oracle | `facade.cerrarDJ(dj)` o método equivalente en `IHostDAO` |
| Devuelve nro. comprobante | `Dj.nroComprobante` generado por secuencia Oracle |

---

## 5. Estados Especiales y Casos Límite

### 5.1. DJ Pendiente Pre-existente (Iniciada en Legacy)

Escenario: el contribuyente ya inició una DJ para el período `2025-12` en el sistema anterior, está `PENDIENTE` (`fechaCierreWeb == null`), y ahora entra al nuevo frontend.

**Comportamiento de la API:**

```json
{
  "periodo": "2025-12",
  "estado": "PENDIENTE",
  "esPresentable": false,
  "motivoNoPresentable": "DJ_PENDIENTE_EXISTENTE",
  "canalOrigen": "LEGACY",
  "nroComprobante": 123440,
  "linkContinuarLegacy": "/IBPresentaciones/seguirDJ.do?nro=123440",
  "mensaje": "Ya iniciaste una DDJJ para este período en el sistema anterior."
}
```

| Canal Origen | Acción permitida | Detalle |
|---|---|---|
| `LEGACY` | Redirección al sistema anterior | La DJ tiene deducciones manuales, multi-actividad o actividad nominal |
| `SIMPLE` | Precarga del monto y salto a confirmación | La DJ fue iniciada por este canal, es simple, sin deducciones manuales |

### 5.2. Período Vencido

Si `fechaVencimiento < hoy`, el backend legacy ya calcula intereses (si aplica). En v1 del frontend simple, se puede:
- Permitir presentar igual (con intereses calculados por Host).
- Bloquear presentación (`esPresentable=false`, `motivoNoPresentable=PERIODO_VENCIDO`).

**Decisión de diseño:** dejar que el Host valide; si Host permite cerrar, la API permite. El flag `esVencido` es informativo para el frontend.

### 5.3. Rectificativas

En v1, **no se permiten rectificativas** desde el frontend simple. Si un período ya tiene una DJ `CERRADA`, el campo `linkRectificar` apunta al flujo legacy de rectificación (URL Struts).

En v2+, el endpoint podría evolucionar soportando `esRectificativa: true` en el request.

### 5.4. Actividades Nominales o con Tratamiento Fiscal Especial

Si `Alicuota.codigoTratamientoFiscal != 0` o `tipoHost == "NOMINAL"`, la DJ simple **no es elegible**. El backend devuelve:

```json
{
  "elegible": false,
  "motivoNoElegible": "ACTIVIDAD_NOMINAL",
  "detalle": "La actividad 741000 tiene alícuota nominal. Debe usar el sistema legacy.",
  "linkLegacy": "/IBPresentaciones/inicioDJ.do"
}
```

---

## 6. Evolución y Escalabilidad del Modelo de Datos

### 6.1. Principios de Diseño para la API

| Principio | Aplicación |
|---|---|
| **Backward compatibility** | `POST /api/v1/ddjj/preview` acepta 1 actividad hoy; en v2 acepta array sin romper v1 |
| **No exponer IDs internos** | `nroComprobante` es el único ID visible; no exponer `secuencia` de `Alicuota` |
| **Campos calculados en backend** | `impuestoDeterminado`, `totalAPagar`, `esVencido` se calculan siempre en servidor |
| **Idempotencia** | `idempotencyKey` evita duplicar cierres si el usuario hace doble POST |
| **Links HATEOAS** | `linkLegacy`, `linkRectificar`, `pdfUrl` permiten evolucionar sin cambiar estructura |

### 6.2. Roadmap de Evolución

| Fase | Cambio en datos | Impacto en contrato |
|---|---|---|
| **v1 (MVP)** | 1 actividad, alícuota estándar, sin deducciones editables | Array `actividades` siempre size=1; `deducciones` es read-only |
| **v1.1** | Soporte período vencido con intereses | Agregar `intereses` y `totalAPagarConIntereses` en response |
| **v2** | Multi-actividad, edición de deducciones | `actividades[]` size > 1; request incluye `deducciones.manual` flags |
| **v2.1** | Actividades nominales | Agregar `ingresoAnioAnterior` como input en request; recalcular alícuota |
| **v3** | Rectificativas | Agregar `esRectificativa: true`, `djOriginalNroComprobante` |
| **v4** | Anual / Bimestral / otros regímenes | Agregar `regimen` al request; reutilizar `PeriodoAnual` del legacy |

### 6.3. Campos del Legacy que quedan fuera de v1 (intencionalmente)

| Campo Legacy | Por qué se omite en v1 | Cuándo entra |
|---|---|---|
| `cooperativaTrabajo` / `cooperativaExenta` | Reglas especiales de cálculo | v2 o canal legacy |
| `ingresoAñoAnteriorEditable` | Solo editable en actividades nominales | v2.1 |
| `retencionesBancarias` / `retencionesSirtac` | Pocas contribuyentes las tienen; se cargan auto | v2 con panel opcional |
| `deducciones` manuales (carga de archivo) | Complejidad de UI y validación | v2 o legacy |
| `percepcionesAduaneras` | Régimen específico | v3+ |
| `rectificativa` / `nroComprobanteDJAnterior` | MVP solo originales | v3 rectificativas |

---

## 7. Resumen de Viabilidad Técnica

| Aspecto | Viabilidad | Riesgo / Mitigación |
|---|---|---|
| **Reutilizar modelos `Dj`, `Actividad`, `Alicuota`** | Alta | Son POJOs planos; se pueden instanciar y poblar desde REST sin tocar Struts |
| **Invocar `Facade` desde Spring MVC** | Alta | `Facade` es singleton accesible; inyectar o lookup en contexto Spring |
| **Consultar Host (`IBWNACTC`, `IBWNPAD`)** | Media | Host es lento; cachear `actividadesVigentes` por CUIT (TTL 5-15 min) |
| **Secuencia de comprobante Oracle** | Alta | `getID_DJ_FormSecuence()` ya existe; reutilizar |
| **Idempotencia de cierre** | Media | Implementar tabla `idempotency_keys` (CUIT + key + timestamp) en Oracle |
| **Generación de PDF** | Media | Reutilizar lógica existente o Jasper del legacy; exponer como URL separada |
| **Validar deducciones DFE/Oracle** | Alta | `getDeduccionesOracle` y `actualizarTotalesDeducciones` ya existen |
| **Java 7 + Spring MVC** | Alta | Spring 4.x funciona en Java 7; usar anotaciones `@RestController` |

---

## 8. Contratos de Endpoint (Referencia Rápida)

### `GET /api/v1/contribuyente/me/ddjj-contexto`

Devuelve contexto completo: datos del contribuyente, elegibilidad, actividades vigentes, períodos con estados y alertas.

### `POST /api/v1/ddjj/preview`

Simula el cierre sin persistir. Devuelve cálculo de impuestos, deducciones y totales. Útil para pantalla de confirmación.

### `POST /api/v1/ddjj`

Cierra la declaración (persiste en Oracle + Host). Requiere `idempotencyKey`. Devuelve comprobante.

### `GET /api/v1/ddjj/{nroComprobante}/estado`

Consulta estado de una DJ cerrada o pendiente.

### `GET /api/v1/ddjj/{nroComprobante}/comprobante`

Devuelve PDF del comprobante de presentación.

---

*Documento generado a partir del análisis del backend `IBPresentaciones`, modelos `Dj`, `Actividad`, `Alicuota`, y formularios frontend `ddjj-simple.json` / `ddjj-mensual.json`.*
