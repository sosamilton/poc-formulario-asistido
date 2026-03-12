import * as wmill from "windmill-client";

type GetRuntimeInput = {
  slug: string;
  version?: number;
};

export async function main(input: GetRuntimeInput) {
  const sql = wmill.datatable();

  let row;

  if (input.version) {
    row = await sql`
      SELECT f.*, fv.version, fv.schema_json, fv.config
      FROM forms f
      JOIN form_versions fv ON f.id = fv.form_id
      WHERE f.slug = ${input.slug} AND fv.version = ${input.version}
    `.fetchOne();
  } else {
    row = await sql`
      SELECT f.*, fv.version, fv.schema_json, fv.config
      FROM forms f
      JOIN form_versions fv ON f.id = fv.form_id
      WHERE f.slug = ${input.slug} AND fv.version = f.active_version
    `.fetchOne();
  }

  if (!row) {
    throw new Error(`Form runtime not found: ${input.slug}`);
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
