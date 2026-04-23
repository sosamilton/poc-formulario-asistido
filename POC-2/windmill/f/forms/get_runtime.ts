import * as wmill from "windmill-client";

export async function main(slug: string, version?: number) {
  const sql = wmill.datatable();

  let row;

  if (version) {
    row = await sql`
      SELECT f.*, fv.version, fv.schema_json, fv.config
      FROM forms f
      JOIN form_versions fv ON f.id = fv.form_id
      WHERE f.slug = ${slug} AND fv.version = ${version}
    `.fetchOne();
  } else {
    row = await sql`
      SELECT f.*, fv.version, fv.schema_json, fv.config
      FROM forms f
      JOIN form_versions fv ON f.id = fv.form_id
      WHERE f.slug = ${slug} AND fv.version = f.active_version
    `.fetchOne();
  }

  if (!row) {
    // Debug: Verificar si el formulario existe
    const formExists = await sql`SELECT id, slug, active_version FROM forms WHERE slug = ${slug}`.fetchOne();
    
    if (!formExists) {
      throw new Error(`Form not found: ${slug}`);
    } else {
      const versions = await sql`SELECT version FROM form_versions WHERE form_id = ${formExists.id}`.fetch();
      throw new Error(`Form found but no valid version: ${slug}. Active version: ${formExists.active_version}, Available versions: ${versions.map(v => v.version).join(', ')}`);
    }
  }

  return {
    form_id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    version: row.version,
    schema: row.schema_json,
    config: row.config,
    is_public: row.is_public,
  };
}
