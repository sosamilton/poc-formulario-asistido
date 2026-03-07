# Ecosistema de Formularios Dinámicos e Integración de Flujos

## 🎯 Objetivo del Proyecto

Crear un **ecosistema modular y escalable** para la generación de formularios dinámicos que permitan:

- ✅ Creación de formularios de forma ágil y flexible
- ✅ Integración con flujos de trabajo internos y externos
- ✅ Control de acceso robusto (ciudadanos y usuarios internos)
- ✅ Seguridad y escalabilidad empresarial
- ✅ Interoperabilidad con sistemas existentes

Este repositorio contiene **múltiples POCs (Proof of Concept)** para evaluar diferentes arquitecturas y tecnologías, permitiendo al equipo experimentar y determinar la mejor solución para las necesidades específicas del proyecto.

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

**Stack:**
- **Form.io**: Motor de formularios con renderizado dinámico
- **Windmill**: Orquestador de flujos con ejecución paralela
- **Frontend**: SPA para renderizado de formularios
- **Mockoon**: APIs mock para desarrollo

**Características:**
- ✅ Formularios JSON Schema basados
- ✅ Flujos con ejecución paralela (reducción de ~6s a ~2s)
- ✅ Precarga de datos desde múltiples fuentes
- ✅ Validación en tiempo real
- ✅ Integración con Keycloak para autenticación

**Documentación:**
- 📄 [Guía de Desarrollo con Windmill](windmill-dev/DESARROLLO_WINDMILL.md)
- 📄 [Implementación DDJJ (Caso de Uso)](IMPLEMENTACION_DDJJ.md)
- 📄 [APIs Mock con Mockoon](apis/README.md)
- 📄 [Arquitectura Frontend](formio-front.md)

**Ubicación:** `windmill-dev/`, `formio/`, `apis/`

---

### 2. **POC Alternativa: n8n + Form.io**

**Stack:**
- **n8n**: Orquestador visual de workflows
- **Form.io**: Motor de formularios
- **PostgreSQL + Redis**: Persistencia y caché

**Ventajas:**
- ✅ UI visual para diseño de workflows
- ✅ Más de 400 integraciones nativas
- ✅ Webhooks y triggers HTTP
- ✅ Ideal para usuarios no técnicos

**Ubicación:** `n8n/`

**Configuración:**
```bash
cd n8n
docker-compose up -d
# Acceso: http://localhost:5678
```

---

### 3. **POC Enterprise: Orbeon Forms**

**Stack:**
- **Orbeon Forms**: Solución enterprise de formularios
- **PostgreSQL**: Base de datos
- **Tomcat**: Servidor de aplicaciones

**Características:**
- ✅ Diseñador visual WYSIWYG
- ✅ XForms estándar W3C
- ✅ Versionado de formularios
- ✅ Workflow integrado
- ✅ Capacidades offline

**Ubicación:** `orbeon/`

**Documentación:** Ver `orbeon/README.md` (si existe)

---

### 4. **POC Open Source: OpenForm**

**Stack:**
- **OpenForm**: Plataforma open-source holandesa
- **Celery**: Procesamiento asíncrono
- **PostgreSQL**: Base de datos
- **Redis**: Cola de mensajes

**Características:**
- ✅ Integración con servicios gubernamentales holandeses
- ✅ APIs REST completas
- ✅ Soporte para ZGW (Zaakgericht Werken)
- ✅ Altamente configurable

**Ubicación:** `openform/`

---

### 5. **POC Feedback: Formbricks**

**Stack:**
- **Formbricks**: Plataforma de encuestas y feedback
- **PostgreSQL**: Base de datos

**Uso:**
- ✅ Encuestas de satisfacción
- ✅ Feedback de usuarios
- ✅ NPS y métricas de experiencia
- ✅ Análisis de respuestas

**Ubicación:** `formbricks/`

---

### 6. **POC Low-Code: Corteza**

**Stack:**
- **Corteza**: Plataforma low-code
- **PostgreSQL**: Base de datos

**Características:**
- ✅ Constructor de aplicaciones sin código
- ✅ Workflows visuales
- ✅ CRM integrado

**Ubicación:** `corteza/`

---

## 📋 Casos de Uso Implementados

### DDJJ (Declaración Jurada de Ingresos Brutos)

**Flujo completo:**
1. Usuario se autentica con Keycloak (JWT)
2. Windmill recibe webhook con token
3. Extrae CUIT del JWT
4. **Ejecución paralela** de consultas:
   - Datos del padrón
   - Historial de declaraciones
   - Períodos adeudados
5. Calcula alícuota y monto mínimo
6. Precarga formulario en Form.io
7. Usuario completa y envía
8. Windmill procesa y persiste

**Tiempo de ejecución:** ~2 segundos (optimizado con paralelización)

**Documentación detallada:** [IMPLEMENTACION_DDJJ.md](IMPLEMENTACION_DDJJ.md)

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

## 🚦 Cómo Empezar

### Prerrequisitos

```bash
# Docker y Docker Compose
docker --version
docker-compose --version

# Node.js (para Windmill CLI)
node --version
npm --version

# Git
git --version
```

### Opción 1: POC con Windmill (Recomendado)

```bash
# 1. Iniciar APIs mock
cd apis
# Abrir iibb.json en Mockoon Desktop App
# O usar CLI: mockoon-cli start --data iibb.json --port 3001

# 2. Iniciar Windmill
cd ../windmill
docker-compose up -d
# Acceso: http://localhost:8000

# 3. Sincronizar scripts y flows
cd ../windmill-dev
npm install -g windmill-cli
wmill workspace add local arba http://localhost:8000
wmill sync push --yes

# 4. Probar el flujo
# Ver documentación en windmill-dev/DESARROLLO_WINDMILL.md
```

### Opción 2: POC con n8n

```bash
# 1. Iniciar n8n
cd n8n
docker-compose up -d
# Acceso: http://localhost:5678

# 2. Importar workflows (si existen)
# Ver documentación en n8n/README.md
```

### Opción 3: POC con Orbeon

```bash
# Iniciar Orbeon
cd orbeon
docker-compose up -d
# Acceso: http://localhost:8080/orbeon
```

---

## 📚 Documentación Detallada

### Guías de Desarrollo

- 📘 **[Desarrollo con Windmill](windmill-dev/DESARROLLO_WINDMILL.md)**
  - Configuración de workspace
  - Creación de scripts y flows
  - Sincronización con Git
  - Mejores prácticas
  - Troubleshooting

- 📗 **[APIs Mock con Mockoon](apis/README.md)**
  - Endpoints disponibles
  - Configuración de Mockoon
  - CUITs de prueba
  - Testing y debugging

- 📙 **[Arquitectura Frontend](formio-front.md)**
  - Integración Form.io + Windmill
  - Flujo de autenticación
  - Renderizado de formularios
  - Casos de uso

### Casos de Uso

- 📄 **[Implementación DDJJ](IMPLEMENTACION_DDJJ.md)**
  - Arquitectura completa
  - Flujo paso a paso
  - Scripts de Windmill
  - Configuración de Form.io
  - Testing end-to-end

### Contexto del Proyecto

- 📋 **[Contexto General](context.md)**
  - Objetivos del proyecto
  - Requerimientos
  - Decisiones arquitectónicas

---

## 🧪 Testing y Desarrollo

### Datos de Prueba

**CUITs configurados en Mockoon:**
- `20345534234` - Servicios Profesionales (regimen CM, alícuota 3.5%)
- `30677993894` - Comercio Minorista (regimen LOCAL, alícuota 2.5%)

**JWT de ejemplo:**
Ver archivo `jwt.example` para estructura del token

**Endpoints de prueba:**
```bash
# Padrón
curl http://localhost:3001/api/padron/20345534234

# Alícuota
curl http://localhost:3001/api/alicuota/620

# Historial
curl http://localhost:3001/api/historial/20345534234

# Períodos adeudados
curl http://localhost:3001/api/periodos-adeudados/20345534234
```

### Ejecutar Flujo DDJJ

```bash
# Con Windmill CLI
wmill flow run f/ddjj/init_ddjj__flow -d '{"token": "eyJhbGc..."}'

# Con HTTP
curl -X POST http://localhost:8000/api/w/arba/jobs/run/http/f/ddjj/init_ddjj__flow \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGc..."}'
```

---

## 🤝 Contribuir al Proyecto

### Agregar un Nuevo POC

1. **Crear directorio** para el nuevo sistema
   ```bash
   mkdir mi-nuevo-poc
   cd mi-nuevo-poc
   ```

2. **Agregar docker-compose.yml** con la configuración
   ```yaml
   version: '3.8'
   services:
     mi-servicio:
       image: mi-imagen:latest
       ports:
         - "8080:8080"
   ```

3. **Documentar** en README.md del POC
   - Objetivo
   - Stack tecnológico
   - Instrucciones de instalación
   - Casos de uso
   - Ventajas y desventajas

4. **Actualizar** este README principal
   - Agregar a la sección de POCs
   - Incluir en tabla comparativa
   - Documentar integración con otros componentes

5. **Commit con convenciones**
   ```bash
   git add .
   git commit -m "feat: agregar POC de [nombre del sistema]
   
   - Configuración de [componentes]
   - Docker compose para desarrollo
   - Documentación de uso
   - Casos de uso implementados"
   ```

### Convenciones de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad o POC
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Tareas de mantenimiento

---

## 🔄 Roadmap

### Fase 1: POCs y Evaluación (Actual)
- [x] POC Form.io + Windmill
- [x] POC n8n + Form.io
- [x] POC Orbeon Forms
- [x] POC OpenForm
- [x] APIs Mock con Mockoon
- [x] Documentación inicial

### Fase 2: Integración y Seguridad
- [ ] Integración completa con Keycloak
- [ ] Implementar RBAC (Role-Based Access Control)
- [ ] Auditoría y logging centralizado
- [ ] Cifrado de datos sensibles
- [ ] Firma digital de formularios

### Fase 3: Escalabilidad
- [ ] Kubernetes deployment
- [ ] Load balancing
- [ ] Caché distribuido (Redis Cluster)
- [ ] CDN para assets estáticos
- [ ] Monitoreo y alertas (Prometheus + Grafana)

### Fase 4: Producción
- [ ] CI/CD pipelines
- [ ] Backups automatizados
- [ ] Disaster recovery
- [ ] Documentación de operaciones
- [ ] Capacitación de equipos

---

## 📊 Comparativa de Soluciones

### Matriz de Decisión

| Criterio | Form.io + Windmill | n8n + Form.io | Orbeon | OpenForm |
|----------|-------------------|---------------|---------|----------|
| **Facilidad de uso** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Costo** | 💰 Bajo | 💰 Bajo | 💰💰💰 Alto | 💰 Bajo |
| **Comunidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Documentación** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Flexibilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔐 Seguridad

### Mejores Prácticas Implementadas

- ✅ **Autenticación JWT** con validación de firma
- ✅ **HTTPS** en todos los endpoints (producción)
- ✅ **Secrets management** con variables de entorno
- ✅ **CORS** configurado correctamente
- ✅ **Rate limiting** en APIs
- ✅ **Validación de entrada** en todos los formularios
- ✅ **Sanitización** de datos de usuario

### Pendientes de Implementación

- ⏳ Integración completa con Keycloak
- ⏳ Auditoría de acciones de usuario
- ⏳ Cifrado de datos en reposo
- ⏳ Firma digital de formularios
- ⏳ 2FA (Two-Factor Authentication)

---

## 🐛 Troubleshooting

### Problemas Comunes

**Puerto ya en uso:**
```bash
# Ver qué proceso usa el puerto
lsof -i :8000

# Matar el proceso
kill -9 <PID>
```

**Docker compose no inicia:**
```bash
# Ver logs
docker-compose logs -f

# Reiniciar servicios
docker-compose down
docker-compose up -d
```

**Windmill no sincroniza:**
```bash
# Verificar configuración
wmill workspace whoami

# Regenerar metadata
wmill script generate-metadata --yes
wmill flow generate-locks --yes

# Push forzado
wmill sync push --yes
```

**Mockoon no responde:**
```bash
# Verificar que está corriendo
curl http://localhost:3001/api/padron/20345534234

# Reiniciar Mockoon
# Desktop: Stop → Start
# CLI: Ctrl+C → mockoon-cli start --data apis/iibb.json
```

---

## 📞 Contacto y Soporte

### Equipo del Proyecto

- **Arquitectura**: [Nombre del arquitecto]
- **Desarrollo**: [Equipo de desarrollo]
- **DevOps**: [Equipo de infraestructura]

### Recursos Adicionales

- 📖 [Documentación de Form.io](https://help.form.io/)
- 📖 [Documentación de Windmill](https://www.windmill.dev/docs)
- 📖 [Documentación de n8n](https://docs.n8n.io/)
- 📖 [Documentación de Orbeon](https://doc.orbeon.com/)
- 📖 [Documentación de Mockoon](https://mockoon.com/docs/)

---

## 📝 Licencia

Este proyecto es de uso interno. Consultar con el equipo legal para licenciamiento de componentes individuales.

---

## 🎉 Agradecimientos

Gracias a todos los miembros del equipo que contribuyen a la evaluación y desarrollo de este ecosistema de formularios dinámicos.

---

**Última actualización:** Marzo 2026  
**Versión del documento:** 1.0.0
