/**
 * Cliente API con soporte de autenticación
 */

import { authService } from './auth.js';

const WINDMILL_URL = import.meta.env.VITE_WINDMILL_URL;
const WINDMILL_WORKSPACE = import.meta.env.VITE_WINDMILL_WORKSPACE;

class ApiClient {
  /**
   * Fetch con autenticación automática
   */
  async fetch(url, options = {}) {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No autenticado');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Token expirado o inválido
      await authService.logout();
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Ejecutar script de Windmill
   */
  async runScript(scriptPath, args = {}) {
    const url = `${WINDMILL_URL}/api/w/${WINDMILL_WORKSPACE}/jobs/run/p/${scriptPath}`;
    
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(args)
    });
  }

  /**
   * Ejecutar script y esperar resultado
   */
  async runScriptSync(scriptPath, args = {}, timeout = 30000) {
    const job = await this.runScript(scriptPath, args);
    return this.waitForJob(job.id, timeout);
  }

  /**
   * Esperar a que un job termine
   */
  async waitForJob(jobId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(jobId);
      
      if (status.type === 'CompletedJob') {
        if (status.success) {
          return status.result;
        } else {
          throw new Error(status.result?.error || 'Job failed');
        }
      }
      
      // Esperar 500ms antes de volver a consultar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Job timeout');
  }

  /**
   * Obtener estado de un job
   */
  async getJobStatus(jobId) {
    const url = `${WINDMILL_URL}/api/w/${WINDMILL_WORKSPACE}/jobs/get/${jobId}`;
    return this.fetch(url);
  }

  /**
   * Obtener configuración de la aplicación
   */
  async getAppConfig() {
    return this.runScriptSync('f/config/get_user_config', {
      token: authService.getToken()
    });
  }

  /**
   * Inicializar formulario
   */
  async initForm(formId, params = {}) {
    return this.runScriptSync('f/forms/init_form', {
      form_id: formId,
      token: authService.getToken(),
      params
    });
  }

  /**
   * Enviar formulario
   */
  async submitForm(formId, submissionId, data) {
    return this.runScriptSync('f/forms/submit_form', {
      form_id: formId,
      submission_id: submissionId,
      data,
      token: authService.getToken()
    });
  }
}

// Singleton
export const apiClient = new ApiClient();
