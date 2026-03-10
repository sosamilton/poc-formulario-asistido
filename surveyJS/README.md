# 📋 POCs de Formularios con SurveyJS para IIBB

Este documento describe las arquitecturas alternativas a evaluar para el sistema de formularios de IIBB con precarga de datos, validaciones custom y valores dinámicos por usuario.

## 🎯 Requisitos del Sistema

- ✅ Precarga de datos desde backend (padrón, alícuotas, históricos)
- ✅ Usuario completa formulario con datos precargados
- ✅ Validaciones custom por usuario
- ✅ Valores de select dinámicos (períodos adeudados, etc.)
- ✅ Integración con APIs externas (Mockoon)

---

## 🏗️ POC 1: Endatix + SurveyJS Library + Windmill

### Arquitectura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   Endatix    │─────▶│  PostgreSQL │
│  (React +   │◀─────│  API (.NET)  │◀─────│             │
│  SurveyJS)  │      └──────────────┘      └─────────────┘
└─────────────┘              │
       │                     │
       │              ┌──────▼──────┐
       └─────────────▶│  Windmill   │
                      │  (Workflows)│
                      └─────────────┘
                             │
                      ┌──────▼──────┐
                      │ APIs Mockoon│
                      │ (Padrón, etc)│
                      └─────────────┘
```

### Stack Tecnológico

**Backend:**
- Endatix API (.NET 10.0)
- PostgreSQL
- Windmill (Python workflows)

**Frontend:**
- React + TypeScript
- SurveyJS Library
- Vite

### Flujo de Precarga de Datos

1. **Frontend** → Windmill workflow `init_ddjj`
   - Envía token JWT del usuario
   
2. **Windmill** ejecuta workflow:
   - Parsea JWT → extrae CUIT
   - Llama APIs en paralelo:
     - `fetch_padron` → obtiene actividad, régimen
     - `fetch_historial` → obtiene monto anterior
     - `fetch_periodos_adeudados` → períodos sin DDJJ
   - `fetch_alicuota` → obtiene alícuota por código de actividad
   
3. **Windmill** → Endatix API:
   - POST `/api/forms/{formId}/submissions` con datos precargados
   - Endatix crea submission con estado "partial"
   
4. **Endatix** devuelve:
   ```json
   {
     "submissionId": "uuid-xxx",
     "formDefinition": { /* SurveyJS JSON */ },
     "data": { /* datos precargados */ }
   }
   ```

5. **Frontend** renderiza SurveyJS:
   ```javascript
   const survey = new Survey.Model(formDefinition);
   survey.data = data; // Datos precargados
   survey.onComplete.add((sender) => {
     // PUT /api/submissions/{submissionId}
   });
   ```

### Características de Endatix

✅ **Prefilled forms** - Soporte nativo para formularios precargados
✅ **Partial submissions** - Usuario puede guardar y continuar
✅ **Form versioning** - Modificar formularios sin perder submissions
✅ **Webhooks** - Notificaciones de eventos (submission completed, etc.)
✅ **Multitenancy** - Aislamiento por contribuyente
✅ **Custom question types** - Almacenados en BD
✅ **SSO** - Keycloak, OAuth 2.0
✅ **reCAPTCHA** - Protección anti-spam
✅ **Email notifications** - Sendgrid, Mailgun

### Validaciones Custom en SurveyJS

```javascript
// En el JSON del formulario
{
  "type": "text",
  "name": "montoADeclarar",
  "validators": [
    {
      "type": "expression",
      "text": "El monto debe ser mayor al mínimo de ${montoMinimo}",
      "expression": "{montoADeclarar} >= {montoMinimo}"
    }
  ]
}
```

### Selects Dinámicos

```javascript
// Períodos adeudados cargados desde backend
{
  "type": "dropdown",
  "name": "periodoADeclarar",
  "choices": "{periodosAdeudados}", // Array precargado
  "choicesOrder": "asc"
}
```

### Pros

- ✅ Backend robusto y maduro (.NET)
- ✅ Features enterprise (multitenancy, webhooks, SSO)
- ✅ SurveyJS completo con todas las capacidades
- ✅ Separación clara de responsabilidades
- ✅ Escalable y mantenible
- ✅ Documentación completa

### Contras

- ❌ Stack .NET (nuevo para el equipo)
- ❌ PostgreSQL adicional
- ❌ Más componentes que mantener
- ❌ Curva de aprendizaje .NET
- ❌ Requiere Endatix Hub para UI de admin (proyecto separado)

### Instalación y Setup

```bash
# 1. Clonar Endatix
cd /home/msosa/iibb/surveyJS
git clone https://github.com/endatix/endatix.git
cd endatix

# 2. Configurar PostgreSQL
docker run -d \
  --name endatix-postgres \
  -e POSTGRES_PASSWORD=endatix123 \
  -e POSTGRES_DB=endatix \
  -p 5432:5432 \
  postgres:16

# 3. Configurar Endatix
cat > appsettings.Development.json <<EOF
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=endatix;Username=postgres;Password=endatix123"
  },
  "Jwt": {
    "Key": "your-secret-key-min-32-chars-long",
    "Issuer": "endatix-api",
    "Audience": "endatix-client"
  }
}
EOF

# 4. Build y Run
dotnet build
dotnet run --project src/Endatix.Api

# 5. Frontend React + SurveyJS
cd ../
npx create-vite@latest endatix-frontend --template react-ts
cd endatix-frontend
npm install survey-react-ui
```

### Estructura de Proyecto Propuesta

```
/home/msosa/iibb/surveyJS/
├── endatix/                    # Backend API (.NET)
├── endatix-frontend/           # Frontend React + SurveyJS
├── windmill-integration/       # Scripts de Windmill
│   ├── workflows/
│   │   └── init_ddjj.yaml
│   └── scripts/
│       ├── fetch_padron.py
│       ├── fetch_alicuota.py
│       └── create_endatix_submission.py
└── README.md                   # Este archivo
```

---

## 🏗️ POC 2: SurveyJS + Backend Custom (Windmill) + PostgreSQL

### Arquitectura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   Windmill   │─────▶│  PostgreSQL │
│  (React +   │◀─────│  (Backend +  │◀─────│  (Submissions)│
│  SurveyJS)  │      │   Workflows) │      └─────────────┘
└─────────────┘      └──────────────┘
                             │
                      ┌──────▼──────┐
                      │ APIs Mockoon│
                      │ (Padrón, etc)│
                      └─────────────┘
```

### Stack Tecnológico

**Backend:**
- Windmill (Python/TypeScript workflows + scripts)
- PostgreSQL (solo tabla de submissions)

**Frontend:**
- React + TypeScript
- SurveyJS Library
- Vite

### Flujo de Precarga de Datos

1. **Frontend** → Windmill HTTP trigger `/api/r/forms/init`
   - Envía `formId` + token JWT
   
2. **Windmill** ejecuta script `f/forms/init_form.py`:
   - Valida token JWT
   - Ejecuta workflow `f/ddjj/init_ddjj`:
     - Obtiene datos de APIs (padrón, alícuotas, etc.)
   - Crea registro en PostgreSQL:
     ```sql
     INSERT INTO submissions (id, form_id, user_cuit, data, status, created_at)
     VALUES (uuid_generate_v4(), 'ddjj-mensual', '20345534234', 
             '{"cuit": "...", "razonSocial": "...", ...}', 
             'partial', NOW());
     ```
   
3. **Windmill** devuelve:
   ```json
   {
     "submissionId": "uuid-xxx",
     "formDefinition": { /* SurveyJS JSON desde Windmill resource */ },
     "prefillData": { /* datos precargados */ }
   }
   ```

4. **Frontend** renderiza SurveyJS:
   ```javascript
   const survey = new Survey.Model(formDefinition);
   survey.data = prefillData;
   survey.onComplete.add(async (sender) => {
     await fetch('/api/r/forms/submit', {
       method: 'POST',
       body: JSON.stringify({
         submissionId: submissionId,
         data: sender.data
       })
     });
   });
   ```

5. **Al submit** → Windmill script `f/forms/submit_form.py`:
   ```sql
   UPDATE submissions 
   SET data = $1, status = 'completed', completed_at = NOW()
   WHERE id = $2;
   ```

### Schema PostgreSQL

```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id VARCHAR(100) NOT NULL,
    user_cuit VARCHAR(11) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'partial', 'completed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_submissions_user_cuit ON submissions(user_cuit);
CREATE INDEX idx_submissions_form_id ON submissions(form_id);
CREATE INDEX idx_submissions_status ON submissions(status);
```

### Windmill Scripts Necesarios

**1. `f/forms/init_form.py`** (ya existe, mejorar):
```python
def main(form_id: str, token: str) -> Dict[str, Any]:
    # 1. Validar token
    user = validate_token(token)
    
    # 2. Ejecutar workflow de precarga
    workflow_result = wmill.run_flow_sync("f/ddjj/init_ddjj", {"token": token})
    
    # 3. Crear submission en PostgreSQL
    submission_id = create_submission(form_id, user["cuit"], workflow_result)
    
    # 4. Obtener form definition desde resource
    form_definition = get_form_definition(form_id)
    
    return {
        "submissionId": submission_id,
        "formDefinition": form_definition,
        "prefillData": workflow_result
    }
```

**2. `f/forms/submit_form.py`** (nuevo):
```python
def main(submission_id: str, data: Dict[str, Any], token: str) -> Dict[str, Any]:
    # 1. Validar token
    user = validate_token(token)
    
    # 2. Actualizar submission en PostgreSQL
    update_submission(submission_id, data, "completed")
    
    # 3. Ejecutar validaciones de negocio
    validate_ddjj_data(data)
    
    # 4. Webhook/notificación (opcional)
    send_notification(user["email"], "DDJJ completada")
    
    return {"success": True, "submissionId": submission_id}
```

**3. `f/forms/get_submission.py`** (nuevo):
```python
def main(submission_id: str, token: str) -> Dict[str, Any]:
    user = validate_token(token)
    submission = get_submission_from_db(submission_id)
    
    # Verificar que el usuario es dueño de la submission
    if submission["user_cuit"] != user["cuit"]:
        raise Exception("No autorizado")
    
    return submission
```

### Windmill Resources

**Form Definitions** (almacenar JSON de SurveyJS):
```yaml
# f/forms/definitions/ddjj_mensual.json
{
  "title": "Declaración Jurada Mensual IIBB",
  "pages": [
    {
      "name": "datos_contribuyente",
      "elements": [
        {
          "type": "text",
          "name": "cuit",
          "title": "CUIT",
          "readOnly": true
        },
        {
          "type": "text",
          "name": "razonSocial",
          "title": "Razón Social",
          "readOnly": true
        },
        {
          "type": "dropdown",
          "name": "periodoADeclarar",
          "title": "Período a Declarar",
          "choices": "{periodosAdeudados}"
        },
        {
          "type": "text",
          "name": "montoADeclarar",
          "title": "Monto a Declarar",
          "inputType": "number",
          "validators": [
            {
              "type": "expression",
              "text": "El monto debe ser mayor a {montoMinimo}",
              "expression": "{montoADeclarar} >= {montoMinimo}"
            }
          ]
        }
      ]
    }
  ]
}
```

### Pros

- ✅ **Todo en Windmill** - Un solo sistema para workflows + backend
- ✅ **Stack familiar** - Python, TypeScript, PostgreSQL
- ✅ **SurveyJS completo** - Todas las capacidades
- ✅ **Control total** - Lógica custom sin limitaciones
- ✅ **Sin servicios externos** - Menos dependencias
- ✅ **PostgreSQL simple** - Solo tabla de submissions
- ✅ **Aprovecha workflows existentes** - Reutiliza `f/ddjj/init_ddjj`

### Contras

- ❌ **Implementación custom** - Tienes que construir CRUD completo
- ❌ **Sin UI de admin** - Necesitas construir panel
- ❌ **Windmill no es backend tradicional** - Puede ser limitante
- ❌ **Sin features enterprise** - No hay multitenancy, webhooks nativos, etc.
- ❌ **Escalabilidad** - Windmill tiene límites para alto tráfico

### Instalación y Setup

```bash
# 1. Crear tabla en PostgreSQL de Windmill
psql -h localhost -U windmill -d windmill <<EOF
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id VARCHAR(100) NOT NULL,
    user_cuit VARCHAR(11) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
EOF

# 2. Frontend React + SurveyJS
cd /home/msosa/iibb/surveyJS
npx create-vite@latest surveyjs-windmill-frontend --template react-ts
cd surveyjs-windmill-frontend
npm install survey-react-ui axios

# 3. Crear scripts en Windmill
cd /home/msosa/iibb/windmill-dev
# Agregar scripts f/forms/submit_form.py, get_submission.py
# Agregar resource con form definitions
```

### Estructura de Proyecto Propuesta

```
/home/msosa/iibb/
├── windmill-dev/               # Scripts y workflows de Windmill
│   ├── f/forms/
│   │   ├── init_form.py       # Ya existe
│   │   ├── submit_form.py     # Nuevo
│   │   ├── get_submission.py  # Nuevo
│   │   └── definitions/       # Form definitions (SurveyJS JSON)
│   │       └── ddjj_mensual.json
│   └── f/ddjj/                # Workflows existentes
│       └── init_ddjj__flow/
├── surveyJS/
│   └── surveyjs-windmill-frontend/  # Frontend React + SurveyJS
└── README.md
```

---

## 📊 Comparación de POCs

| Característica | POC 1: Endatix | POC 2: Windmill Custom |
|----------------|----------------|------------------------|
| **Backend** | .NET 10.0 | Python/TypeScript |
| **Base de datos** | PostgreSQL dedicado | PostgreSQL de Windmill |
| **Curva de aprendizaje** | Alta (.NET) | Baja (stack actual) |
| **Features enterprise** | ✅ Nativas | ❌ Custom |
| **Multitenancy** | ✅ | ❌ |
| **Webhooks** | ✅ | ⚠️ Manual |
| **Form versioning** | ✅ | ❌ |
| **Partial submissions** | ✅ | ⚠️ Manual |
| **UI de admin** | ⚠️ Endatix Hub | ❌ |
| **Escalabilidad** | ✅ Alta | ⚠️ Media |
| **Mantenimiento** | ⚠️ Más componentes | ✅ Menos componentes |
| **Tiempo de implementación** | 2-3 semanas | 1 semana |

---

## 🎯 Recomendación

### Para Evaluar:

1. **POC 1 (Endatix)** si:
   - Necesitas features enterprise (multitenancy, SSO, webhooks)
   - Planeas escalar a múltiples jurisdicciones/clientes
   - Tienes recursos para aprender .NET
   - Quieres un backend robusto y probado

2. **POC 2 (Windmill Custom)** si:
   - Quieres aprovechar la inversión en Windmill
   - Prefieres stack familiar (Python/TypeScript)
   - Necesitas control total sobre la lógica
   - Tiempo de implementación es crítico

### Criterios de Evaluación:

- ✅ Facilidad de precarga de datos
- ✅ Validaciones custom funcionando
- ✅ Selects dinámicos por usuario
- ✅ Performance (tiempo de carga)
- ✅ Experiencia de desarrollo
- ✅ Facilidad de mantenimiento

---

## 📝 Notas

- Ambos POCs usan **SurveyJS Library** en el frontend (mismo componente)
- La diferencia principal es el **backend** (Endatix vs Windmill custom)
- Los **workflows de Windmill** (`f/ddjj/init_ddjj`) se reutilizan en ambos casos
- **Form.io** queda descartado en favor de SurveyJS por mayor flexibilidad

---

## 🔗 Referencias

- [Endatix GitHub](https://github.com/endatix/endatix)
- [Endatix Hub](https://github.com/endatix/endatix-hub)
- [SurveyJS Library](https://github.com/surveyjs/survey-library)
- [SurveyJS Documentation](https://surveyjs.io/form-library/documentation/overview)
- [Windmill Documentation](https://www.windmill.dev/docs)
