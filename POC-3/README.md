# 📋 POCs de Formularios con SurveyJS para IIBB

Este documento describe las arquitecturas alternativas a evaluar para el sistema de formularios de IIBB con precarga de datos, validaciones custom y valores dinámicos por usuario.

## 🎯 Requisitos del Sistema

- ✅ Precarga de datos desde backend (padrón, alícuotas, históricos)
- ✅ Usuario completa formulario con datos precargados
- ✅ Validaciones custom por usuario
- ✅ Valores de select dinámicos (períodos adeudados, etc.)
- ✅ Integración con APIs externas (Mockoon)

---

## 🏗️ POC 3: Endatix + SurveyJS Library + Windmill

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


## 🔗 Referencias

- [Endatix GitHub](https://github.com/endatix/endatix)
- [Endatix Hub](https://github.com/endatix/endatix-hub)
- [SurveyJS Library](https://github.com/surveyjs/survey-library)
- [SurveyJS Documentation](https://surveyjs.io/form-library/documentation/overview)
