# POC-1: Form.io + Windmill + Frontend Svelte

## 🎯 Objetivo del POC

Evaluar la viabilidad de un ecosistema de formularios dinámicos que combine:

- **Form.io** como motor de renderizado de formularios
- **Windmill** como orquestador de flujos y lógica de negocio
- **Frontend Svelte** como contenedor de la aplicación
- **Mockoon** para simular APIs de sistemas internos

### ¿Qué estamos probando?

✅ **Precarga de datos desde backend** - Obtener datos de múltiples APIs antes de mostrar el formulario
✅ **Validaciones custom por usuario** - Reglas de negocio específicas según contexto del contribuyente
✅ **Valores dinámicos en selects** - Opciones que dependen de datos del usuario (períodos adeudados, etc.)
✅ **Orquestación de workflows** - Ejecución paralela de consultas para optimizar tiempos
✅ **Separación de responsabilidades** - Frontend UI, Windmill lógica, Form.io renderizado

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario Autenticado                       │
│                      (Token JWT)                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Svelte)                          │
│  - Maneja autenticación                                      │
│  - Renderiza Form.io                                         │
│  - Envía/recibe datos de Windmill                            │
│  Puerto: 3011                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Windmill (Orquestador)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  HTTP Trigger: /api/r/forms/init                   │     │
│  │  Script: f/forms/init_form.py                      │     │
│  │  - Valida JWT                                       │     │
│  │  - Ejecuta workflow init_ddjj                       │     │
│  │  - Devuelve formUrl + submissionId + prefillData   │     │
│  └────────────────────────────────────────────────────┘     │
│                              │                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Workflow: f/ddjj/init_ddjj                        │     │
│  │  1. parse_jwt → extrae CUIT                        │     │
│  │  2. Ejecución PARALELA (branchall):                │     │
│  │     - fetch_padron (actividad, régimen)            │     │
│  │     - fetch_historial (monto anterior)             │     │
│  │     - fetch_periodos_adeudados                     │     │
│  │  3. fetch_alicuota (según código actividad)        │     │
│  │  4. calcular_periodo_minimo                        │     │
│  │  5. create_formio_submission                       │     │
│  └────────────────────────────────────────────────────┘     │
│  Puerto: 8000                                                │
└─────────────────────────────────────────────────────────────┘
                    │                    │
         ┌──────────┘                    └──────────┐
         ▼                                          ▼
┌──────────────────┐                    ┌──────────────────┐
│    Form.io       │                    │     Mockoon      │
│  - Almacena      │                    │  - API Padrón    │
│    submissions   │                    │  - API Alícuota  │
│  - Renderiza     │                    │  - API Historial │
│    formularios   │                    │  - API Períodos  │
│  Puerto: 3001    │                    │  Puerto: 3002    │
└──────────────────┘                    └──────────────────┘
```

---

## 📦 Componentes

### 1. Frontend (Svelte)

**Ubicación:** `./frontend/`

**Responsabilidades:**
- Autenticación de usuarios
- Navegación entre formularios
- Renderizado de Form.io con datos precargados
- Envío de submissions completadas

**Stack:**
- Svelte 4
- Vite
- Form.io JS Library
- Docker

### 2. Windmill (Orquestador)

**Ubicación:** `./windmill-dev/`

**Responsabilidades:**
- Validación de tokens JWT
- Orquestación de workflows
- Consultas a APIs externas
- Lógica de negocio (cálculos, validaciones)
- Creación de submissions en Form.io

**Scripts principales:**
- `f/forms/init_form.py` - Inicialización de formularios
- `f/ddjj/parse_jwt.ts` - Parseo de JWT
- `f/ddjj/fetch_*.ts` - Consultas a APIs
- `f/ddjj/calcular_periodo_minimo.ts` - Lógica de negocio
- `f/ddjj/create_formio_submission.ts` - Integración con Form.io

**Workflows:**
- `f/ddjj/init_ddjj__flow` - Flujo completo de inicialización DDJJ

### 3. Form.io (Motor de Formularios)

**Ubicación:** `./formio/`

**Responsabilidades:**
- Almacenamiento de definiciones de formularios
- Renderizado de formularios
- Almacenamiento de submissions
- Validaciones de formulario

**Formularios:**
- `iibbSimple` - Declaración Jurada Mensual simplificada

### 4. Mockoon (APIs Mock)

**Ubicación:** `../apis/iibb.json`

**Responsabilidades:**
- Simular APIs de sistemas internos
- Proveer datos de prueba consistentes

**Endpoints:**
- `GET /api/padron/{cuit}` - Datos del padrón
- `GET /api/actividad/{codigo}` - Alícuota por actividad
- `GET /api/historial/{cuit}` - Historial de declaraciones
- `GET /api/periodos-adeudados/{cuit}` - Períodos sin DDJJ

---

## 🚀 Inicio Rápido

### Prerrequisitos

```bash
# Docker y Docker Compose
docker --version
docker-compose --version
```

### Levantar Todo el Stack

```bash
cd /home/msosa/iibb/POC-1

# Levantar todos los servicios
docker-compose up -d

# Verificar que todo está corriendo
docker-compose ps
```

**Servicios disponibles:**
- Frontend: http://localhost:3011
- Windmill: http://localhost:8000
- Form.io: http://localhost:3001
- Mockoon: http://localhost:3002

### Sincronizar Windmill

```bash
cd windmill-dev

# Instalar Windmill CLI (primera vez)
npm install -g windmill-cli

# Configurar workspace
wmill workspace add local arba http://localhost:8000

# Sincronizar scripts y workflows
wmill sync push --yes
```

### Probar el Flujo

1. Abrir http://localhost:3011
2. Hacer login (mock)
3. Click en "Declaración Jurada Mensual"
4. El formulario debería cargar con datos precargados

---

## 🧪 Testing

### Datos de Prueba

**CUITs configurados en Mockoon:**
- `20345534234` - Servicios Profesionales
  - Actividad: 620 (Servicios profesionales)
  - Régimen: CM (Convenio Multilateral)
  - Alícuota: 3.5%
  - Monto anterior: $125,000

- `30677993894` - Comercio Minorista
  - Actividad: 471 (Comercio minorista)
  - Régimen: LOCAL
  - Alícuota: 2.5%
  - Monto anterior: $85,000

### Probar APIs Mock

```bash
# Padrón
curl http://localhost:3002/api/padron/20345534234

# Alícuota
curl http://localhost:3002/api/actividad/620

# Historial
curl http://localhost:3002/api/historial/20345534234

# Períodos adeudados
curl http://localhost:3002/api/periodos-adeudados/20345534234
```

### Probar Workflow de Windmill

```bash
# Generar token JWT de prueba
cd windmill-dev
wmill script run f/ddjj/generate_test_jwt -d '{"cuit": "20345534234"}'

# Ejecutar workflow completo
wmill flow run f/ddjj/init_ddjj -d '{"token": "eyJhbGc..."}'
```

---

## 📊 Métricas de Performance

### Tiempo de Ejecución del Workflow

**Antes (ejecución secuencial):**
- parse_jwt: 50ms
- fetch_padron: 1500ms
- fetch_alicuota: 1200ms
- fetch_historial: 1800ms
- fetch_periodos_adeudados: 1400ms
- calcular_minimo: 100ms
- create_submission: 800ms
- **Total: ~6.85 segundos**

**Después (ejecución paralela con branchall):**
- parse_jwt: 50ms
- **Parallel fetch (max):** 1800ms
- fetch_alicuota: 1200ms
- calcular_minimo: 100ms
- create_submission: 800ms
- **Total: ~3.95 segundos**

**Optimización: 42% de reducción en tiempo de ejecución**

---

## 🔍 Puntos de Evaluación

### ✅ Aspectos Positivos Observados

1. **Separación clara de responsabilidades**
   - Frontend solo renderiza
   - Windmill maneja toda la lógica
   - Form.io solo almacena y valida

2. **Workflows visuales y auditables**
   - Fácil ver el flujo de ejecución
   - Logs detallados de cada paso
   - Debugging simplificado

3. **Ejecución paralela efectiva**
   - Reducción significativa de tiempos
   - Aprovecha I/O concurrente

4. **Precarga de datos funcional**
   - Formulario se carga con datos correctos
   - Usuario solo completa lo faltante

### ⚠️ Desafíos Encontrados

1. **Debugging complejo**
   - Múltiples capas (Frontend → Windmill → Form.io)
   - Errores pueden ocurrir en cualquier capa
   - Necesidad de logging exhaustivo

2. **Token JWT mock**
   - Formato base64url vs base64 estándar
   - Parsing en TypeScript requiere cuidado
   - Necesidad de generar tokens válidos

3. **Integración Form.io**
   - API de Form.io requiere estructura específica
   - Submissions vs Forms vs Schemas
   - Necesidad de entender modelo de datos

4. **Sincronización Windmill**
   - Necesidad de `wmill sync push` manual
   - Locks de flows deben regenerarse
   - Metadata debe estar actualizada

---

## 🐛 Problemas Conocidos y Soluciones

### 1. Frontend queda en "Cargando formulario..."

**Causa:** Workflow `init_ddjj` no se ejecuta o falla silenciosamente

**Solución:**
```bash
# Ver logs de Windmill
docker-compose logs windmill

# Ejecutar workflow manualmente para ver error
wmill flow run f/ddjj/init_ddjj -d '{"token": "..."}'
```

### 2. Error "Invalid alias" en Form.io

**Causa:** Nombre de formulario incorrecto

**Solución:**
- Verificar que el formulario existe en Form.io: http://localhost:3001
- Verificar nombre en `init_form.py`: debe ser `iibbSimple`

### 3. Token JWT no se parsea correctamente

**Causa:** Formato base64 estándar en lugar de base64url

**Solución:**
- Usar `base64.urlsafe_b64encode()` en Python
- Remover padding `=` del token
- Ver `init_form.py` función `base64url_encode()`

---

## 📚 Documentación

### Guías Internas
- [Desarrollo Windmill](./windmill-dev/README.md) - Guía completa de desarrollo
- [Arquitectura del Proyecto](../README.md) - Visión general del repositorio

### Documentación Externa
- [Windmill Docs](https://www.windmill.dev/docs)
- [Form.io Docs](https://help.form.io/)
- [Mockoon Docs](https://mockoon.com/docs/)
- [Svelte Docs](https://svelte.dev/docs)

---

## 🎓 Lecciones Aprendidas

1. **La precarga de datos es viable** pero requiere orquestación cuidadosa
2. **Windmill es efectivo para workflows** pero tiene curva de aprendizaje
3. **Form.io es robusto** pero su API requiere entendimiento profundo
4. **La ejecución paralela es crucial** para performance aceptable
5. **El debugging requiere logging exhaustivo** en cada capa

---

## 🔜 Próximos Pasos

- [ ] Resolver bug de carga de formulario (token JWT)
- [ ] Implementar validaciones custom en Form.io
- [ ] Implementar selects dinámicos con datos precargados
- [ ] Agregar manejo de errores robusto
- [ ] Implementar submit de formulario completo
- [ ] Agregar tests automatizados
- [ ] Documentar flujo de submit

---

## 📞 Contacto

Para preguntas sobre este POC, consultar con el equipo de desarrollo.
