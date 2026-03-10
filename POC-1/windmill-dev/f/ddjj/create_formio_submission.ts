type SubmissionData = {
  cuit: string;
  razonSocial: string;
  actividad: string;
  regimen: string;
  alicuota: number;
  montoAnterior: number | null;
  periodosAdeudados: string[];
  montoMinimo: number;
};

type SubmissionResult = {
  submission_id: string;
  form_url: string;
  cuit: string;
  periodosAdeudados: string[];
  montoAnterior: number | null;
};

export async function main(data: SubmissionData): Promise<SubmissionResult> {
  const formioUrl = "https://formio.mdsoluciones.ar/";
  const formId = "69ac22b5c99310e3a822b518";
  // Crear submission vacía solo con campos básicos para evitar recursividad
  // Los demás campos se llenarán en el frontend con prefillData
  const submissionPayload = {
    data: {
      cuit: data.cuit,
      razonSocial: data.razonSocial,
    },
  };

  try {
    const response = await fetch(`${formioUrl}/form/${formId}/submission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API Form.io: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      submission_id: result._id,
      form_url: `${formioUrl}/#/form/${formId}/submission/${result._id}`,
      cuit: data.cuit,
      periodosAdeudados: data.periodosAdeudados,
      montoAnterior: data.montoAnterior,
    };
  } catch (error) {
    throw new Error(`Error al crear submission en Form.io: ${(error as Error).message}`);
  }
}
