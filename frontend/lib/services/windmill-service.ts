interface WindmillJobResponse {
  completed: boolean
  result?: any
}

interface FormData {
  config: object
  schema: object
  form_id: string
  version: number
  metadata: {
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
  submission_id: string
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
      const response = await this.makeRequest('/api/r/generate-jwt-demo', {
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

  async generateForm(token: string): Promise<FormData> {
    try {
      const response = await this.makeRequest('/api/r/init_form_ddjj', {
        method: 'POST',
        body: JSON.stringify({
          token: token
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const formData = await response.json()
      return formData
    } catch (error) {
      console.error('Error generating form:', error)
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

  async loadDeclaration(): Promise<{ formData: FormData; token: string }> {
    try {
      const tokenResponse = await this.generateTestJwt()
      const token = tokenResponse.token || tokenResponse

      const formData = await this.generateForm(token)

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
