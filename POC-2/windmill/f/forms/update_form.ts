import * as wmill from "windmill-client";

export async function main(
  slug: string,
  name?: string,
  description?: string,
  category?: string,
  is_public?: boolean,
  schema_json?: object,
  config?: object,
  updated_by: string = "system"
) {
  const sql = wmill.datatable();

  const form = await sql`SELECT * FROM forms WHERE slug = ${slug}`.fetchOne();

  if (!form) {
    throw new Error(`Form not found: ${slug}`);
  }

  if (name || description || category !== undefined || is_public !== undefined) {
    await sql`
      UPDATE forms
      SET name = ${name || form.name},
          description = ${description !== undefined ? description : form.description},
          category = ${category !== undefined ? category : form.category},
          is_public = ${is_public !== undefined ? is_public : form.is_public}
      WHERE slug = ${slug}
    `.execute();
  }

  if (schema_json || config) {
    const newVersion = form.active_version + 1;

    const currentVersion = await sql`
      SELECT schema_json, config
      FROM form_versions
      WHERE form_id = ${form.id} AND version = ${form.active_version}
    `.fetchOne();

    await sql`
      INSERT INTO form_versions (form_id, version, schema_json, config, created_by)
      VALUES (
        ${form.id},
        ${newVersion},
        ${JSON.stringify(schema_json || currentVersion.schema_json)},
        ${JSON.stringify(config || currentVersion.config)},
        ${updated_by}
      )
    `.execute();

    await sql`
      UPDATE forms
      SET active_version = ${newVersion}
      WHERE id = ${form.id}
    `.execute();
  }

  const updatedForm = await sql`SELECT * FROM forms WHERE slug = ${slug}`.fetchOne();

  return {
    success: true,
    form: updatedForm,
  };
}
