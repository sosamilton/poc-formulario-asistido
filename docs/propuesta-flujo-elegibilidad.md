# Propuesta: API de Elegibilidad vs Endpoint Único `/iniciar`

## Contexto

El flujo de DDJJ Simple necesita una **puerta de entrada** que decida si el contribuyente puede usar la experiencia simplificada o debe ir al wizard legacy completo. Este documento analiza tres opciones arquitectónicas para esa puerta.

> **Estado**: Propuesta abierta. Decisiones pendientes de product owner + referentes funcionales IIBB.
> **Relación**: Ver pregunta crítica **A7.1** en `preguntas-criticas-arquitectura.md`.

---

## Opción A — API de Elegibilidad Dedicada (`GET /elegibilidad-ddjj-simple`)

### Flujo

```
Usuario entra a /simplificado
        ↓
Frontend → GET /contribuyente/me/elegibilidad-ddjj-simple
        ↓
Backend evalúa reglas (actividades, régimen, deducciones, DJ pendiente)
        ↓
Response 200 { elegible: true/false, motivo, linkLegacy, contexto }
        ↓
Frontend decide qué pantalla mostrar
```

### Contrato (actual en `contrato-ddjj-simple.md`)

```json
// Elegible
{
  "elegible": true,
  "actividadUnica": { ... },
  "periodosPresentables": [ ... ],
  "historialReciente": [ ... ]
}

// No elegible
{
  "elegible": false,
  "motivoNoElegible": "MULTIPLES_ACTIVIDADES",
  "mensajeUsuario": "...",
  "linkLegacy": "/IBPresentaciones/preInicioDDJJ.do"
}
```

### Casos de respuesta documentados

| Caso | `elegible` | `motivoNoElegible` | UX esperada |
|---|---|---|---|
| Happy path | `true` | `null` | Formulario simplificado |
| Períodos faltantes | `true` | `null` + `alertaPeriodosFaltantes[]` | Formulario con banner amarillo |
| DJ pendiente legacy | `false` | `DJ_PENDIENTE_EXISTENTE` | Pantalla bloqueo + link a seguir DJ |
| Múltiples actividades | `false` | `MULTIPLES_ACTIVIDADES` | Pantalla bloqueo + link legacy |
| Tratamiento fiscal especial | `false` | `TRATAMIENTO_FISCAL_ESPECIAL` | Pantalla bloqueo + link legacy |
| Deducciones manuales | `false` | `DEDUCCIONES_MANUALES` | Pantalla bloqueo + link legacy |

### Pros

- **UX rica**: cada motivo de no-elegibilidad tiene su propia pantalla, copy y link.
- **Cacheable**: el frontend puede guardar la respuesta y no reconsultar al navegar entre pasos.
- **Dashboard futuro**: la misma API alimenta una pantalla de "estado del contribuyente" sin iniciar presentación.

### Contras

- **Frontend conoce reglas de negocio** (aunque sea via booleanos). Si cambia un motivo, hay que tocar frontend.
- **+1 endpoint** para mantener, versionar y testear.
- **Doble validación**: el backend valida en `/elegibilidad`, pero `/confirmar` debe revalidar todo (la realidad pudo cambiar entre ambos requests).

---

## Opción B — Backend Redirige (sin API de elegibilidad)

### Flujo

```
Usuario clica "Presentar DDJJ" en menú legacy
        ↓
Legacy servlet / Servlet nuevo decide: ¿elegible?
        ↓
    Sí → 302 Redirect a /simplificado/index.html
    No → sigue wizard Struts normal
```

O vía API opaca:

```
Frontend → POST /ddjj-simple/iniciar
        ↓
Backend evalúa internamente
        ↓
Sí  → 200 + contexto del formulario
No  → 409/303 + Location: linkLegacy
```

### Contrato propuesto (mínimo)

```http
POST /api/v1/ddjj-simple/iniciar
Authorization: Bearer <token>
```

```json
// Éxito
{
  "modo": "SIMPLE",
  "url": "/simplificado",
  "contexto": {
    "periodosPresentables": [ ... ],
    "actividadUnica": { ... }
  }
}

// Redirect a legacy
{
  "modo": "LEGACY",
  "url": "/IBPresentaciones/preInicioDDJJ.do",
  "motivo": "MULTIPLES_ACTIVIDADES"
}
```

### Pros

- **Frontend tonto**: no sabe reglas. Solo renderiza lo que recibe.
- **Un solo punto de decisión**: backend controla todo. Cambiar una regla no toca frontend.
- **Seguridad de acceso**: imposible llegar al formulario simplificado saltándose la puerta.

### Contras

- **UX pobre para "no elegible"**: el usuario ve un redirect brusco o un mensaje genérico. Difícil explicar por qué no puede usar el simplificado.
- **Difícil manejar alertas**: "elegible pero tenés un período faltante" requiere pasar metadata igualmente.
- **Bookmark/refresh**: si el usuario bookmarkea `/simplificado`, hay que revalidar al entrar igual.

---

## Opción C — Híbrida: `/iniciar` con contexto completo (Recomendada)

### Flujo

```
Usuario clica "Presentar DDJJ" en menú legacy
        ↓
Frontend → POST /ddjj-simple/iniciar
        ↓
Backend evalúa elegibilidad + arma contexto
        ↓
Response 200:
  { "modo": "SIMPLE",   "contexto": { ... } }  → renderiza formulario
  { "modo": "LEGACY",   "url": "...", "motivo": "..." } → pantalla bloqueo
  { "modo": "ALERTA",   "contexto": { ... }, "alertas": [ ... ] } → formulario + banners
```

### Diferencias clave vs Opción A

| Aspecto | Opción A (`/elegibilidad`) | Opción C (`/iniciar`) |
|---|---|---|
| Responsable de decisión | Frontend | Backend |
| URL de entrada al flujo | `/simplificado` (directo) | Menú legacy → `/iniciar` → `/simplificado` |
| Navegación independiente | Sí, el usuario puede entrar directo | No, siempre pasa por `/iniciar` |
| Reutilizable para dashboard | Sí | No (a menos que se agregue `?intencion=consulta`) |
| Número de endpoints | 2 (`/elegibilidad`, luego `/preview`, `/confirmar`) | 1 (`/iniciar` que devuelve contexto) |

---

## Comparativa de Impacto en Componentes

| Componente | Opción A | Opción B | Opción C |
|---|---|---|---|
| **Frontend** | Conoce 5+ motivos de no-elegibilidad para mostrar pantallas | Solo maneja redirect o render genérico | Recibe `modo` + `motivo`, mapea a componentes |
| **Backend legacy** | Expone `/elegibilidad` + revalida en `/confirmar` | Servlet interno decide redirect | Expone `/iniciar` + reutiliza lógica en `/confirmar` |
| **Contrato API** | 3 endpoints (`/me`, `/elegibilidad`, `/preview`, `/confirmar`) | 2 endpoints (`/iniciar` opaco, `/confirmar`) | 3 endpoints (`/me`, `/iniciar`, `/preview`, `/confirmar`) |
| **Mockoon/Testing** | Mocks complejos por scenario | Mocks simples (Sí/No) | Mocks con `modo` |
| **Windmill/Forms** | Puede consumir `/elegibilidad` directamente | Depende del redirect | Consume `/iniciar` como trigger |

---

## Casos de Uso y Recomendación

### Si el acceso es SIEMPRE desde el menú legacy (sin URL directa)

→ **Opción C** o **Opción B** son más simples. El usuario nunca necesita saber si es elegible antes de intentar presentar.

### Si se quiere un "dashboard del contribuyente" que muestre estado sin iniciar

→ **Opción A** es indispensable. La API `/elegibilidad` se reutiliza para "¿puedo presentar?" sin comprometerse.

### Si la prioridad es mínima complejidad frontend y zero trust

→ **Opción B**. El frontend es un mero renderer. Cualquier intento de acceso directo a `/simplificado` se rechaza por falta de contexto.

### Recomendación por defecto (v1)

**Opción C** (`/iniciar`) porque:
1. Mantiene la UX rica (pantallas por motivo) sin exponer reglas al frontend.
2. Centraliza la lógica de elegibilidad en un solo lugar (el servlet `/iniciar`).
3. Permite evolucionar a Opción A en v2 si se necesita dashboard, sin romper el contrato.

---

## Notas de Implementación

- La lógica de elegibilidad es **la misma** en las tres opciones: mono-actividad + régimen LOCAL + sin tratamiento fiscal + sin deducciones manuales + sin DJ pendiente. Lo que cambia es **dónde se ejecuta** y **cómo se comunica el resultado**.
- Si se elige Opción C, el endpoint `/elegibilidad` puede mantenerse como **endpoint interno** o **v2 futuro**, pero no es necesario para el MVP.
- El contrato `contrato-ddjj-simple.md` debe reflejar la opción elegida. Hoy refleja **Opción A**.

---

## Referencias

- `contrato-ddjj-simple.md` — contrato actual basado en Opción A.
- `preguntas-criticas-arquitectura.md` — pregunta A7.1 enlaza a este documento.
- Código legacy: `CerrarDJAction.java`, `Facade.java` — lógica de validación previa al cierre que debe replicarse en la puerta de elegibilidad.
