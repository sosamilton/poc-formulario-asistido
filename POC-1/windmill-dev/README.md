# POC 1: Form.io + Windmill + Frontend

## 🎯 Descripción

Este POC implementa un ecosistema completo de formularios dinámicos utilizando:

- **Windmill** como orquestador de flujos y motor de lógica de negocio
- **Form.io** como motor de renderizado de formularios
- **Mockoon** para simular APIs de sistemas internos
- **Keycloak** para autenticación y autorización (JWT)

## 🏗️ Arquitectura

```
Usuario autenticado (JWT)
        ↓
Frontend contenedor
        ↓
Windmill (orquestador)
    ├── Valida JWT
    ├── Consulta APIs mock
    ├── Aplica lógica de negocio
    └── Precarga Form.io
        ↓
Form.io (renderizado)
        ↓
Windmill (submit final)
        ↓
Persistencia
```

## 🚀 Quick Start

### Prerrequisitos

```bash
# Docker y Docker Compose
docker --version
docker-compose --version

# Node.js y npm (para Windmill CLI)
node --version
npm --version
```

### Paso 1: Iniciar APIs Mock

```bash
cd ../apis

# Opción A: Mockoon Desktop App (recomendado)
# 1. Descargar desde https://mockoon.com/download/
# 2. Abrir iibb.json
# 3. Iniciar el servidor en puerto 3001

# Opción B: Mockoon CLI
npm install -g @mockoon/cli
mockoon-cli start --data iibb.json --port 3001
```

### Paso 2: Iniciar Windmill

```bash
cd ../windmill
docker-compose up -d

# Verificar que está corriendo
curl http://localhost:8000/api/version
```

**Acceso:** http://localhost:8000
- Usuario: `admin@windmill.dev`
- Password: (configurado en `.env`)

### Paso 3: Sincronizar Workspace

```bash
cd ../windmill-dev

# Instalar Windmill CLI
npm install -g windmill-cli

# Configurar workspace local
wmill workspace add local arba http://localhost:8000

# Sincronizar scripts y flows
wmill sync push --yes
```

### Paso 4: Probar el Flujo

```bash
# Ejecutar flujo de inicialización DDJJ
wmill flow run f/ddjj/init_ddjj__flow -d '{"token": "eyJhbGc..."}'

# O vía HTTP
curl -X POST http://localhost:8000/api/w/arba/jobs/run/http/f/ddjj/init_ddjj__flow \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

---

## 📋 Caso de Uso: DDJJ (Declaración Jurada)

### Flujo Completo

1. **Usuario autenticado** hace click en "Nueva DDJJ"
2. **Frontend** envía JWT al endpoint `/ddjj/init`
3. **Windmill** ejecuta workflow `init_ddjj__flow`:
   - Parsea JWT y extrae CUIT
   - **Ejecución paralela** de consultas:
     - Datos del padrón (actividad, régimen)
     - Alícuota por código de actividad
     - Historial de declaraciones
     - Períodos adeudados
   - Calcula monto mínimo según reglas de negocio
   - Crea submission en Form.io con datos precargados
4. **Usuario** completa información faltante en formulario
5. **Form.io** envía submission a Windmill
6. **Windmill** valida, procesa y persiste

### Tiempo de Ejecución

- **Antes (secuencial):** ~6 segundos
- **Después (paralelo con branchall):** ~2 segundos
- **Optimización:** 66% de reducción

### Scripts Implementados

| Script | Descripción | Ubicación |
|--------|-------------|-----------|
| `parse_jwt` | Extrae CUIT del token JWT | `f/ddjj/parse_jwt.ts` |
| `fetch_padron` | Consulta datos del padrón | `f/ddjj/fetch_padron.ts` |
| `fetch_alicuota` | Obtiene alícuota por actividad | `f/ddjj/fetch_alicuota.ts` |
| `fetch_historial` | Consulta historial de DDJJ | `f/ddjj/fetch_historial.ts` |
| `fetch_periodos_adeudados` | Obtiene períodos sin DDJJ | `f/ddjj/fetch_periodos_adeudados.ts` |
| `calcular_periodo_minimo` | Calcula monto mínimo | `f/ddjj/calcular_periodo_minimo.ts` |
| `create_formio_submission` | Crea draft en Form.io | `f/ddjj/create_formio_submission.ts` |

### Flow Principal

**`f/ddjj/init_ddjj__flow`**

```yaml
modules:
  - id: a
    value:
      type: rawscript
      path: f/ddjj/parse_jwt
      
  - id: b
    value:
      type: branchall  # Ejecución paralela
      branches:
        - modules:
            - path: f/ddjj/fetch_padron
        - modules:
            - path: f/ddjj/fetch_alicuota
        - modules:
            - path: f/ddjj/fetch_historial
        - modules:
            - path: f/ddjj/fetch_periodos_adeudados
            
  - id: c
    value:
      path: f/ddjj/calcular_periodo_minimo
      
  - id: d
    value:
      path: f/ddjj/create_formio_submission
```

---

## 🧪 Testing

### Datos de Prueba

**CUITs configurados en Mockoon:**
- `20345534234` - Servicios Profesionales (regimen CM, alícuota 3.5%)
- `30677993894` - Comercio Minorista (regimen LOCAL, alícuota 2.5%)

**JWT de ejemplo:**
Ver archivo `../jwt.example` para estructura del token

### Endpoints de Prueba

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

### Ejecutar Scripts Individuales

```bash
# Parse JWT
wmill script run f/ddjj/parse_jwt -d '{"token": "eyJhbGc..."}'

# Fetch padrón
wmill script run f/ddjj/fetch_padron -d '{"cuit": "20345534234"}'

# Calcular mínimo
wmill script run f/ddjj/calcular_periodo_minimo -d '{"regimen": "CM", "alicuota": 3.5}'
```

---

## 🔧 Desarrollo

### Estructura del Proyecto

```
windmill-dev/
├── f/
│   └── ddjj/
│       ├── parse_jwt.ts
│       ├── parse_jwt.script.yaml
│       ├── fetch_padron.ts
│       ├── fetch_alicuota.ts
│       ├── fetch_historial.ts
│       ├── fetch_periodos_adeudados.ts
│       ├── calcular_periodo_minimo.ts
│       ├── create_formio_submission.ts
│       └── init_ddjj__flow/
│           └── flow.yaml
├── wmill-lock.yaml
└── README.md (este archivo)
```

### Workflow de Desarrollo

1. **Modificar scripts localmente**
   ```bash
   # Editar archivos .ts
   vim f/ddjj/mi_script.ts
   ```

2. **Generar metadata**
   ```bash
   wmill script generate-metadata --yes
   ```

3. **Generar locks para flows**
   ```bash
   wmill flow generate-locks --yes
   ```

4. **Push a Windmill**
   ```bash
   wmill sync push --yes
   ```

5. **Pull desde Windmill** (si otros modificaron)
   ```bash
   wmill sync pull --yes
   ```

### Mejores Prácticas

- ✅ Usar `bun` como runtime para TypeScript (más rápido que Deno)
- ✅ Importar librerías sin prefijo `npm:` (ej: `import jwt from 'jsonwebtoken'`)
- ✅ Generar locks antes de hacer push
- ✅ Usar `branchall` para ejecución paralela cuando sea posible
- ✅ Mantener scripts pequeños y enfocados (single responsibility)
- ✅ Documentar parámetros en los scripts

---

## 🐛 Troubleshooting

### Windmill no sincroniza

```bash
# Verificar configuración
wmill workspace whoami

# Regenerar metadata
wmill script generate-metadata --yes
wmill flow generate-locks --yes

# Push forzado
wmill sync push --yes
```

### Error de importación en scripts

```bash
# Verificar que el lenguaje sea 'bun' en .script.yaml
cat f/ddjj/mi_script.script.yaml

# Debe tener:
# language: bun
```

### Mockoon no responde

```bash
# Verificar que está corriendo
curl http://localhost:3001/api/padron/20345534234

# Reiniciar Mockoon
# Desktop: Stop → Start
# CLI: Ctrl+C → mockoon-cli start --data ../apis/iibb.json
```

### Flow falla en ejecución

```bash
# Ver logs del job
wmill job get <job_id>

# Ver logs en UI
# http://localhost:8000 → Runs → Click en el job
```

---

## 📚 Documentación Relacionada

### Guías Internas

- 📘 [Guía de Desarrollo Windmill](DESARROLLO_WINDMILL.md) - Documentación técnica completa
- 📄 [Implementación DDJJ](../IMPLEMENTACION_DDJJ.md) - Caso de uso detallado
- 📗 [APIs Mock](../apis/README.md) - Configuración de Mockoon
- 📙 [Arquitectura Frontend](../formio-front.md) - Integración Form.io

### Documentación Externa

- 📖 [Windmill Docs](https://www.windmill.dev/docs)
- 📖 [Windmill CLI](https://www.windmill.dev/docs/advanced/cli)
- 📖 [Form.io Docs](https://help.form.io/)
- 📖 [Mockoon Docs](https://mockoon.com/docs/)

---

## 🔐 Principios de Seguridad

1. **CUIT siempre proviene del token JWT** - El frontend nunca decide el CUIT
2. **El formulario es solo UI** - No ejecuta lógica tributaria crítica
3. **La lógica de negocio vive en Windmill** - Motor fiscal separado del motor de UI
4. **Submit final siempre revalida** - No confiar en validaciones del frontend
5. **Secrets en variables de entorno** - No hardcodear credenciales

---
