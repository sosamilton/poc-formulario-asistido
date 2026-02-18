# 🎯 Contexto actual

Tenés:

* ✅ Windmill → recibe JWT, obtiene CUIT, consulta sistemas internos
* ✅ Form.io OSS → API + builder
* ❌ Falta → capa frontend que renderice el formulario

Objetivo:

> Windmill inicia proceso → precarga datos → usuario completa → submit vuelve a Windmill → validación final → persistencia oficial.

---

# 🏗 Arquitectura recomendada (modelo limpio)

```text
Usuario (Keycloak)
        ↓
Frontend (SPA simple)
        ↓
Windmill (/ddjj/init)
        ↓
Form.io API (crea draft o pasa data)
        ↓
Frontend renderiza formulario
        ↓
Submit → Windmill (/ddjj/submit)
```

---

# 🧩 Parte clave: ¿Cómo precargar datos?

Existen **3 mecanismos posibles**.

---

# 🔵 OPCIÓN 1 — Crear un "draft submission" en Form.io (RECOMENDADA)

👉 Es la más sólida para tu caso institucional.

## Flujo

1. Front llama a:

   ```
   POST /ddjj/init
   ```

2. Windmill:

   * Valida JWT
   * Extrae CUIT
   * Consulta sistemas
   * Construye `submission.data`
   * Llama a Form.io:

   ```
   POST /form/{formId}/submission
   ```

   con:

   ```json
   {
     "data": {
       "cuit": "27-...",
       "actividad": "Servicios",
       "periodo": "2026-02"
     }
   }
   ```

3. Form.io devuelve:

   ```json
   { "_id": "submissionId123" }
   ```

4. Windmill devuelve ese ID al frontend.

5. Frontend renderiza:

   ```js
   Formio.createForm(
     document.getElementById('form'),
     'https://formio/api/form/FORMID',
     {
       submission: { _id: 'submissionId123' }
     }
   );
   ```

👉 El formulario se carga ya con datos.

---

## Ventajas

✔ Persistencia intermedia
✔ Permite guardar borradores
✔ Permite retomar proceso
✔ Separación limpia
✔ Escalable

---

# 🟢 OPCIÓN 2 — Pasar datos directamente al SDK (sin crear submission)

Windmill devuelve:

```json
{
  "prefill": {
    "cuit": "...",
    "actividad": "..."
  }
}
```

Y el frontend hace:

```js
Formio.createForm(el, formUrl, {
  submission: {
    data: prefill
  }
});
```

## Ventajas

✔ Más simple
✔ No crea registro previo

## Desventajas

❌ No hay borrador
❌ No hay estado persistente
❌ Más débil para auditoría

👉 Bueno para demo simple.
👉 No ideal para sistema tributario real.

---

# 🟡 OPCIÓN 3 — URL con query params (NO recomendado)

Ej:

```
/form?cuit=27...
```

Y usar lógica JS para precargar.

❌ Manipulable
❌ Inseguro
❌ No institucional

No lo recomiendo.

---

# 🔐 Seguridad — ¿El frontend debe integrarse con Keycloak?

Sí.

Idealmente:

* Frontend = SPA protegida
* Login vía Keycloak
* Obtiene JWT
* Llama a Windmill con ese JWT

Windmill:

* Verifica firma del token
* Extrae CUIT
* Nunca acepta CUIT desde frontend

⚠ Form.io no debería confiar en datos enviados directamente desde cliente.

---

# 🧠 Dónde deben vivir las validaciones

Hay 3 niveles:

---

## 1️⃣ Validaciones simples (Frontend / Form.io)

* Required
* Min / Max
* Regex
* Condiciones visuales

Esto está perfecto en Form.io.

---

## 2️⃣ Validaciones técnicas (Windmill, opcional en vivo)

Ej:

* CUIT activo
* Actividad válida
* Monto mínimo según régimen

Se pueden hacer:

A) En submit final
B) Vía endpoint async desde Form.io

Form.io permite validaciones async custom.

Pero la validación crítica debe repetirse en submit final.

---

## 3️⃣ Validación definitiva (Windmill)

Siempre revalidar en:

```
POST /ddjj/submit
```

Nunca confiar solo en frontend.

---

# 🧱 ¿Es viable hacer un frontend genérico para renderizar cualquier Form.io?

Sí. Y es la mejor práctica.

Tu frontend puede ser algo así:

```js
const formId = getFromRoute();
Formio.createForm(
  document.getElementById('form'),
  `${API}/form/${formId}`
);
```

Eso te permite:

* Renderizar cualquier formulario
* No hardcodear estructura
* Cambiar formularios sin cambiar frontend
* Versionar formularios desde Form.io

---

## Entonces, ¿dónde viven las validaciones en frontend genérico?

En el JSON del formulario dentro de Form.io.

El frontend solo renderiza.

Windmill valida lo crítico.

---

# 🧩 Arquitectura ideal final para tu caso

## 🟣 Frontend

* SPA simple
* Integra Keycloak
* Llama a Windmill
* Renderiza Form.io SDK
* No tiene lógica fiscal

---

## 🟣 Windmill

* Valida JWT
* Orquesta
* Genera borrador
* Revalida submit
* Persiste definitivo

---

## 🟣 Form.io

* Builder
* API
* Render UI
* Validaciones simples
* Persistencia temporal

---

# 🔥 Mejores prácticas recomendadas

1. Nunca confiar en datos del frontend
2. Revalidar todo en submit
3. Crear draft submission
4. Separar claramente UI y motor fiscal
5. No poner reglas tributarias en JS del formulario
6. Loggear cada paso en Windmill
7. Manejar versión del formulario

---

# 📌 Respuesta directa a tus dudas

### 🔹 Mecanismos de sincronización

* Draft submission (mejor)
* Prefill directo en SDK
* Async validation endpoints
* Webhooks al submit

---

### 🔹 ¿Frontend debe integrar Keycloak?

Sí.
Windmill valida token.
Form.io no debería ser tu sistema de auth principal.

---

### 🔹 Mejores prácticas de validación

* Simple → Form.io
* Compleja → Windmill
* Crítica → Siempre revalidar en submit final

---

### 🔹 ¿Frontend genérico viable?

Totalmente viable y recomendado.
Las validaciones viven:

* UI → en JSON del form
* Negocio → en Windmill
