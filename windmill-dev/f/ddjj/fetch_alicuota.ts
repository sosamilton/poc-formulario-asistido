type AlicuotaData = {
  codigoActividad: string;
  descripcion: string;
  alicuota: number;
};

export async function main(codigoActividad: string): Promise<AlicuotaData> {
  const mockoonUrl = "http://localhost:3001";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/actividad/${codigoActividad}`);
    
    if (!response.ok) {
      throw new Error(`Mockoon API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      codigoActividad: data.codigoActividad,
      descripcion: data.descripcion,
      alicuota: data.alicuota,
    };
  } catch (error) {
    throw new Error(`Failed to fetch alicuota data: ${(error as Error).message}`);
  }
}
