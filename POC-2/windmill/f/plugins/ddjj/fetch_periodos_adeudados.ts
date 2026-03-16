type PeriodosData = {
  cuit: string;
  periodosAdeudados: string[];
};

export async function main(cuit: string): Promise<PeriodosData> {
  const mockoonUrl = "http://mockoon:3001";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/periodos-adeudados/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Error en API Mockoon: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      cuit: data.cuit,
      periodosAdeudados: data.periodosAdeudados,
    };
  } catch (error) {
    throw new Error(`Error al obtener períodos adeudados: ${(error as Error).message}`);
  }
}
