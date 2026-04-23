## ¿Qué se consulta al Host hoy y con qué frecuencia?

| Consulta Host | Rutina | Frecuencia en legacy | ¿Cambia? |
|---|---|---|---|
| **Actividades vigentes** | `IBWNACTC` | Cada vez que se inicia una DJ ([InicioDDJJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/InicioDDJJAction.java:45:0-733:1)) | **Sí** — bajas/altas de actividades |
| **Periodos exigibles / DJ existentes** | `IBWNPAD` / `IBWNPDD` | En búsqueda de DJ, cierre | **Sí** — a medida que pasan los meses |
| **Deducciones (retenciones bancarias, SIRTAC)** | Host DFE | Solo en cierre ([CerrarDJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/CerrarDJAction.java:38:0-448:1)) | **Sí** — mensuales |
| **Validación de inicio** (ingreso año ant.) | `IBWNPAD` | En inicio de DJ | **Sí** — depende de la DJ anterior |
| **Créditos SAF período anterior** | Host/archivos SAF | En cierre | **No** — histórico, ya cerrado |
| **Cierre efectivo** | `IBWNCIE` | Una vez por cierre | N/A — es escritura |

---

## Tu hipótesis: ¿la actividad de un período vencido cambia?

**Parcialmente cierta, con un matiz clave.**

### Caso 1: Período YA cerrado (tiene `nroComprobante`, `fechaCierreWeb != null`)

En este caso, la actividad que se usó **ya está persistida en Oracle** como parte de la DJ cerrada. El legacy no vuelve a consultar el Host para eso; la DJ cerrada es inmutable.

```
Oracle: DJ #123456 → Actividad 741000 → Alicuota 3.5% → Monto $168.817
       ↑
       └── Esto YA está grabado. No se toca más.
```

### Caso 2: Período NO presentado, pero VENCIDO

Acá es donde tu hipótesis aplica mejor. Si el período `2025-10` (vencido) nunca se declaró:

- **La actividad vigente HOY** podría diferir de la que había en octubre.
- Ejemplo: el contribuyente tenía actividad `741000` en octubre, pero se dio de baja en noviembre. El Host hoy solo devolvería actividades vigentes, **no la historia**.

**Riesgo:** si cacheás "actividades vigentes" sin fecha de snapshot, podrías perder la actividad que tenía en el período vencido.

### Caso 3: Período NO presentado, EN VENTANA (vigente)

Acá la actividad **sí puede cambiar** (bajas, altas, cambio de alícuota). Es el caso más dinámico.

---

## ¿Qué se podría optimizar guardando en Oracle?

### Opción A: Snapshot de actividades por período (tu idea)

**Propuesta:** Al consultar `IBWNACTC` por primera vez para un (CUIT, período), guardar en Oracle una tabla `ACTIVIDAD_SNAPSHOT` con:

```sql
ACTIVIDAD_SNAPSHOT
- cuit
- periodo_año
- periodo_nro
- codigo_actividad
- alicuota
- fecha_consulta_host
- hash_datos
```

**Lógica:**
- Si vuelvo a necesitar actividades para ese (CUIT, período) y ya tengo snapshot reciente (ej. < 30 días), uso Oracle.
- Si el período ya venció y tiene snapshot, **nunca más consulto Host** para ese período.

**Pros:**
- Reduce drásticamente llamadas al Host para períodos vencidos.
- Período cerrado → inmutable por definición.

**Contras / Riesgos:**
- ¿Y si el contribuyente nunca presentó ese período y quiere presentar **tarde** (con intereses)? La actividad snapshot podría estar desactualizada si cambió post-vencimiento.
- ¿Quién invalida el cache? Necesitás un mecanismo de "cache stale" o invalidación manual.

**Mitigación:**
- Snapshot solo para períodos **ya iniciados** (DJ en curso) o **ya cerrados**.
- Para períodos vencidos sin presentar, consultar Host igual (es edge case).

---

### Opción B: Cachear "Actividades Vigentes del Contribuyente" (sin período)

**Propuesta:** Guardar en Oracle (o Redis/Cache distribuido) las actividades vigentes del contribuyente con TTL:

```java
// Pseudo-config
host.actividades.cache.ttl=15min
host.actividades.cache.key=ACTIVIDADES_VIGENTES:{cuit}
```

**Lógica:**
- [getActividadesDJ_HOST(dj, rol)](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1025:1-1031:2) → primero cache (Oracle tabla o memcached).
- Si no está o expiró, consultar Host y guardar.

**Pros:**
- Un contribuyente con 1 actividad consulta Host una vez cada 15 min, no en cada navegación.
- Simple de implementar.

**Contras:**
- Si el contribuyente da de baja/alta una actividad en otro canal (mesas, otro sistema), el cache está desactualizado hasta que expire.
- Para cierre de DJ, **siempre** se debería re-validar con Host (critical path).

---

### Opción C: Precargar en Oracle al abrir período mensual

**Propuesta:** Un job mensual que, al inicio de cada período fiscal, consulte Host para todos los contribuyentes activos y precargue en Oracle:

```sql
-- Tabla maestra de actividades por período
CONTRIBUYENTE_PERIODO_ACTIVIDAD
- cuit
- periodo
- codigo_actividad
- alicuota_estandar
- es_nominal
- fecha_precarga
```

**Lógica:**
- Cuando el contribuyente entra a declarar, las actividades ya están en Oracle.
- Solo se consulta Host como fallback o si no hay precarga.

**Pros:**
- Zero latencia para el 99% de los usuarios.
- Se consulta Host una sola vez por período, no por contribuyente × interacción.

**Contras:**
- Masivo: si hay 500k contribuyentes, son 500k consultas al Host por mes.
- Muchos no van a declarar ese mes (desperdicio).
- Complejidad operativa: job, monitoreo, reintentos.

---

## Tu escenario específico: "Actividad en período vencido no debería cambiar"

Tenés razón en el principio, pero con una salvedad técnica:

| Situación | ¿La actividad cambia? | ¿Se puede cachear? |
|---|---|---|
| Período **cerrado** (DJ presentada) | No → ya está en Oracle | Ya está persistido, no hay problema |
| Período **vencido, nunca presentado** | Podría (baja posterior) | Riesgo medio: snapshot con timestamp |
| Período **en ventana, no iniciado** | Sí (altas/bajas en tiempo real) | Cache corto TTL (5-15 min) |
| Período **iniciado (DJ pendiente)** | No debería → ya se fijó al inicio | **Sí**, y de hecho ya está en sesión/Oracle |

**La clave es:** cuando el legacy hace [InicioDDJJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/InicioDDJJAction.java:45:0-733:1), crea el objeto [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) en memoria/sesión con las actividades del Host **en ese momento**. Ese [Dj](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/model/Dj.java:28:0-2142:1) pendiente ya tiene "congelada" la actividad. Si el contribuyente abandona y vuelve días después, el legacy recupera la DJ desde Oracle, **no vuelve a consultar Host** para actividades.

```java
// InicioDDJJAction
List actividades = facade.getActividadesDJ_HOST(dj, rol); // Host, una sola vez
// ... guarda en sesión / Oracle como DJ iniciada ...
// Días después, el usuario vuelve:
Dj djRecuperada = facade.getDjPendiente(cuit, periodo); // Oracle, no Host
```

**Esto ya es una forma de "cache" implícita** en el modelo legacy.

---

## Recomendación pragmática para tu API

### Nivel 1: Reutilizar lo que ya hace el legacy (gratis)
- Si el contribuyente **ya inició** una DJ para el período (estado `PENDIENTE`), usá la DJ de Oracle. No consultes Host.
- Esto ya lo hace [BusquedaDDJJAction](cci:2://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/controller/BusquedaDDJJAction.java:51:0-1304:1) y `ConsultasDAO`.

### Nivel 2: Cache de aplicación para actividades vigentes (bajo esfuerzo)
- Implementar una tabla `CACHE_ACTIVIDADES_HOST`:
  ```sql
  CACHE_ACTIVIDADES_HOST
  - cuit NUMBER
  - json_response CLOB  -- o campos normalizados
  - fecha_cache TIMESTAMP
  - ttl_minutos NUMBER DEFAULT 15
  ```
- `GET /api/v1/contribuyente/me/ddjj-contexto` → si `fecha_cache + ttl > now()`, usar cache.
- Invalidación manual: si un operador de mesa modifica actividades, limpiar cache del CUIT.

### Nivel 3: Snapshot por período (mayor esfuerzo, más optimización)
- Tabla `ACTIVIDAD_PERIODO_SNAPSHOT`:
  ```sql
  - cuit, periodo_año, periodo_nro, codigo, alicuota, fecha_snapshot
  - UNIQUE(cuit, periodo_año, periodo_nro, codigo)
  ```
- Se crea al **primer** [getActividadesDJ_HOST](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1025:1-1031:2) para ese período.
- Si el período venció y no se presentó, el snapshot sirve para consultas futuras (el usuario probablemente ya no presenta, pero si lo hace, la actividad es "la que tenía en ese momento").

### Nivel 4: Precarga masiva (alto esfuerzo, para v2+)
- Job mensual que precarga para contribuyentes "predecibles" (los que siempre declaran, actividad estable).
- No recomendable para v1.

---

## ¿Y si la actividad cambia mientras hay DJ pendiente?

Tu segunda hipótesis: *"si cambia es solo para agregar, en ese caso me quedaría pendiente esa DDJJ"*.

**Esto ya pasa en el legacy.** Si un contribuyente tiene una DJ iniciada con actividad `741000`, y luego se le da de alta una segunda actividad `620100`:

| Escenario | Comportamiento legacy | Comportamiento API propuesto |
|---|---|---|
| DJ ya iniciada (pendiente) en Oracle | El legacy no se entera hasta que el usuario vuelve a interactuar. La DJ sigue con la actividad original. | **Igual**: la API debe devolver `estado=PENDIENTE`, `linkLegacy` para continuar. |
| Nuevo intento de iniciar DJ | [getActividadesDJ_HOST](cci:1://file:///c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/java/ar/gov/arba/ibpresentaciones/facade/Facade.java:1025:1-1031:2) trae 2 actividades → el legacy permite iniciar (con más actividades) o alerta inconsistencia. | La API debería marcar `elegible=false`, `motivo=MULTIPLES_ACTIVIDADES`. |

**Conclusión:** la DJ pendiente es un "snapshot" válido. No invalidarla por cambios posteriores en el Host. Eso es coherente con el legacy y evita inconsistencias.

---

## Resumen: ¿qué optimizar para v1?

| Optimización | Esfuerzo | Impacto | Recomendación v1 |
|---|---|---|---|
| Reutilizar DJ pendiente de Oracle | Bajo | Alto | **Sí, obligatorio.** |
| Cache TTL actividades vigentes (CUIT) | Medio | Medio | **Sí, recomendable.** Tabla `CACHE_ACTIVIDADES_HOST` con 15-30 min TTL. |
| Snapshot por período vencido | Medio-Alto | Medio | **No para v1.** Validar con dominio primero. |
| Precarga masiva mensual | Alto | Alto a escala | **No para v1.** |

**Pregunta clave para el experto de dominio:**
> *"¿Un contribuyente que tiene actividad A en el período X, y luego se le da de baja la actividad A, puede/quiere presentar la DDJJ del período X con la actividad A (histórica) o solo con las vigentes?"*

Si la respuesta es *"con la vigente al momento de iniciar la DJ"*, entonces el snapshot por período es válido. Si es *"con la que tenía en ese período"*, entonces tu idea es aún más aplicable.