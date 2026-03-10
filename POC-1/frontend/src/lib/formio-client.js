/**
 * Cliente para interactuar con Form.io API
 */

import { Formio } from '@formio/js';

const FORMIO_URL = import.meta.env.VITE_FORMIO_URL;

class FormioClient {
  /**
   * Cargar schema de un formulario
   */
  async loadForm(formId) {
    const formio = new Formio(`${FORMIO_URL}/form/${formId}`);
    return formio.loadForm();
  }

  /**
   * Crear draft submission
   */
  async createSubmission(formId, data) {
    const formio = new Formio(`${FORMIO_URL}/form/${formId}`);
    return formio.saveSubmission({ data });
  }

  /**
   * Actualizar submission
   */
  async updateSubmission(formId, submissionId, data) {
    const formio = new Formio(`${FORMIO_URL}/form/${formId}/submission/${submissionId}`);
    return formio.saveSubmission({ data });
  }

  /**
   * Obtener submission
   */
  async getSubmission(formId, submissionId) {
    const formio = new Formio(`${FORMIO_URL}/form/${formId}/submission/${submissionId}`);
    return formio.loadSubmission();
  }

  /**
   * Renderizar formulario en un elemento
   */
  async renderForm(element, formId, options = {}) {
    return Formio.createForm(
      element,
      `${FORMIO_URL}/form/${formId}`,
      options
    );
  }
}

export const formioClient = new FormioClient();
