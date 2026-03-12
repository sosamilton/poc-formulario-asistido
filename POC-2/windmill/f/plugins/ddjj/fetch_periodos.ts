import * as wmill from "windmill-client";

type FetchPeriodosInput = {
  cuit?: string;
  created_by?: string;
  anio?: number;
};

export async function main(input: FetchPeriodosInput) {
  const cuit = input.cuit || input.created_by;
  const anio = input.anio || new Date().getFullYear();

  if (!cuit) {
    return {
      success: false,
      message: "CUIT no proporcionado",
      data: null,
    };
  }

  try {
    const sql = wmill.datatable();
    
    const rows = await sql`
      SELECT periodo, estado, fecha_vencimiento
      FROM periodos_ddjj
      WHERE cuit = ${cuit} AND EXTRACT(YEAR FROM periodo) = ${anio}
      ORDER BY periodo DESC
    `.fetch();

    const periodos = rows.map((row) => ({
      periodo: row.periodo,
      estado: row.estado,
      fecha_vencimiento: row.fecha_vencimiento,
      vencido: new Date(row.fecha_vencimiento) < new Date(),
    }));

    const pendientes = periodos.filter((p) => p.estado === "pendiente");

    return {
      success: true,
      data: {
        periodos: periodos,
        pendientes: pendientes,
        total: periodos.length,
        total_pendientes: pendientes.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al consultar períodos: ${error.message}`,
      data: null,
    };
  }
}
