# 🏗️ Arquitecturas para Sistema de Formularios y Trámites Digitales

## 📋 Contexto

**Stack tecnológico:**
- Backend: Windmill (workflows, scripts, APIs)
- Formularios: Form.io OSS (builder + renderer JS)
- Despliegue: Self-hosted

**Requisitos:**
1. Soportar formularios simples (render + submit)
2. Soportar aplicaciones complejas (branding, navegación, multi-paso, lógica adicional)
3. Arquitectura modular y schema-driven
4. Escalabilidad sin reescribir frontend

---

# 🎯 ARQUITECTURA 1: Micro-Frontend Modular (RECOMENDADA)

## Concepto

Sistema de **micro-frontends** donde cada componente es independiente y se orquesta mediante un **Application Shell** configurable por schema.

## Componentes principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Shell                         │
│  (Routing, Auth, Branding, Navigation, State Management)    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼─────────┐
│ Form Renderer  │  │   Workflow  │  │  Custom Modules  │
│    Module      │  │   Stepper   │  │   (opcional)     │
└───────┬────────┘  └──────┬──────┘  └────────┬─────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼──────────┐
                │   Backend Adapter    │
                │  (Windmill Client)   │
                └───────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼─────────┐
│   Windmill     │  │  Form.io    │  │  External APIs   │
│   (Backend)    │  │    API      │  │                  │
└────────────────┘  └─────────────┘  └──────────────────┘
```

### 1. **Application Shell** (React/Vue/Vanilla JS)

**Responsabilidades:**
- Autenticación (Keycloak integration)
- Routing dinámico basado en configuración
- Layout y branding (header, footer, sidebar)
- State management global
- Carga dinámica de módulos

**Configuración schema-driven:**

```json
{
  "appId": "ddjj-iibb",
  "version": "1.0.0",
  "branding": {
    "logo": "/assets/logo.png",
    "theme": "rentas-ba",
    "title": "Declaraciones Juradas IIBB"
  },
  "auth": {
    "provider": "keycloak",
    "realm": "tributario"
  },
  "routes": [
    {
      "path": "/ddjj/:periodo",
      "module": "form-renderer",
      "config": {
        "formId": "ddjj-mensual",
        "workflow": "ddjj-init-submit"
      }
    },
    {
      "path": "/tramites/inscripcion",
      "module": "multi-step-wizard",
      "config": {
        "steps": [
          {"formId": "datos-contribuyente", "title": "Datos del Contribuyente"},
          {"formId": "actividades", "title": "Actividades"},
          {"formId": "documentacion", "title": "Documentación"}
        ],
        "workflow": "inscripcion-workflow"
      }
    }
  ]
}
```

### 2. **Form Renderer Module**

**Responsabilidades:**
- Renderizar formularios Form.io
- Manejar prefill de datos
- Gestionar submissions
- Validaciones client-side

**Implementación:**

```typescript
// form-renderer.module.ts
export class FormRendererModule {
  private formio: any;
  private windmillClient: WindmillClient;
  
  async initialize(config: FormConfig) {
    const { formId, workflow } = config;
    
    // 1. Obtener datos precargados desde Windmill
    const initData = await this.windmillClient.run(
      `${workflow}/init`,
      { token: this.getAuthToken() }
    );
    
    // 2. Crear draft submission en Form.io (opcional)
    let submissionId = null;
    if (initData.createDraft) {
      const submission = await this.createDraftSubmission(
        formId,
        initData.prefillData
      );
      submissionId = submission._id;
    }
    
    // 3. Renderizar formulario
    this.formio = await Formio.createForm(
      document.getElementById('form-container'),
      `${FORMIO_API}/form/${formId}`,
      {
        submission: submissionId 
          ? { _id: submissionId }
          : { data: initData.prefillData },
        hooks: {
          beforeSubmit: this.beforeSubmit.bind(this)
        }
      }
    );
    
    // 4. Configurar event handlers
    this.formio.on('submit', this.handleSubmit.bind(this));
  }
  
  async handleSubmit(submission: any) {
    // Enviar a Windmill para validación y persistencia final
    const result = await this.windmillClient.run(
      `${this.config.workflow}/submit`,
      {
        token: this.getAuthToken(),
        data: submission.data
      }
    );
    
    if (result.success) {
      this.router.navigate(result.redirectUrl || '/success');
    } else {
      this.showErrors(result.errors);
    }
  }
  
  async createDraftSubmission(formId: string, data: any) {
    const formio = new Formio(`${FORMIO_API}/form/${formId}`);
    return await formio.saveSubmission({ data });
  }
}
```

### 3. **Workflow Stepper Module** (para trámites multi-paso)

**Responsabilidades:**
- Navegación entre pasos
- Persistencia de estado intermedio
- Progress tracking
- Validación por paso

```typescript
// workflow-stepper.module.ts
export class WorkflowStepperModule {
  private steps: StepConfig[];
  private currentStep: number = 0;
  private sessionData: any = {};
  
  async initialize(config: WorkflowConfig) {
    this.steps = config.steps;
    await this.loadOrCreateSession();
    this.renderStep(this.currentStep);
  }
  
  async loadOrCreateSession() {
    // Obtener o crear sesión de workflow en Windmill
    const session = await this.windmillClient.run(
      'workflow/get-or-create-session',
      { workflowId: this.config.workflowId }
    );
    this.sessionData = session.data;
    this.currentStep = session.currentStep || 0;
  }
  
  async renderStep(stepIndex: number) {
    const step = this.steps[stepIndex];
    
    // Renderizar formulario del paso actual
    const formRenderer = new FormRendererModule();
    await formRenderer.initialize({
      formId: step.formId,
      workflow: this.config.workflow,
      onSubmit: this.handleStepSubmit.bind(this)
    });
    
    // Actualizar UI de navegación
    this.updateProgressBar(stepIndex);
  }
  
  async handleStepSubmit(data: any) {
    // Guardar datos del paso
    this.sessionData[this.steps[this.currentStep].id] = data;
    
    // Persistir en backend
    await this.windmillClient.run(
      'workflow/save-step',
      {
        sessionId: this.sessionData.sessionId,
        step: this.currentStep,
        data: data
      }
    );
    
    // Avanzar al siguiente paso o finalizar
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep(this.currentStep);
    } else {
      await this.finalizeWorkflow();
    }
  }
  
  async finalizeWorkflow() {
    const result = await this.windmillClient.run(
      `${this.config.workflow}/finalize`,
      {
        sessionId: this.sessionData.sessionId,
        allData: this.sessionData
      }
    );
    
    this.router.navigate(result.redirectUrl);
  }
}
```

### 4. **Backend Adapter (Windmill Client)**

**Responsabilidades:**
- Comunicación con Windmill API
- Manejo de autenticación
- Retry logic y error handling
- Caching opcional

```typescript
// windmill-client.ts
export class WindmillClient {
  private baseUrl: string;
  private workspace: string;
  
  async run(scriptPath: string, args: any) {
    const response = await fetch(
      `${this.baseUrl}/api/w/${this.workspace}/jobs/run/p/${scriptPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(args)
      }
    );
    
    if (!response.ok) {
      throw new WindmillError(await response.json());
    }
    
    return await response.json();
  }
  
  async runAndWait(scriptPath: string, args: any, timeout = 30000) {
    const job = await this.run(scriptPath, args);
    return await this.waitForJob(job.id, timeout);
  }
  
  private async waitForJob(jobId: string, timeout: number) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(jobId);
      
      if (status.completed) {
        return status.result;
      }
      
      await this.sleep(500);
    }
    
    throw new Error('Job timeout');
  }
}
```

## Flujos de ejemplo

### Flujo 1: Formulario simple (DDJJ)

```
1. Usuario accede a /ddjj/2026-03
2. App Shell carga Form Renderer Module
3. Form Renderer llama a Windmill: f/ddjj/init
   - Windmill valida JWT
   - Extrae CUIT
   - Consulta padrón, historial, períodos adeudados
   - Calcula monto mínimo
   - Crea draft submission en Form.io
   - Retorna submissionId
4. Form Renderer renderiza formulario con datos precargados
5. Usuario completa y envía
6. Form Renderer llama a Windmill: f/ddjj/submit
   - Windmill revalida todo
   - Persiste en sistema oficial
   - Retorna confirmación
7. Redirect a página de éxito
```

### Flujo 2: Trámite multi-paso (Inscripción)

```
1. Usuario accede a /tramites/inscripcion
2. App Shell carga Workflow Stepper Module
3. Stepper crea sesión en Windmill
4. Paso 1: Datos del contribuyente
   - Renderiza formulario
   - Usuario completa
   - Guarda en sesión
5. Paso 2: Actividades
   - Renderiza formulario
   - Precarga datos del paso 1 si es necesario
   - Usuario completa
   - Guarda en sesión
6. Paso 3: Documentación
   - Upload de archivos
   - Usuario completa
7. Finalización:
   - Windmill recibe todos los datos
   - Ejecuta workflow completo
   - Genera expediente
   - Envía notificaciones
8. Redirect a página de confirmación
```

## Ventajas

✅ **Modularidad extrema**: Cada módulo es independiente
✅ **Schema-driven**: Configuración JSON para todo
✅ **Escalabilidad**: Agregar nuevos módulos sin tocar código existente
✅ **Evolución gradual**: Empezar simple, crecer a complejo
✅ **Reutilización**: Mismos módulos para múltiples aplicaciones
✅ **Testing**: Cada módulo se testea independientemente
✅ **Versionado**: Múltiples versiones de módulos coexistiendo

## Desventajas

⚠️ **Complejidad inicial**: Requiere setup más elaborado
⚠️ **Overhead**: Para formularios muy simples puede ser excesivo
⚠️ **Curva de aprendizaje**: Equipo debe entender la arquitectura

---

# 🎯 ARQUITECTURA 2: Headless CMS Pattern

## Concepto

Tratar el sistema de formularios como un **Headless CMS** donde Form.io es el backend de contenido y el frontend es un renderer agnóstico que consume schemas.

## Componentes principales

```
┌─────────────────────────────────────────────────────────┐
│              Universal Form Application                 │
│         (Single SPA - React/Vue/Svelte)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│  Schema Store  │ │   Router   │ │  Theme Engine  │
│   (Metadata)   │ │  (Dynamic) │ │   (Branding)   │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                ┌─────────▼──────────┐
                │  Orchestration     │
                │      Layer         │
                └─────────┬──────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│   Form.io      │ │  Windmill  │ │   Storage      │
│   (Schemas)    │ │ (Business) │ │   (Files)      │
└────────────────┘ └────────────┘ └────────────────┘
```

### 1. **Schema Store** (Metadata Repository)

Define **toda** la aplicación mediante schemas JSON:

```json
{
  "applications": [
    {
      "id": "ddjj-iibb",
      "name": "Declaraciones Juradas IIBB",
      "version": "2.0.0",
      "theme": "rentas-ba",
      "routes": [
        {
          "path": "/ddjj/:periodo",
          "type": "single-form",
          "metadata": {
            "formId": "ddjj-mensual-v2",
            "title": "Declaración Jurada Mensual",
            "description": "Complete su declaración jurada del período {{periodo}}",
            "lifecycle": {
              "init": "f/ddjj/init",
              "validate": "f/ddjj/validate",
              "submit": "f/ddjj/submit",
              "onSuccess": "/ddjj/confirmacion",
              "onError": "/ddjj/error"
            },
            "features": {
              "autosave": true,
              "draftMode": true,
              "offlineSupport": false
            }
          }
        },
        {
          "path": "/tramites/inscripcion",
          "type": "multi-step-form",
          "metadata": {
            "workflowId": "inscripcion-contribuyente",
            "title": "Inscripción de Contribuyente",
            "steps": [
              {
                "id": "step-1",
                "formId": "datos-contribuyente",
                "title": "Datos Personales",
                "validation": "f/inscripcion/validate-step1"
              },
              {
                "id": "step-2",
                "formId": "actividades",
                "title": "Actividades Económicas",
                "dependsOn": ["step-1"],
                "validation": "f/inscripcion/validate-step2"
              }
            ],
            "lifecycle": {
              "init": "f/inscripcion/init-workflow",
              "saveStep": "f/inscripcion/save-step",
              "finalize": "f/inscripcion/finalize"
            }
          }
        }
      ]
    }
  ]
}
```

### 2. **Universal Form Application** (Frontend único)

```typescript
// app.ts - Aplicación universal
export class UniversalFormApp {
  private schemaStore: SchemaStore;
  private orchestrator: Orchestrator;
  private router: DynamicRouter;
  
  async bootstrap() {
    // 1. Cargar configuración de aplicación
    const appConfig = await this.schemaStore.loadApp(
      window.location.hostname
    );
    
    // 2. Aplicar branding/theme
    this.applyTheme(appConfig.theme);
    
    // 3. Configurar router dinámico
    this.router.configure(appConfig.routes);
    
    // 4. Inicializar autenticación
    await this.initAuth(appConfig.auth);
    
    // 5. Comenzar aplicación
    this.router.start();
  }
  
  // Router dinámico basado en metadata
  private configureRouter(routes: RouteConfig[]) {
    routes.forEach(route => {
      this.router.add(route.path, async (params) => {
        const renderer = this.getRenderer(route.type);
        await renderer.render(route.metadata, params);
      });
    });
  }
  
  private getRenderer(type: string): FormRenderer {
    switch(type) {
      case 'single-form':
        return new SingleFormRenderer(this.orchestrator);
      case 'multi-step-form':
        return new MultiStepRenderer(this.orchestrator);
      case 'custom':
        return new CustomRenderer(this.orchestrator);
      default:
        throw new Error(`Unknown renderer type: ${type}`);
    }
  }
}
```

### 3. **Orchestration Layer**

Coordina todas las interacciones entre frontend y backends:

```typescript
// orchestrator.ts
export class Orchestrator {
  private windmill: WindmillClient;
  private formio: FormioClient;
  private cache: CacheManager;
  
  async initializeForm(metadata: FormMetadata, params: any) {
    // 1. Ejecutar script de inicialización
    const initResult = await this.windmill.runAndWait(
      metadata.lifecycle.init,
      { ...params, token: this.getAuthToken() }
    );
    
    // 2. Cargar schema del formulario desde Form.io
    const formSchema = await this.formio.loadForm(metadata.formId);
    
    // 3. Crear draft submission si está habilitado
    let submission = null;
    if (metadata.features.draftMode) {
      submission = await this.formio.createSubmission(
        metadata.formId,
        initResult.prefillData
      );
    }
    
    return {
      schema: formSchema,
      submission: submission,
      prefillData: initResult.prefillData,
      metadata: initResult.metadata
    };
  }
  
  async submitForm(metadata: FormMetadata, data: any) {
    // 1. Validación opcional previa
    if (metadata.lifecycle.validate) {
      const validation = await this.windmill.runAndWait(
        metadata.lifecycle.validate,
        { data, token: this.getAuthToken() }
      );
      
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
    }
    
    // 2. Submit final
    const result = await this.windmill.runAndWait(
      metadata.lifecycle.submit,
      { data, token: this.getAuthToken() }
    );
    
    return result;
  }
  
  async autosave(formId: string, submissionId: string, data: any) {
    // Autosave periódico en Form.io
    await this.formio.updateSubmission(submissionId, data);
  }
}
```

### 4. **Single Form Renderer**

```typescript
// renderers/single-form.renderer.ts
export class SingleFormRenderer implements FormRenderer {
  private formio: any;
  private autosaveTimer: any;
  
  async render(metadata: FormMetadata, params: any) {
    // 1. Inicializar formulario
    const formData = await this.orchestrator.initializeForm(
      metadata,
      params
    );
    
    // 2. Renderizar
    this.formio = await Formio.createForm(
      document.getElementById('form-container'),
      formData.schema,
      {
        submission: formData.submission || { data: formData.prefillData },
        readOnly: metadata.readOnly || false
      }
    );
    
    // 3. Configurar autosave
    if (metadata.features.autosave) {
      this.setupAutosave(metadata, formData.submission?._id);
    }
    
    // 4. Manejar submit
    this.formio.on('submit', async (submission) => {
      const result = await this.orchestrator.submitForm(
        metadata,
        submission.data
      );
      
      if (result.success) {
        window.location.href = metadata.lifecycle.onSuccess;
      } else {
        this.showErrors(result.errors);
      }
    });
  }
  
  private setupAutosave(metadata: FormMetadata, submissionId: string) {
    this.formio.on('change', () => {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(async () => {
        const data = this.formio.submission.data;
        await this.orchestrator.autosave(
          metadata.formId,
          submissionId,
          data
        );
        this.showAutosaveIndicator();
      }, 2000);
    });
  }
}
```

## Ventajas

✅ **Configuración total por schema**: Todo es metadata
✅ **Frontend único**: Una sola aplicación para todos los formularios
✅ **Deployment simple**: Un solo bundle
✅ **Consistencia**: UX uniforme en todos los formularios
✅ **Fácil mantenimiento**: Cambios en schemas, no en código
✅ **Multi-tenancy**: Múltiples aplicaciones con mismo código

## Desventajas

⚠️ **Menos flexible**: Difícil agregar comportamientos muy custom
⚠️ **Schema complexity**: Schemas pueden volverse muy complejos
⚠️ **Performance**: Bundle único puede ser grande

---

# 🎯 ARQUITECTURA 3: Event-Driven Micro-Services

## Concepto

Sistema basado en **eventos** donde cada componente es un servicio independiente que se comunica mediante eventos, permitiendo máxima flexibilidad y escalabilidad.

## Componentes principales

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│         (Thin client - React/Vue/Vanilla)               │
└─────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket / SSE
                          │
┌─────────────────────────▼─────────────────────────────┐
│                  Event Bus / Message Broker            │
│              (Redis Pub/Sub / NATS / Kafka)            │
└─────────────────────────┬─────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│  Form Service  │ │  Workflow  │ │  Notification  │
│                │ │  Service   │ │    Service     │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│   Form.io      │ │  Windmill  │ │   Database     │
└────────────────┘ └────────────┘ └────────────────┘
```

### 1. **Event Bus** (Redis Pub/Sub o NATS)

```typescript
// event-bus.ts
export class EventBus {
  private redis: Redis;
  private handlers: Map<string, Function[]> = new Map();
  
  async publish(event: DomainEvent) {
    await this.redis.publish(
      event.type,
      JSON.stringify(event)
    );
  }
  
  subscribe(eventType: string, handler: Function) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
      this.redis.subscribe(eventType);
    }
    this.handlers.get(eventType).push(handler);
  }
  
  async emit(eventType: string, payload: any) {
    const event: DomainEvent = {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date(),
      payload: payload,
      metadata: {
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId()
      }
    };
    
    await this.publish(event);
  }
}

// Eventos del dominio
interface DomainEvent {
  id: string;
  type: string;
  timestamp: Date;
  payload: any;
  metadata: {
    userId: string;
    sessionId: string;
  };
}
```

### 2. **Form Service** (Windmill)

```python
# f/forms/init_form.py
import wmill
from typing import Dict, Any

async def main(
    form_id: str,
    user_token: str,
    params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Inicializa un formulario y emite eventos
    """
    # 1. Validar usuario
    user = await validate_token(user_token)
    
    # 2. Cargar configuración del formulario
    form_config = await load_form_config(form_id)
    
    # 3. Ejecutar lógica de precarga
    prefill_data = await execute_prefill_logic(
        form_config,
        user,
        params
    )
    
    # 4. Crear draft submission
    submission = await create_draft_submission(
        form_id,
        prefill_data
    )
    
    # 5. Emitir evento
    await emit_event({
        "type": "form.initialized",
        "payload": {
            "formId": form_id,
            "submissionId": submission["_id"],
            "userId": user["id"]
        }
    })
    
    return {
        "submissionId": submission["_id"],
        "prefillData": prefill_data,
        "formSchema": form_config["schema"]
    }


# f/forms/submit_form.py
async def main(
    form_id: str,
    submission_id: str,
    data: Dict[str, Any],
    user_token: str
) -> Dict[str, Any]:
    """
    Procesa el submit de un formulario
    """
    # 1. Validar
    user = await validate_token(user_token)
    
    # 2. Validaciones de negocio
    validation_result = await validate_business_rules(
        form_id,
        data
    )
    
    if not validation_result["valid"]:
        await emit_event({
            "type": "form.validation_failed",
            "payload": {
                "formId": form_id,
                "submissionId": submission_id,
                "errors": validation_result["errors"]
            }
        })
        return {"success": False, "errors": validation_result["errors"]}
    
    # 3. Persistir
    result = await persist_submission(form_id, data)
    
    # 4. Emitir evento de éxito
    await emit_event({
        "type": "form.submitted",
        "payload": {
            "formId": form_id,
            "submissionId": submission_id,
            "userId": user["id"],
            "data": data
        }
    })
    
    # 5. Trigger workflow si corresponde
    if result.get("triggerWorkflow"):
        await emit_event({
            "type": "workflow.start",
            "payload": {
                "workflowId": result["workflowId"],
                "submissionId": submission_id
            }
        })
    
    return {"success": True, "result": result}
```

### 3. **Workflow Service** (Windmill)

```python
# f/workflows/orchestrator.py
async def main(event: Dict[str, Any]):
    """
    Orquesta workflows basados en eventos
    """
    event_type = event["type"]
    
    if event_type == "form.submitted":
        await handle_form_submission(event["payload"])
    elif event_type == "workflow.step_completed":
        await handle_step_completion(event["payload"])
    elif event_type == "workflow.start":
        await start_workflow(event["payload"])


async def start_workflow(payload: Dict[str, Any]):
    workflow_id = payload["workflowId"]
    submission_id = payload["submissionId"]
    
    # Cargar definición del workflow
    workflow_def = await load_workflow_definition(workflow_id)
    
    # Crear sesión de workflow
    session = await create_workflow_session(
        workflow_id,
        submission_id
    )
    
    # Ejecutar primer paso
    first_step = workflow_def["steps"][0]
    await execute_step(session["id"], first_step)
    
    # Emitir evento
    await emit_event({
        "type": "workflow.started",
        "payload": {
            "workflowId": workflow_id,
            "sessionId": session["id"]
        }
    })


async def handle_step_completion(payload: Dict[str, Any]):
    session_id = payload["sessionId"]
    step_index = payload["stepIndex"]
    
    # Cargar sesión
    session = await load_workflow_session(session_id)
    workflow_def = await load_workflow_definition(session["workflowId"])
    
    # Verificar si hay más pasos
    if step_index + 1 < len(workflow_def["steps"]):
        next_step = workflow_def["steps"][step_index + 1]
        await execute_step(session_id, next_step)
    else:
        # Workflow completado
        await finalize_workflow(session_id)
        await emit_event({
            "type": "workflow.completed",
            "payload": {
                "workflowId": session["workflowId"],
                "sessionId": session_id
            }
        })
```

### 4. **Frontend Event-Driven**

```typescript
// frontend/event-driven-app.ts
export class EventDrivenFormApp {
  private eventBus: EventBusClient;
  private formio: any;
  
  async initialize() {
    // Conectar al event bus
    this.eventBus = new EventBusClient('wss://api.example.com/events');
    
    // Suscribirse a eventos relevantes
    this.eventBus.on('form.initialized', this.handleFormInitialized.bind(this));
    this.eventBus.on('form.validation_failed', this.handleValidationFailed.bind(this));
    this.eventBus.on('workflow.step_completed', this.handleStepCompleted.bind(this));
    
    // Iniciar formulario
    await this.initForm();
  }
  
  async initForm() {
    // Emitir evento de inicialización
    await this.eventBus.emit('form.init_requested', {
      formId: this.getFormId(),
      params: this.getParams()
    });
  }
  
  handleFormInitialized(event: any) {
    const { submissionId, prefillData, formSchema } = event.payload;
    
    // Renderizar formulario
    Formio.createForm(
      document.getElementById('form'),
      formSchema,
      {
        submission: { _id: submissionId }
      }
    ).then(form => {
      this.formio = form;
      
      // Configurar submit
      form.on('submit', async (submission) => {
        await this.eventBus.emit('form.submit_requested', {
          formId: this.getFormId(),
          submissionId: submissionId,
          data: submission.data
        });
      });
    });
  }
  
  handleValidationFailed(event: any) {
    this.formio.setErrors(event.payload.errors);
  }
  
  handleStepCompleted(event: any) {
    // Navegar al siguiente paso
    this.router.navigate(`/step/${event.payload.nextStep}`);
  }
}
```

## Ventajas

✅ **Máxima escalabilidad**: Servicios independientes
✅ **Desacoplamiento total**: Componentes no se conocen entre sí
✅ **Resilencia**: Fallas aisladas por servicio
✅ **Auditoría completa**: Todos los eventos quedan registrados
✅ **Extensibilidad**: Agregar servicios sin modificar existentes
✅ **Real-time**: Actualizaciones en tiempo real vía eventos

## Desventajas

⚠️ **Complejidad operacional**: Requiere infraestructura de mensajería
⚠️ **Debugging difícil**: Flujos distribuidos son más complejos
⚠️ **Latencia**: Comunicación asíncrona puede agregar latencia
⚠️ **Eventual consistency**: No hay consistencia inmediata

---

# 📊 Comparación de Arquitecturas

| Criterio | Micro-Frontend | Headless CMS | Event-Driven |
|----------|----------------|--------------|--------------|
| **Complejidad inicial** | Media | Baja | Alta |
| **Flexibilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mantenibilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Curva aprendizaje** | Media | Baja | Alta |
| **Self-hosted friendly** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mejor para** | Aplicaciones complejas | Formularios simples | Sistemas distribuidos |

---

# 🎨 Patrones de Diseño Recomendados

## 1. **Repository Pattern** (para todas las arquitecturas)

```typescript
// repositories/form.repository.ts
export interface FormRepository {
  loadForm(formId: string): Promise<FormSchema>;
  createSubmission(formId: string, data: any): Promise<Submission>;
  updateSubmission(submissionId: string, data: any): Promise<Submission>;
  getSubmission(submissionId: string): Promise<Submission>;
}

export class FormioRepository implements FormRepository {
  private client: FormioClient;
  
  async loadForm(formId: string): Promise<FormSchema> {
    return await this.client.get(`/form/${formId}`);
  }
  
  async createSubmission(formId: string, data: any): Promise<Submission> {
    return await this.client.post(`/form/${formId}/submission`, { data });
  }
}
```

## 2. **Strategy Pattern** (para validaciones)

```typescript
// validators/validation-strategy.ts
export interface ValidationStrategy {
  validate(data: any): Promise<ValidationResult>;
}

export class ClientSideValidation implements ValidationStrategy {
  async validate(data: any): Promise<ValidationResult> {
    // Validaciones simples en cliente
    return { valid: true, errors: [] };
  }
}

export class ServerSideValidation implements ValidationStrategy {
  constructor(private windmill: WindmillClient) {}
  
  async validate(data: any): Promise<ValidationResult> {
    // Validaciones complejas en servidor
    return await this.windmill.run('f/validation/validate', { data });
  }
}

export class ValidationContext {
  private strategy: ValidationStrategy;
  
  setStrategy(strategy: ValidationStrategy) {
    this.strategy = strategy;
  }
  
  async validate(data: any): Promise<ValidationResult> {
    return await this.strategy.validate(data);
  }
}
```

## 3. **Observer Pattern** (para eventos de formulario)

```typescript
// observers/form-observer.ts
export interface FormObserver {
  onFormChange(data: any): void;
  onFormSubmit(data: any): void;
  onFormError(error: any): void;
}

export class AutosaveObserver implements FormObserver {
  private timer: any;
  
  onFormChange(data: any) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.autosave(data);
    }, 2000);
  }
  
  onFormSubmit(data: any) {
    clearTimeout(this.timer);
  }
  
  onFormError(error: any) {
    console.error('Form error:', error);
  }
  
  private async autosave(data: any) {
    // Guardar borrador
  }
}

export class AnalyticsObserver implements FormObserver {
  onFormChange(data: any) {
    this.trackEvent('form_changed', { fields: Object.keys(data) });
  }
  
  onFormSubmit(data: any) {
    this.trackEvent('form_submitted', { formId: data.formId });
  }
  
  onFormError(error: any) {
    this.trackEvent('form_error', { error: error.message });
  }
}
```

## 4. **Builder Pattern** (para construcción de formularios complejos)

```typescript
// builders/form-builder.ts
export class FormBuilder {
  private config: FormConfig = {};
  
  setFormId(formId: string): this {
    this.config.formId = formId;
    return this;
  }
  
  setPrefillData(data: any): this {
    this.config.prefillData = data;
    return this;
  }
  
  enableAutosave(interval: number = 2000): this {
    this.config.autosave = { enabled: true, interval };
    return this;
  }
  
  enableDraftMode(): this {
    this.config.draftMode = true;
    return this;
  }
  
  setValidation(strategy: ValidationStrategy): this {
    this.config.validation = strategy;
    return this;
  }
  
  addObserver(observer: FormObserver): this {
    if (!this.config.observers) {
      this.config.observers = [];
    }
    this.config.observers.push(observer);
    return this;
  }
  
  async build(): Promise<FormInstance> {
    return new FormInstance(this.config);
  }
}

// Uso:
const form = await new FormBuilder()
  .setFormId('ddjj-mensual')
  .setPrefillData({ cuit: '27-12345678-9' })
  .enableAutosave()
  .enableDraftMode()
  .setValidation(new ServerSideValidation(windmillClient))
  .addObserver(new AutosaveObserver())
  .addObserver(new AnalyticsObserver())
  .build();
```

---

# 🔄 Versionado de Formularios

## Estrategia recomendada: Semantic Versioning + Migrations

```typescript
// version-manager.ts
export class FormVersionManager {
  async getFormVersion(formId: string, version?: string): Promise<FormSchema> {
    if (!version) {
      // Obtener última versión
      return await this.getLatestVersion(formId);
    }
    
    // Obtener versión específica
    return await this.getSpecificVersion(formId, version);
  }
  
  async migrateSubmission(
    submission: Submission,
    fromVersion: string,
    toVersion: string
  ): Promise<Submission> {
    const migrations = await this.getMigrations(fromVersion, toVersion);
    
    let migratedData = submission.data;
    for (const migration of migrations) {
      migratedData = await migration.migrate(migratedData);
    }
    
    return {
      ...submission,
      data: migratedData,
      metadata: {
        ...submission.metadata,
        migratedFrom: fromVersion,
        migratedTo: toVersion
      }
    };
  }
}

// Ejemplo de migración
export class DdjjV1ToV2Migration implements Migration {
  fromVersion = '1.0.0';
  toVersion = '2.0.0';
  
  async migrate(data: any): Promise<any> {
    return {
      ...data,
      // Renombrar campo
      montoDeclarado: data.monto,
      // Agregar nuevo campo con valor por defecto
      tipoDeclaracion: 'mensual',
      // Eliminar campo obsoleto
      monto: undefined
    };
  }
}
```

## Schema de versionado en Form.io

```json
{
  "title": "DDJJ Mensual",
  "name": "ddjjMensual",
  "path": "ddjj-mensual",
  "type": "form",
  "display": "form",
  "version": "2.1.0",
  "metadata": {
    "semanticVersion": "2.1.0",
    "changelog": [
      {
        "version": "2.1.0",
        "date": "2026-03-01",
        "changes": ["Agregado campo observaciones"]
      },
      {
        "version": "2.0.0",
        "date": "2026-01-15",
        "changes": ["Cambio de estructura de montos", "Nuevo campo tipo declaración"]
      }
    ],
    "compatibleWith": ["2.0.0", "2.1.0"],
    "deprecatedVersions": ["1.0.0", "1.1.0"]
  },
  "components": [...]
}
```

---

# 🔗 Integración Workflows Backend con Formularios

## Patrón: Workflow-Form Binding

```typescript
// workflow-form-binding.ts
export class WorkflowFormBinding {
  async bindFormToWorkflow(
    formId: string,
    workflowId: string,
    config: BindingConfig
  ) {
    // 1. Registrar binding en metadata
    await this.registerBinding(formId, workflowId, config);
    
    // 2. Configurar triggers
    await this.setupTriggers(formId, workflowId, config.triggers);
    
    // 3. Configurar data mapping
    await this.setupDataMapping(formId, workflowId, config.mapping);
  }
  
  private async setupTriggers(
    formId: string,
    workflowId: string,
    triggers: TriggerConfig[]
  ) {
    for (const trigger of triggers) {
      switch (trigger.event) {
        case 'onSubmit':
          await this.createWebhook(
            formId,
            'submit',
            `${WINDMILL_URL}/api/w/${WORKSPACE}/jobs/run/f/${workflowId}`
          );
          break;
        case 'onSave':
          await this.createWebhook(
            formId,
            'save',
            `${WINDMILL_URL}/api/w/${WORKSPACE}/jobs/run/f/${workflowId}/autosave`
          );
          break;
      }
    }
  }
}
```

## Ejemplo de configuración

```json
{
  "bindings": [
    {
      "formId": "ddjj-mensual",
      "workflowId": "f/ddjj/process",
      "triggers": [
        {
          "event": "onSubmit",
          "action": "start_workflow",
          "async": true
        }
      ],
      "mapping": {
        "form.data.cuit": "workflow.input.contribuyente.cuit",
        "form.data.periodo": "workflow.input.periodo",
        "form.data.montoDeclarado": "workflow.input.declaracion.monto"
      },
      "callbacks": {
        "onWorkflowComplete": {
          "action": "redirect",
          "url": "/ddjj/confirmacion?id={{workflow.result.expedienteId}}"
        },
        "onWorkflowError": {
          "action": "show_error",
          "message": "{{workflow.error.message}}"
        }
      }
    }
  ]
}
```

---

# 🎯 Recomendación Final

Para tu caso específico (sistema tributario con Windmill + Form.io), recomiendo:

## **ARQUITECTURA 1 (Micro-Frontend Modular)** como base

**Razones:**
1. ✅ Máxima flexibilidad para evolucionar
2. ✅ Permite empezar simple y crecer
3. ✅ Separación clara de responsabilidades
4. ✅ Self-hosted friendly
5. ✅ Fácil agregar nuevos módulos sin romper existentes

## Implementación por fases

### Fase 1: MVP (Formularios simples)
- Application Shell básico
- Form Renderer Module
- Windmill Client
- Autenticación Keycloak

### Fase 2: Workflows (Trámites multi-paso)
- Workflow Stepper Module
- Session management
- Progress tracking

### Fase 3: Features avanzados
- Autosave
- Offline support
- File uploads
- Custom validations

### Fase 4: Optimizaciones
- Caching
- Analytics
- A/B testing
- Performance monitoring

---

# 📚 Recursos adicionales

- Form.io SDK: https://github.com/formio/formio.js
- Windmill Docs: https://docs.windmill.dev
- Micro-frontends: https://micro-frontends.org
- Event-Driven Architecture: https://martinfowler.com/articles/201701-event-driven.html
