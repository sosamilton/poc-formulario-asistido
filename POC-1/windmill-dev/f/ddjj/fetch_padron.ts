type PadronData = {
  cuit: string;
  razonSocial: string;
  actividad: string;
  codigoActividad: string;
  regimen: string;
};

export async function main(cuit: string): Promise<PadronData> {
  const mockoonUrl = "https://apis.mdsoluciones.ar";
  
  try {
    const response = await fetch(`${mockoonUrl}/api/padron/${cuit}`);
    
    if (!response.ok) {
      throw new Error(`Error en API Mockoon: ${response.status} ${response.statusText}`);
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
    throw new Error(`Error al obtener datos del padrón: ${(error as Error).message}`);
  }
}
