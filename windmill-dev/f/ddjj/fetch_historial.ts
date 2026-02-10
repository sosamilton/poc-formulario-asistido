type HistorialData = {
  cuit: string;
  montoAnterior: number | null;
  fechaUltimaDDJJ: string | null;
};

export async function main(cuit: string): Promise<HistorialData> {
  const mockoonUrl = "http://localhost:3001";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/historial/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Mockoon API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      cuit: data.cuit,
      montoAnterior: data.montoAnterior,
      fechaUltimaDDJJ: data.fechaUltimaDDJJ,
    };
  } catch (error) {
    throw new Error(`Failed to fetch historial data: ${(error as Error).message}`);
  }
}
