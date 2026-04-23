import * as wmill from "windmill-client";

type SaveSubmissionInput = {
  submission_id?: string;
  form_id: string;
  version: number;
  data: object;
  status?: string;
  validation_errors?: object;
  metadata?: object;
  created_by?: string;
};

export async function main(input: SaveSubmissionInput) {
  const sql = wmill.datatable();

  if (input.submission_id) {
    const submission = await sql`
      UPDATE form_submissions
      SET data = ${JSON.stringify(input.data)}, 
          status = ${input.status || "draft"}, 
          validation_errors = ${input.validation_errors ? JSON.stringify(input.validation_errors) : null}, 
          metadata = ${JSON.stringify(input.metadata || {})}
      WHERE id = ${input.submission_id}
      RETURNING *
    `.fetchOne();

    if (!submission) {
      throw new Error(`Submission not found: ${input.submission_id}`);
    }

    return submission;
  } else {
    const submission = await sql`
      INSERT INTO form_submissions (form_id, version, data, status, validation_errors, metadata, created_by)
      VALUES (${input.form_id}, ${input.version}, ${JSON.stringify(input.data)}, 
              ${input.status || "draft"}, 
              ${input.validation_errors ? JSON.stringify(input.validation_errors) : null}, 
              ${JSON.stringify(input.metadata || {})}, 
              ${input.created_by || "anonymous"})
      RETURNING *
    `.fetchOne();

    return submission;
  }
}
