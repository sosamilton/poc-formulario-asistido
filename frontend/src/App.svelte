<script>
  import { onMount } from 'svelte';
  import { authService, showMockLogin } from './lib/auth.js';
  import { apiClient } from './lib/api.js';
  import FormRenderer from './components/FormRenderer.svelte';
  
  let isAuthenticated = false;
  let isLoading = true;
  let config = null;
  let currentRoute = null;
  let user = null;

  onMount(async () => {
    // Inicializar autenticación
    const authenticated = await authService.init();
    
    if (authenticated) {
      await loadApp();
    } else {
      isLoading = false;
      setupMockLogin();
    }
  });

  async function loadApp() {
    try {
      isAuthenticated = true;
      user = authService.getUser();
      
      // Cargar configuración autorizada
      config = await apiClient.getAppConfig();
      
      // Configurar router simple
      setupRouter();
      
      isLoading = false;
    } catch (error) {
      console.error('Error cargando app:', error);
      alert('Error al cargar la aplicación: ' + error.message);
      await authService.logout();
    }
  }

  function setupMockLogin() {
    // Mostrar pantalla de login mock
    const loginHtml = showMockLogin();
    document.getElementById('app').innerHTML = loginHtml;
    
    // Configurar handlers
    window.loginAs = async (userType) => {
      try {
        await authService.loginMock(userType);
        window.location.reload();
      } catch (error) {
        alert('Error en login: ' + error.message);
      }
    };
  }

  function setupRouter() {
    // Router simple basado en hash
    const navigate = () => {
      const hash = window.location.hash.slice(1) || '/';
      const route = config.routes.find(r => matchRoute(r.path, hash));
      
      if (route) {
        currentRoute = route;
      } else {
        currentRoute = config.routes[0]; // Default a primera ruta
      }
    };

    window.addEventListener('hashchange', navigate);
    navigate();
  }

  function matchRoute(pattern, path) {
    // Match simple de rutas
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, i) => {
      return part.startsWith(':') || part === pathParts[i];
    });
  }

  async function handleLogout() {
    await authService.logout();
  }
</script>

{#if isLoading}
  <div class="container mt-5 text-center">
    <div class="spinner-border" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
    <p class="mt-3">Cargando aplicación...</p>
  </div>
{:else if isAuthenticated && config}
  <div class="app">
    <!-- Header -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" href="javascript:void(0)">
          {config.branding?.title || 'Sistema de Formularios'}
        </a>
        <div class="navbar-nav ms-auto">
          <div class="nav-item dropdown">
            <a class="nav-link dropdown-toggle text-white" href="javascript:void(0)" role="button" 
               data-bs-toggle="dropdown" aria-expanded="false">
              👤 {user.nombre}
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><span class="dropdown-item-text"><small>CUIT: {user.cuit}</small></span></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item" on:click={handleLogout}>Cerrar sesión</button></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>

    <!-- Navigation -->
    <div class="container-fluid mt-3">
      <div class="row">
        <div class="col-md-3">
          <div class="list-group">
            {#each config.routes as route}
              <a href="#{route.path}" 
                 class="list-group-item list-group-item-action"
                 class:active={currentRoute?.path === route.path}>
                {route.metadata?.title || route.path}
              </a>
            {/each}
          </div>
        </div>

        <!-- Main content -->
        <div class="col-md-9">
          {#if currentRoute}
            <FormRenderer route={currentRoute} />
          {:else}
            <div class="alert alert-info">
              Selecciona un formulario del menú
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .app {
    min-height: 100vh;
    background-color: #f8f9fa;
  }
</style>
