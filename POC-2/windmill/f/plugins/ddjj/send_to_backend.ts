import * as wmill from "windmill-client";

type SendToBackendInput = {
  submission_id: string;
  form_id: string;
  data: any;
  metadata?: any;
};

export async function main(input: SendToBackendInput) {
  try {
    const backendUrl = await wmill.getVariable("u/admin/IIBB_BACKEND_URL");
    const apiKey = await wmill.getVariable("u/admin/IIBB_API_KEY");

    const payload = {
      submission_id: input.submission_id,
      form_type: "ddjj",
      data: input.data,
      metadata: input.metadata || {},
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${backendUrl}/api/ddjj/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      backend_response: result,
      submission_id: input.submission_id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      submission_id: input.submission_id,
      timestamp: new Date().toISOString(),
    };
  }
}
