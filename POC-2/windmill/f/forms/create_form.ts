import * as wmill from "windmill-client";

export async function main(
  slug: string,
  name: string,
  schema_json: object,
  description?: string,
  category?: string,
  is_public: boolean = false,
  config: object = {},
  created_by: string = "system"
) {
  const sql = wmill.datatable();

  const form = await sql`
    INSERT INTO forms (slug, name, description, category, is_public, active_version, created_by)
    VALUES (${slug}, ${name}, ${description || null}, ${category || null}, 
            ${is_public}, 1, ${created_by})
    RETURNING *
  `.fetchOne();

  const version = await sql`
    INSERT INTO form_versions (form_id, version, schema_json, config, created_by)
    VALUES (${form.id}::uuid, 1, ${JSON.stringify(schema_json)}, 
            ${JSON.stringify(config || {})}, ${created_by || "system"})
    RETURNING *
  `.fetchOne();

  return {
    form: form,
    version: version,
  };
}
