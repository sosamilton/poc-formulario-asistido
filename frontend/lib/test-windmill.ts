// Test script to verify Windmill API connectivity
// This can be run in the browser console to test the API endpoints

async function testWindmillAPI() {
  try {
    console.log('Testing Windmill API connectivity...')
    
    // Test 1: Generate test JWT
    console.log('1. Generating test JWT...')
    const jwtResponse = await fetch('http://localhost/api/w/formularios/jobs/run/p/f/plugins/ddjj/generate_test_jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '
      },
      body: JSON.stringify({})
    })
    
    if (!jwtResponse.ok) {
      throw new Error(`JWT Generation failed: ${jwtResponse.status}`)
    }
    
    const uuid = await jwtResponse.text()
    console.log('Job UUID:', uuid)
    
    // Wait for completion
    const jwtResult = await waitForJobCompletion(uuid) as any
    console.log('JWT Result:', jwtResult)
    
    const token = jwtResult.token || jwtResult
    console.log('Generated Token:', token)
    
    // Test 2: Generate form with token
    console.log('2. Generating form with token...')
    const formResponse = await fetch('http://localhost/api/w/formularios/jobs/run/f/f/form_lifecycle/init_flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '
      },
      body: JSON.stringify({
        token: token
      })
    })
    
    if (!formResponse.ok) {
      throw new Error(`Form Generation failed: ${formResponse.status}`)
    }
    
    const formUuid = await formResponse.text()
    console.log('Form Job UUID:', formUuid)
    
    // Wait for form completion
    const formData = await waitForJobCompletion(formUuid) as any
    console.log('Form Data:', formData)
    
    return {
      success: true,
      token,
      formData
    }
    
  } catch (error) {
    console.error('Test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function waitForJobCompletion(uuid: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const endpoint = `http://localhost/api/w/formularios/jobs_u/completed/get_result_maybe/${uuid}`
      const checkResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '
        }
      })

      const checkData = await checkResponse.json()

      if (checkData.completed) {
        resolve(checkData.result || checkData)
      } else {
        setTimeout(async () => {
          const result = await waitForJobCompletion(uuid)
          resolve(result)
        }, 1000)
      }
    } catch (error) {
      reject(error)
    }
  })
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testWindmillAPI = testWindmillAPI
  console.log('testWindmillAPI() function available in console')
}

export { testWindmillAPI }
