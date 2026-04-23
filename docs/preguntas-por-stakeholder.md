# Preguntas abiertas por stakeholder

Complemento de `ddjj-simple.md`. Cada pregunta tiene referencia cruzada a los ítems **P1–P3** de la hoja de ruta.

**Cómo usar este doc**:
- Compartir la sección correspondiente a cada stakeholder por separado (no abrumar con lo que no le compete).
- Marcar ✅ cuando se responde, agregar la respuesta debajo de la pregunta.
- Si una respuesta destraba otro ítem, actualizar también `ddjj-simple.md`.

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

### 🟡 N8. SAF (saldo a favor) precargado
- ¿Siempre viene precargado de la DJ anterior o hay casos donde hay que re-calcular? (`setearSaldosSAFDJAnterior`).

### 🟡 N9. COPRET (crédito fiscal)
- ¿Aplica a todos los contribuyentes elegibles o solo a algunos? ¿Requiere alguna declaración previa?

### 🟢 N10. Mensajes "no elegible" (ref P3.10)
- ¿Qué texto exacto mostrar por cada motivo? (`MULTIPLES_ACTIVIDADES`, `TRATAMIENTO_FISCAL_ESPECIAL`, etc.).
- ¿Quién redacta? ¿Producto, comunicación, legales?

### 🟢 N11. Notificación email del comprobante (ref P3.12)
- ¿Se manda mail al cerrar? Legacy actualmente ¿lo hace? ¿Qué plantilla usa?

### 🟢 N12. Criterios de éxito del rollout
- ¿Qué % de adopción esperamos y en qué plazo?
- ¿Qué tasa de fallback a legacy es aceptable (ej: <15%)?
- ¿Medimos NPS post-cierre?

### 🟢 N13. Comportamiento con períodos previos faltantes (alt 1/2/3)
- Se propuso **Alt 2** (permitir continuar con alerta). Validar con negocio si legalmente es aceptable que alguien presente febrero sin haber presentado enero.

---

## 2. Equipo legacy IBPresentaciones

*Interlocutores sugeridos*: devs que mantienen el WAR IBPresentaciones, arquitectos Java.

### 🔴 L1. ¿Cómo marcamos el "canal de origen" de un `Dj`? (ref P2.6)
- ¿Podemos agregar columna `CANAL_ORIGEN VARCHAR2(20)` a la tabla de cabecera (`CABECERA_DJ` o equivalente)?
- Si no, ¿usamos tabla auxiliar `DDJJ_CANAL_METADATA`?
- ¿Qué impacto tiene en reportes / views existentes?

### 🔴 L2. `rolOpcionMenu` necesario (ref P2.7)
- ¿Cuál es el `rolOpcionMenu` que deben usar los endpoints REST para invocar rutinas Natural?
- ¿Hay un rol "genérico" por tipo de usuario o depende del tenant?
- ¿Cómo lo mapeamos desde los `permissions` del JWT?

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
- **Pregunta al equipo**: ¿qué hace `LoginFilter` actualmente? ¿Lee cookie de sesión ARBA o valida token? ¿Conviene opción (a) o (b)?

### 🟡 L13. Compatibilidad Java 7
- `pom.xml:5` → `java.version = 1.7`. Librerías modernas que requieran Java 8+ (ej. `jjwt 0.11+`, `jackson 2.12+`) no sirven sin actualizar el compilador.
- Sugerido para JWT: `io.jsonwebtoken:jjwt:0.9.1` o `com.auth0:java-jwt:3.19.x`.
- **Pregunta al equipo**: ¿hay roadmap para mover a Java 8+? De ser así, simplificaría muchas dependencias modernas.

### 🟡 L4. Reuso de `Facade` vs capa nueva
- ¿El REST puede invocar directamente `Facade` o necesita una fachada propia para evitar contaminar con cosas request-scoped?
- ¿Hay state compartido en `HttpSession` que rompe si no se lo provee?

### 🟡 L5. Subtipo de gestión nuevo
- ¿Cómo se agrega `SUBTIPO_OPERACION_DDJJ_SIMPLE` a `ConstantesAplicacion` y al catálogo de gestión?
- ¿Requiere migración/seed en alguna tabla de tipos?

### 🟡 L6. Compatibilidad con `existeDJ(dj, "xPeriodo")`
- Si dos canales (legacy + simple) intentan insertar cabecera en paralelo, ¿hay lock o simplemente gana el primero?
- ¿La unique constraint es `(cuit, periodo, rectificativa)`?

### 🟡 L7. `PDFManager` para comprobante (ref D17)
- ¿`PDFManager` puede invocarse fuera del contexto Struts (sin `ActionForward`)?
- ¿Qué dependencias tiene (templates, fonts, logos)?
- ¿Es thread-safe para servir desde REST concurrente?

### 🟡 L8. Manejo de transacciones
- Actualmente `Facade.importarYPersistirDJDelOracle` está anotada con `@Transactional`. ¿La nueva llamada desde REST respeta el mismo propagation?
- ¿Qué pasa si `cerrarDJ` host falla después del commit de Oracle? ¿Compensación manual?

### 🟢 L9. Logs/auditoría: integración con sistema existente
- ¿Hay un sistema de logs centralizado (ELK, Splunk)? ¿Cómo logueamos desde el nuevo servlet para mantener consistencia?

### 🟢 L10. Versionado de la API
- `/api/v1/*`. ¿Política de deprecación si cambia contrato? ¿Quién decide v2?

### 🟢 L11. Diagrama entidad-relación DDJJ
- ¿Hay un ERD vigente de las tablas `CABECERA_DJ`, `ACTIVIDAD_DJ`, `ALICUOTA_DJ`, `DEDUCCION_*`?
- Útil para el mapeo Frontend → Dj legacy.

---

## 3. Seguridad / SSO

*Interlocutores sugeridos*: equipo de seguridad ARBA, admins de Keycloak.

### 🔴 S1. JWKS del SSO Keycloak (ref P2.8)
- ¿Cuál es la URL del JWKS del realm ARBA?
- ¿Hay un clientId específico que debamos pedir para este servicio?
- ¿Formato de los claims estándar (OIDC) o custom?

### 🔴 S2. Claims disponibles en el JWT
- `identifier` = CUIT (ya confirmado en el código existente de Windmill).
- `permissions` = array de roles. ¿Formato exacto? ¿Hay un rol específico para "IIBB contribuyente"?
- `fullname`, `email`. ¿Son siempre poblados?

### 🔴 S3. Validación de firma y expiración
- ¿Qué algoritmo (RS256, ES256)?
- ¿Rotación de claves? ¿Caché de JWKS cuánto tiempo?
- ¿Refresh tokens soportados o solo access tokens?

### 🟡 S4. Forward del JWT Windmill → IBPresentaciones
- ¿El JWT del usuario final se puede reenviar tal cual, o se genera uno intermedio?
- ¿Hay riesgo de replay si el JWT pasa por logs?

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

### 🔴 D2. Alternativa: tabla auxiliar
- Si no se aprueba D1, ¿se aprueba `DDJJ_CANAL_METADATA(nro_comprobante FK, canal, timestamp_creacion, usuario_canal)`?

### 🟡 D3. Performance del endpoint de elegibilidad
- `getActividadesDJ_HOST` es costoso (llamada Natural). ¿Podemos cachear resultados por CUIT/mes en Oracle?
- ¿Cuánto tarda hoy la consulta de "últimos N períodos" vía `getDDJJConDeuda`?

### 🟡 D4. Índices sobre tabla cabecera
- Para soportar consultas frecuentes por CUIT + período, ¿hay índice adecuado?
- ¿Hace falta agregar alguno para no degradar con el nuevo tráfico?

### 🟡 D5. Backup y ventanas de mantenimiento
- ¿Ventana de mantenimiento conocida? Para avisar en frontend ("DDJJ no disponible entre X y Y").

### 🟡 D6. Secuencia `ID_DJ_FormSecuence`
- ¿Es la única secuencia que usa cabecera? ¿Hay límite de throughput?
- Si múltiples requests concurrentes, ¿genera hot-spot?

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
