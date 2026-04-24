type SchemaJson = {
  title?: string;
  logoPosition?: string;
  pages?: Array<{
    name: string;
    elements: Array<any>;
  }>;
  [key: string]: any;
};

export async function main(
  schema: SchemaJson,
  cuit: string,
  razonSocial: string,
  actividad: string,
  codigoActividad: string,
  periodosAdeudados: string[],
  alicuota: number
) {
  const transformedSchema = JSON.parse(JSON.stringify(schema));
  
  if (!transformedSchema.pages || transformedSchema.pages.length === 0) {
    throw new Error("Schema no tiene páginas definidas");
  }

  const page = transformedSchema.pages[0];
  if (!page.elements) {
    page.elements = [];
  }

  // Actualizar el HTML del info_contribuyente
  const infoElement = page.elements.find((el: any) => el.name === "info_contribuyente");
  if (infoElement && infoElement.type === "html") {
    infoElement.html = `<div class='contribuyente-info'><div class='info-row'><span class='label'>CUIT</span><span class='value'>${cuit} - ${razonSocial}</span></div><div class='info-row'><span class='label'>Actividad</span><span class='value'>${actividad} (${codigoActividad})</span></div></div>`;
  }

  // Actualizar el dropdown de períodos con los períodos adeudados
  const periodoElement = page.elements.find((el: any) => el.name === "periodo");
  if (periodoElement && periodoElement.type === "dropdown" && periodosAdeudados.length > 0) {
    // Convertir períodos adeudados a formato de choices
    periodoElement.choices = periodosAdeudados.map((periodo: string) => {
      const [year, month] = periodo.split('-');
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      return {
        value: periodo,
        text: `${monthName} ${year}`
      };
    });
    
    // Establecer el primer período como default
    periodoElement.defaultValue = periodosAdeudados[0];
  }

  return {
    schema: transformedSchema,
    metadata: {
      cuit,
      razonSocial,
      actividad,
      codigoActividad,
      alicuota,
      periodosAdeudados
    }
  };
}