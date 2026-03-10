type HistorialData = {
  cuit: string;
  montoAnterior: number | null;
  fechaUltimaDDJJ: string | null;
};

export async function main(cuit: string): Promise<HistorialData> {
  const mockoonUrl = "https://apis.mdsoluciones.ar";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/historial/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Error en API Mockoon: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      cuit: data.cuit,
      montoAnterior: data.montoAnterior,
      fechaUltimaDDJJ: data.fechaUltimaDDJJ,
    };
  } catch (error) {
    throw new Error(`Error al obtener datos históricos: ${(error as Error).message}`);
  }
}
