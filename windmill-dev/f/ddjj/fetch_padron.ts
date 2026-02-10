type PadronData = {
  cuit: string;
  razonSocial: string;
  actividad: string;
  codigoActividad: string;
  regimen: string;
};

export async function main(cuit: string): Promise<PadronData> {
  const mockoonUrl = "http://localhost:3001";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/padron/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Mockoon API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      cuit: data.cuit,
      razonSocial: data.razonSocial,
      actividad: data.actividad,
      codigoActividad: data.codigoActividad,
      regimen: data.regimen,
    };
  } catch (error) {
    throw new Error(`Failed to fetch padron data: ${(error as Error).message}`);
  }
}
