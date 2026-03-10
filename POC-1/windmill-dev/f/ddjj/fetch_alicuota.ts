type AlicuotaData = {
  codigoActividad: string;
  descripcion: string;
  alicuota: number;
};

export async function main(codigoActividad: string): Promise<AlicuotaData> {
  const mockoonUrl = "https://apis.mdsoluciones.ar";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/actividad/${codigoActividad}`);
    
    if (!response.ok) {
      throw new Error(`Error en API Mockoon: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      codigoActividad: data.codigoActividad,
      descripcion: data.descripcion,
      alicuota: data.alicuota,
    };
  } catch (error) {
    throw new Error(`Error al obtener datos de alícuota: ${(error as Error).message}`);
  }
}
