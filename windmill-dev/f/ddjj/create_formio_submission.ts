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
  const formioUrl = "http://localhost:3010";
  const formId = "699db24bb89b5983c653b400";
  
  const submissionPayload = {
    data: {
      cuit: data.cuit,
      razonSocial: data.razonSocial,
      actividad: data.actividad,
      regimen: data.regimen,
      alicuota: data.alicuota,
      montoAnterior: data.montoAnterior,
      periodoADeclarar1: null, // User will select from dropdown
      montoADeclarar: null, // User will fill this
      // Store periodos for dynamic select population
      _periodosAdeudados: data.periodosAdeudados,
      _montoMinimo: data.montoMinimo,
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
      throw new Error(`Form.io API error: ${response.status} - ${errorText}`);
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
    throw new Error(`Failed to create Form.io submission: ${(error as Error).message}`);
  }
}
