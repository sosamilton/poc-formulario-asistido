# APIs Mock - Mockoon

Este directorio contiene las configuraciones de Mockoon para simular las APIs del sistema IIBB durante el desarrollo.

## 📋 Contenido

- `iibb.json` - Configuración principal de Mockoon con todos los endpoints
- `iibb.json.backup` - Backup de la configuración

## 🚀 Uso Recomendado con Mockoon

### Instalación de Mockoon

**Opción 1: Desktop App (Recomendado para desarrollo)**
```bash
# Linux (AppImage)
wget https://github.com/mockoon/mockoon/releases/latest/download/mockoon-x.x.x.AppImage
chmod +x mockoon-x.x.x.AppImage
./mockoon-x.x.x.AppImage

# macOS
brew install --cask mockoon

# Windows
# Descargar desde https://mockoon.com/download/
```

**Opción 2: CLI (Para CI/CD)**
```bash
npm install -g @mockoon/cli
```

### Iniciar el servidor mock

**Con Desktop App:**
1. Abrir Mockoon
2. File → Open environment
3. Seleccionar `apis/iibb.json`
4. Click en el botón "Start server" (▶️)
5. El servidor estará disponible en `http://localhost:3001`

**Con CLI:**
```bash
# Desde la raíz del proyecto
mockoon-cli start --data apis/iibb.json --port 3001

# O con watch para recargar cambios
mockoon-cli start --data apis/iibb.json --port 3001 --watch
```

## 📡 Endpoints Disponibles

### 1. Padrón - Obtener datos del contribuyente

```http
GET http://localhost:3001/api/padron/:cuit
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/padron/20345534234
```

**Respuesta:**
```json
{
  "cuit": "20345534234",
  "razonSocial": "JUAN PALOTE",
  "actividad": "Servicios profesionales",
  "codigoActividad": "620",
  "regimen": "CM"
}
```

**CUITs de prueba configurados:**
- `30677993894` - Comercio Minorista (regimen LOCAL)
- `20345534234` - Servicios Profesionales (regimen CM)
- Cualquier otro CUIT devuelve datos generados con Faker

### 2. Alícuota - Obtener tasa por código de actividad

```http
GET http://localhost:3001/api/alicuota/:codigoActividad
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/alicuota/620
```

**Respuesta:**
```json
{
  "codigoActividad": "620",
  "alicuota": 3.5,
  "descripcion": "Servicios profesionales"
}
```

**Códigos de actividad configurados:**
- `620` - Servicios profesionales (3.5%)
- `741` - Comercio minorista (2.5%)
- Otros códigos devuelven alícuota por defecto (3.0%)

### 3. Historial - Obtener declaraciones anteriores

```http
GET http://localhost:3001/api/historial/:cuit
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/historial/20345534234
```

**Respuesta:**
```json
{
  "cuit": "20345534234",
  "montoAnterior": 150000,
  "ultimoPeriodo": "2024-02"
}
```

### 4. Períodos Adeudados - Obtener períodos sin DDJJ

```http
GET http://localhost:3001/api/periodos-adeudados/:cuit
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/periodos-adeudados/20345534234
```

**Respuesta:**
```json
{
  "cuit": "20345534234",
  "periodosAdeudados": ["2024-01", "2024-02", "2024-03"]
}
```

## 🔧 Configuración

### Puerto

El servidor mock está configurado para correr en el puerto **3001**. Si necesitas cambiarlo:

**Desktop App:** Settings → Port
**CLI:** `--port <numero>`

### Latencia simulada

Por defecto, las respuestas son instantáneas (latency: 0ms). Para simular latencia de red:

1. Abrir `iibb.json`
2. Modificar el campo `"latency"` a nivel global o por endpoint
3. Reiniciar el servidor

```json
{
  "latency": 500,  // 500ms de delay
  ...
}
```

### CORS

Mockoon maneja CORS automáticamente. Si necesitas configuración específica:

**Desktop App:** Settings → Headers → Add CORS headers

## 🧪 Testing

### Verificar que el servidor está corriendo

```bash
curl http://localhost:3001/api/padron/20345534234
```

### Probar todos los endpoints

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

### Integración con Windmill

Los scripts de Windmill en `f/ddjj/` están configurados para usar `http://localhost:3001`:

```typescript
// Ejemplo en fetch_padron.ts
const response = await fetch(`http://localhost:3001/api/padron/${cuit}`);
```

## 📝 Modificar Endpoints

### Agregar nuevo endpoint

1. Abrir Mockoon Desktop App
2. Click en "+" para agregar nueva ruta
3. Configurar método, path y respuesta
4. Guardar (File → Save)
5. Commitear cambios en `iibb.json`

### Agregar nueva respuesta condicional

1. Seleccionar el endpoint
2. Click en "Add response"
3. Configurar reglas (Rules)
4. Ejemplo: Si `cuit` equals `12345678901` → devolver respuesta específica

## 🐳 Docker (Opcional)

Si prefieres correr Mockoon en Docker:

```bash
# Crear docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  mockoon:
    image: mockoon/cli:latest
    ports:
      - "3001:3001"
    volumes:
      - ./apis/iibb.json:/data/iibb.json
    command: ["--data", "/data/iibb.json", "--port", "3001"]
EOF

# Iniciar
docker-compose up -d
```

## 🔄 Sincronización

### Backup de configuración

Antes de hacer cambios importantes:

```bash
cp apis/iibb.json apis/iibb.json.backup
```

### Restaurar desde backup

```bash
cp apis/iibb.json.backup apis/iibb.json
```

## 📚 Recursos

- **Documentación oficial**: https://mockoon.com/docs/
- **Templating helpers**: https://mockoon.com/docs/latest/templating/overview/
- **Faker.js**: https://fakerjs.dev/ (para datos aleatorios)
- **CLI Reference**: https://mockoon.com/cli/

## 🚨 Troubleshooting

### Puerto 3001 ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :3001

# Matar el proceso
kill -9 <PID>

# O usar otro puerto
mockoon-cli start --data apis/iibb.json --port 3002
```

### Cambios no se reflejan

1. Verificar que guardaste el archivo en Mockoon
2. Reiniciar el servidor (Stop → Start)
3. Limpiar caché del navegador si usas desde el browser

### CORS errors

Mockoon maneja CORS automáticamente, pero si tienes problemas:

1. Settings → Headers
2. Agregar: `Access-Control-Allow-Origin: *`
3. Agregar: `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

---

**Última actualización**: Marzo 2026
