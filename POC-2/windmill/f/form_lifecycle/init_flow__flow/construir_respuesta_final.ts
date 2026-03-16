export async function main(
  runtime: any,
  transformedData: any,
  submission: any,
  cuit: string,
  razonSocial: string
) {
  return {
    submission_id: submission.id,
    schema: transformedData.schema,
    config: runtime.config,
    form_id: runtime.form_id,
    version: runtime.version,
    metadata: {
      form_name: runtime.name,
      form_slug: runtime.slug,
      category: runtime.category,
      ...transformedData.metadata,
      created_by: cuit,
      submission_status: submission.status,
      submission_created_at: submission.created_at,
      submission_updated_at: submission.updated_at
    }
  };
}