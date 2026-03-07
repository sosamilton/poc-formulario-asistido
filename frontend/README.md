# Frontend - Sistema de Formularios IIBB

MVP con arquitectura Headless CMS y Seguridad Mínima Viable (SMV).

## 🚀 Características

- ✅ **Auth Mock** para desarrollo sin Keycloak
- ✅ **Seguridad desde el inicio** (tokens JWT)
- ✅ **Arquitectura Headless CMS** (schema-driven)
- ✅ **Form.io integration** para renderizado de formularios
- ✅ **Svelte** como framework ligero
- ✅ **Preparado para Keycloak** (fácil migración)

## 📋 Requisitos

- Node.js 18+
- npm o pnpm
- Windmill backend corriendo en `http://localhost:8000`
- Form.io (opcional, se puede usar schemas inline)

## 🛠️ Instalación

```bash
cd frontend
npm install
```

## 🏃 Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🔐 Sistema de Autenticación

### Modo Mock (Desarrollo)

Por defecto, la app usa autenticación mock sin necesidad de Keycloak.

**Usuarios disponibles:**

1. **Contribuyente** (Juan Pérez)
   - CUIT: 27-12345678-9
   - Roles: `contribuyente`
   - Puede: Ver y enviar DDJJ, consultar deuda

2. **Contador** (María González)
   - CUIT: 20-98765432-1
   - Roles: `contador`, `contribuyente`
   - Puede: Todo lo del contribuyente + más formularios

3. **Agente Fiscalización** (Pedro Admin)
   - CUIT: 23-11111111-1
   - Roles: `agente-fiscalizacion`, `admin`
   - Puede: Generar requerimientos, acceso completo

### Cambiar a Keycloak (Producción)

1. Editar `.env`:
```bash
VITE_AUTH_MODE=keycloak
VITE_KEYCLOAK_URL=https://keycloak.example.com
VITE_KEYCLOAK_REALM=tributario
VITE_KEYCLOAK_CLIENT_ID=formio-frontend
```

2. El código ya está preparado, solo cambiar la variable de entorno.

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── lib/
│   │   ├── auth.js           # Sistema de autenticación (mock + keycloak)
│   │   ├── api.js            # Cliente API con tokens
│   │   └── formio-client.js  # Cliente Form.io
│   ├── components/
│   │   └── FormRenderer.svelte  # Renderizador de formularios
│   ├── App.svelte            # Componente principal
│   └── main.js               # Entry point
├── index.html
├── vite.config.js
├── package.json
└── .env                      # Configuración (no commitear)
```

## 🔒 Seguridad

### Tokens JWT

Todos los requests al backend incluyen el token:

```javascript
Authorization: Bearer <token>
```

### Validación en Backend

Cada endpoint de Windmill valida el token:

```python
from f.auth.validate_token import main as validate_token

def main(token: str, ...):
    user = validate_token(token)
    # ... resto del código
```

### Permisos por Rol

Los formularios se filtran según los roles del usuario:

```python
# Solo usuarios con rol "agente-fiscalizacion" ven este formulario
"requiredRoles": ["agente-fiscalizacion"]
```

## 🎨 Agregar Nuevos Formularios

### 1. Definir en Backend

Editar `windmill-dev/f/config/get_user_config.py`:

```python
{
    "path": "/mi-formulario",
    "formId": "mi-form-id",
    "metadata": {
        "title": "Mi Formulario",
        "description": "Descripción",
        "lifecycle": {
            "init": "f/forms/init_form",
            "submit": "f/forms/submit_form"
        },
        "requiredRoles": ["contribuyente"]
    }
}
```

### 2. Implementar Lógica

En `windmill-dev/f/forms/init_form.py`:

```python
def init_mi_formulario(user, params):
    return {
        "submissionId": None,
        "prefillData": {...},
        "formSchema": {...}
    }
```

En `windmill-dev/f/forms/submit_form.py`:

```python
def process_mi_formulario(data, user):
    # Procesar datos
    return {"success": True, "message": "OK"}
```

### 3. Listo!

El frontend automáticamente:
- Muestra el formulario en el menú (si el usuario tiene permisos)
- Renderiza el schema
- Maneja el submit

## 🧪 Testing

```bash
# Correr tests (cuando los agregues)
npm test
```

## 📦 Build para Producción

```bash
npm run build
```

Los archivos estáticos quedan en `dist/`

## 🔄 Migración a Keycloak

Cuando tengas Keycloak listo:

1. Cambiar `VITE_AUTH_MODE=keycloak` en `.env`
2. Configurar las variables de Keycloak
3. Listo! El código ya soporta ambos modos

## 🐛 Troubleshooting

### "No autenticado"

- Verificar que Windmill esté corriendo
- Verificar que los scripts de Windmill estén desplegados
- Revisar la consola del navegador

### "Usuario no autorizado"

- Verificar los roles del usuario mock
- Verificar `requiredRoles` en la definición del formulario

### Formulario no se renderiza

- Verificar que el `formSchema` tenga `components`
- Revisar la consola del navegador
- Verificar que Form.io esté cargado

## 📚 Documentación

- [Form.io Docs](https://help.form.io)
- [Svelte Docs](https://svelte.dev)
- [Windmill Docs](https://docs.windmill.dev)

## 🎯 Próximos Pasos

- [ ] Agregar autosave
- [ ] Implementar draft submissions en Form.io
- [ ] Agregar tests
- [ ] Implementar offline support
- [ ] Agregar más formularios
- [ ] Integrar con Keycloak real
