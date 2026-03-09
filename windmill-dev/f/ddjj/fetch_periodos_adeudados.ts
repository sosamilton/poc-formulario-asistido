type PeriodosData = {
  cuit: string;
  periodosAdeudados: string[];
};

export async function main(cuit: string): Promise<PeriodosData> {
  const mockoonUrl = "https://apis.mdsoluciones.ar";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/periodos-adeudados/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Mockoon API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      cuit: data.cuit,
      periodosAdeudados: data.periodosAdeudados,
    };
  } catch (error) {
    throw new Error(`Failed to fetch periodos adeudados: ${(error as Error).message}`);
  }
}
