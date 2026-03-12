# Frontend Example - Windmill Forms Engine

Ejemplo de frontend React + SurveyJS para consumir el motor de formularios de Windmill.

## Instalación

```bash
npm install
```

## Configuración

Copiar `.env.example` a `.env` y configurar:

```env
VITE_WINDMILL_URL=http://localhost:8000
VITE_WINDMILL_TOKEN=your-windmill-token-here
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Uso

El componente `FormRenderer` se encarga de:

1. **Inicializar** el formulario llamando a la API de Windmill
2. **Renderizar** el schema SurveyJS con datos precargados
3. **Validar** los datos antes del envío
4. **Enviar** el formulario completo

### Ejemplo de uso:

```tsx
<FormRenderer
  slug="ddjj-iibb"
  windmillUrl="http://localhost:8000"
  windmillToken="your-token"
  userId="user-123"
/>
```

## Integración

El frontend se comunica con Windmill a través de los siguientes endpoints:

- `POST /api/w/formularios/jobs/run/f/formularios/api/get_form_init` - Inicializar
- `POST /api/w/formularios/jobs/run/f/formularios/api/post_form_validate` - Validar
- `POST /api/w/formularios/jobs/run/f/formularios/api/post_form_submit` - Enviar
