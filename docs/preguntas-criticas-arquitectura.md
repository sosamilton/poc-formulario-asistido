# Preguntas Críticas de Arquitectura — DDJJ Simple (Formularios Dinámicos IIBB)

Documento derivado del análisis de `preguntas-por-stakeholder.md`.
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

### 🔴 A2. ¿Dónde corre el frontend nuevo? ¿Mismo dominio que legacy o subdominio/apartado?
- **Impacto**: Si el frontend corre en `ibpresentaciones.arba.gov.ar/simplificado` → cookie fluye, cero cambios de seguridad.
- Si corre en `forms.arba.gov.ar` o Windmill/Vercel → necesitamos saber si la cookie llega o si se usa JWT.
- **Quién responde**: SRE / DevOps / equipo frontend.

### 🟡 A3. ¿IBPresentaciones corre sobre qué servidor de aplicaciones?
- **Impacto**: WebLogic, Tomcat, JBoss, etc. Afecta cómo se deploya el segundo `DispatcherServlet` Spring MVC, hot-reload, y ciclo de deploy.
- **Quién responde**: SRE / DevOps.

### 🟡 A4. ¿Hay roadmap para subir a Java 8+?
- **Impacto**: Hoy es Java 7. Librerías JWT modernas (`jjwt 0.11+`), Jackson 2.12+, y muchas utilidades requieren Java 8+. Si no hay roadmap, nos limita a `jjwt 0.9.1` o `java-jwt 3.19.x`.
- **Quién responde**: arquitectos Java / equipo legacy.

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

### 🟡 A12. ¿Se requiere firma electrónica adicional o aceptación de términos antes del cierre?
- **Impacto**: Si se requiere, el formulario dinámico debe incluir un paso de checkbox legal antes del botón "Confirmar". Si no, el flujo es más simple.
- **Quién responde**: área legal ARBA + compliance fiscal.

---

## 5. Infraestructura y Operación (decide deploy y monitoreo)

### 🔴 A13. ¿Cómo se despliega IBPresentaciones hoy? ¿CI/CD, manual, ventana de mantenimiento?
- **Impacto**: Afecta frecuencia de releases, rollback strategy, y si podemos iterar rápido sobre el servlet REST.
- **Quién responde**: SRE / DevOps.

### 🟡 A14. ¿Windmill y IBPresentaciones están en la misma red/cluster o hay firewalls entre ellos?
- **Impacto**: Si hay firewalls, necesitamos abrir puertos/reglas. Si están en mismo cluster, la latencia es menor y la seguridad de red es más simple.
- **Quién responde**: SRE / DevOps / equipo de red.

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
| 11 | A12 (firma/aceptación términos) | Legal | Define pasos del formulario |
| 12 | A13 (deploy/CI-CD) | Infra | Define velocidad de iteración |
| 13 | A14 (red/firewalls) | Infra | Define conectividad |
| 14 | A4 (Java 8 roadmap) | Java | Define librerías disponibles |

---

## Notas

- Las preguntas resueltas por análisis de código legacy (L1-L9, N7-N11, D3, D6, I5, S1-S4) se omiten de este documento porque ya tienen respuesta técnica verificada.
- Este documento debe revisarse y actualizarse a medida que las respuestas lleguen de los stakeholders.
