/**
 * Sistema de autenticación con soporte para:
 * - Mock (desarrollo local sin Keycloak)
 * - Keycloak (producción)
 */

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';

// Mock de usuario para desarrollo
// Basado en datos reales de ejemplo de ARBA
const MOCK_USERS = {
  'contribuyente': {
    cuit: '20345534234',
    nombre: 'JUAN PALOTE',
    roles: ['contribuyente'],
    email: 'juan.palote@example.com',
    permissions: ['IngresosBrutos|Contribuyente|Contribuyente'],
    type: 'EXTERNO'
  },
  'contador': {
    cuit: '20-98765432-1',
    nombre: 'María González',
    roles: ['contador', 'contribuyente'],
    email: 'maria@example.com',
    permissions: ['IngresosBrutos|Contador|Contador'],
    type: 'EXTERNO'
  },
  'agente': {
    cuit: '23-11111111-1',
    nombre: 'Pedro Admin',
    roles: ['agente-fiscalizacion', 'admin'],
    email: 'pedro@rentas.gob.ar',
    permissions: ['IngresosBrutos|Agente|Admin'],
    type: 'INTERNO'
  }
};

class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
  }

  /**
   * Inicializar autenticación según el modo
   */
  async init() {
    if (AUTH_MODE === 'mock') {
      return this.initMock();
    } else if (AUTH_MODE === 'keycloak') {
      return this.initKeycloak();
    }
    throw new Error(`Modo de auth no soportado: ${AUTH_MODE}`);
  }

  /**
   * Mock: Login simple para desarrollo
   */
  async initMock() {
    // Verificar si ya hay sesión
    const storedToken = localStorage.getItem('mock_token');
    if (storedToken) {
      try {
        this.user = JSON.parse(atob(storedToken.split('.')[1]));
        this.token = storedToken;
        return true;
      } catch (e) {
        localStorage.removeItem('mock_token');
      }
    }
    return false;
  }

  /**
   * Mock: Login con usuario predefinido
   */
  async loginMock(userType = 'contribuyente') {
    const user = MOCK_USERS[userType];
    if (!user) {
      throw new Error(`Usuario mock no encontrado: ${userType}`);
    }

    // Crear token mock (JWT fake pero con estructura válida)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: `f:6fc04c49-4702-47dc-aee1-6764ed79e6d1:${user.cuit}`,
      identifier: user.cuit,
      cuit: user.cuit,
      fullname: user.nombre,
      login: user.cuit,
      email: user.email,
      type: user.type,
      permissions: user.permissions,
      realm_access: { roles: user.roles },
      scope: 'openid arba-roles arba-roles-all',
      iss: 'https://idp.test.arba.gov.ar/realms/ARBA',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
      iat: Math.floor(Date.now() / 1000)
    }));
    const signature = btoa('mock-signature');
    
    this.token = `${header}.${payload}.${signature}`;
    this.user = user;
    
    localStorage.setItem('mock_token', this.token);
    return true;
  }

  /**
   * Keycloak: Inicialización real
   */
  async initKeycloak() {
    // TODO: Implementar cuando tengas Keycloak
    const keycloak = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
    });

    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false
    });

    if (authenticated) {
      this.token = keycloak.token;
      this.user = {
        cuit: keycloak.tokenParsed.cuit,
        nombre: keycloak.tokenParsed.name,
        email: keycloak.tokenParsed.email,
        roles: keycloak.tokenParsed.realm_access?.roles || []
      };
    }

    return authenticated;
  }

  /**
   * Obtener token actual
   */
  getToken() {
    return this.token;
  }

  /**
   * Obtener usuario actual
   */
  getUser() {
    return this.user;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Verificar si tiene un rol específico
   */
  hasRole(role) {
    return this.user?.roles?.includes(role) || false;
  }

  /**
   * Logout
   */
  async logout() {
    if (AUTH_MODE === 'mock') {
      localStorage.removeItem('mock_token');
      this.user = null;
      this.token = null;
      window.location.reload();
    } else if (AUTH_MODE === 'keycloak') {
      // TODO: keycloak.logout()
    }
  }
}

// Singleton
export const authService = new AuthService();

/**
 * Componente de login mock para desarrollo
 */
export function showMockLogin() {
  return `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h4 class="mb-0">Login Mock - Desarrollo</h4>
            </div>
            <div class="card-body">
              <p class="text-muted">Selecciona un usuario para continuar:</p>
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary" onclick="window.loginAs('contribuyente')">
                  👤 Contribuyente (JUAN PALOTE)
                  <br><small class="text-muted">CUIT: 20345534234</small>
                  <br><small class="text-success">✓ Datos reales de ejemplo ARBA</small>
                </button>
                <button class="btn btn-outline-success" onclick="window.loginAs('contador')">
                  💼 Contador (María González)
                  <br><small class="text-muted">CUIT: 20-98765432-1</small>
                </button>
                <button class="btn btn-outline-danger" onclick="window.loginAs('agente')">
                  🛡️ Agente Fiscalización (Pedro Admin)
                  <br><small class="text-muted">CUIT: 23-11111111-1</small>
                </button>
              </div>
              <hr>
              <p class="text-muted small mb-0">
                ⚠️ Modo desarrollo: Los tokens son simulados y no requieren Keycloak.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
