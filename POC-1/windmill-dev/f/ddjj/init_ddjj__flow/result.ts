// Devolver datos directamente sin crear submission en Form.io
type Params = {
  cuit: string;
  razonSocial: string;
  actividad: string;
  regimen: string;
  alicuota: number;
  montoAnterior: number | null;
  periodosAdeudados: string[];
}

export async function main(
  cuit: string,
  razonSocial: string,
  actividad: string,
  regimen: string,
  alicuota: number,
  montoAnterior: number | null,
  periodosAdeudados: string[]
) {
  console.log('[DEBUG] Parámetros recibidos:', { cuit, razonSocial, actividad, regimen, alicuota, montoAnterior, periodosAdeudados });
  
  const result = {
    cuit,
    razonSocial,
    actividad,
    regimen,
    alicuota,
    montoAnterior,
    periodosAdeudados
  };
  
  console.log('[DEBUG] Resultado a devolver:', result);
  return result;
}