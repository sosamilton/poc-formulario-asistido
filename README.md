# Ecosistema de Formularios Dinámicos e Integración de Flujos

## 🎯 Visión del Proyecto

Crear un **ecosistema modular y escalable** para la generación de formularios dinámicos que permitan:

- ✅ Creación de formularios de forma ágil y flexible
- ✅ Integración con flujos de trabajo internos y externos
- ✅ Control de acceso robusto (ciudadanos y usuarios internos)
- ✅ Seguridad y escalabilidad empresarial
- ✅ Interoperabilidad con sistemas existentes

Este repositorio contiene **múltiples POCs (Proof of Concept)** para evaluar diferentes arquitecturas y tecnologías, permitiendo al equipo experimentar y determinar la mejor solución.

### Principios de Diseño

1. 🔐 **El frontend nunca decide datos críticos** - La autenticación determina la identidad
2. 🧩 **El formulario es capa de UI** - No ejecuta lógica de negocio compleja
3. 🧠 **La lógica vive en backend** - Motor de negocio separado del motor de UI
4. 🔄 **El flujo debe ser orquestado** - Workflows claros y auditables
5. 📦 **Almacenamiento independiente** - No depender del motor de formularios

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    Control de Acceso                         │
│              (Keycloak / OAuth / SAML)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Motor de Formularios                       │
│    (Form.io / Orbeon / OpenForm / Formbricks)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Orquestador de Flujos                       │
│              (Windmill / n8n / Camunda)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   APIs y Servicios                           │
│         (Mockoon / APIs Reales / Microservicios)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 POCs en Evaluación

Este repositorio está organizado en **POCs independientes**, cada uno con su propio stack completo y documentación.

### **POC-1: Form.io + Windmill + Frontend Svelte** 🔥 *En desarrollo activo*

**Stack:** Form.io + Windmill + Mockoon + Frontend Svelte

**Objetivo:**
Evaluar la viabilidad de un ecosistema de formularios con precarga de datos desde backend, validaciones custom y valores dinámicos por usuario.

**Características:**
- ✅ Orquestación de workflows con Windmill
- ✅ Ejecución paralela de consultas (42% más rápido)
- ✅ Precarga automática de datos desde APIs
- ✅ Validaciones custom por usuario
- ✅ Selects dinámicos según contexto

**📂 Carpeta:** `POC-1/`  
**📘 Documentación:** [POC-1/README.md](POC-1/README.md)  
**🚀 Quick Start:** `cd POC-1 && docker-compose up -d`

**Estado:** 🟡 En desarrollo - Resolviendo integración JWT + precarga de datos

---

### **POC-2: SurveyJS + Endatix + Windmill** � *Planificado*

**Stack:** SurveyJS Library + Endatix API (.NET) + Windmill + PostgreSQL

**Objetivo:**
Evaluar una solución enterprise con backend robusto (.NET) y features avanzadas (multitenancy, webhooks, SSO).

**Características:**
- ✅ Backend .NET 10.0 maduro
- ✅ Multitenancy nativo
- ✅ Form versioning
- ✅ Partial submissions
- ✅ Webhooks y notificaciones
- ✅ SSO (Keycloak, OAuth 2.0)

**📂 Carpeta:** `surveyJS/` (documentación)  
**� Documentación:** [surveyJS/README.md](surveyJS/README.md)

**Estado:** 📝 Documentado - Pendiente de implementación

---

### **POC-3: SurveyJS + Windmill Custom Backend** 📋 *Planificado*

**Stack:** SurveyJS Library + Windmill (backend custom) + PostgreSQL

**Objetivo:**
Evaluar una solución simplificada usando solo Windmill como backend, sin servicios externos adicionales.

**Características:**
- ✅ Todo en Windmill (workflows + backend)
- ✅ Stack familiar (Python/TypeScript)
- ✅ PostgreSQL simple (solo submissions)
- ✅ Control total sobre lógica
- ✅ Aprovecha workflows existentes

**📂 Carpeta:** `surveyJS/` (documentación)  
**📘 Documentación:** [surveyJS/README.md](surveyJS/README.md)

**Estado:** 📝 Documentado - Pendiente de implementación

---

### **Otros POCs Explorados** 🔍

Estos POCs fueron evaluados previamente pero no están en desarrollo activo:

- **n8n + Form.io** - Orquestación visual no-code (`n8n/`)
- **Orbeon Forms** - Solución enterprise XForms (`orbeon/`)
- **OpenForm** - Plataforma gubernamental holandesa (`openform/`)
- **Formbricks** - Encuestas y feedback (`formbricks/`)
- **Corteza** - Constructor low-code (`corteza/`)

---

## 📋 Caso de Uso: DDJJ (Declaración Jurada)

Implementación completa de una Declaración Jurada de Ingresos Brutos con:

- Autenticación JWT con extracción de CUIT
- Consultas paralelas a sistemas internos
- Precarga automática de formularios
- Validaciones de negocio en backend
- Tiempo de ejecución: ~2 segundos

**📄 Documentación completa:** [IMPLEMENTACION_DDJJ.md](IMPLEMENTACION_DDJJ.md)  
**📘 Implementación técnica:** [windmill-dev/README.md](windmill-dev/README.md)

---

## 🛠️ Tecnologías Evaluadas

### Motores de Formularios

| Tecnología | Tipo | Complejidad | Licencia | Recomendado para |
|------------|------|-------------|----------|------------------|
| **Form.io** | JSON Schema | Media | Open Source / Enterprise | POCs rápidos, APIs REST |
| **Orbeon** | XForms | Alta | AGPL / Commercial | Soluciones enterprise |
| **OpenForm** | Custom | Alta | EUPL | Integración gubernamental |
| **Formbricks** | Encuestas | Baja | AGPL | Feedback y métricas |

### Orquestadores de Flujos

| Tecnología | Tipo | UI Visual | Complejidad | Recomendado para |
|------------|------|-----------|-------------|------------------|
| **Windmill** | Code-first | Sí | Media | Desarrolladores, performance |
| **n8n** | Low-code | Sí | Baja | Usuarios no técnicos |
| **Camunda** | BPMN | Sí | Alta | Procesos complejos enterprise |

### Control de Acceso

| Tecnología | Protocolo | Complejidad | Recomendado para |
|------------|-----------|-------------|------------------|
| **Keycloak** | OAuth2, SAML, OIDC | Media | Solución completa SSO |
| **Auth0** | OAuth2, OIDC | Baja | SaaS rápido |
| **Custom JWT** | JWT | Baja | Integraciones simples |

---

## � Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Node.js y npm (para Windmill CLI)
- Git

### Comenzar con un POC

Cada POC tiene su propia documentación detallada en su carpeta:

- **Windmill (recomendado):** Ver [windmill-dev/README.md](windmill-dev/README.md)
- **n8n:** `cd n8n && docker-compose up -d` → http://localhost:5678
- **Orbeon:** `cd orbeon && docker-compose up -d` → http://localhost:8080/orbeon
- **APIs Mock:** Ver [apis/README.md](apis/README.md)

---

## 📚 Documentación

### Por POC

- 📘 [POC-1: Form.io + Windmill + Svelte](POC-1/README.md) - Arquitectura, quick start, testing
- 📗 [POC-2 y POC-3: SurveyJS](surveyJS/README.md) - Comparación de arquitecturas con SurveyJS
- � [APIs Mock con Mockoon](apis/README.md) - Endpoints, configuración, testing

### Guías Técnicas

- 📄 [Desarrollo con Windmill](POC-1/windmill-dev/README.md) - Guía técnica detallada del POC-1

---

## 🤝 Contribuir

### Agregar un Nuevo POC

1. Crear carpeta para el POC: `mkdir mi-poc/`
2. Agregar `docker-compose.yml` con la configuración
3. Crear `README.md` con:
   - Descripción y stack
   - Quick start
   - Características principales
4. Actualizar este README agregando el POC a la lista
5. Commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/)

### Convenciones de Commits

- `feat:` - Nueva funcionalidad o POC
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `refactor:` - Refactorización de código

### Recursos Adicionales

- 📖 [Documentación de Form.io](https://help.form.io/)
- 📖 [Documentación de Windmill](https://www.windmill.dev/docs)
- 📖 [Documentación de n8n](https://docs.n8n.io/)
- 📖 [Documentación de Orbeon](https://doc.orbeon.com/)
- 📖 [Documentación de Mockoon](https://mockoon.com/docs/)