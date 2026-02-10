# 📄 Documento de Contexto

## Demo DDJJ Inicial – Arquitectura con Windmill + Form Engine

---

# 1. 🎯 Objetivo del Proyecto

Construir un **prototipo funcional (demo)** de una Declaración Jurada Inicial (DDJJ) que:

1. Obtenga el **CUIT desde el token de autenticación**
2. Consulte sistemas internos
3. Precargue automáticamente el formulario
4. Permita completar información faltante
5. Ejecute validaciones complejas
6. Procese la presentación final de forma segura

El sistema debe estar diseñado desde el inicio con:

* Separación clara de responsabilidades
* Seguridad por diseño
* Capacidad de escalar en complejidad normativa
* Arquitectura desacoplada

---

# 2. 🧠 Principios de Diseño

1. 🔐 El frontend nunca decide el CUIT.
2. 🧩 El formulario es capa de UI, no motor fiscal.
3. 🧠 La lógica tributaria vive en backend (Windmill).
4. 🔄 El flujo debe ser orquestado.
5. 📦 El almacenamiento definitivo no depende del motor de formularios.

---

# 3. 🏗 Arquitectura General

```
Usuario autenticado
        ↓
Frontend contenedor (Portal)
        ↓
Windmill (MCP + Workflows)
        ↓
Sistemas internos simulados
        ↓
Motor de Formularios (Form.io o similar)
```

---

# 4. 🧩 Componentes y Responsabilidades

---

## 4.1 🧍 Usuario

* Ya autenticado mediante sistema externo
* Posee un JWT válido
* El JWT contiene el CUIT como claim

---

## 4.2 🌐 Frontend (Portal Contenedor)

Responsabilidades:

* Recibir el token
* Llamar al endpoint `/ddjj/init`
* Redirigir al formulario precargado
* No manipular CUIT
* No ejecutar lógica tributaria

No debe:

* Decidir mínimos
* Validar reglas fiscales críticas
* Permitir modificar CUIT

---

## 4.3 ⚙ Windmill (Motor Orquestador + MCP)

Es el **componente central del sistema**.

### Funciones principales:

### A) Inicialización de DDJJ

Workflow `/ddjj/init`

1. Valida JWT
2. Extrae CUIT
3. Consulta sistemas internos:

   * Actividad
   * Régimen
   * Declaraciones previas
   * Situación fiscal
4. Aplica reglas:

   * Determina período sugerido
   * Determina mínimo
   * Define secciones visibles
5. Genera payload inicial
6. Crea borrador de formulario vía API
7. Devuelve URL o ID de sesión

---

### B) Validación Intermedia (opcional)

Workflow `/ddjj/validate`

* Valida datos ingresados
* Puede consultar sistemas externos
* Devuelve errores estructurados

---

### C) Presentación Final

Workflow `/ddjj/submit`

1. Recibe submission final
2. Revalida reglas críticas
3. Verifica coherencia contra backend
4. Persiste en base oficial
5. Genera número de presentación
6. Genera constancia

---

## 4.4 🧾 Motor de Formularios (Form.io u otro)

Responsabilidades:

* Renderizar UI
* Manejar multi-step
* Validaciones simples
* Condiciones visuales
* Persistencia temporal (draft)

No debe:

* Ser fuente de verdad fiscal
* Ejecutar lógica normativa compleja
* Tomar decisiones críticas

---

## 4.5 🗄 Sistemas Internos (Mock para demo)

Para el demo pueden simularse como:

* Scripts Windmill
* APIs mock
* Base de datos simple

Simularán:

* Padrón de contribuyentes
* Actividades
* Historial de DDJJ
* Régimen fiscal

---

# 5. 🔄 Flujo Funcional Completo

---

## Paso 1 – Inicio

Usuario hace click en "Nueva DDJJ"

Frontend:

```
POST /ddjj/init
Authorization: Bearer <token>
```

---

## Paso 2 – Orquestación en Windmill

Windmill:

* Decodifica token
* Obtiene CUIT
* Consulta padrones
* Evalúa reglas
* Construye JSON inicial

Ejemplo de payload:

```json
{
  "cuit": "27-3456736-8",
  "actividad": "Servicios de diseño especializado",
  "periodo_sugerido": "2026-02",
  "monto_minimo": 450,
  "secciones_visibles": ["facturacion"]
}
```

---

## Paso 3 – Creación del Draft

Windmill crea submission draft en Form Engine.

Devuelve:

```json
{
  "form_url": "https://forms.local/ddjj?submission=abc123"
}
```

---

## Paso 4 – Usuario completa formulario

El formulario:

* Muestra datos precargados
* Bloquea CUIT
* Permite editar monto
* Ejecuta validaciones simples

---

## Paso 5 – Submit Final

Form Engine llama:

```
POST /ddjj/submit
```

Windmill:

* Revalida todo
* Calcula mínimo
* Valida coherencia
* Persiste resultado
* Genera comprobante

---

# 6. 🔐 Seguridad

1. CUIT siempre proviene del token.
2. No se aceptan CUIT enviados por frontend.
3. Submit final siempre revalida.
4. El motor de formularios no es sistema fuente.

---

# 7. 🧪 Alcance del Demo con MCP

El demo debería incluir:

### ✔ Script 1 – Validación de token

Simulado si no hay auth real.

### ✔ Script 2 – Consulta mock de padrón

### ✔ Script 3 – Lógica tributaria mínima

### ✔ Workflow 1 – init_ddjj

### ✔ Workflow 2 – submit_ddjj

### ✔ Formulario simple con:

* CUIT bloqueado
* Actividad precargada
* Período desplegable
* Monto editable
* Botón Continuar

---

# 8. 📈 Escalabilidad Futura

Esta arquitectura permite:

* Versionado de reglas
* Nuevos regímenes
* Más validaciones externas
* Auditoría
* Logs centralizados
* Separación UI / Motor fiscal
* Migrar el form engine sin romper backend

---

# 9. 🧠 Decisión Arquitectónica Clave

El sistema se modela como:

> Motor Fiscal (Windmill) + Motor de UI (Form Engine)

Y no como:

> Formulario con lógica embebida

Esto es lo que permite crecer hacia un sistema tributario real.

---

# 10. 📌 Próximo Paso Sugerido

Podemos ahora:

1. Definir los workflows concretos para el demo en Windmill
2. Diseñar la estructura de datos base
3. Definir cómo usar MCP para automatizar generación de scripts
4. Simular los sistemas internos
5. Diseñar el primer formulario JSON
