# Preguntas abiertas por stakeholder

Complemento de `ddjj-simple.md`. Cada pregunta tiene referencia cruzada a los ítems **P1–P3** de la hoja de ruta.


**Leyenda de prioridad**:
- 🔴 **Bloqueante**: sin esto no avanza Fase 0/1.
- 🟡 **Necesario para Fase 2/3**: podemos seguir con mocks, pero hay que responderlo antes de implementar backend.
- 🟢 **Deseable / optimización**: no bloquea, mejora UX o métricas.

---

## 1. Negocio / Producto / Dominio tributario

*Interlocutores sugeridos*: product owner ARBA, referentes funcionales IIBB, implementadores legacy con conocimiento de dominio.

### 🔴 N1. ¿Qué actividades están alcanzadas por la DDJJ simplificada? (ref P1.1)
- ¿Existe una lista definida por negocio (whitelist NAIIBB) o lo inferimos por reglas (mono-actividad + sin tratamientos especiales)?
- Si es whitelist: ¿cuáles son esos códigos? ¿está versionada?
- Si es por reglas: ¿qué reglas exactas? (sugerencia: `tipoHost != nominal` AND `codigoTratamientoFiscal == 0` AND `regimen != CM`).
- **Impacto**: si son reglas, van al backend; si es lista corta, puede vivir en config de Windmill.

### 🔴 N2. ¿La alícuota depende del ingreso del año anterior para alguna actividad candidata? (ref P1.2)
- ¿Existen actividades "nominales" donde la alícuota cambia por rango de ingresos?
- Si sí, ¿están excluidas del fast-path? (propuesta: sí).

### 🔴 N3. Convenio Multilateral vs Local (ref P1.5)
- Confirmar que v1 es **solo contribuyentes LOCAL**.
- ¿Cómo detectamos de forma confiable `regimen=LOCAL` vs `regimen=CM`? ¿Es una columna en padrón ARBA o hay que consultar a AFIP?

### 🔴 N4. Ventana de elegibilidad (ref P1.4)
- Confirmar 3 meses vs otra ventana. ¿O es mejor "año fiscal corriente"?
- ¿Se cuentan meses calendario o meses con actividad declarada?
- ¿Qué pasa con contribuyentes que recién arrancan y no tienen historial?

### 🟡 N5. Régimen bimestral (ref P1.3)
- ¿Está activo el régimen bimestral en producción actualmente?
- Si no lo está, podemos ignorarlo. Si sí, ¿qué tipos de contribuyente lo usan?
- Propuesta v1: solo mensual.

### 🟡 N6. Cooperativa de trabajo
- Asumimos que queda fuera (lógica de `seteoCalculoExentoCoopT` es específica). Confirmar.
- ¿Hay muchos contribuyentes en esta categoría? (para dimensionar el fallback).

### 🟡 N7. Deducciones precargadas, ¿son la fuente de verdad?
- Si DFE/host no tienen todas las deducciones (ej: retención bancaria tardía), ¿permitimos que el usuario cierre con deducciones parciales?
- ¿Cómo lo hace hoy legacy? (Creo que también cierra con lo que tiene).

**✅ Respuesta (análisis código legacy):**
- Legacy **sí permite cerrar con deducciones parciales**. Al iniciar la DJ, precarga deducciones desde DFE + Host + AR y persiste un snapshot en Oracle. Al cerrar (`CerrarDJAction.validacionesCierre`), **no recarga deducciones externas**; usa exclusivamente las persistidas.
- **Carga parcial (`esCargaParcial`)**: si falla la inserción en Oracle de alguna deducción (no porque falte en DFE/Host), el sistema registra el error pero continúa. Es tolerancia a errores de persistencia, no a datos faltantes.
- **Implicancia API DDJJ Simple**: para v1 (sin carga manual de deducciones), la precarga en `/preview` es suficiente. Legacy demuestra que cerrar con el snapshot precargado es aceptable. No se requiere recarga automática antes del cierre.

### 🟡 N8. SAF (saldo a favor) precargado
- ¿Siempre viene precargado de la DJ anterior o hay casos donde hay que re-calcular? (`setearSaldosSAFDJAnterior`).

**✅ Respuesta (análisis código legacy):**
- `Facade.setearSaldosSAFDJAnterior()` (`Facade.java:1233`) busca la **última DJ cerrada** del contribuyente (`obtenerUltimaDJCerrada`).
- Si la liquidación de esa DJ anterior tiene saldo negativo (`getSaldo() < 0`), lo toma como SAF: `djOracle.getLiquidacionDTO().getSaldo().abs()`.
- Setea `importeSAFAnterior` y `fechaSAFAnterior` (fecha de cierre web de la DJ anterior).
- Si no hay DJ anterior cerrada o el saldo no es negativo → `importeSAFAnterior = 0.00`.
- **Para DDJJ Simple**: el SAF debe precargarse en `/preview` igual que legacy, tomando la última DJ cerrada del contribuyente. No requiere recálculo por parte del usuario.

### 🟡 N9. COPRET (crédito fiscal)
- ¿Aplica a todos los contribuyentes elegibles o solo a algunos? ¿Requiere alguna declaración previa?

### 🟢 N10. Mensajes "no elegible" (ref P3.10)
- ¿Qué texto exacto mostrar por cada motivo? (`MULTIPLES_ACTIVIDADES`, `TRATAMIENTO_FISCAL_ESPECIAL`, etc.).

### 🟢 N11. Notificación email del comprobante (ref P3.12)
- ¿Es necesario mandar notificacion o es suficiente con el comprobante en pantalla? - hoy en dia creo que no, al menos no vi referencias en el codigo

**✅ Respuesta (análisis código legacy):**
- Legacy **no envía email automático** al cerrar DJ. Existe un sistema externo `WebMailer` (`X_SERVICIO_MAIL` / `WEBMAILER`) pero se invoca manualmente desde el menú "Enviar mail", no automáticamente, se usa para contacto no para notificaciones de presentación.
- **Propuesta**: para v1, comprobante en pantalla + descarga PDF es suficiente. Email opcional como mejora futura.

### 🟢 N12. Comportamiento con períodos previos faltantes (alt 1/2/3)
- Se propuso **Alt 2** (permitir continuar con alerta). Validar con negocio si legalmente es aceptable que alguien presente febrero sin haber presentado enero.

---

## 2. Equipo legacy IBPresentaciones

*Interlocutores sugeridos*: devs que mantienen el WAR IBPresentaciones, arquitectos Java.

### 🔴 L1. ¿Cómo marcamos el "canal de origen" de un `Dj`? (ref P2.6)
- ¿Podemos agregar columna `CANAL_ORIGEN VARCHAR2(20)` a la tabla de cabecera (`CABECERA_DJ` o equivalente)?
- Si no, ¿usamos tabla auxiliar `DDJJ_CANAL_METADATA`?
- ¿Qué impacto tiene en reportes / views existentes?

**✅ Respuesta (análisis código legacy):**
- `X_ORIGEN_DJ` existe con valores: `'O'` = Oracle/Web iniciada, `'H'` = Host consulta, `'M'` = Migrada. Indica **de dónde vino la DJ**, no el canal frontend.
- **Opción recomendada**: reusar `X_ORIGEN_DJ` con nuevo valor `'S'` (Simple/API). Los checks Java (`isOrigenHost()`, `isOrigenMigrada()`) solo actúan sobre `'H'` y `'M'`; todo lo demás cae en el camino Oracle/Web. Riesgo mínimo en Java, pero **requiere auditar SPs/views en Oracle** con `DECODE`/`CASE` sobre `X_ORIGEN_DJ`.
- Alternativa más segura: nueva columna `CANAL_ORIGEN VARCHAR2(20)`.

### 🔴 L2. `rolOpcionMenu` necesario (ref P2.7)
- ¿Cuál es el `rolOpcionMenu` que deben usar los endpoints REST para invocar rutinas Natural?
- ¿Hay un rol "genérico" por tipo de usuario o depende del tenant?
- ¿Cómo lo mapeamos desde los `permissions` del JWT?

**✅ Respuesta (análisis código legacy):**
- `RolOpcionMenuFilter` obtiene el rol desde `SingletonMenuRoles` basado en la **URL del action + perfiles del usuario**. Legacy usa roles diferenciados para compensaciones, servicios y DDJJ normal.
- Para la API REST sin sesión web, esto se simplifica: se puede definir un **rol genérico fijo** (ej. `IBDDJJ_Presentacion`) para todas las llamadas a Host desde el nuevo servlet. No requiere mapeo dinámico desde JWT `permissions`.
- La autenticación SSO (cookie/JWT ARBA) se puede reusar; el backend construye `UsuarioDTO` igual que `getUsuarioLog()`.

### 🔴 L3. Framework REST a usar — **RESUELTO técnicamente, pendiente validación del equipo**
- **Finding**: `@c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/pom.xml:281-285` ya tiene `spring-webmvc 4.3.9` + Jackson 2.4.1 (`:307-316`). El `ContextLoaderListener` de Spring ya está cargado (`web.xml:53-55`). Struts 1.1 atiende SOLO `*.do` (`web.xml:114-117`), por lo que **Struts y REST pueden coexistir**.
- **Propuesta**: usar **Spring MVC** con un segundo `DispatcherServlet` mapeado a `/api/v1/*`. Cero dependencias nuevas. Controllers con `@RestController` inyectando `Facade` existente por `@Autowired`.
- Alternativas descartadas:
  1. ~~Jersey~~: requiere JARs adicionales + glue `jersey-spring3` sin ganancia frente a Spring MVC.
  2. ~~HttpServlet plano~~: verboso, obliga a resolver DI a mano vía `WebApplicationContextUtils`.
- **Pregunta concreta al equipo**: ¿hay algún motivo arquitectónico / histórico para NO agregar un segundo `DispatcherServlet`? ¿Algún deploy constraint que prefiera HttpServlet plano?

### 🔴 L12. Integración del REST con `LoginFilter` existente
- `@c:/Users/milton.sosa/sistemas/IBPresentaciones/IBPresentaciones/src/main/webapp/WEB-INF/web.xml:17-40` aplica `LoginFilter` (de `weblib 1.0.87` ARBA) a `/*` → **también interceptaría `/api/v1/*`**.
- Dos opciones:
  - **a)** Excluir `/api/v1/*` del `LoginFilter` y colocar un filtro propio que valide JWT Keycloak.
  - **b)** Si el `LoginFilter` actual ya entiende JWT/SSO moderno (Weblib puede haberse actualizado), reusarlo → menos código pero acoplamiento al weblib.

**✅ Respuesta (análisis código legacy):**
- **No existe `LoginFilter`** en el código fuente de IBPresentaciones. La autenticación la maneja `SessionFilter`, que:
  1. Si no hay usuario en sesión (`usuario == null`): redirige a `/welcome.do` (login).
  2. Si la URL empieza con `/servicios` o `/compensaciones`: construye `UsuarioDTO` vía `getFacade().getUsuarioLog(request, contextoOperacion)` y permite continuar **sin sesión web tradicional**.
- **Implicancia**: para `/api/v1/*`, el patrón `/servicios` ya demuestra que IBPresentaciones acepta llamadas "sin sesión web". Se puede agregar el patrón `/api/v1/*` a `SessionFilter` o crear un filter propio que lea JWT SSO y construya `UsuarioDTO`, replicando la lógica de `getUsuarioLog()`.

### 🟡 L13. Compatibilidad Java 7
- `pom.xml:5` → `java.version = 1.7`. Librerías modernas que requieran Java 8+ (ej. `jjwt 0.11+`, `jackson 2.12+`) no sirven sin actualizar el compilador.
- Sugerido para JWT: `io.jsonwebtoken:jjwt:0.9.1` o `com.auth0:java-jwt:3.19.x`.
- **Pregunta al equipo**: ¿hay roadmap para mover a Java 8+? De ser así, simplificaría muchas dependencias modernas.

### 🟡 L4. Reuso de `Facade` vs capa nueva
- ¿El REST puede invocar directamente `Facade` o necesita una fachada propia para evitar contaminar con cosas request-scoped?
- ¿Hay state compartido en `HttpSession` que rompe si no se lo provee?

**✅ Respuesta (análisis código legacy):**
- `Facade` es un singleton Spring (`@Service`) inyectado en los Actions. Sus métodos reciben `HttpServletRequest` y `UsuarioDTO` como parámetros, pero **no mantienen estado de sesión** internamente (el `Dj` se pasa explícitamente).
- Para REST, se puede inyectar `Facade` por `@Autowired` y construir `UsuarioDTO` desde el JWT/cookie SSO. No se requiere `HttpSession`.
- **Cuidado**: algunos métodos (ej. `mergeActividades`) reciben `rolOpcionMenu` desde sesión; en REST hay que pasarlo explícitamente o usar valor por defecto.

### 🟡 L5. Subtipo de gestión nuevo
- ¿Cómo se agrega `SUBTIPO_OPERACION_DDJJ_SIMPLE` a `ConstantesAplicacion` y al catálogo de gestión?
- ¿Requiere migración/seed en alguna tabla de tipos?

**✅ Respuesta (análisis código legacy):**
- Los subtipos son constantes Java (`ConstantesAplicacion.java:23-117`) usadas para auditoría de gestión. Ej: `SUBTIPO_OPERACION_INICIO_DJ = 45`, `SUBTIPO_OPERACION_CIERRE = 57`.
- **No requieren seed en base**; el campo en la tabla de gestión es numérico libre.
- Para distinguir operaciones del flujo Simple, se puede agregar un nuevo subtipo (ej. `100`). Es trivial: solo agregar constante Java. Si no, se reusan los existentes (`45`, `57`).

### 🟡 L6. Compatibilidad con `existeDJ(dj, "xPeriodo")`
- Si dos canales (legacy + simple) intentan insertar cabecera en paralelo, ¿hay lock o simplemente gana el primero?
- ¿La unique constraint es `(cuit, periodo, rectificativa)`?

**✅ Respuesta (análisis código legacy):**
- `Facade.importarYPersistirDJDelOracle()` invoca `this.existeDJ(dj, "xPeriodo")` **antes de insertar**. Si ya existe, lanza `DdjjExistenteException`.
- No hay lock explícito; gana el primero que logra insertar. El segundo recibe la excepción.
- Unique constraint en Oracle: inferido de la lógica, probablemente `(CUIT, N_PERIODO, N_ANIO, N_RECTIFICATIVA)`.

### 🟡 L7. `PDFManager` para comprobante (ref D17)
- ¿`PDFManager` puede invocarse fuera del contexto Struts (sin `ActionForward`)?
- ¿Qué dependencias tiene (templates, fonts, logos)?
- ¿Es thread-safe para servir desde REST concurrente?

**✅ Respuesta (análisis código legacy):**
- Sí, `PDFManager` es independiente de Struts. Recibe `Dj` por parámetro y retorna `byte[]`. No depende de `ActionForward` ni `HttpSession`.
- **Dependencias**: `pdflib` (comercial, en `weblib.pom`), fonts Helvetica embebidos, logo/código de barras vía `ar.gov.gba.ec.barcode.CodigoBarras`.
- **Thread-safe**: Sí. Es stateless; cada método crea `new pdflib()` localmente.
- **Desde REST**: invocable directamente pasando `Dj` poblado. No requiere contexto Struts.

### 🟡 L8. Manejo de transacciones
- Actualmente `Facade.importarYPersistirDJDelOracle` está anotada con `@Transactional`. ¿La nueva llamada desde REST respeta el mismo propagation?
- ¿Qué pasa si `cerrarDJ` host falla después del commit de Oracle? ¿Compensación manual?

**✅ Respuesta (análisis código legacy):**
- Legacy tiene **dos modos de cierre**, controlados por parámetro `PARAM_CIERRE_SINCRONIZADO` (`CerrarDJAction.java:224-238`):
  1. **Modo 2 transacciones** (`cerrarEn2Transacciones`): primero `cerrarDJEnOracle()` (commit propio), luego `cerrarDJ()` en Host. Si Host falla después del commit Oracle, **queda inconsistencia** — DJ cerrada en Oracle pero no en Host.
  2. **Modo sincronizado** (`cerrarDJEnOracleyHost`): Oracle + Host dentro de una misma `@Transactional` (`Facade.java:1966`). Si Host falla, Spring hace rollback de Oracle. **PERO** hay un `//TODO` en el catch (`Facade.java:1999`) que indica que en ciertos errores de Host (código 57, rectificativa ya procesada) se comentó el rollback para "grabar el error de alguna forma". Esto significa que **legacy NO tiene compensación automática robusta**.
- **Implicancia API**: para v1, se recomienda usar el modo sincronizado (una sola `@Transactional` que cubra Oracle + Host). Si Host falla, Spring hace rollback de Oracle. El riesgo de inconsistencia es el mismo que legacy hoy. Compensación manual requerida solo si se opta por commit Oracle anticipado.

### 🟢 L9. Logs/auditoría: integración con sistema existente
- ¿Hay un sistema de logs centralizado (ELK, Splunk)? ¿Cómo logueamos desde el nuevo servlet para mantener consistencia?

**✅ Respuesta (análisis weblib.pom):**
- Logging legacy usa **log4j 1.2.17** + `ar.gov.arba:logSeguridad:20180712` (wrapper ARBA para auditoría de seguridad/gestión).
- El nuevo servlet puede usar el mismo esquema (Log4j 1.x + `logSeguridad`) para mantener consistencia con trazas de gestión existentes. No se detecta ELK/Splunk en dependencias; probablemente hay forwarder externo sobre archivos de log.
- **Alternativa moderna**: si se introduce SLF4J/Logback, verificar compatibilidad con `logSeguridad`.

---

## 3. Seguridad / SSO

*Interlocutores sugeridos*: equipo de seguridad ARBA, admins de Keycloak.

### 🔴 S1. JWKS del SSO Keycloak (ref P2.8)
- ¿Cuál es la URL del JWKS del realm ARBA?
- ¿Hay un clientId específico que debamos pedir para este servicio?
- ¿Formato de los claims estándar (OIDC) o custom?

**✅ Respuesta (análisis código legacy):**
- **Escenario A — Cookie SSO compartida (mismo dominio o subdominio con `Domain=.arba.gov.ar`)**: no aplica. La cookie de sesión ARBA viaja automáticamente. `SessionFilter` detecta `usuario != null` y construye `UsuarioDTO`. No se necesita JWT ni JWKS.
- **Escenario B — Cookie no compartida o dominio distinto**: si la cookie del SSO no llega al backend (ej. frontend en `forms.arba.gov.ar` con cookie específica de dominio, o Windmill/Vercel): sí se requiere JWKS, clientId y validación OIDC. **Pregunta clave al equipo de seguridad**: ¿la cookie de sesión ARBA se setea con `Domain=.arba.gov.ar` o con dominio específico de cada aplicación?

### 🔴 S2. Claims disponibles en el JWT
- `identifier` = CUIT (ya confirmado en el código existente de Windmill).
- `permissions` = array de roles. ¿Formato exacto? ¿Hay un rol específico para "IIBB contribuyente"?
- `fullname`, `email`. ¿Son siempre poblados?

**✅ Respuesta (análisis código legacy):**
- **Escenario A — Cookie SSO compartida**: no aplica. Los datos del usuario (CUIT, nombre, mail) se obtienen de `ContextoLoginWeb` en sesión vía `getUsuarioLog()`. No se usa JWT.
- **Escenario B — JWT explícito**: el token debe contener al menos `identifier` (CUIT). Para auditoría/riesgo, también `fullname` y `email`. Los `permissions` solo serían necesarios si el backend requiere autorización por rol; para DDJJ Simple, el rol puede ser fijo genérico (`IBDDJJ_Presentacion`).

### 🔴 S3. Validación de firma y expiración
- ¿Qué algoritmo (RS256, ES256)?
- ¿Rotación de claves? ¿Caché de JWKS cuánto tiempo?
- ¿Refresh tokens soportados o solo access tokens?

**✅ Respuesta (análisis código legacy):**
- **Escenario A — Cookie SSO compartida**: no aplica. La validación la hace el SSO ARBA (cookie de sesión). `SessionFilter` solo verifica que `usuario != null`.
- **Escenario B — JWT explícito**: se requiere validar firma (algoritmo según JWKS del SSO ARBA), expiración (`exp`), y eventualmente rotación de claves. Si el frontend es SPA sin backend propio, el JWT se envía desde el browser. Si hay backend intermedio (Windmill), puede hacer proxy o generar token intermedio.

### 🟡 S4. Forward del JWT Windmill → IBPresentaciones
- ¿El JWT del usuario final se puede reenviar tal cual, o se genera uno intermedio?
- ¿Hay riesgo de replay si el JWT pasa por logs?

**✅ Respuesta (análisis código legacy):**
- **Escenario A — Cookie SSO compartida**: no aplica. No hay JWT que reenviar; la cookie fluye automáticamente del browser al backend.
- **Escenario B — JWT explícito**: si Windmill (o el frontend) actúa como proxy, puede reenviar el JWT del usuario tal cual al backend IBPresentaciones, o generar un token intermedio de servicio a servicio. Reenviar el JWT del usuario es más simple pero implica que IBPresentaciones debe validarlo (requiere JWKS). Generar token intermedio añade complejidad pero desacopla. **Riesgo de replay**: mitigable evitando loguear el header `Authorization` en proxies/ALBs.

### 🟡 S5. Rate limiting y anti-abuso
- ¿Aplicamos rate limit por CUIT en los endpoints REST?
- ¿Detección de intentos de cierre repetido (protección contra idempotencia incorrecta)?

### 🟡 S6. Auditoría de seguridad
- ¿Logueamos intentos de elegibilidad fallidos? ¿Solo los éxitos?
- Cumplimiento: ¿hay requisitos de retención de logs por LGPD/equivalente ARBA?

### 🟢 S7. CORS
- Dominio del frontend nuevo. ¿Mismo dominio que legacy o subdominio?
- Si es cross-origin, lista de orígenes permitidos.

### 🟢 S8. Headers de seguridad
- CSP, X-Frame-Options, etc. para las nuevas respuestas.

---

## 4. DBA / Base de Datos Oracle

*Interlocutores sugeridos*: DBA ARBA, owners de los esquemas Oracle de IBPresentaciones.

### 🔴 D1. ¿Se aprueba agregar columna `CANAL_ORIGEN` a la cabecera `Dj`? (ref L1)
- Tipo propuesto: `VARCHAR2(20) DEFAULT 'LEGACY' NOT NULL`.
- Valores: `LEGACY | SIMPLE | API`.
- Impacto en views, reportes, ETL.

**✅ Respuesta (análisis código legacy — ver L1):**
- `X_ORIGEN_DJ` existe con valores `'O'` (Oracle/Web), `'H'` (Host), `'M'` (Migrada). Indica de dónde vino la DJ, no el canal frontend.
- **Opción recomendada**: reusar `X_ORIGEN_DJ` con nuevo valor `'S'` (Simple/API). Los checks Java solo actúan sobre `'H'` y `'M'`; todo lo demás cae en camino Oracle/Web. Riesgo mínimo en Java, pero **requiere auditar SPs/views en Oracle** con `DECODE`/`CASE` sobre `X_ORIGEN_DJ`.
- Alternativa más segura: nueva columna `CANAL_ORIGEN VARCHAR2(20)`.

### 🔴 D2. Alternativa: tabla auxiliar
- Si no se aprueba D1/D1-bis, ¿se aprueba `DDJJ_CANAL_METADATA(nro_comprobante FK, canal, timestamp_creacion, usuario_canal)`?

**✅ Respuesta:**
- Si no se puede tocar `X_ORIGEN_DJ` ni agregar `CANAL_ORIGEN`, tabla auxiliar es viable pero añade JOIN en consultas. Para v1, reusar `X_ORIGEN_DJ` con `'S'` es el camino más simple.

### 🟡 D3. Performance del endpoint de elegibilidad
- `getActividadesDJ_HOST` es costoso (llamada Natural). ¿Podemos cachear resultados por CUIT/mes en Oracle?
- ¿Cuánto tarda hoy la consulta de "últimos N períodos" vía `getDDJJConDeuda`?

**✅ Respuesta (análisis código legacy):**
- `getActividadesDJ_HOST` (`HostDAO.java`) invoca rutina Natural `IBWNACTC` pasando `anio` y `periodo`. Es llamada síncrona al mainframe; latencia depende de carga del Host.
- `getDDJJConDeuda` consulta Oracle (no Host) para obtener últimos N períodos con deuda. Performance depende de índices sobre `CABECERA` (ver D4).
- **Cache en Oracle**: posible pero requiere invalidación cuando el Host actualiza datos. Legacy no cachea actividades; cada DJ las consulta en vivo.
- **Para DDJJ Simple**: dado que el flujo es 1 actividad + sin deducciones manuales, la carga es menor que legacy. La llamada a `IBWNACTC` sigue siendo necesaria para validar elegibilidad (mono-actividad, tratamiento fiscal, etc.).
- **Recomendación**: no cachear en v1. Medir latencia real en staging antes de optimizar.

### 🟡 D4. Índices sobre tabla cabecera
- Para soportar consultas frecuentes por CUIT + período, ¿hay índice adecuado?
- ¿Hace falta agregar alguno para no degradar con el nuevo tráfico?

### 🟡 D5. Backup y ventanas de mantenimiento
- ¿Ventana de mantenimiento conocida? Para avisar en frontend ("DDJJ no disponible entre X y Y").

### 🟡 D6. Secuencia `ID_DJ_FormSecuence`
- ¿Es la única secuencia que usa cabecera? ¿Hay límite de throughput?
- Si múltiples requests concurrentes, ¿genera hot-spot?

**✅ Respuesta (análisis código legacy):**
- Es la **única secuencia** usada para generar `nroComprobante` de DJ iniciadas en Oracle (`Facade.java:2323`: `getConsultasDAO().getID_DJ_FormSecuence()`).
- También se usa para DJ Anual (`Facade.java:2443`) y actividades (`Utils.getNextSecuenciaActividad(dj)`, `Facade.java:435`).
- **Throughput**: no hay límite en código; es secuencia Oracle estándar. Legacy la usa hace años con carga concurrente. No se detecta hot-spot en el código.
- **Implicancia API**: para alta concurrencia, Oracle secuencias soportan `CACHE` y `NOORDER`. El DBA debe verificar configuración actual si se espera pico de tráfico.

### 🟢 D7. Entorno de QA
- ¿Hay un schema QA con datos realistas para testear los casos C1-C9 del roadmap?
- ¿Cómo sembrar datos ficticios?

### 🟢 D8. Purga de pendientes huérfanos
- ¿Hay job batch que limpia `Dj` pendientes viejos? ¿Lo extendemos para pendientes simple?

---

## 5. Infraestructura / DevOps

*Interlocutores sugeridos*: SRE / DevOps ARBA, quien opera los servers de IBPresentaciones y Windmill.

### 🔴 I1. Deploy del WAR con el nuevo servlet
- ¿Cómo se despliega IBPresentaciones hoy? (WebLogic/Tomcat/JBoss/otro).
- ¿Ciclo de deploy (CI/CD, manual, ventana)?
- ¿Podemos hacer hot-reload o requiere restart?

### 🔴 I2. Comunicación Windmill → IBPresentaciones
- ¿Mismo cluster/red, o hay firewalls?
- ¿URL interna o se expone por gateway?
- ¿Certificados mTLS o solo TLS estándar?

### 🔴 I3. Hosting del Frontend Next
- ¿Dónde corre en producción? (Vercel, contenedores ARBA, IIS).
- ¿Cómo resuelve el dominio? ¿Subdominio?

### 🟡 I4. Observabilidad (ref sección Observabilidad del roadmap)
- ¿Hay Prometheus/Grafana/Datadog/otro?
- ¿Cómo exportan métricas las apps Java? (Micrometer, JMX Exporter).

### 🟡 I5. Logs centralizados
- ¿ELK, Splunk, CloudWatch? Formato esperado (JSON estructurado).

**✅ Respuesta (análisis weblib.pom — ver L9):**
- Legacy usa **log4j 1.2.17** + `ar.gov.arba:logSeguridad:20180712`. No se detecta ELK, Splunk, ni CloudWatch en dependencias del WAR.
- Probablemente hay un **forwarder externo** (agente en servidor o ALB) que lee los archivos de log de disco y los envía a una plataforma centralizada. Este es un patrón común en aplicaciones Java legacy.
- **Formato**: log4j 1.x usa formato de texto plano configurable por `PatternLayout`. No es JSON estructurado nativo.
- **Implicancia**: para observabilidad moderna, se puede agregar un appender JSON (requiere librería adicional compatible con Java 7) o mantener formato texto y dejar que el forwarder/Logstash lo parseé.

### 🟡 I6. Feature flags
- ¿Hay un sistema de feature flags ya en uso (Unleash, LaunchDarkly, config propia)?
- O implementamos con tabla Oracle + caché.

### 🟡 I7. Secrets management
- JWKS URL, conexión Oracle, etc.: ¿Vault, env vars, archivo? ¿Quién administra?

### 🟢 I8. Variables de entorno Windmill
- `ibpresentaciones_base_url` como variable. ¿Quién la setea en staging vs prod?

### 🟢 I9. Disaster recovery
- Si IBPresentaciones cae, ¿el nuevo frontend muestra mensaje de mantenimiento automático?

### 🟢 I10. Monitoreo del host mainframe
- ¿Hay alertas existentes cuando Natural/Adabas cae? ¿Las reusamos?

---

## 6. Frontend / UX

*Interlocutores sugeridos*: diseñador/a UX, PM, equipo frontend Next.

### 🔴 F1. Wireframes / Figma definitivos
- ¿Hay diseño aprobado para las pantallas: lista de períodos, formulario de monto, confirmación, éxito?
- Pantalla de "no elegible": mockup por cada motivo.

### 🟡 F2. Navegación desde legacy al nuevo flow
- ¿Cómo llega el usuario? ¿Banner en home de legacy? ¿Link directo desde menú?
- ¿Qué URL? ¿Es interno a IBPresentaciones o externo?

### 🟡 F3. Navegación desde nuevo al legacy
- Cuándo mostramos "Ir a la presentación completa": ¿modal, botón inline, página intermedia?
- ¿Qué URL exacta de legacy? (ej: `/IBPresentaciones/preInicioDDJJ.do` vs deep-link con período precargado).

### 🟡 F4. Manejo de estados de carga
- Preview: loader inline vs skeleton.
- Confirmar: loader full-screen con mensaje tranquilizador ("Estamos presentando tu DDJJ ante ARBA...").

### 🟡 F5. Accesibilidad
- ¿Requisitos WCAG? ¿Nivel A, AA, AAA?

### 🟢 F6. Responsive / mobile
- ¿Se espera que el flow funcione en móvil?

### 🟢 F7. Idioma
- Solo español. ¿Alguna variante regional/formal/informal?

---

## 7. Legales / Compliance (si aplica)

*Interlocutores sugeridos*: área legal ARBA, compliance fiscal.

### 🟡 Leg1. Validez jurídica de la DDJJ presentada desde el nuevo canal
- ¿El comprobante generado tiene la misma validez legal que el de legacy?
- ¿Requiere firma electrónica adicional?

### 🟡 Leg2. Aceptación del usuario
- ¿Se requiere un "acepto los términos" antes del cierre?
- ¿Qué texto legal debe aparecer?

### 🟢 Leg3. Retención del comprobante
- ¿El contribuyente debe descargar sí o sí el PDF? ¿O se guarda online y basta con el número de comprobante?

### 🟢 Leg4. Tratamiento de datos personales
- Confirmación de que los datos circulan solo entre sistemas ARBA, nada a terceros.

---

# Resumen: qué destrabo primero

Ordenado por impacto en el cronograma:

1. **Negocio N1, N2, N3, N4** → definen la lógica de elegibilidad; bloquean Fase 2.
2. **Legacy L1, L2, L3** → definen el approach técnico; bloquean Fase 2-3.
3. **Seguridad S1, S2, S3** → bloquean Fase 2.
4. **DBA D1/D2** → bloquean Fase 3.
5. **Infra I1, I2, I3** → bloquean deploy de Fase 2 en ambiente real.

Todo lo 🟡 y 🟢 se puede responder en paralelo a la implementación.
