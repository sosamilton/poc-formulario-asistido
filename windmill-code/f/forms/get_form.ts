import * as wmill from "windmill-client";

export async function main(slug: string) {
  const sql = wmill.datatable();

  const form = await sql`SELECT * FROM forms WHERE slug = ${slug}`.fetchOne();

  if (!form) {
    throw new Error(`Form not found: ${slug}`);
  }

  return form;
}
