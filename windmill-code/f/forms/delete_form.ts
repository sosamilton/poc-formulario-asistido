import * as wmill from "windmill-client";

export async function main(slug: string, hard_delete: boolean = false) {
  const sql = wmill.datatable();

  const form = await sql`SELECT * FROM forms WHERE slug = ${slug}`.fetchOne();

  if (!form) {
    throw new Error(`Form not found: ${slug}`);
  }

  if (hard_delete) {
    await sql`DELETE FROM form_submissions WHERE form_id = ${form.id}`.execute();
    await sql`DELETE FROM form_versions WHERE form_id = ${form.id}`.execute();
    await sql`DELETE FROM forms WHERE id = ${form.id}`.execute();
  } else {
    await sql`
      UPDATE forms
      SET is_public = false,
          description = CONCAT('[DELETED] ', COALESCE(description, ''))
      WHERE id = ${form.id}
    `.execute();
  }

  return {
    success: true,
    message: hard_delete ? "Form permanently deleted" : "Form marked as deleted",
    slug: slug,
  };
}
