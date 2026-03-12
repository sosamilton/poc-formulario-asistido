import { useState, useEffect } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.min.css';

interface FormRendererProps {
  slug: string;
  windmillUrl: string;
  windmillToken: string;
  userId?: string;
}

export function FormRenderer({ slug, windmillUrl, windmillToken, userId = 'anonymous' }: FormRendererProps) {
  const [survey, setSurvey] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    initializeForm();
  }, [slug]);

  const initializeForm = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${windmillUrl}/api/w/formularios/jobs/run/f/formularios/api/get_form_init`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${windmillToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: slug,
            created_by: userId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to initialize form: ${response.statusText}`);
      }

      const jobId = await response.text();
      
      const result = await pollJobResult(jobId);

      const surveyModel = new Model(result.schema);
      surveyModel.data = result.data;
      
      surveyModel.onValidateQuestion.add(async (sender, options) => {
        const validationResult = await validateForm(sender.data);
        if (!validationResult.valid) {
          const fieldErrors = validationResult.errors.filter(
            (e: any) => e.field === options.name
          );
          if (fieldErrors.length > 0) {
            options.error = fieldErrors[0].message;
          }
        }
      });

      surveyModel.onComplete.add(async (sender) => {
        await submitForm(sender.data);
      });

      setSurvey(surveyModel);
      setSubmissionId(result.submission_id);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollJobResult = async (jobId: string, maxAttempts = 30): Promise<any> => {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${windmillUrl}/api/w/formularios/jobs/completed/get/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${windmillToken}`,
          },
        }
      );

      if (response.ok) {
        return await response.json();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Job timeout');
  };

  const validateForm = async (data: any) => {
    try {
      const response = await fetch(
        `${windmillUrl}/api/w/formularios/jobs/run/f/formularios/api/post_form_validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${windmillToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: slug,
            data: data,
          }),
        }
      );

      const jobId = await response.text();
      return await pollJobResult(jobId);
    } catch (err) {
      console.error('Validation error:', err);
      return { valid: false, errors: [] };
    }
  };

  const submitForm = async (data: any) => {
    try {
      const response = await fetch(
        `${windmillUrl}/api/w/formularios/jobs/run/f/formularios/api/post_form_submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${windmillToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: slug,
            data: data,
            submission_id: submissionId,
            metadata: {
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
            },
          }),
        }
      );

      const jobId = await response.text();
      const result = await pollJobResult(jobId);

      if (result.success) {
        console.log('Form submitted successfully:', result);
      } else {
        throw new Error('Submission failed');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      alert('Error al enviar el formulario: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Cargando formulario...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!survey) {
    return null;
  }

  return <Survey model={survey} />;
}
