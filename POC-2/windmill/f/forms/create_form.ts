import * as wmill from "windmill-client";

type FormInput = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  is_public?: boolean;
  schema_json: object;
  config?: object;
  created_by?: string;
};

export async function main(input: FormInput) {
  const sql = wmill.datatable();

  const form = await sql`
    INSERT INTO forms (slug, name, description, category, is_public, active_version, created_by)
    VALUES (${input.slug}, ${input.name}, ${input.description || null}, ${input.category || null}, 
            ${input.is_public || false}, 1, ${input.created_by || "system"})
    RETURNING *
  `.fetchOne();

  const version = await sql`
    INSERT INTO form_versions (form_id, version, schema_json, config, created_by)
    VALUES (${form.id}, 1, ${JSON.stringify(input.schema_json)}, 
            ${JSON.stringify(input.config || {})}, ${input.created_by || "system"})
    RETURNING *
  `.fetchOne();

  return {
    form: form,
    version: version,
  };
}
