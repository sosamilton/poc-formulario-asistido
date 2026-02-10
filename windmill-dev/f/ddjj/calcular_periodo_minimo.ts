type CalculoResult = {
  montoMinimo: number;
  regimenAplicado: string;
  alicuotaAplicada: number;
};

export async function main(
  regimen: string,
  alicuota: number
): Promise<CalculoResult> {
  // Business logic for minimum amount calculation
  // For demo: hardcoded values based on regime
  
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
