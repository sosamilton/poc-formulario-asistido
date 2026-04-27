# Preguntas Críticas de Arquitectura — DDJJ Simple (Formularios Dinámicos IIBB)

Documento derivado del análisis de `preguntas-generales-por-temas.md`.
Solo se incluyen las preguntas cuya respuesta **cambia el diseño o la arquitectura** de la solución. Las resueltas por código legacy se omiten.

---

## Leyenda de impacto arquitectónico

- 🔴 **Decisión de diseño**: define patrón, stack o integración. Sin esto no se puede armar la arquitectura de referencia.
- 🟡 **Restricción**: limita opciones técnicas. Puede bloquear librerías o approaches.
- 🟢 **UX/Frontend**: afecta contrato visual, navegación o experiencia del formulario dinámico.

---

## 1. Seguridad e Integración (decide el stack de autenticación)

### 🔴 A1. ¿La cookie de sesión ARBA se setea con `Domain=.arba.gov.ar`?
- **Impacto**: Si es **SÍ** → Escenario A: cookie fluye automáticamente. No se necesita JWT, JWKS, ni validación de firma en backend. `SessionFilter` + `getUsuarioLog()` es suficiente.
- Si es **NO** (cookie específica por app) → Escenario B: se requiere JWT explícito, validación OIDC, y complejidad en frontend/backend.
- **Quién responde**: equipo de seguridad ARBA / admins de Keycloak.

**✅ Respuesta (análisis código IBPresentaciones / Gestionar):**
- El flujo legacy **usa sesión SSO en servidor** y toma el usuario desde `ContextoLoginWeb` guardado en `HttpSession` bajo `CteClienteSSO.CONTEXTO_LOGIN`.
- En `IBPresentaciones`, `SessionFilter` deja pasar el request, y si no hay `usuario` en sesión pero la URL es de servicios/compensaciones, llama a `Facade.getUsuarioLog()` para reconstruir el `UsuarioDTO` desde el contexto SSO.
- **Implicancia práctica**: si la cookie SSO comparte dominio/path y llega al backend, no hace falta JWT para el flujo legacy. El problema no es el frontend en sí, sino **si la sesión/cookie del navegador viaja al WAR correcto**.
- Para el nuevo frontend y Windmill, la decisión clave sigue siendo: **¿el acceso se hace bajo el mismo dominio y con cookie compartida, o habrá un origen distinto que obligue a token explícito?**

### 🔴 A2. ¿Dónde corre el frontend nuevo? ¿Mismo dominio que legacy o subdominio/apartado?
- **Impacto**: Si el frontend corre en `ibpresentaciones.arba.gov.ar/simplificado` → cookie fluye, cero cambios de seguridad.
- Si corre en `forms.arba.gov.ar` o Windmill → necesitamos saber si la cookie llega o si se usa JWT.
- **Quién responde**: SRE / DevOps / equipo frontend.

**✅ Respuesta (análisis código IBPresentaciones / Gestionar):**
- Si el nuevo frontend vive bajo el **mismo dominio navegable por el browser** que IBPresentaciones, el modelo más simple es reutilizar la sesión/cookie y dejar que el backend arme el usuario desde SSO.
- Si el frontend o Windmill quedan fuera del dominio o no pueden compartir la cookie, entonces el flujo necesita un **token explícito** (JWT/OIDC) o un backend intermedio que actúe como proxy con la identidad del usuario.
- Para decidir bien, no alcanza con saber el dominio: también importa el **path de la cookie** y qué app queda detrás de cada contexto (`/IBPresentaciones`, `/Gestionar`, `/simplificado`, etc.).

### 🟡 A3. ¿IBPresentaciones corre sobre qué servidor de aplicaciones?
- **Impacto**: WebLogic, Tomcat, JBoss, etc. Afecta cómo se deploya el segundo `DispatcherServlet` Spring MVC, hot-reload, y ciclo de deploy.
- **Quién responde**: SRE / DevOps.



---

## 2. Datos y Persistencia (decide el modelo de datos)

### 🔴 A5. ¿Se aprueba reusar `X_ORIGEN_DJ` con valor `'S'` (Simple) o se prefiere nueva columna `CANAL_ORIGEN`?
- **Impacto**: Reusar `'S'` en `X_ORIGEN_DJ` es más rápido (solo constante Java) pero requiere auditar SPs/views Oracle que hagan `DECODE`/`CASE` sobre este campo. Nueva columna es más segura pero requiere DDL + migración + updates en ETL/reportes.
- **Quién responde**: DBA + owners de esquema Oracle + equipo de reportes/ETL.

### 🔴 A6. ¿Se usa modo de cierre sincronizado (`@Transactional` Oracle + Host) o se acepta el riesgo de inconsistencia del modo 2 transacciones?
- **Impacto**: Legacy tiene ambos modos controlados por parámetro. El modo sincronizado usa una sola `@Transactional` con rollback automático si Host falla. El modo 2 transacciones commitea Oracle primero y puede quedar inconsistente si Host falla después.
- **Recomendación técnica**: sincronizado. Pero requiere confirmar que no hay restricción de timeout de transacción en el servidor de aplicaciones.
- **Quién responde**: DBA + arquitectos Java + equipo legacy.

---

## 3. Negocio y Elegibilidad (decide el motor de reglas)

### 🔴 A7. ¿La elegibilidad es por whitelist de actividades (lista fija de códigos NAIIBB) o por reglas (mono-actividad + sin tratamiento fiscal + régimen != CM)?
- **Impacto**: Si es **whitelist** → la lista puede vivir en config de Windmill/frontend y el backend solo valida. Si es **reglas** → el backend necesita lógica de negocio que evalúe actividad, régimen, y tratamiento fiscal en cada request.
- **Quién responde**: product owner + referentes funcionales IIBB.

### 🔴 A7.1. ¿El frontend evalúa elegibilidad via API dedicada (`GET /elegibilidad`) o el backend decide el flujo en un endpoint único (`POST /iniciar`)?
- **Impacto**: Define si el contrato expone una "puerta" explícita que el frontend consulta (Opción A), o si el backend redirige opacamente al legacy (Opción B), o una híbrida donde `/iniciar` devuelve `{modo: SIMPLE|LEGACY, contexto}` (Opción C recomendada). Esto afecta:
  - Complejidad del frontend (¿necesita conocer 5+ motivos de no-elegibilidad?).
  - Seguridad de acceso (¿puede alguien saltarse la puerta y entrar directo al formulario simplificado?).
  - Reutilización futura (¿se necesita un "dashboard de estado" antes de iniciar?).
- **Detalle**: Ver análisis completo de las tres opciones en [`docs/propuesta-flujo-elegibilidad.md`](propuesta-flujo-elegibilidad.md).
- **Quién responde**: product owner + arquitecto frontend + referentes funcionales IIBB.

### 🔴 A8. ¿v1 es solo contribuyentes LOCAL? ¿Cómo detectamos `regimen=LOCAL` vs `regimen=CM`?
- **Impacto**: Si v1 excluye CM, el endpoint `/elegibilidad` debe filtrar antes de consultar al Host. Necesitamos saber si el padrón ARBA tiene esta columna o si hay que consultar AFIP/Host.
- **Quién responde**: referentes funcionales IIBB + DBA (estructura del padrón).

### 🔴 A9. ¿Cuál es la ventana de elegibilidad exacta? ¿3 meses calendario? ¿Año fiscal corriente? ¿Meses con actividad declarada?
- **Impacto**: Define la query de "últimos N períodos" y el criterio de "periodos previos faltantes". Afecta el endpoint `/elegibilidad` y la pantalla de lista de períodos.
- **Quién responde**: product owner + referentes funcionales IIBB.

---

## 4. Frontend y Formularios Dinámicos (decide UX y contratos)

### 🔴 A10. ¿Hay wireframes/Figma aprobados para: lista de períodos, formulario de monto, confirmación, éxito, y pantallas de "no elegible"?
- **Impacto**: Sin diseño aprobado no se puede definir el contrato visual ni los estados del formulario dinámico. Cada pantalla de "no elegible" por motivo (`MULTIPLES_ACTIVIDADES`, `TRATAMIENTO_FISCAL_ESPECIAL`, etc.) necesita su propio mockup y mensaje.
- **Quién responde**: diseñador/a UX + PM.

### 🔴 A11. ¿Cómo llega el usuario al nuevo flujo desde legacy? ¿Banner, link directo desde menú, URL específica?
- **Impacto**: Define la navegación entre sistemas, SEO, y si necesitamos deep-link con parámetros (ej. período precargado). Si el acceso es por URL tipo `/simplificado`, hay que definir si es interno al WAR de IBPresentaciones o externo.
- **Quién responde**: PM + equipo frontend + equipo legacy.

---

## Resumen: decisiones que desbloquean la arquitectura

| Orden | Pregunta | Área | Impacto |
|---|---|---|---|
| 1 | A1 (cookie `Domain`) | Seguridad | Define todo el stack de auth |
| 2 | A7 (elegibilidad: whitelist vs reglas) | Negocio | Define el motor de reglas |
| 3 | A5 (`X_ORIGEN_DJ` vs nueva columna) | DBA | Define modelo de datos |
| 4 | A10 (wireframes aprobados) | UX | Define contrato visual |
| 5 | A2 (dominio del frontend) | Infra | Define si necesitamos JWT |
| 6 | A8 (LOCAL vs CM) | Negocio | Define scope de v1 |
| 7 | A9 (ventana de elegibilidad) | Negocio | Define lógica de períodos |
| 8 | A3 (servidor de aplicaciones) | Infra | Define deploy y constraints |
| 9 | A6 (modo de cierre) | DBA + Java | Define consistencia transaccional |
| 10 | A11 (navegación legacy → nuevo) | UX + Frontend | Define integración de flujos |
| 11 | A7.1 (elegibilidad: /elegibilidad vs /iniciar) | Arquitectura | Define quién decide el flujo y cómo |
| 12 | A4 (Java 8 roadmap) | Java | Define librerías disponibles |

---

## Preguntas pendientes de diseño/integración (no incluidas aún)

Las siguientes preguntas pueden ser críticas pero necesitan validación de impacto arquitectónico real:

| Pregunta | Área | Por qué podría ser crítica |
|---|---|---|
| **A15. ¿El frontend nuevo consume el API REST directamente o via Windmill (proxy/flows)?** | Frontend + Windmill | Define si Windmill es solo backend de forms o también API gateway. Afecta latencia, seguridad (key management), y si el frontend necesita manejo de errores de red. |
| **A16. ¿El API REST debe soportar CORS?** | Seguridad + Infra | Si el frontend corre en dominio separado, necesitamos CORS o proxy reverso. Esto impacta configuración de servidor y seguridad. |
| **A17. ¿Se necesita rate limiting o throttling en el API REST?** | Seguridad | Si el API es público (JWT sin sesión), podría requerir rate limiting por CUIT o IP. Impacta librerías/infraestructura. |
| **A18. ¿El PDF del comprobante se genera en legacy o en el nuevo stack?** | Backend | Si legacy genera PDF, el API solo devuelve URL. Si nuevo stack genera, necesitamos motor de PDF (iText/PDFBox) y acceso a datos de DJ. |
| **A19. ¿Los logs del nuevo API REST se centralizan en ELK/Graylog o se integran a `grabarGestion` legacy?** | Observabilidad | Define si necesitamos librerías de logging distribuido o si usamos el mecanismo existente (`ContextoOperacion`). |
| **A20. ¿Se necesita cacheo de alícuotas o datos de actividad?** | Backend | Si el servicio de alícuotas es lento, podríamos necesitar Redis/ehcache. Impacta dependencias y configuración. |
| **A21. ¿El nuevo flujo convive como una subruta dentro de IBPresentaciones o como una app separada que solo consume el mismo SSO?** | Arquitectura + Seguridad | Define si la convivencia se resuelve con cookie compartida y redirects internos, o con integración por JWT/proxy y CORS. |

Estas preguntas se agregarán al documento solo si se confirma que impactan el diseño o stack.

---

## Notas

- Se eliminaron preguntas no arquitectónicas (A12, A13, A14) que no impactan el diseño o stack de la solución.
- Las preguntas resueltas por análisis de código legacy (L1-L9, N7-N11, D3, D6, I5, S1-S4) se omiten porque ya tienen respuesta técnica verificada.
- Este documento debe revisarse y actualizarse a medida que las respuestas lleguen de los stakeholders.
