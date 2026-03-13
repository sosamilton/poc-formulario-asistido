import * as wmill from "windmill-client";

export async function main() {
  const sql = wmill.datatable();

  const forms = await sql`
    SELECT id, slug, name, description, category, is_public, active_version, created_at, updated_at
    FROM forms
    ORDER BY created_at DESC
  `.fetch();

  return forms;
}
