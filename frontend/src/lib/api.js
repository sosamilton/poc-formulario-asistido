/**
 * Cliente API con soporte de autenticación
 */

import { authService } from './auth.js';

const WINDMILL_URL = import.meta.env.VITE_WINDMILL_URL || '';
const WINDMILL_WORKSPACE = import.meta.env.VITE_WINDMILL_WORKSPACE;

class ApiClient {
  /**
   * Llamar a un HTTP trigger de Windmill
   */
  async callHttpTrigger(routePath, body = {}) {
    // HTTP triggers en Windmill se acceden con prefijo /api/r/
    const baseUrl = WINDMILL_URL || '';
    const url = `${baseUrl}/api/r/${routePath}`;
    
    console.log('Calling HTTP trigger:', url, 'with body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Obtener configuración de la aplicación
   */
  async getAppConfig() {
    return this.callHttpTrigger('config/user', {
      token: authService.getToken()
    });
  }

  /**
   * Inicializar formulario
   */
  async initForm(formId, params = {}) {
    return this.callHttpTrigger('forms/init', {
      form_id: formId,
      token: authService.getToken(),
      params
    });
  }

  /**
   * Enviar formulario
   */
  async submitForm(formId, submissionId, data) {
    return this.callHttpTrigger('forms/submit', {
      form_id: formId,
      submission_id: submissionId,
      data,
      token: authService.getToken()
    });
  }
}

// Singleton
export const apiClient = new ApiClient();
