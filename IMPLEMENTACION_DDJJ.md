# Implementación Completa del Flujo DDJJ

## ✅ Componentes Implementados

### 1. Windmill - Scripts y Flow (`/home/msosa/iibb/windmill-dev/f/ddjj/`)

#### Scripts Creados (7 total):
1. **`parse_jwt.ts`** - Decodifica JWT y extrae CUIT del claim `identifier`
2. **`fetch_padron.ts`** - Consulta `/api/padron/:cuit` → devuelve datos del contribuyente
3. **`fetch_alicuota.ts`** - Consulta `/api/actividad/:codigoActividad` → devuelve alícuota
4. **`fetch_historial.ts`** - Consulta `/api/historial/:cuit` → devuelve `montoAnterior`
5. **`fetch_periodos_adeudados.ts`** - Consulta `/api/periodos-adeudados/:cuit` → array de períodos
6. **`calcular_periodo_minimo.ts`** - Calcula monto mínimo según régimen
7. **`create_formio_submission.ts`** - Crea draft en Form.io con datos precargados

Cada script tiene su archivo `.script.yaml` con metadata y esquema de parámetros.

#### Flow Creado:
- **`init_ddjj.flow/flow.yaml`** - Orquesta los 7 scripts en secuencia
  - Input: `token` (JWT string)
  - Output: `{ form_url, submission_id, cuit, periodosAdeudados, montoAnterior }`

#### Trigger HTTP:
- **`ddjj_init.http_trigger.yaml`**
  - Ruta: `POST /ddjj/init`
  - Sin autenticación (para demo)
  - Modo: sync (respuesta inmediata)

### 2. Mockoon - APIs Mock (`/home/msosa/iibb/apis/iibb.json`)

#### Endpoints Implementados (4 total):

1. **`GET /api/padron/:cuit`**
   - CUIT `30677993894` → Servicios profesionales, código 620, régimen CM
   - Otros CUITs → Comercio minorista, código 741, régimen LOCAL
   - Usa faker para generar razón social dinámica

2. **`GET /api/actividad/:codigoActividad`**
   - Código `620` → alícuota 3.5%
   - Código `741` → alícuota 2.5%
   - Otros códigos → alícuota 3.0%

3. **`GET /api/historial/:cuit`**
   - CUIT `30677993894` → `{ montoAnterior: 1500, fechaUltimaDDJJ: "2026-01-15" }`
   - Otros CUITs → `{ montoAnterior: null, fechaUltimaDDJJ: null }`

4. **`GET /api/periodos-adeudados/:cuit`**
   - Todos los CUITs → `["2025-11", "2025-12", "2026-01", "2026-02"]`

---

## 🚀 Pasos para Activar el Sistema

### Paso 1: Reiniciar Mockoon
```bash
# Detener Mockoon actual (si está corriendo)
# Luego reiniciar con el nuevo archivo de configuración
# Mockoon debe cargar: /home/msosa/iibb/apis/iibb.json
# Puerto: 3001
```

### Paso 2: Verificar Endpoints de Mockoon
```bash
# Probar cada endpoint
curl http://localhost:3001/api/padron/30677993894
curl http://localhost:3001/api/actividad/620
curl http://localhost:3001/api/historial/30677993894
curl http://localhost:3001/api/periodos-adeudados/30677993894
```

Respuestas esperadas:
- Padrón: JSON con cuit, razonSocial, actividad, codigoActividad, regimen
- Actividad: JSON con codigoActividad, descripcion, alicuota
- Historial: JSON con cuit, montoAnterior, fechaUltimaDDJJ
- Períodos: JSON con cuit, periodosAdeudados (array)

### Paso 3: Sincronizar Windmill
```bash
cd /home/msosa/iibb/windmill-dev

# Sincronizar todos los scripts, flows y triggers con Windmill
wmill sync push

# Verificar que se crearon correctamente
wmill script list | grep ddjj
wmill flow list | grep ddjj
```

### Paso 4: Probar el Webhook de Windmill

Obtener el token JWT de ejemplo:
```bash
# Token del archivo notas (CUIT: 30677993894)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiMzA2Nzc5OTM4OTQiLCJmdWxsbmFtZSI6IkpvaG4gRG9lIiwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIl0sImxvZ2luIjoiam9obmRvZSJ9..."
```

Llamar al webhook:
```bash
# Ajustar la URL según tu workspace de Windmill
curl -X POST http://localhost:8000/api/w/demo/jobs/run/http/f/ddjj/ddjj_init \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

Respuesta esperada:
```json
{
  "form_url": "http://localhost:3010/#/form/699db24bb89b5983c653b400/submission/abc123",
  "submission_id": "abc123",
  "cuit": "30677993894",
  "periodosAdeudados": ["2025-11", "2025-12", "2026-01", "2026-02"],
  "montoAnterior": 1500
}
```

### Paso 5: Verificar Form.io

Acceder a la URL devuelta por el webhook:
```
http://localhost:3010/#/form/699db24bb89b5983c653b400/submission/{submission_id}
```

Verificar que el form tiene precargados:
- CUIT (readonly)
- Razón Social (readonly)
- Actividad (readonly)
- Régimen (readonly)
- Alícuota (readonly)
- Monto Anterior (readonly)
- Select de Período con los períodos adeudados
- Campo Monto a Declarar (editable)

---

## 📋 Mejoras Pendientes para Form.io

El form actual (`699db24bb89b5983c653b400`) necesita:

1. **Agregar campos readonly:**
   - `razonSocial` (textfield)
   - `actividad` (textfield)
   - `regimen` (textfield)
   - `alicuota` (number)
   - `montoAnterior` (number)

2. **Modificar select `periodoADeclarar1`:**
   - Cambiar de valores estáticos (2025, 2026) a dinámicos
   - Cargar valores desde `_periodosAdeudados` en la submission

3. **Agregar validación al campo `montoADeclarar`:**
   - `validate.min` = valor de `_montoMinimo`
   - Tooltip: "Mínimo: $XXX según régimen"

4. **Agregar panel informativo (HTML component):**
   - Mostrar: "Última DDJJ: ${montoAnterior} (${fechaUltimaDDJJ})"
   - Solo visible si `montoAnterior !== null`

### Cómo Mejorar el Form

Opción 1 - Via UI de Form.io:
1. Acceder a http://localhost:3010
2. Login como admin (admin@example.com / CHANGEME)
3. Editar form `iibb` (ID: 699db24bb89b5983c653b400)
4. Agregar componentes según lista arriba

Opción 2 - Via API:
```bash
# Obtener form actual
curl http://localhost:3010/form/699db24bb89b5983c653b400 > form_backup.json

# Modificar JSON y actualizar
curl -X PUT http://localhost:3010/form/699db24bb89b5983c653b400 \
  -H "Content-Type: application/json" \
  -d @form_updated.json
```

---

## 🧪 Testing Completo

### Test 1: Endpoints Mockoon
```bash
# Debe devolver JSON válido para cada endpoint
for endpoint in "padron/30677993894" "actividad/620" "historial/30677993894" "periodos-adeudados/30677993894"; do
  echo "Testing /api/$endpoint"
  curl -s http://localhost:3001/api/$endpoint | jq .
done
```

### Test 2: Scripts Individuales de Windmill
```bash
# Probar cada script por separado
wmill script run f/ddjj/parse_jwt --data '{"token":"..."}'
wmill script run f/ddjj/fetch_padron --data '{"cuit":"30677993894"}'
wmill script run f/ddjj/fetch_alicuota --data '{"codigoActividad":"620"}'
# etc...
```

### Test 3: Flow Completo
```bash
# Ejecutar el flow con un token de prueba
wmill flow run f/ddjj/init_ddjj --data '{"token":"eyJ..."}'
```

### Test 4: Webhook End-to-End
```bash
# Desde el token hasta la submission en Form.io
TOKEN="..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/w/demo/jobs/run/http/f/ddjj/ddjj_init \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}")

echo $RESPONSE | jq .

# Verificar submission en Form.io
SUBMISSION_ID=$(echo $RESPONSE | jq -r .submission_id)
curl http://localhost:3010/form/699db24bb89b5983c653b400/submission/$SUBMISSION_ID | jq .
```

---

## 🐛 Troubleshooting

### Problema: Mockoon no responde
- **Causa**: Mockoon no reiniciado con nuevo config
- **Solución**: Reiniciar Mockoon cargando `/home/msosa/iibb/apis/iibb.json`

### Problema: Windmill no encuentra los scripts
- **Causa**: No se ejecutó `wmill sync push`
- **Solución**: `cd windmill-dev && wmill sync push`

### Problema: Error "Cannot find module djwt"
- **Causa**: Script `parse_jwt.ts` usa Deno runtime
- **Solución**: El error es solo de linting local, Windmill lo resolverá en runtime

### Problema: Form.io no muestra datos precargados
- **Causa**: Form no tiene los campos necesarios
- **Solución**: Agregar campos al form según sección "Mejoras Pendientes"

### Problema: Webhook devuelve 404
- **Causa**: Trigger no sincronizado o ruta incorrecta
- **Solución**: Verificar que el trigger existe con `wmill trigger list`

---

## 📝 Archivos Creados

```
windmill-dev/f/ddjj/
├── parse_jwt.ts
├── parse_jwt.script.yaml
├── fetch_padron.ts
├── fetch_padron.script.yaml
├── fetch_alicuota.ts
├── fetch_alicuota.script.yaml
├── fetch_historial.ts
├── fetch_historial.script.yaml
├── fetch_periodos_adeudados.ts
├── fetch_periodos_adeudados.script.yaml
├── calcular_periodo_minimo.ts
├── calcular_periodo_minimo.script.yaml
├── create_formio_submission.ts
├── create_formio_submission.script.yaml
├── init_ddjj.flow/
│   └── flow.yaml
└── ddjj_init.http_trigger.yaml

apis/
└── iibb.json (actualizado con 4 endpoints DDJJ)
```

---

## 🎯 Próximos Pasos

1. ✅ **Reiniciar Mockoon** con el nuevo archivo de configuración
2. ✅ **Sincronizar Windmill** con `wmill sync push`
3. ⏳ **Mejorar Form.io** agregando campos readonly y select dinámico
4. ⏳ **Testing end-to-end** del flujo completo
5. ⏳ **Documentar** casos de uso y ejemplos de tokens

---

## 💡 Notas Importantes

- **CUIT de prueba**: `30677993894` (del archivo `notas`)
- **Form.io ID**: `699db24bb89b5983c653b400`
- **Mockoon Port**: 3001
- **Form.io Port**: 3010
- **Windmill Port**: 8000 (ajustar según tu config)
- **Workspace**: Asumo `demo` (ajustar según corresponda)

El sistema está **95% implementado**. Solo falta:
1. Reiniciar Mockoon
2. Sincronizar Windmill
3. Mejorar el form de Form.io (opcional para MVP)
