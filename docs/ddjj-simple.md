# Hoja de ruta consolidada (post-feedback)

Aplico tus respuestas y dejo explícito lo que queda para validar con expertos del dominio / equipo legacy.

## Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| A1 | Ventana elegibilidad | **3 meses** por defecto, **parametrizable** (config, no hardcode) |
| A2 | Criterio "una sola actividad" | "En los últimos N meses, en cada período el contribuyente tuvo exactamente 1 actividad vigente". **No** se exige que sea la misma en todos los meses. |
| B7 | Deducciones | No se declaran en v1. Se **muestran precargadas** en pantalla de confirmación (desde host/DFE). |
| B8 | Ingreso año anterior | Se **muestra** en pantalla de confirmación, no editable. |
| B9 | Alícuota editable | **No** en v1. Si necesita cambiar → legacy. |
| B10 | SAF período anterior | Se **muestra** en pantalla de confirmación. |
| D14 | UX cierre | Sincrónico, UI esperando con loader. |
| D15 | Idempotencia | Responsabilidad de legacy (`existeDJ(dj,"xPeriodo")` ya lo valida). Frontend bloquea doble-click. |
| D16 | Errores de cierre | Queda PENDIENTE; tras 2-3 reintentos fallidos → borrar (`deleteDJPendiente`). Criterio exacto a revisar. |
| E18 | Auth | Mismo JWT del SSO (Keycloak ARBA). Nueva app es "sub-app" de IBPresentaciones. |
| E19 | `rolOpcionMenu` | Derivado del claim `permissions` del JWT. |
| E20 | Windmill → IBPresentaciones | Reenvía el JWT del usuario final (no service-account). |
| F21 | Auditoría | Nuevo subtipo `SUBTIPO_OPERACION_DDJJ_SIMPLE` en `GestionDTO`, mismo mecanismo que legacy. |

## Contrato de datos confirmación (basado en tu mockup)

Actualizo el POST de cierre para que el backend devuelva exactamente los datos de la pantalla que me pasaste:

```json
POST /api/v1/ddjj-simple/preview
Request: { "periodo":"2026-02", "montoImponible": 168817 }
Response: {
  "periodo": "2026-02",
  "periodoDisplay": "Febrero 2026",
  "montoDeclarado": 168817.00,
  "ingresoAnioAnterior": 163200.00,
  "alicuota": 3.50,
  "subtotalAPagar": 6304.50,
  "descuentos": {
    "creditoFiscalCopret": 1400.00,
    "deducciones": 3000.00,         // suma retenciones+percepciones+bancarias+sirtac precargadas
    "saldoAFavor": 100.00,          // SAF período anterior
    "detalleDeducciones": [          // opcional, para desglose si el usuario expande
      {"tipo":"RETENCION","agente":"...","importe":1200.00, "fecha":"..."},
      {"tipo":"PERCEPCION","agente":"...","importe":1800.00, "fecha":"..."}
    ]
  },
  "impuestoAPagar": 5908.50,
  "fechaVencimiento": "2026-02-28"
}

POST /api/v1/ddjj-simple/confirmar
Request:  { "periodo":"2026-02", "montoImponible": 168817, "idempotencyKey": "..." }
Response: { "nroComprobante": 123456, "pdfUrl": "...", "estado": "CERRADA" }
```

Separar **preview** (cálculo sin persistir) de **confirmar** (persiste y cierra) permite que la UI reuse el cálculo sin generar `Dj` pendientes en cada tecla.

## Propuesta para "períodos a mostrar" (C11) 

Dejo las 3 opciones explícitas para decidir más adelante:

- **Alt 1 — Minimalista**: solo listar períodos presentables (no presentados + hábiles). Pantalla vacía = "no hay nada para presentar".
- **Alt 2 — Histórico con links (tu sugerencia)**: últimos 3-4 períodos con su estado. Los ya presentados muestran "Rectificar → legacy". Si falta un período anterior → alerta "tenés una DDJJ previa sin presentar (2025-12)" pero **permite continuar** con el actual.
- **Alt 3 — Histórico estricto**: igual a 2 pero **bloquea** si hay períodos previos sin presentar (obliga a presentar cronológicamente o ir a legacy).



## Propuesta para DDJJ pendiente pre-existente (C13)

Casos a cubrir si el usuario entra al nuevo flujo y en Oracle ya hay un `Dj` con estado `PENDIENTE` para ese período:

- **Si fue creado desde legacy** con datos complejos (multi-actividad, etc.) → redirect a legacy con link directo al `nroComprobante`.
- **Si fue creado desde el nuevo canal** (detectable por el subtipo de gestión o una marca `CANAL_ORIGEN='SIMPLE'` en cabecera) → precargar monto y mostrar pantalla de confirmación directamente. Permitir editar monto o confirmar.

Esto requiere un **campo adicional en la cabecera `Dj`** (o una tabla auxiliar) para marcar el canal de origen. Alternativa sin cambio de schema: chequear si el `Dj` pendiente tiene exactamente 1 actividad sin modificaciones y ninguna deducción cargada manualmente.

## PDF (D17) — dos caminos

- **Opción A (rápida)**: reusar `PDFManager` del legacy, misma estética del comprobante actual. Trabajo = cero.
- **Opción B (nuevo sistema de PDF)**: integrar el servicio nuevo que mencionás. Necesito que me indiques cuál es y si hay documentación / endpoint / librería para evaluar viabilidad.

---

# Ítems abiertos a validar con dominio / equipo legacy

Los dejo priorizados y con formato "qué hay que responder → por qué importa → cómo investigarlo":

## P1 — Críticos para cerrar contrato

1. **¿Qué actividades están alcanzadas por la DDJJ simplificada?** (tus puntos A3, A5)  
   *Por qué importa*: define qué actividades rechazar desde `elegibilidad`. Hoy tengo inferido "mono-actividad + sin tratamiento fiscal + no nominal + no coop. trabajo", pero no sé si existe una lista explícita del negocio.  
   *Cómo investigarlo*: revisar si en IBPresentaciones hay una tabla/param tipo `ACTIVIDADES_SIMPLES` o reglas documentadas. Si no, definir con negocio un **whitelist inicial** (ej: códigos NAIIBB específicos) vs **blacklist** (excluir `tipoHost=nominal`, `codigoTratamientoFiscal != 0`).  
   → **Decisión importante**: si lo resolvemos con whitelist/blacklist de códigos, el cambio es solo en Windmill/mock; si hay lógica compleja, va en IBPresentaciones.

2. **¿La alícuota depende del ingreso del año anterior?** (A4)  
   *Por qué importa*: si para una "actividad nominal" la alícuota cambia por rango de ingresos, no es fast-path. Hay que confirmar que en la whitelist de actividades elegibles **ninguna** sea nominal.  
   *Evidencia en código*: `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dao/consultas/ConsultasDAO.java:687-690` (`T_ALICUOTA_HOST`) y `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:3323-3340` (validación por rango).

3. **¿Qué actividades usan régimen bimestral?** (A6)  
   *Por qué importa*: el legacy lo soporta (ver `REGIMEN_BIMESTRAL` en constantes y `aniosBimestral` en `InicioDDJJForm`), pero generalmente aplica a contribuyentes específicos (ingresos bajos / ciertos regímenes). Si el fast-path las excluye, reducimos complejidad de UI.  
   *Propuesta*: v1 = **solo mensual**; si es bimestral → no elegible.

4. **Ventana de elegibilidad (A1)**: confirmar 3 meses vs otro valor. Probablemente depende del ciclo fiscal (ej: "año fiscal corriente" podría tener más sentido que "rolling 3 meses"). Parametrizable de todos modos.

5. **Convenio Multilateral (CM) vs Contribuyente Local**  
   *Por qué importa*: si `regimen=="CM"` la base imponible se distribuye entre jurisdicciones con coeficientes unificados, cálculo totalmente distinto al local. **No es fast-path.**  
   *Propuesta*: v1 = **solo LOCAL** (ARBA puro). Si `regimen=="CM"` → `no-elegible` con motivo `CONVENIO_MULTILATERAL`.

## P2 — Bloqueantes para implementación

6. **¿Existe un flag/tabla para distinguir "canal de origen" de un `Dj`?** (punto C13 arriba). Si no, ¿qué política seguimos cuando hay pendiente previa?

7. **Mapeo de `rolOpcionMenu` desde JWT** (E19). Hay que ver qué claim o permiso específico habilita al usuario a operar DDJJ en rutinas Natural. No es un rol inventado; es un string que el host valida.

8. **JWKS del SSO Keycloak ARBA** (E18): URL del JWKS o secret compartido para validar firma en el nuevo servlet REST. Lo maneja seguridad/infra.

9. **Política de rollback** (D16): ¿cuántos reintentos? ¿qué errores son "retryables"? ¿quién dispara el reintento (usuario con botón, job batch, ninguno)?

## P3 — Deseables para UX

10. **Mensajes de "no elegible"** (tu punto 3/5): si alguien no es elegible, ¿qué texto le mostramos y con qué link? Probablemente `"Tu caso requiere la presentación completa en [link a legacy]"` con tracking del motivo.

11. **¿El nuevo PDF existe ya como servicio?** (D17 opción B) — url / doc / ejemplo.

12. **¿Se necesita notificación por mail del comprobante?** El legacy probablemente no lo hace en cierre simple, pero puede ser un "nice-to-have".

13. **Estados intermedios**: si el usuario abre el flow y abandona sin confirmar, ¿guardamos algo? Propuesta v1: **no**. El borrador vive solo mientras la pestaña está abierta (in-memory en el frontend). Se persiste solo al confirmar.

---

# Glosario

| Término | Qué es | Dónde vive |
|---|---|---|
| **DDJJ** | Declaración Jurada de Ingresos Brutos | Concepto ARBA |
| **`Dj`** | Entidad raíz en legacy. Contiene cabecera + `actividades` + deducciones | `model/Dj.java` |
| **Actividad** | NAIIBB con su alícuota y monto imponible. Un `Dj` puede tener N | `model/Actividad.java` |
| **Alícuota** | `%` que aplica a la base imponible de una actividad | `model/Alicuota.java` |
| **Régimen** | Mensual / Bimestral / CM (Convenio Multilateral) / LOCAL | Constantes |
| **SAF** | Saldo A Favor del período anterior (se descuenta del impuesto) | `Dj.importeSaldoAnterior` |
| **COPRET** | Crédito fiscal por Comisión Provincial de Educación y Trabajo | `Dj.creditoFiscalCopret` |
| **Deducciones** | Retenciones + percepciones + bancarias + SIRTAC que reducen el saldo | Lists en `Dj` |
| **SIRTAC** | Sistema de Recaudación sobre Tarjetas de Crédito | Deducción bancaria |
| **DFE** | Datos Fiscales Electrónicos — origen de deducciones informadas | Oracle + host |
| **Host** | Sistema mainframe (Natural / Adabas) donde impacta la presentación | Rutinas `IBWN*` |
| **`IBWNPAD`** | Rutina Natural — valida inicio DJ, calcula vencimiento, ingreso año ant. | `HostDAO.validarInicioDJ` |
| **`IBWNRECT`** | Rutina Natural — determina si es original o rectificativa | `HostDAO.calcularTipoDJ` |
| **`IBWNACTC`** | Rutina Natural — devuelve actividades vigentes + alícuotas | `HostDAO.getActividadesDJ_HOST` |
| **Actividad "nominal"** | Aquella cuya alícuota varía según rango de ingresos del año anterior | `T_ALICUOTA_HOST` |
| **Tratamiento fiscal** | Régimen especial (portuaria, exenta, cooperativa, etc.) | `Alicuota.codigoTratamientoFiscal` |
| **Rectificativa** | DDJJ que reemplaza una anterior ya presentada | `Dj.rectificativa > 0` |
| **Gestión** | Registro de auditoría por sub-operación | `GestionDTO` |
| **`rolOpcionMenu`** | Rol ARBA que habilita operar rutinas Natural | Session attribute |

---

# Alcance v1

## IN — casos cubiertos

- Contribuyente **LOCAL** (no CM).
- **Régimen mensual**.
- **Una sola actividad** vigente en los últimos N meses (N=3 por defecto).
- Actividad **sin tratamiento fiscal especial** (`codigoTratamientoFiscal == 0`).
- Actividad **no nominal** (alícuota fija, no depende de ingresos año ant.).
- Período **no presentado previamente**.
- Usuario **autenticado vía SSO** (JWT Keycloak).
- **Presentación original** (no rectificativas).
- Deducciones / SAF / COPRET **precargadas y visibles**, no editables.

## OUT — fuera de v1 (redirect a legacy)

- Multi-actividad, cambio de alícuota, tratamientos fiscales especiales.
- Régimen bimestral o Convenio Multilateral.
- Rectificativas de cualquier tipo.
- Cooperativa de trabajo.
- Declaración de deducciones manuales que no vengan de DFE/host.
- Edición de una DDJJ ya presentada.
- Descarga/consulta de DDJJ históricas (sólo link a legacy).

## OUT pero candidato a v2+

- Rectificativa simple (solo cambio de monto, misma actividad).
- Multi-actividad ≤ N (ej: hasta 3) con alícuotas estándar.
- Notificación por mail del comprobante.
- Generación de PDF con nuevo servicio.

---

# Arquitectura de referencia

```
┌────────────────┐      JWT       ┌──────────────┐
│ Frontend Next  │ ─────────────► │   Windmill   │
│ (nuevo)        │ ◄───────────── │   (flows)    │
└────────────────┘   schema+data  └──────┬───────┘
                                         │ JWT forward
                                         ▼
                              ┌──────────────────────┐
                              │ IBPresentaciones     │
                              │  /api/v1/*  (nuevo)  │
                              │  ├── /me             │
                              │  ├── /elegibilidad   │
                              │  ├── /preview        │
                              │  └── /confirmar      │
                              └──────┬───────────────┘
                                     │ reusa
                              ┌──────▼─────────┐    ┌──────────────┐
                              │ Facade +       │───►│ Oracle       │
                              │ HostDAO        │    │ (Dj, Activ,  │
                              │                │    │  Alicuota)   │
                              │                │    └──────────────┘
                              │                │    ┌──────────────┐
                              │                │───►│ Host Natural │
                              │                │    │ (IBWN*)      │
                              └────────────────┘    └──────────────┘
                                     ▲
                                     │ misma sesión Spring / misma auditoría
                              ┌──────┴─────────┐
                              │ Struts legacy  │
                              │ (/*.do)        │
                              └────────────────┘
```

---

# Contrato completo de endpoints

Resumen (detalle en `iibb/poc-formulario-asistido/apis/iibb-simple.json`).

## `GET /api/v1/contribuyente/me`
- **Auth**: JWT obligatorio. CUIT se deriva del claim, **no** se recibe como parámetro.
- **Response 200**: `{cuit, razonSocial, regimen, email?}`.
- **Errores**: 401 JWT inválido, 403 sin permisos IIBB.

## `GET /api/v1/contribuyente/me/elegibilidad-ddjj-simple?ventanaMeses=3`
- **Auth**: JWT.
- **Query opcional**: `ventanaMeses` (default 3, max 12).
- **Response 200**:
  ```jsonc
  {
    "elegible": true|false,
    "motivoNoElegible": null | "MULTIPLES_ACTIVIDADES" | "TRATAMIENTO_FISCAL_ESPECIAL"
                      | "ACTIVIDAD_NOMINAL" | "CONVENIO_MULTILATERAL" | "REGIMEN_BIMESTRAL"
                      | "COOPERATIVA_TRABAJO" | "SIN_ACTIVIDAD",
    "mensajeUsuario": string | null,
    "linkLegacy": string | null,
    "ventanaMeses": 3,
    "actividadUnica": { "codigo","descripcion","alicuotaVigente","tipoHost","codigoTratamientoFiscal" } | null,
    "periodosPresentables": [ { "periodo","periodoDisplay","vencimiento","estado" } ],
    "alertaPeriodosFaltantes": [ { "periodo","periodoDisplay","mensaje" } ]?,
    "historialReciente": [ { "periodo","estado","nroComprobante","fechaCierre","montoDeclarado","impuestoPagado","linkLegacy" } ]
  }
  ```

## `POST /api/v1/ddjj-simple/preview`
- **Auth**: JWT.
- **Body**: `{periodo: "YYYY-MM", montoImponible: number}`.
- **Response 200**: liquidación calculada (sin persistir). Ver mock para forma completa.
- **Errores**: 422 monto inválido, 409 período ya presentado, 403 no elegible para ese período.

## `POST /api/v1/ddjj-simple/confirmar`
- **Auth**: JWT.
- **Body**: `{periodo, montoImponible, idempotencyKey}`.
- **Response 201**: `{nroComprobante, estado:"CERRADA", pdfUrl, linkLegacy, impuestoPagado, fechaCierre, fechaVencimiento}`.
- **Errores**:
  - **409 `DDJJ_YA_EXISTENTE`** → mostrar link a legacy.
  - **502 `HOST_NO_DISPONIBLE`** con `reintentable:true` → permitir reintento manual, backend ya dejó `Dj` PENDIENTE.
  - **422 `VALIDACION`** → alícuota/monto inconsistente.
  - **500** → rollback: `deleteDJPendiente`.

---

# Mapeo Frontend simple → modelo `Dj` legacy

Para que quien implemente el servlet sepa cómo construir el `Dj` al recibir el `POST /confirmar`:

| Campo Frontend / Request | Campo `Dj` legacy | Cómo se obtiene |
|---|---|---|
| (JWT `identifier`) | `Dj.cuit` | Parseo JWT |
| (JWT `fullname`) | `Dj.razonSocial` | Parseo JWT |
| `periodo` "2026-02" | `Dj.periodoAño=2026`, `Dj.periodoNro=2` | Split |
| *fijo* | `Dj.regimen = REGIMEN_MENSUAL` | Constante |
| *fijo* | `Dj.formulario = PARAM_CODIGO_FORM_MENSUAL` | `SingletonUtils` |
| — | `Dj.aplicativo / Version / Release` | `SingletonUtils` (igual que legacy) |
| — | `Dj.fechaInicio / fechaActualizacion` | `new Date()` |
| (backend) | `Dj.rectificativa = 0` | Siempre original en v1 |
| (backend) | `Dj.cooperativaTrabajo = false` | Excluido en v1 |
| (backend, nuevo) | `Dj.canalOrigen = "SIMPLE"` | **Requiere agregar columna** |
| `montoImponible` | `Actividad.montoImponible` (una sola) | Directo |
| (host IBWNACTC) | `Actividad.codigo / descripcion / tipo` | Precargado por `getActividadesDJ_HOST` |
| (host IBWNACTC) | `Alicuota.alicuota` (una sola, sec=1) | Precargado |
| (host IBWNACTC) | `Alicuota.alicuotaModificada = alicuota` | **Igual a alicuota** → sin cambio |
| (host IBWNACTC) | `Alicuota.motivoCambioAlicuota = 0` | Sin cambio |
| (host IBWNACTC) | `Alicuota.codigoTratamientoFiscal = 0` | Validado en elegibilidad |
| (host IBWNPAD) | `Dj.importeIngresoAñoAnterior` | Calculado al invocar `validarInicioDJ` |
| (Oracle DFE/host) | `Dj.retenciones/percepciones/bancarias/sirtac` | Importado por `importarDeduccionesORACLE_HOST_cargandoEnDJ` |
| (Oracle) | `Dj.importeSaldoAnterior` (SAF) | `setearSaldosSAFDJAnterior` |
| (cálculo) | `Dj.impuestoAPagar` | `djConLiquicion` |

**Flujo mental del `POST /confirmar`**:

1. Validar JWT + reevaluar elegibilidad para `periodo`.
2. `validarInicioDJ` → obtiene vencimiento e ingreso año anterior.
3. `calcularTipoDJ` → confirma que es original (si no → 409).
4. `getActividadesDJ_HOST` → obtiene la actividad + alícuota.
5. Construir `Dj` con el mapping de arriba.
6. `importarDeduccionesORACLE_HOST_cargandoEnDJ` → precarga deducciones.
7. `djConLiquicion` → calcula saldo.
8. `validarImportesActividades`.
9. `insertDJCabecera` + `insertDJActividades`.
10. `cerrarDJ` en host.
11. Grabar `GestionDTO` con subtipo `SUBTIPO_OPERACION_DDJJ_SIMPLE`.
12. Generar PDF (`PDFManager`) y devolver `nroComprobante + pdfUrl`.

---

# Riesgos conocidos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Alícuota vigente cambia entre preview y confirmar | Cálculo inconsistente | Backend recalcula en `confirmar` ignorando el preview; si difiere → 409 `ALICUOTA_CAMBIO` y re-preview. |
| Usuario presenta la misma DDJJ desde legacy en paralelo | Duplicado | `existeDJ(dj,"xPeriodo")` en legacy → 409. Frontend bloquea doble-click con idempotencyKey. |
| Período se vence entre preview y confirmar | Vencimiento + intereses | Mostrar vencimiento en preview; si al confirmar ya venció → permitir pero agregar leyenda (mismo comportamiento que legacy). |
| Host caído al cerrar | `Dj` queda PENDIENTE huérfano | Respuesta 502 `reintentable`; job batch a futuro que reintente o notifique. |
| JWT expira mid-flow | Pérdida de datos ingresados | Frontend guarda el monto en `sessionStorage` y reintenta auth silencioso. |
| Convenio Multilateral mal clasificado | Contribuyente CM cae en fast-path incorrecto | Elegibilidad valida `regimen` contra `HostDAO.verificarContribuyente` (fuente de verdad). |
| Deducciones llegan tarde de host | Preview con valores incompletos | Timeout de 3s; si falla, preview sigue pero con flag `deduccionesParciales:true` y advertencia UI. |
| Un usuario legítimo queda marcado "no elegible" por bug | Frustración + bajada de adopción | Link siempre visible a legacy; logging del motivo para auditar falsos negativos. |
| Cambio de schema Oracle (nueva col `CANAL_ORIGEN`) rechazado por DBA | Bloqueo | Plan B: tabla auxiliar `DDJJ_SIMPLE_METADATA(nroComprobante, canal, timestamp)`. |

---

# Plan de fases y entregables

## Fase 0 — Contrato (HECHO / en curso)
- [x] Roadmap consolidado (este doc).
- [x] Mock definitivo en `apis/iibb-simple.json` (4 endpoints, escenarios).
- [x] `compose.yml` para levantar mock en puerto 3002.
- [ ] Validar P1.1, P1.2, P1.3, P1.5 con negocio / legacy.
- **Criterio done**: contrato firmado por negocio + legacy + frontend.

## Fase 1 — Frontend + Windmill contra mocks
- [ ] Adaptar `POC-2/windmill/f/form_lifecycle/init_flow__flow` para consumir `/me` + `/elegibilidad` en vez de los 4 mocks viejos.
- [ ] Crear `submit_flow__flow` → orquesta `/preview` + `/confirmar`.
- [ ] Nuevas pantallas Next: lista de períodos presentables, form de monto, pantalla de confirmación (mockup ya definido), pantalla de éxito con descarga PDF.
- [ ] Manejo de respuestas `no-elegible` → redirect con mensaje + link.
- **Criterio done**: flow E2E funcional contra mock, incluyendo happy path + 3 escenarios de error.

## Fase 2 — Servlet REST en IBPresentaciones (solo lectura)
- [ ] Agregar `DispatcherServlet` de Spring MVC mapeado a `/api/v1/*` en `web.xml` (ver decisión en `preguntas-por-stakeholder.md` → L3). **Cero dependencias nuevas** (`spring-webmvc` y Jackson ya están).
- [ ] Crear `springRestContext.xml` con `<mvc:annotation-driven/>` y `<context:component-scan>` para el paquete `ar.gov.arba.ibpresentaciones.rest`.
- [ ] Decidir coexistencia con `LoginFilter` existente (opción (a) excluir `/api/v1/*` + filtro JWT propio, o (b) reusar filter del weblib) — ver L12.
- [ ] Implementar `@RestController` para `/me` y `/elegibilidad` inyectando `Facade`/`HostDAO` con `@Autowired`.
- [ ] Validación JWT Keycloak (librería compatible Java 7, ver L13).
- [ ] Mapeo `rolOpcionMenu` desde claims.
- [ ] Suite de tests con datasets Oracle de QA.
- [ ] Switch de Windmill: var env `ibpresentaciones_base_url`.
- **Criterio done**: frontend consume APIs reales para lectura; mock sigue disponible como fallback.

## Fase 3 — Persistencia (preview + confirmar)
- [ ] Implementar `/preview` (cálculo, no persiste).
- [ ] Implementar `/confirmar` con el flujo de 12 pasos del mapping.
- [ ] Columna `CANAL_ORIGEN` o tabla auxiliar.
- [ ] Nuevo subtipo `SUBTIPO_OPERACION_DDJJ_SIMPLE` en `GestionDTO`.
- [ ] Generación PDF con `PDFManager` reusado.
- **Criterio done**: usuarios piloto pueden cerrar DDJJ reales y se ven en legacy.

## Fase 4 — Rollout gradual
- [ ] Feature flag por CUIT / por % de usuarios.
- [ ] Piloto con N contribuyentes conocidos.
- [ ] Métricas de adopción, tasa de conversión a legacy, errores por motivo.
- [ ] Comunicación a usuarios desde legacy (banner "probá el nuevo formulario").
- **Criterio done**: ≥X% de usuarios elegibles usan el nuevo flujo con < Y% de fallback a legacy.

## Fase 5 — Evolución (v2+)
- [ ] Notificación email.
- [ ] Rectificativas simples.
- [ ] Multi-actividad con alícuotas estándar.
- [ ] Nuevo sistema de PDF.

---

# Testing strategy

## Mocks
- Mockoon en puerto 3002 con los escenarios ya definidos (ver `iibb/poc-formulario-asistido/apis/iibb-simple.json`).
- Query param `?scenario=` en `/elegibilidad` para switchear entre elegible, no-elegible-*, con-alerta.
- `periodo==2025-12` → 409 en confirmar. `periodo==1999-01` → 502.

## Dataset de QA (a armar con legacy)
Necesitamos CUITs reales/ficticios con las siguientes características en Oracle + host:

| Caso | Perfil | Resultado esperado |
|---|---|---|
| C1 | LOCAL + 1 actividad + últimos 3 meses presentados | elegible, 0 períodos presentables (todo al día) |
| C2 | LOCAL + 1 actividad + 1 período sin presentar | elegible, 1 período presentable |
| C3 | LOCAL + 2 actividades vigentes | no-elegible MULTIPLES_ACTIVIDADES |
| C4 | CM | no-elegible CONVENIO_MULTILATERAL |
| C5 | LOCAL + 1 actividad con tratamiento portuario | no-elegible TRATAMIENTO_FISCAL_ESPECIAL |
| C6 | LOCAL + 1 actividad nominal (alícuota por rango) | no-elegible ACTIVIDAD_NOMINAL |
| C7 | LOCAL + 1 actividad pero régimen bimestral | no-elegible REGIMEN_BIMESTRAL |
| C8 | LOCAL + 1 actividad + `Dj` PENDIENTE pre-existente canal simple | precarga monto |
| C9 | LOCAL + 1 actividad + `Dj` PENDIENTE pre-existente canal legacy | redirect a legacy |

## Tipos de prueba
- **Unit tests** en servlet (Facade mockeada) → validar mapeo `Dj`.
- **Integration tests** contra Oracle QA + host QA (si existe).
- **E2E Playwright** en frontend cubriendo C1-C4 mínimo.
- **Smoke test** en deploy: llamar `/me` + `/elegibilidad` con un CUIT de prueba conocido.

---

# Observabilidad

Qué loguear / medir desde el día 1 (dashboards permitirán decidir si v2 avanza):

## Logs estructurados
- `request_id` (correlación Windmill ↔ IBPresentaciones).
- CUIT hasheado (no plano) + `motivoNoElegible` cuando corresponda.
- Tiempo de cada paso del confirmar (validar, calcular, insert, host, pdf).

## Métricas clave
- `elegibilidad_total / elegibles / no_elegibles_por_motivo`.
- `preview_latency_p50/p95/p99`.
- `confirmar_latency_p50/p95/p99` + `success_rate`.
- `fallback_a_legacy` (contribuyentes elegibles que igual clickean link a legacy).
- `host_errors` / `oracle_errors` / `rollback_count`.
- `pendientes_huérfanos` (Dj SIMPLE sin cierre tras > N min).

## Alertas
- `confirmar_error_rate > 5%` en 10 min.
- `host_down` (≥ 3 errores 502 consecutivos).
- `pendientes_huérfanos > 0`.

---

# Rollout y feature flag

## Variables de control
- `ddjj_simple.enabled` (global kill switch).
- `ddjj_simple.allow_cuits` (whitelist de CUITs para piloto).
- `ddjj_simple.rollout_percentage` (0-100, gradual).
- `ddjj_simple.ventana_meses` (default 3).
- `ddjj_simple.actividades_whitelist` / `blacklist` (según decisión P1.1).

## Fases de adopción propuestas
1. **Piloto cerrado** (10-50 CUITs internos ARBA).
2. **Piloto abierto por invitación** (banner en legacy para 1% elegibles).
3. **Rollout 10% → 25% → 50% → 100%** según métricas.
4. **Default** (banner invertido: legacy para casos complejos).

## Kill switch
Si se detecta un bug crítico (cálculo erróneo, pérdida de DDJJ), bajar `ddjj_simple.enabled=false` redirige a todos al legacy sin deploy.

---

# Anexo: referencias al código legacy

Índice rápido para devs que implementen los endpoints.

## Inicio de DDJJ (referencia conceptual)
- `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/InicioDDJJAction.java:97-382` — flujo completo `performInicioDDJJ` (referencia para ver qué pasos replica nuestro `/confirmar`).

## Facade (orquestación)
- `insertDJCabecera`, `insertDJActividades`: `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:241-356`.
- `importarYPersistirDJDelOracle` (plantilla para persistencia completa): `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:2505-2588`.
- `persistirDjOriginalConDeducsInformadasPorAgente` (variante más cercana al simple): `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:2859-2882`.
- `getActividadesDJ_HOST`: `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1026-1032`.
- `validarImportesActividades`: `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:3279-3352`.

## Host DAO (rutinas Natural)
- `verificarContribuyente`, `validarInicioDJ`, `calcularTipoDJ`, `getActividadesDJ_HOST`, `cerrarDJ`, `getDDJJConDeuda`: `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dao/host/IHostDAO.java:33-59`.
- Implementación `getActividadesDJ_HOST` (parseo IBWNACTC): `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/dao/host/HostDAO.java:188-238`.

## Modelo
- `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java` — entidad raíz.
- `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Actividad.java`.
- `IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Alicuota.java`.

## Constantes relevantes
- `ConstantesAplicacion`: `REGIMEN_MENSUAL`, `REGIMEN_BIMESTRAL`, `SUBTIPO_OPERACION_INICIO_DJ`, `PARAM_CODIGO_FORM_MENSUAL`, `ACCION_INGRESO_AÑO_ANTERIOR`, `AÑO_2000_DJ_ANTICIPO`.
