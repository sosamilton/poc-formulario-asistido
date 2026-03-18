interface WindmillJobResponse {
  completed: boolean
  result?: any
}

interface FormData {
  formUrl: string
  submissionId?: string
  prefillData?: Record<string, any>
  dynamicOptions?: Record<string, any[]>
  metadata?: {
    cuit: string
    alicuota: number
    category: any
    actividad: string
    form_name: string
    form_slug: string
    created_by: string
    razonSocial: string
    codigoActividad: string
    periodosAdeudados: string[]
    submission_status: string
    submission_created_at: string
    submission_updated_at: string
  }
}

class WindmillService {
  private baseUrl: string
  private bearerToken: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WINDMILL_URL || 'http://localhost'
    this.bearerToken = ''
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      ...options.headers as Record<string, string>,
    }

    // Only add Content-Type for requests with a body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  async generateTestJwt(): Promise<any> {
    try {
      const response = await this.makeRequest('/api/r/ddjj/generate_test_jwt', {
        method: 'GET',
      })

      if (!response.ok) {
        console.error('Error generating test JWT:', response)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const token = await response.text()
      return { token }
    } catch (error) {
      console.error('Error generating test JWT:', error)
      throw error
    }
  }

  async initForm(formId: string, token: string, params = {}): Promise<FormData> {
    try {
      const response = await this.makeRequest('/api/r/forms/init', {
        method: 'POST',
        body: JSON.stringify({
          form_id: formId,
          token: token,
          params
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const formData = await response.json()
      return formData
    } catch (error) {
      console.error('Error initializing form:', error)
      throw error
    }
  }

  async submitForm(formId: string, submissionId: string, data: any, token: string): Promise<any> {
    try {
      const response = await this.makeRequest('/api/r/forms/submit', {
        method: 'POST',
        body: JSON.stringify({
          form_id: formId,
          submission_id: submissionId,
          data,
          token
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting form:', error)
      throw error
    }
  }

  private async waitForJobCompletion(uuid: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const endpoint = `/api/w/formularios/jobs_u/completed/get_result_maybe/${uuid}`
        const checkResponse = await this.makeRequest(endpoint, {
          method: 'GET',
        })

        const checkData: WindmillJobResponse = await checkResponse.json()

        if (checkData.completed) {
          resolve(checkData.result || checkData)
        } else {
          setTimeout(async () => {
            try {
              const result = await this.waitForJobCompletion(uuid)
              resolve(result)
            } catch (error) {
              reject(error)
            }
          }, 1000)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async loadDeclaration(formId: string = 'ddjj-mensual', params = {}): Promise<{ formData: FormData; token: string }> {
    try {
      const tokenResponse = await this.generateTestJwt()
      const token = tokenResponse.token || tokenResponse

      const formData = await this.initForm(formId, token, params)

      return {
        formData,
        token
      }
    } catch (error) {
      console.error('Error loading declaration:', error)
      throw error
    }
  }
}

export const windmillService = new WindmillService()
export type { FormData }
