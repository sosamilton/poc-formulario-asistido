type CalculoResult = {
  montoMinimo: number;
  regimenAplicado: string;
  alicuotaAplicada: number;
};

export async function main(
  regimen: string,
  alicuota: number
): Promise<CalculoResult> {
  // Lógica de negocio para cálculo de monto mínimo
  // Para demo: valores hardcodeados según régimen
  
  let montoMinimo = 0;
  
  switch (regimen) {
    case "CM": // Convenio Multilateral
      montoMinimo = 450;
      break;
    case "LOCAL":
      montoMinimo = 300;
      break;
    case "ESPECIAL":
      montoMinimo = 600;
      break;
    default:
      montoMinimo = 400;
  }
  
  return {
    montoMinimo,
    regimenAplicado: regimen,
    alicuotaAplicada: alicuota,
  };
}
