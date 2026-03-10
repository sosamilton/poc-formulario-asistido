<script>
  import { onMount, onDestroy, tick } from 'svelte';
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
    // Esperar a que el DOM esté completamente renderizado
    await tick();
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

      console.log('[DEBUG] initData recibido:', initData);

      // 2. Cargar schema del formulario desde Form.io
      const formioInstance = new Formio(initData.formUrl);
      const formSchema = await formioInstance.loadForm();

      console.log('[DEBUG] formSchema cargado:', formSchema);

      // 3. Inyectar opciones dinámicas en el schema
      if (initData.dynamicOptions) {
        console.log('[DEBUG] Inyectando dynamicOptions:', initData.dynamicOptions);
        
        // Recorrer componentes del formulario y actualizar los que tengan dataSrc: custom
        const injectDynamicOptions = (components) => {
          if (!components) return;
          
          components.forEach(component => {
            // Si el componente tiene dataSrc: custom y hay opciones dinámicas para él
            if (component.dataSrc === 'custom' && initData.dynamicOptions[component.key]) {
              console.log(`[DEBUG] Inyectando opciones para campo: ${component.key}`);
              
              // Configurar custom values con función que devuelve las opciones
              component.data = {
                custom: `values = ${JSON.stringify(initData.dynamicOptions[component.key])}`
              };
            }
            
            // Recursivo para componentes anidados (panels, columns, etc.)
            if (component.components) {
              injectDynamicOptions(component.components);
            }
            if (component.columns) {
              component.columns.forEach(col => injectDynamicOptions(col.components));
            }
          });
        };
        
        injectDynamicOptions(formSchema.components);
      }

      // 4. Preparar submission data
      // Usar siempre prefillData del backend, que ya tiene los datos correctos
      console.log('[DEBUG] Usando prefillData:', initData.prefillData);
      console.log('[DEBUG] Submission ID:', initData.submissionId);
      
      const submissionData = {
        data: initData.prefillData || {}
      };

      // Si hay submissionId, agregarlo para que Form.io lo use al guardar
      if (initData.submissionId) {
        submissionData._id = initData.submissionId;
      }

      console.log('[DEBUG] Submission data preparada:', submissionData);
      
      // Esperar a que formContainer esté disponible
      await tick();
      
      // Verificar que formContainer existe
      if (!formContainer) {
        console.error('[ERROR] formContainer aún no está definido después de tick()');
        throw new Error('formContainer no está definido');
      }
      console.log('[DEBUG] formContainer existe:', formContainer);
      
      console.log('[DEBUG] Iniciando Formio.createForm...');

      // 4. Renderizar formulario con schema y submission
      try {
        // Crear timeout para detectar si se cuelga
        const createFormPromise = Formio.createForm(
          formContainer,
          formSchema,
          {
            submission: submissionData,
            readOnly: route.metadata.readOnly || false
          }
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Formio.createForm tardó más de 10 segundos')), 10000)
        );
        
        formio = await Promise.race([createFormPromise, timeoutPromise]);
        console.log('[DEBUG] Formio.createForm completado exitosamente');
        console.log('[DEBUG] Instancia formio:', formio);
      } catch (formError) {
        console.error('[ERROR] Error en Formio.createForm:', formError);
        console.error('[ERROR] formError.message:', formError.message);
        console.error('[ERROR] formError.stack:', formError.stack);
        throw formError;
      }

      console.log('[DEBUG] Formulario creado exitosamente');

      // 5. Configurar event handlers
      formio.on('submit', handleSubmit);
      formio.on('change', handleChange);

      console.log('[DEBUG] Event handlers configurados');

      isLoading = false;
    } catch (err) {
      console.error('[ERROR] Error inicializando formulario:', err);
      console.error('[ERROR] Stack trace:', err.stack);
      error = err.message || 'Error desconocido al cargar el formulario';
      isLoading = false;
    }
  }

  async function handleSubmit(submission) {
    try {
      console.log('[DEBUG] Submit iniciado con datos:', submission.data);
      
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

      console.log('[DEBUG] Respuesta del submit:', result);

      if (result.success) {
        // Mostrar mensaje de éxito
        console.log('[SUCCESS]', result.message);
        
        // Usar redirectUrl de la respuesta o el configurado en la ruta
        const redirectUrl = result.redirectUrl || route.metadata.lifecycle?.onSuccess || '/success';
        console.log('[DEBUG] Redirigiendo a:', redirectUrl);
        
        // Pequeño delay para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.hash = redirectUrl;
        }, 500);
      } else {
        // Mostrar errores de validación
        console.error('[ERROR] Errores de validación:', result.errors);
        if (result.errors && Array.isArray(result.errors)) {
          // Convertir errores al formato de Form.io
          const formioErrors = result.errors.reduce((acc, err) => {
            acc[err.path] = err.message;
            return acc;
          }, {});
          formio.setErrors(formioErrors);
        }
        alert('Error al enviar el formulario: ' + (result.message || 'Error desconocido'));
        
        // Rehabilitar botón si hay error
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Enviar';
        }
      }
    } catch (err) {
      console.error('[ERROR] Error en submit:', err);
      alert('Error al enviar el formulario: ' + err.message);
      
      // Rehabilitar botón si hay error
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
      {/if}
      
      {#if error}
        <div class="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      {/if}
      
      <!-- Siempre renderizar el contenedor, pero ocultarlo si hay loading o error -->
      <div bind:this={formContainer} style:display={isLoading || error ? 'none' : 'block'}></div>
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
