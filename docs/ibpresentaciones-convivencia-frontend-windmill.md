# IBPresentaciones + nuevo frontend + Windmill

## Objetivo

Este documento resume **cómo puede convivir IBPresentaciones con el nuevo frontend de presentación y Windmill**, considerando el flujo real de autenticación/autorización observado en el código legacy y las decisiones abiertas en la arquitectura del POC.

La idea es tener una guía práctica para decidir:

- cuándo el nuevo frontend puede vivir dentro del flujo de IBPresentaciones,
- cuándo conviene que Windmill participe,
- cuándo hace falta token explícito o proxy,
- y qué preguntas faltan cerrar para tomar una decisión definitiva.

---

## Punto de partida: cómo funciona hoy IBPresentaciones

En el legacy se ve este patrón:

- `LoginFilter` y `SessionFilter` participan en el flujo de entrada.
- El usuario autenticado se toma desde `CteClienteSSO.CONTEXTO_LOGIN` en `HttpSession`.
- `Facade.getUsuarioLog()` arma el `UsuarioDTO` con CUIT, nombre, perfiles y autorizado si existe.
- `RolOpcionMenuFilter` define el rol operativo según URL y perfiles.
- Hay rutas especiales como `/servicios` y `/compensaciones` que pueden reconstruir usuario desde SSO sin pasar por el flujo web tradicional.

**Conclusión práctica:** el modelo legacy está pensado para **SSO + sesión compartida**. Si la cookie viaja al backend correcto, no hace falta JWT para el caso normal.

---

## Qué queremos resolver

El nuevo frontend de presentación y Windmill pueden convivir con IBPresentaciones de varias formas:

- como una nueva ruta dentro del mismo dominio,
- como una app aparte en el mismo dominio navegable,
- como un frontend separado que llama a IBPresentaciones/Windmill por backend,
- o como un flujo híbrido donde el nuevo frontend solo atiende casos simples y legacy sigue siendo fallback.

La elección depende sobre todo de:

- si la cookie SSO comparte dominio y path,
- si el frontend nuevo corre dentro del mismo sitio o en otro origen,
- si Windmill actúa solo como orquestador o también como gateway,
- y si el flujo simplificado debe coexistir con el wizard legacy o reemplazarlo gradualmente.

---

## Opciones de convivencia

### Opción 1 — Nuevo flujo como subruta dentro de IBPresentaciones

#### Cómo funcionaría

- El usuario entra desde IBPresentaciones.
- El backend decide si puede ir al flujo simplificado.
- Si aplica, redirige a una ruta como `/simplificado` dentro del mismo contexto.
- El frontend nuevo usa la misma sesión/cookie SSO que el legacy.
- Windmill se usa para orquestación de formularios, validaciones o persistencia auxiliar.

#### Cuándo conviene

- Cuando se quiere la **máxima compatibilidad** con el modelo actual.
- Cuando el dominio y la cookie ya están resueltos.
- Cuando el nuevo flujo debe sentirse como parte de la misma aplicación.

#### Qué hace falta

- Definir la ruta de entrada y salida.
- Acordar el punto de decisión: `iniciar` o `elegibilidad`.
- Exponer el contexto mínimo del usuario y período desde el backend.
- Mantener fallback al wizard legacy para casos complejos.

#### Pros

- Menor fricción de autenticación.
- No obliga a inventar un esquema nuevo de login.
- Aprovecha el SSO y la sesión existentes.

#### Contras

- Más acoplamiento con IBPresentaciones.
- Puede complicar el deploy si el frontend nuevo vive en otro stack.
- La convivencia visual y técnica queda atada al WAR legacy.

---

### Opción 2 — Frontend nuevo separado, pero bajo el mismo dominio/cookie compartida

#### Cómo funcionaría

- El frontend nuevo corre como app separada, pero dentro del mismo dominio navegable.
- El browser sigue enviando la cookie SSO automáticamente.
- El backend de IBPresentaciones sigue reconstruyendo usuario desde `ContextoLoginWeb`.
- Windmill puede leer el contexto del usuario y generar formularios/flows.

#### Cuándo conviene

- Cuando se quiere separar frontend moderno del WAR legacy sin romper el SSO.
- Cuando la infraestructura permite compartir cookie por dominio/path.
- Cuando el equipo quiere desplegar el frontend con un ciclo independiente.

#### Qué hace falta

- Confirmar `Domain` y `Path` de la cookie.
- Definir si el frontend se monta en subdominio o subruta.
- Establecer cómo se comunica el frontend con IBPresentaciones.
- Definir si Windmill se consume directo o solo vía backend.

#### Pros

- Separación limpia de UI.
- El usuario puede mantener una sola identidad de sesión.
- Se puede evolucionar el frontend sin tocar tanto el legacy.

#### Contras

- Hay que asegurar que la cookie realmente viaje.
- Si hay CORS o cross-origin, aparece complejidad extra.
- Requiere coordinación de rutas, headers y políticas del navegador.

---

### Opción 3 — Frontend o Windmill en otro origen, con JWT/proxy

#### Cómo funcionaría

- El frontend nuevo o Windmill viven fuera del dominio compartido.
- La cookie SSO no alcanza o no viaja como se espera.
- Se introduce un token explícito, o Windmill/otro backend actúa como proxy de identidad.
- IBPresentaciones valida el token o recibe llamadas firmadas por un backend intermedio.

#### Cuándo conviene

- Cuando el frontend no puede quedar bajo el mismo dominio.
- Cuando Windmill corre en infraestructura separada.
- Cuando se necesita desacoplar completamente el canal moderno del legacy.

#### Qué hace falta

- Definir emisor y validador del token.
- Definir claims mínimos: CUIT, nombre, permisos, expiración.
- Establecer JWKS o mecanismo equivalente.
- Revisar CORS, CORS preflight, headers y seguridad de logs.

#### Pros

- Máxima independencia entre stacks.
- Mejor para integraciones cross-origin.
- Permite integrar otros canales a futuro.

#### Contras

- Más complejidad operativa y de seguridad.
- Hay que mantener validación de firma, expiración y rotación.
- El flujo deja de depender solo de la sesión SSO tradicional.

---

### Opción 4 — Híbrida: nuevo frontend solo para casos simples, legacy como fallback

#### Cómo funcionaría

- El usuario entra al flujo desde legacy.
- Un endpoint decide si es elegible para el flujo simplificado.
- Si es elegible, va al frontend nuevo.
- Si no lo es, se redirige al wizard legacy completo.
- Windmill puede participar en precarga, validación o armado de formularios.

#### Cuándo conviene

- Cuando se quiere migrar por etapas.
- Cuando el nuevo frontend no cubre todos los casos tributarios.
- Cuando legacy todavía debe seguir siendo la fuente de verdad para casos complejos.

#### Qué hace falta

- Definir la puerta de entrada única (`/iniciar`, `elegibilidad`, o similar).
- Mantener los motivos de no elegibilidad bien tipificados.
- Asegurar que el fallback a legacy conserve el contexto.
- Implementar feature flags o rollout gradual.

#### Pros

- Es la opción más realista para migración gradual.
- Reduce riesgo funcional.
- Permite validar UX y operación con un subconjunto de casos.

#### Contras

- Duplica caminos de navegación.
- Requiere buena trazabilidad para saber por qué cayó en legacy.
- El usuario puede ver dos experiencias distintas en el mismo proceso.

---

## Recomendación práctica por escenario

### Escenario A — mismo dominio y cookie compartida

**Recomendación:** Opción 1 o 2.

- Mantener SSO/cookie como mecanismo principal.
- Reutilizar sesión de legacy.
- Evitar JWT salvo que aparezca una necesidad real.

### Escenario B — frontend nuevo separado, pero todavía controlado por ARBA

**Recomendación:** Opción 2 con fallback híbrido.

- Separar frontend modernizado.
- Mantener IBPresentaciones como validador/autorizador.
- Usar Windmill como orquestador.

### Escenario C — origin distinto / Windmill externo / cookie no compartida

**Recomendación:** Opción 3.

- Introducir JWT o proxy de identidad.
- No depender de una cookie que no puede llegar.
- Aceptar el costo de seguridad/operación.

### Escenario D — migración progresiva de casos simples

**Recomendación:** Opción 4.

- El nuevo frontend atiende solo el fast-path.
- IBPresentaciones sigue cubriendo el resto.
- Permite probar sin romper el flujo actual.

---

## Qué debería decidirse antes de implementar

### Decisiones técnicas

- Si el frontend nuevo vive dentro del mismo dominio que IBPresentaciones.
- Si Windmill consume el backend directamente o actúa como proxy/gateway.
- Si el usuario se identifica por cookie SSO o por JWT.
- Si el nuevo frontend debe tener CORS habilitado.

### Decisiones funcionales

- Qué casos entran al flujo simplificado.
- Qué motivos expulsan al usuario al legacy.
- Si el flujo nuevo reemplaza o solo complementa a IBPresentaciones.
- Cómo se representa el fallback para el usuario.

### Decisiones de datos/auditoría

- Cómo marcar el canal de origen del trámite.
- Qué subtipo de operación se usa para auditoría.
- Cómo se registran intentos fallidos o redirecciones a legacy.

---

## Preguntas reformuladas para tomar decisión

Estas preguntas están más enfocadas para cerrar el diseño:

### 1. ¿El frontend nuevo va a vivir bajo el mismo dominio y con cookie compartida?

Si la respuesta es sí:

- se mantiene el modelo SSO legacy,
- no hace falta JWT,
- el backend reconstruye el usuario desde sesión.

Si la respuesta es no:

- hay que definir JWT/proxy,
- revisar CORS,
- y separar el contrato de identidad.

### 2. ¿Windmill será solo orquestador o también gateway de identidad?

Si es solo orquestador:

- el frontend o el backend principal maneja la identidad.

Si también es gateway:

- Windmill debe transportar o reconstruir el contexto del usuario.

### 3. ¿El flujo simplificado reemplaza al legacy o convive con él?

Si reemplaza:

- hay que cubrir todos los casos y migrar más lógica.

Si convive:

- hay que definir la puerta de entrada y el fallback al wizard legacy.

### 4. ¿La decisión la toma el frontend o el backend?

- Si la toma el frontend, la UX es más rica pero conoce más reglas.
- Si la toma el backend, el frontend es más tonto pero el control queda centralizado.
- Para migración gradual, conviene que el backend devuelva `modo` + `contexto`.

---

## Propuesta de camino recomendado

Para este POC y una transición ordenada, la secuencia más razonable sería:

1. **Asegurar convivencia por mismo dominio/cookie** si la infraestructura lo permite.
2. **Definir un endpoint de inicio** que decida entre `SIMPLE` y `LEGACY`.
3. **Usar el nuevo frontend solo para casos simples**.
4. **Mantener legacy como fallback** para casos no elegibles o complejos.
5. **Evitar JWT** mientras la cookie SSO alcance.
6. **Introducir JWT/proxy solo si el dominio o la cookie lo obligan**.

---

## Resumen ejecutivo

- IBPresentaciones hoy funciona con **SSO + sesión**.
- El nuevo frontend puede convivir con ese modelo si está bajo el mismo dominio o si la cookie llega correctamente.
- Windmill encaja mejor como **orquestador de formularios y reglas**, no necesariamente como gateway de login.
- La mejor estrategia para arrancar es **convivencia híbrida**: nuevo frontend para el fast-path y legacy como fallback.
- Si la infraestructura no permite compartir cookie, entonces hay que ir a **JWT/proxy**.

---

## Referencias

- `ARQUITECTURA.md`
- `docs/ddjj-simple.md`
- `docs/preguntas-criticas-arquitectura.md`
- `docs/preguntas-generales-por-temas.md`
- Código legacy IBPresentaciones: `SessionFilter`, `SetUpAction`, `Facade.getUsuarioLog()`, `RolOpcionMenuFilter`
