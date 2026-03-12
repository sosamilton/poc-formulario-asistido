import * as wmill from "windmill-client";

type FetchPadronInput = {
  cuit?: string;
  created_by?: string;
};

export async function main(input: FetchPadronInput) {
  const cuit = input.cuit || input.created_by;

  if (!cuit) {
    return {
      success: false,
      message: "CUIT no proporcionado",
      data: null,
    };
  }

  try {
    const sql = wmill.datatable();
    
    const contribuyente = await sql`
      SELECT * FROM padron_contribuyentes WHERE cuit = ${cuit} LIMIT 1
    `.fetchOne();

    if (!contribuyente) {
      return {
        success: false,
        message: "Contribuyente no encontrado en el padrón",
        data: null,
      };
    }

    return {
      success: true,
      data: {
        cuit: contribuyente.cuit,
        razon_social: contribuyente.razon_social,
        domicilio_fiscal: contribuyente.domicilio_fiscal,
        actividad_principal: contribuyente.actividad_principal,
        regimen: contribuyente.regimen,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al consultar padrón: ${error.message}`,
      data: null,
    };
  }
}
