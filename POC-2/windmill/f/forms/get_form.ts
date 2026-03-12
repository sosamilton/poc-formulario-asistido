import * as wmill from "windmill-client";

type GetFormInput = {
  slug: string;
};

export async function main(input: GetFormInput) {
  const sql = wmill.datatable();

  const form = await sql`SELECT * FROM forms WHERE slug = ${input.slug}`.fetchOne();

  if (!form) {
    throw new Error(`Form not found: ${input.slug}`);
  }

  return form;
}
