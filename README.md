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

## 🚀 POCs Implementados

### 1. **POC Principal: Form.io + Windmill + Frontend**

**Stack:** Form.io + Windmill + Mockoon + Keycloak

**Características:**
- ✅ Orquestación code-first con ejecución paralela
- ✅ Formularios JSON Schema
- ✅ Precarga automática de datos
- ✅ Alta performance (~2s por flujo completo)

**📂 Carpeta:** `windmill-dev/`  
**� Documentación:** [windmill-dev/README.md](windmill-dev/README.md)

---

### 2. **POC Alternativa: n8n + Form.io**

**Stack:** n8n + Form.io + PostgreSQL + Redis

**Características:**
- ✅ UI visual para workflows (no-code/low-code)
- ✅ 400+ integraciones nativas
- ✅ Ideal para usuarios no técnicos

**📂 Carpeta:** `n8n/`  
**🚀 Quick Start:** `cd n8n && docker-compose up -d`

---

### 3. **POC Enterprise: Orbeon Forms**

**Stack:** Orbeon Forms + PostgreSQL + Tomcat

**Características:**
- ✅ Diseñador visual WYSIWYG
- ✅ XForms estándar W3C
- ✅ Workflow y versionado integrado
- ✅ Solución enterprise completa

**📂 Carpeta:** `orbeon/`  
**🚀 Quick Start:** `cd orbeon && docker-compose up -d`

---

### 4. **POC Open Source: OpenForm**

**Stack:** OpenForm + Celery + PostgreSQL + Redis

**Características:**
- ✅ Plataforma gubernamental holandesa
- ✅ APIs REST completas
- ✅ Procesamiento asíncrono
- ✅ Altamente configurable

**📂 Carpeta:** `openform/`

---

### 5. **POC Feedback: Formbricks**

**Stack:** Formbricks + PostgreSQL

**Características:**
- ✅ Encuestas y feedback de usuarios
- ✅ NPS y métricas de experiencia
- ✅ Análisis de respuestas

**📂 Carpeta:** `formbricks/`

---

### 6. **POC Low-Code: Corteza**

**Stack:** Corteza + PostgreSQL

**Características:**
- ✅ Constructor de aplicaciones sin código
- ✅ Workflows visuales
- ✅ CRM integrado

**📂 Carpeta:** `corteza/`

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

- 📘 [POC 1: Windmill + Form.io](windmill-dev/README.md) - Quick start, testing, desarrollo
- 📗 [APIs Mock con Mockoon](apis/README.md) - Endpoints, configuración, testing
- 📙 [Arquitectura Frontend](formio-front.md) - Integración Form.io + Windmill

### Guías Técnicas

- 📄 [Implementación DDJJ](IMPLEMENTACION_DDJJ.md) - Caso de uso completo
- 📖 [Desarrollo con Windmill](windmill-dev/DESARROLLO_WINDMILL.md) - Guía técnica detallada

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