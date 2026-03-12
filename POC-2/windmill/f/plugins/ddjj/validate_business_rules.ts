type ValidateBusinessRulesInput = {
  data: any;
  form_id: string;
  version: number;
};

export async function main(input: ValidateBusinessRulesInput) {
  const errors: any[] = [];
  const data = input.data;

  if (data.ingresos_brutos) {
    if (data.ingresos_brutos < 0) {
      errors.push({
        field: "ingresos_brutos",
        message: "Los ingresos brutos no pueden ser negativos",
      });
    }

    if (data.ingresos_brutos > 1000000000) {
      errors.push({
        field: "ingresos_brutos",
        message: "Los ingresos brutos exceden el límite permitido",
      });
    }
  }

  if (data.deducciones && data.ingresos_brutos) {
    if (data.deducciones > data.ingresos_brutos) {
      errors.push({
        field: "deducciones",
        message: "Las deducciones no pueden superar los ingresos brutos",
      });
    }
  }

  if (data.periodo) {
    const periodo = new Date(data.periodo);
    const hoy = new Date();
    
    if (periodo > hoy) {
      errors.push({
        field: "periodo",
        message: "No se puede declarar un período futuro",
      });
    }
  }

  if (data.actividades && Array.isArray(data.actividades)) {
    let sumaAlicuotas = 0;
    
    for (const actividad of data.actividades) {
      if (actividad.porcentaje_actividad) {
        sumaAlicuotas += actividad.porcentaje_actividad;
      }
    }

    if (Math.abs(sumaAlicuotas - 100) > 0.01) {
      errors.push({
        field: "actividades",
        message: "La suma de porcentajes de actividades debe ser 100%",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}
