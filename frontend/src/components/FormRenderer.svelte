<script>
  import { onMount, onDestroy } from 'svelte';
  import { Formio } from '@formio/js';
  import { apiClient } from '../lib/api.js';
  import { formioClient } from '../lib/formio-client.js';

  export let route;

  let formContainer;
  let formio;
  let isLoading = true;
  let error = null;
  let submissionId = null;

  onMount(async () => {
    await initializeForm();
  });

  onDestroy(() => {
    if (formio) {
      formio.destroy();
    }
  });

  async function initializeForm() {
    try {
      isLoading = true;
      error = null;

      // 1. Inicializar formulario en backend
      const initData = await apiClient.initForm(
        route.metadata.formId,
        getRouteParams()
      );

      submissionId = initData.submissionId;

      // 2. Cargar schema del formulario desde Form.io
      const formioInstance = new Formio(initData.formUrl);
      const formSchema = await formioInstance.loadForm();

      // 3. Renderizar formulario con schema y datos precargados
      formio = await Formio.createForm(
        formContainer,
        formSchema,
        {
          submission: initData.submissionId 
            ? { _id: initData.submissionId }
            : { data: initData.prefillData || {} },
          readOnly: route.metadata.readOnly || false
        }
      );

      // 4. Configurar event handlers
      formio.on('submit', handleSubmit);
      formio.on('change', handleChange);

      isLoading = false;
    } catch (err) {
      console.error('Error inicializando formulario:', err);
      error = err.message;
      isLoading = false;
    }
  }

  async function handleSubmit(submission) {
    try {
      // Deshabilitar botón de submit
      const submitButton = formContainer.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
      }

      // Enviar a backend
      const result = await apiClient.submitForm(
        route.metadata.formId,
        submissionId,
        submission.data
      );

      if (result.success) {
        // Redirect o mostrar éxito
        const successUrl = route.metadata.lifecycle?.onSuccess || '/success';
        window.location.hash = successUrl;
      } else {
        // Mostrar errores
        if (result.errors) {
          formio.setErrors(result.errors);
        }
        alert('Error al enviar el formulario: ' + (result.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error en submit:', err);
      alert('Error al enviar el formulario: ' + err.message);
    } finally {
      // Rehabilitar botón
      const submitButton = formContainer.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar';
      }
    }
  }

  function handleChange(changed) {
    // Aquí podrías implementar autosave
    console.log('Form changed:', changed);
  }

  function getRouteParams() {
    // Extraer parámetros de la ruta
    const hash = window.location.hash.slice(1);
    const pathParts = hash.split('/');
    const routeParts = route.path.split('/');
    
    const params = {};
    routeParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[i];
      }
    });
    
    return params;
  }

  // Recargar cuando cambia la ruta
  $: if (route) {
    if (formio) {
      formio.destroy();
    }
    initializeForm();
  }
</script>

<div class="form-renderer">
  <div class="card">
    <div class="card-header">
      <h4 class="mb-0">{route.metadata?.title || 'Formulario'}</h4>
      {#if route.metadata?.description}
        <p class="text-muted mb-0 mt-2">{route.metadata.description}</p>
      {/if}
    </div>
    <div class="card-body">
      {#if isLoading}
        <div class="text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Cargando formulario...</span>
          </div>
          <p class="mt-3">Cargando formulario...</p>
        </div>
      {:else if error}
        <div class="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      {:else}
        <div bind:this={formContainer}></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .form-renderer {
    margin-bottom: 2rem;
  }

  :global(.formio-component-submit button) {
    width: auto !important;
  }
</style>
