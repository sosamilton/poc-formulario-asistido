# Windmill Integration - Frontend

## Overview

This document describes the integration between the frontend and Windmill API for dynamic form generation.

## Architecture

### Components Created

1. **WindmillService** (`lib/services/windmill-service.ts`)
   - Handles communication with Windmill API
   - Manages JWT generation and form creation
   - Implements job completion polling

2. **useWindmillForm Hook** (`hooks/use-windmill-form.ts`)
   - Custom React hook for form state management
   - Handles loading states and error handling
   - Provides interface for form loading operations

3. **LoadingSpinner** (`components/loading-spinner.tsx`)
   - Reusable loading component
   - Multiple size options

4. **SonnerToaster** (`components/ui/sonner-toaster.tsx`)
   - Toast notifications using Sonner
   - Integrated in layout for global access

### Updated Components

1. **SurveyForm** (`components/survey-form.tsx`)
   - Added metadata and submission_id props
   - Enhanced completion handler to include metadata

2. **PresentarPage** (`app/presentar/page.tsx`)
   - Integrated Windmill service
   - Added loading states and error handling
   - Dynamic form rendering with debug info

3. **Layout** (`app/layout.tsx`)
   - Added SonnerToaster for notifications

## API Flow

### 1. Generate Test JWT
```
POST /api/w/formularios/jobs/run/p/f/plugins/ddjj/generate_test_jwt
{
  "body": {}
}
```

### 2. Wait for Job Completion
```
GET /api/w/formularios/jobs_u/completed/get_result_maybe/{UUID}
```

### 3. Generate Form
```
POST /api/w/formularios/jobs/run/f/f/form_lifecycle/init_flow
{
  "token": "GENERATED_TOKEN"
}
```

### 4. Wait for Form Completion
Same endpoint as step 2 with different UUID

## Form Data Structure

The API returns a form data structure with:

```typescript
interface FormData {
  config: object
  schema: object           // SurveyJS form schema
  form_id: string
  version: number
  metadata: {
    cuit: string
    alicuota: number
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
```

## Usage

### Basic Usage

```typescript
import { useWindmillForm } from '@/hooks/use-windmill-form'

function MyComponent() {
  const { isLoading, error, formData, loadDeclaration } = useWindmillForm()

  const handleLoad = async () => {
    await loadDeclaration()
  }

  return (
    <div>
      {!formData && !isLoading && (
        <button onClick={handleLoad}>Cargar declaración</button>
      )}
      
      {isLoading && <LoadingSpinner />}
      
      {error && <div>Error: {error}</div>}
      
      {formData && (
        <SurveyForm 
          json={formData.schema} 
          metadata={formData.metadata}
          submissionId={formData.submission_id}
        />
      )}
    </div>
  )
}
```

## Environment Variables

Create `.env.local` in the frontend root:

```env
NEXT_PUBLIC_WINDMILL_URL=http://localhost
```

## Testing

A test script is available at `lib/test-windmill.ts` that can be used to verify API connectivity:

```javascript
// In browser console
testWindmillAPI()
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Network errors**: Caught and displayed as toast notifications
2. **API errors**: HTTP status codes checked and appropriate messages shown
3. **Job completion timeout**: Recursive polling with 1-second intervals
4. **Type safety**: TypeScript interfaces for all API responses

## Features

1. **Dynamic form generation**: Forms are generated based on Windmill workflow
2. **Metadata preservation**: All form metadata is stored and passed through
3. **Submission tracking**: Unique submission_id for each form instance
4. **Loading states**: Visual feedback during API operations
5. **Error recovery**: Retry functionality for failed operations
6. **Debug information**: Development mode shows token, submission_id, and metadata

## Next Steps

1. Add form submission endpoint integration
2. Implement form saving/loading functionality
3. Add form validation on the backend
4. Implement user authentication
5. Add form history/tracking features
