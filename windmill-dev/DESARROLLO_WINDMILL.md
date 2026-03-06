# Guía de Desarrollo con Windmill y Sincronización Git

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Configuración Inicial](#configuración-inicial)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Flujo de Trabajo de Desarrollo](#flujo-de-trabajo-de-desarrollo)
5. [Sincronización con Git](#sincronización-con-git)
6. [Comandos Útiles](#comandos-útiles)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Troubleshooting](#troubleshooting)

---

## Introducción

Windmill permite desarrollar scripts, flows y apps localmente y sincronizarlos con una instancia deployada (localhost o producción) usando Git como fuente de verdad.

**Conceptos clave:**
- **Local**: Archivos en tu máquina (`.ts`, `.yaml`, `.lock`)
- **Remote**: Instancia de Windmill (localhost:8000 o dominio)
- **Git**: Repositorio que actúa como fuente de verdad

---

## Configuración Inicial

### 1. Instalar Windmill CLI

```bash
npm install -g windmill-cli
# o
pnpm install -g windmill-cli
```

### 2. Verificar instalación

```bash
wmill version
```

### 3. Configurar workspace

#### Para localhost:

```bash
# Agregar workspace local
wmill workspace add local workspaceName http://localhost:8000

# Cambiar al workspace
wmill workspace switch local
```

#### Para dominio remoto:

```bash
# Agregar workspace de producción
wmill workspace add prod workspaceName https://windmill.tudominio.com

# Cambiar al workspace
wmill workspace switch prod
```

### 4. Autenticación

Necesitas un token de API de Windmill:

1. Ve a tu instancia de Windmill
2. Settings → Tokens
3. Crea un nuevo token
4. Guárdalo de forma segura

```bash
# El CLI te pedirá el token la primera vez
wmill sync pull
```

### 5. Inicializar proyecto

```bash
# En el directorio de tu proyecto
wmill init

# Esto crea wmill.yaml con la configuración
```

---

## Estructura de Archivos

```
windmill-dev/
├── wmill.yaml              # Configuración del proyecto
├── wmill-lock.yaml         # Lock de versiones deployadas
├── .gitignore              # Ignorar archivos sensibles
├── f/                      # Carpeta de folders
│   └── ejemplo/              # Tu folder
│       ├── parse_jwt.ts           # Script TypeScript
│       ├── parse_jwt.script.yaml  # Metadata del script
│       ├── parse_jwt.script.lock  # Lock de dependencias
│       └── init_ejemplo__flow/       # Flow (termina en __flow)
│           ├── flow.yaml          # Definición del flow
│           └── *.ts               # Scripts inline del flow
├── u/                      # Carpeta de usuarios
│   └── admin/
│       └── my_script.ts
└── README.md
```

### Convenciones de nombres:

- **Scripts**: `nombre.ts` + `nombre.script.yaml` + `nombre.script.lock`
- **Flows**: Carpeta `nombre__flow/` con `flow.yaml`
- **Apps**: Carpeta `nombre__app/` con `app.yaml`

---

## Flujo de Trabajo de Desarrollo

### Opción 1: Desarrollo Local → Remote

**Escenario**: Crear/modificar código localmente y subirlo a Windmill

#### 1. Crear un nuevo script

```bash
# Crear archivo TypeScript
touch f/ejemplo/mi_script.ts
```

Edita el archivo con tu código:

```typescript
export async function main(param1: string, param2: number) {
  // Tu código aquí
  return { result: "success" };
}
```

#### 2. Generar metadata

```bash
# Genera .script.yaml y .script.lock automáticamente
wmill script generate-metadata f/ejemplo/mi_script.ts
```

Esto crea:
- `f/ejemplo/mi_script.script.yaml` - Schema y configuración
- `f/ejemplo/mi_script.script.lock` - Dependencias lockadas

#### 3. Revisar cambios antes de subir

```bash
# Ver qué cambios se aplicarán
wmill sync push --dry-run
```

#### 4. Subir a Windmill

```bash
# Subir cambios al workspace activo
wmill sync push

# O sin confirmación
wmill sync push --yes
```

#### 5. Commit a Git

```bash
git add .
git commit -m "feat: agregar script mi_script"
git push
```

### Opción 2: Remote → Local

**Escenario**: Alguien modificó algo en la UI de Windmill y quieres traerlo local

#### 1. Bajar cambios de Windmill

```bash
# Ver qué cambios hay en remote
wmill sync pull --dry-run

# Bajar cambios
wmill sync pull
```

#### 2. Revisar cambios

```bash
git status
git diff
```

#### 3. Commit a Git

```bash
git add .
git commit -m "sync: actualizar desde windmill remote"
git push
```

### Opción 3: Crear un Flow

#### 1. Crear carpeta del flow

```bash
mkdir -p f/ejemplo/mi_flow__flow
```

#### 2. Crear flow.yaml

```yaml
summary: Mi flow de ejemplo
description: |
  Descripción detallada del flow
value:
  modules:
    - id: a
      value:
        type: rawscript
        path: f/ejemplo/parse_jwt
        content: ""
        language: bun
        input_transforms:
          token:
            expr: flow_input.token
            type: javascript
      summary: Primer paso
schema:
  $schema: https://json-schema.org/draft/2020-12/schema
  type: object
  required:
    - token
  properties:
    token:
      type: string
      description: Token de entrada
      default: ""
```

#### 3. Generar locks del flow

```bash
wmill flow generate-locks f/ejemplo/mi_flow__flow/
```

#### 4. Subir a Windmill

```bash
wmill sync push --yes
```

---

## Sincronización con Git

### Configuración de .gitignore

```gitignore
# Windmill
.wmill/
*.env
*.secret

# Node
node_modules/
.npm/

# IDE
.vscode/
.idea/
```

### Workflow recomendado

```bash
# 1. Asegurarte de estar sincronizado
wmill sync pull

# 2. Crear rama para tu feature
git checkout -b feature/nueva-funcionalidad

# 3. Desarrollar localmente
# ... editar archivos ...

# 4. Generar metadata si creaste scripts nuevos
wmill script generate-metadata f/ejemplo/nuevo_script.ts

# 5. Probar en Windmill local/dev
wmill sync push --yes

# 6. Commit a Git
git add .
git commit -m "feat: agregar nueva funcionalidad"

# 7. Push a Git
git push origin feature/nueva-funcionalidad

# 8. Crear Pull Request en GitHub/GitLab

# 9. Después del merge, sincronizar producción
wmill workspace switch prod
git pull origin main
wmill sync push --yes
```

### Trabajar con múltiples ambientes

#### Configurar workspaces

```bash
# Desarrollo local
wmill workspace add dev workspaceName http://localhost:8000

# Staging
wmill workspace add staging workspaceName https://staging.windmill.tudominio.com

# Producción
wmill workspace add prod workspaceName https://windmill.tudominio.com
```

#### Sincronizar entre ambientes

```bash
# 1. Desarrollar en local
wmill workspace switch dev
wmill sync push --yes

# 2. Probar en staging
wmill workspace switch staging
wmill sync push --yes

# 3. Deployar a producción
wmill workspace switch prod
wmill sync push --yes
```

---

## Comandos Útiles

### Scripts

```bash
# Listar todos los scripts
wmill script list

# Ver detalles de un script
wmill script get f/ejemplo/parse_jwt

# Ejecutar un script localmente (preview)
wmill script preview f/ejemplo/parse_jwt.ts -d '{"token": "abc123"}'

# Ejecutar un script en Windmill
wmill script run f/ejemplo/parse_jwt -d '{"token": "abc123"}'

# Generar metadata para todos los scripts
wmill script generate-metadata --yes
```

### Flows

```bash
# Listar flows
wmill flow list

# Ver detalles de un flow
wmill flow get f/ejemplo/init_ejemplo__flow

# Ejecutar un flow
wmill flow run f/ejemplo/init_ejemplo__flow -d '{"token": "abc123"}'

# Generar locks de flows
wmill flow generate-locks --yes
```

### Sincronización

```bash
# Pull (traer cambios de Windmill)
wmill sync pull                    # Con confirmación
wmill sync pull --yes              # Sin confirmación
wmill sync pull --dry-run          # Solo ver cambios

# Push (subir cambios a Windmill)
wmill sync push                    # Con confirmación
wmill sync push --yes              # Sin confirmación
wmill sync push --dry-run          # Solo ver cambios

# Opciones avanzadas
wmill sync push --skip-secrets     # No subir secretos
wmill sync pull --plain-secrets    # Bajar secretos en texto plano
```

### Workspaces

```bash
# Listar workspaces configurados
wmill workspace list

# Ver workspace actual
wmill workspace whoami

# Cambiar de workspace
wmill workspace switch dev
```

---

## Mejores Prácticas

### 1. Estructura de carpetas

```
f/
├── common/          # Scripts compartidos
├── api/            # Integraciones con APIs
├── ejemplo/           # Módulo ejemplo
└── utils/          # Utilidades
```

### 2. Naming conventions

- **Scripts**: `verbo_sustantivo.ts` (ej: `fetch_padron.ts`, `parse_jwt.ts`)
- **Flows**: `sustantivo_flow__flow/` (ej: `init_ejemplo__flow/`)
- **Variables**: snake_case para IDs de módulos

### 3. Documentación

Siempre incluir:
- `summary`: Descripción corta (1 línea)
- `description`: Descripción detallada
- Comentarios en el código

### 4. Versionado

```bash
# Usar tags de Git para versiones
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### 5. Testing

```bash
# Probar scripts localmente antes de subir
wmill script preview f/ejemplo/mi_script.ts -d @test-data.json

# Ejecutar en Windmill dev antes de prod
wmill workspace switch dev
wmill sync push --yes
# ... probar en UI ...
wmill workspace switch prod
wmill sync push --yes
```

### 6. Secrets y Variables

```bash
# NO commitear secrets en Git
# Usar variables de Windmill

# Crear variable
wmill variable add f/ejemplo/api_key "valor_secreto" --secret

# Listar variables
wmill variable list
```

### 7. Locks

```bash
# Regenerar locks cuando cambien dependencias
wmill script generate-metadata --lock-only f/ejemplo/mi_script.ts

# Para flows
wmill flow generate-locks f/ejemplo/mi_flow__flow/
```

---

## Troubleshooting

### Error: "No content path given and no content file found"

**Causa**: Archivos `.script.yaml` sin el archivo `.ts` correspondiente

**Solución**:
```bash
# Eliminar archivos huérfanos
rm f/ejemplo/archivo_huerfano.script.yaml
rm f/ejemplo/archivo_huerfano.script.lock
```

### Error: "Failed to generate lockfile: bun install failed"

**Causa**: Importación incorrecta o dependencia no disponible

**Solución**:
```bash
# Verificar importaciones en el .ts
# Para Bun, NO usar prefijo npm:
# ❌ import jwt from "npm:jsonwebtoken"
# ✅ import jwt from "jsonwebtoken"
```

### Flow aparece como script

**Causa**: Archivos inline o estructura incorrecta

**Solución**:
```bash
# 1. Eliminar archivos inline incorrectos
rm -rf f/ejemplo/mi_flow__flow/*.inline_script.*

# 2. Asegurar que flow.yaml use referencias externas
# content: "" (vacío)
# path: f/ejemplo/script_externo

# 3. Regenerar locks
wmill flow generate-locks f/ejemplo/mi_flow__flow/
```

### Conflictos entre local y remote

**Solución**:
```bash
# Opción 1: Forzar local → remote
wmill sync push --yes

# Opción 2: Forzar remote → local
wmill sync pull --yes

# Opción 3: Resolver manualmente
wmill sync pull --dry-run  # Ver diferencias
# ... resolver conflictos en archivos ...
wmill sync push --yes
```

### Script no se actualiza en Windmill

**Solución**:
```bash
# 1. Regenerar metadata
wmill script generate-metadata f/ejemplo/mi_script.ts --yes

# 2. Verificar que el push incluye el script
wmill sync push --dry-run

# 3. Forzar push
wmill sync push --yes
```

---

## Ejemplo Completo: Crear Feature de Cero

```bash
# 1. Crear rama
git checkout -b feature/validacion-cuit

# 2. Crear script
cat > f/ejemplo/validar_cuit.ts << 'EOF'
export async function main(cuit: string): Promise<boolean> {
  // Validar formato CUIT
  const regex = /^\d{11}$/;
  if (!regex.test(cuit)) {
    return false;
  }
  
  // Validar dígito verificador
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = cuit.split('').map(Number);
  const suma = digitos.slice(0, 10).reduce(
    (acc, dig, i) => acc + dig * multiplicadores[i], 
    0
  );
  const verificador = (11 - (suma % 11)) % 11;
  
  return verificador === digitos[10];
}
EOF

# 3. Generar metadata
wmill script generate-metadata f/ejemplo/validar_cuit.ts

# 4. Probar localmente
wmill script preview f/ejemplo/validar_cuit.ts -d '{"cuit": "20345534234"}'

# 5. Subir a dev
wmill workspace switch dev
wmill sync push --yes

# 6. Probar en Windmill UI
# ... abrir http://localhost:8000 y probar ...

# 7. Commit
git add f/ejemplo/validar_cuit.*
git commit -m "feat: agregar validación de CUIT"

# 8. Push
git push origin feature/validacion-cuit

# 9. Crear PR y mergear

# 10. Deploy a producción
git checkout main
git pull
wmill workspace switch prod
wmill sync push --yes
```

---

## Recursos Adicionales

- **Documentación oficial**: https://www.windmill.dev/docs
- **CLI Reference**: https://www.windmill.dev/docs/advanced/cli
- **OpenFlow Schema**: Para entender estructura de flows
- **Discord de Windmill**: Para soporte de la comunidad

---

## Resumen de Comandos Esenciales

```bash
# Setup inicial
wmill workspace add <name> <workspace> <url>
wmill workspace switch <name>
wmill init

# Desarrollo diario
wmill script generate-metadata <script.ts>
wmill flow generate-locks <flow__flow/>
wmill sync push --yes
wmill sync pull --yes

# Testing
wmill script preview <script.ts> -d '{"param": "value"}'
wmill flow run <flow__flow> -d '{"param": "value"}'

# Gestión
wmill script list
wmill flow list
wmill workspace whoami
```

---

**Última actualización**: Marzo 2026
