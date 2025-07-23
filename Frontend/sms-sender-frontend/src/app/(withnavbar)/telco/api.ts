// API helper functions for future backend integration
// These functions currently use mock data but can be easily replaced with actual API calls

import { TelcoRecord, TelcoSubmissionRequest, TelcoSubmissionResponse, ApiResponse } from './types';

// Base API URL - will be used when connecting to backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Mock API responses for development
const MOCK_ENABLED = process.env.NODE_ENV === 'development';

// Generic API request function
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API Request Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// API Functions for Telco Data Management

/**
 * Submit telco record with files to backend
 * @param request - The submission request with record ID and files
 * @returns Promise with submission response
 */
export async function submitTelcoRecord(
  request: TelcoSubmissionRequest
): Promise<ApiResponse<TelcoSubmissionResponse>> {
  if (MOCK_ENABLED) {
    // Mock response for development
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    
    return {
      success: true,
      data: {
        id: request.recordId,
        status: 'submitted',
        submittedAt: new Date(),
        notes: 'Successfully submitted via mock API'
      }
    };
  }

  // Real API call - uncomment and modify when backend is ready
  /*
  const formData = new FormData();
  formData.append('recordId', request.recordId);
  formData.append('registrationDocument', request.registrationDocument);
  formData.append('paymentProof', request.paymentProof);
  formData.append('idCard', request.idCard);
  
  if (request.metadata) {
    formData.append('metadata', JSON.stringify(request.metadata));
  }

  return apiRequest<TelcoSubmissionResponse>('/telco/submit', {
    method: 'POST',
    body: formData,
    headers: {} // Remove Content-Type for FormData
  });
  */

  // Placeholder return for now
  return {
    success: false,
    error: 'Backend API not yet implemented'
  };
}

/**
 * Get all telco records
 * @returns Promise with array of telco records
 */
export async function getTelcoRecords(): Promise<ApiResponse<TelcoRecord[]>> {
  if (MOCK_ENABLED) {
    // Return empty array for mock - data will be managed locally
    return { success: true, data: [] };
  }

  return apiRequest<TelcoRecord[]>('/telco/records');
}

/**
 * Update telco record
 * @param id - Record ID
 * @param updates - Partial record updates
 * @returns Promise with updated record
 */
export async function updateTelcoRecord(
  id: string, 
  updates: Partial<TelcoRecord>
): Promise<ApiResponse<TelcoRecord>> {
  if (MOCK_ENABLED) {
    // Mock update - just return the updates
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      success: true, 
      data: { id, ...updates } as TelcoRecord 
    };
  }

  return apiRequest<TelcoRecord>(`/telco/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete telco record
 * @param id - Record ID
 * @returns Promise with success status
 */
export async function deleteTelcoRecord(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  if (MOCK_ENABLED) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, data: { deleted: true } };
  }

  return apiRequest<{ deleted: boolean }>(`/telco/records/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Bulk submit multiple records
 * @param recordIds - Array of record IDs to submit
 * @returns Promise with bulk submission results
 */
export async function bulkSubmitRecords(recordIds: string[]): Promise<ApiResponse<{
  successful: string[];
  failed: { id: string; error: string }[];
}>> {
  if (MOCK_ENABLED) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      data: {
        successful: recordIds,
        failed: []
      }
    };
  }

  return apiRequest('/telco/bulk-submit', {
    method: 'POST',
    body: JSON.stringify({ recordIds }),
  });
}

/**
 * Get submission status for a record
 * @param recordId - Record ID
 * @returns Promise with submission status
 */
export async function getSubmissionStatus(recordId: string): Promise<ApiResponse<TelcoSubmissionResponse>> {
  if (MOCK_ENABLED) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        id: recordId,
        status: 'processing',
        submittedAt: new Date(),
        notes: 'Processing submission'
      }
    };
  }

  return apiRequest<TelcoSubmissionResponse>(`/telco/submissions/${recordId}`);
}

// Helper function to check if API is available
export async function checkApiHealth(): Promise<boolean> {
  if (MOCK_ENABLED) {
    return true;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Configuration object for easy backend integration
export const ApiConfig = {
  baseUrl: API_BASE_URL,
  endpoints: {
    submit: '/telco/submit',
    records: '/telco/records',
    bulkSubmit: '/telco/bulk-submit',
    submissions: '/telco/submissions',
    health: '/health'
  },
  mockEnabled: MOCK_ENABLED
};

// Example of how to use these functions:
/*
// In your component:
import { submitTelcoRecord, getTelcoRecords } from './api';

const handleSubmit = async (recordId: string, files: { reg: File, payment: File, id: File }) => {
  const result = await submitTelcoRecord({
    recordId,
    registrationDocument: files.reg,
    paymentProof: files.payment,
    idCard: files.id,
    metadata: {
      submittedBy: session?.user?.name || 'Unknown',
      submittedAt: new Date(),
      notes: 'Submitted from telco interface'
    }
  });

  if (result.success) {
    console.log('Submission successful:', result.data);
  } else {
    console.error('Submission failed:', result.error);
  }
};
*/
