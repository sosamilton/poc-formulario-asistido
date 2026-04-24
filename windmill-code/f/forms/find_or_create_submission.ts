import * as wmill from "windmill-client";

type FindOrCreateSubmissionInput = {
  form_id: string;
  version: number;
  cuit: string;
  data: object;
  metadata?: object;
};

type Submission = {
  id: string;
  form_id: string;
  version: number;
  data: any;
  status: string;
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function main(
  form_id: string,
  version: number,
  cuit: string,
  data: object,
  metadata?: object
): Promise<Submission> {
  const sql = wmill.datatable();

  // Buscar submission existente en estado 'draft' para este CUIT y form_id
  const existingSubmission = await sql`
    SELECT * FROM form_submissions
    WHERE form_id = ${form_id}::UUID
      AND metadata->>'cuit' = ${cuit}
      AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1
  `.fetchOne();

  if (existingSubmission) {
    // Si existe un submission en draft, actualizarlo con los nuevos datos
    const updated = await sql`
      UPDATE form_submissions
      SET data = ${data},
          metadata = ${metadata || {}},
          version = ${version},
          updated_at = NOW()
      WHERE id = ${existingSubmission.id}::UUID
      RETURNING *
    `.fetchOne();

    return updated;
  } else {
    // Si no existe o todos están completed, crear uno nuevo
    const newSubmission = await sql`
      INSERT INTO form_submissions (
        form_id, 
        version, 
        data, 
        status, 
        metadata, 
        created_by
      )
      VALUES (
        ${form_id}::UUID,
        ${version},
        ${data},
        'draft',
        ${metadata || {}},
        ${cuit}
      )
      RETURNING *
    `.fetchOne();

    return newSubmission;
  }
}
