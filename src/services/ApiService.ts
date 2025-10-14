import { ApiResponse } from './ApiResponse';
import { getHeaders, getBaseUrl } from '../utils/apiHelpers';

/**
 * Main API Service class for handling all HTTP requests
 * Based on the Flutter ApiService implementation
 */
export class ApiService {
  protected baseUrl: string;
  private pendingRequests: Map<string, Promise<ApiResponse>> = new Map();

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Generate a unique key for request deduplication
   */
  private getRequestKey(method: string, endpoint: string, body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${endpoint}:${bodyStr}`;
  }

  /**
   * Handle HTTP response and convert to ApiResponse
   */
  private async handleHttpResponse(response: Response): Promise<ApiResponse> {
    console.log('Response Status:', response.status);

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;

    const responseText = await response.text();

    if (responseText.length > 1024) {
      console.log('Response Body: [Truncated due to length > 1024 characters]');
    } else {
      console.log('Response Body:', responseText);
    }

    if (isJson) {
      return ApiResponse.fromHttpResponse(response, responseText, response.url);
    } else {
      // For non-JSON responses (like files)
      const success = response.status >= 200 && response.status < 300;
      const mockJson = success
        ? '{"data": "File content type, not JSON. Handled by caller.", "message": "File retrieval successful."}'
        : '{"message": "File retrieval failed."}';

      return ApiResponse.fromHttpResponse(response, mockJson, response.url);
    }
  }

  /**
   * GET request with deduplication
   */
  async get( 
    endpoint: string,
    options: {
      requiresAuth?: boolean;
      queryParameters?: Record<string, any> | null;
      skipDeduplication?: boolean;
    } = {}
  ): Promise<ApiResponse> {
    const { requiresAuth = true, queryParameters = null, skipDeduplication = false } = options;

    // Create request key for deduplication
    const requestKey = this.getRequestKey('GET', endpoint, queryParameters);

    // Check if there's already a pending request (unless skipped)
    if (!skipDeduplication && this.pendingRequests.has(requestKey)) {
      console.log('Returning cached request for:', endpoint);
      return this.pendingRequests.get(requestKey)!;
    }

    const headers = getHeaders(requiresAuth);
    let url = `${this.baseUrl}${endpoint}`;

    if (queryParameters) {
      const params = new URLSearchParams();
      Object.entries(queryParameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      url += `?${params.toString()}`;
    }

    console.log('GET Request:', url);
    console.log('Headers:', headers);

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        return await this.handleHttpResponse(response);
      } catch (error) {
        console.error(`Error in GET ${endpoint}:`, error);

        if (error instanceof TypeError && error.message.includes('fetch')) {
          return ApiResponse.fromError(
            'Network error: Please check your connection and try again.',
            -1
          );
        }

        return ApiResponse.fromError(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          -3
        );
      } finally {
        // Remove from pending requests when done
        this.pendingRequests.delete(requestKey);
      }
    })();

    // Store the promise for deduplication
    if (!skipDeduplication) {
      this.pendingRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  }

  /**
   * POST request
   */
  async post(
    endpoint: string,
    options: {
      body?: any;
      requiresAuth?: boolean;
    } = {}
  ): Promise<ApiResponse> {
    const { body, requiresAuth = true } = options;
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('POST Request:', url);
    console.log('Headers:', headers);
    console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        -3
      );
    }
  }

  /**
   * PUT request
   */
  async put(
    endpoint: string,
    options: {
      body?: any;
      requiresAuth?: boolean;
    } = {}
  ): Promise<ApiResponse> {
    const { body, requiresAuth = true } = options;
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('PUT Request:', url);
    console.log('Headers:', headers);
    console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in PUT ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        -3
      );
    }
  }

  /**
   * DELETE request
   */
  async delete(
    endpoint: string,
    options: {
      body?: any;
      requiresAuth?: boolean;
    } = {}
  ): Promise<ApiResponse> {
    const { body = null, requiresAuth = true } = options;
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('DELETE Request:', url);
    console.log('Headers:', headers);
    if (body) console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: body ? JSON.stringify(body) : null
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in DELETE ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        -3
      );
    }
  }

  /**
   * PATCH request
   */
  async patch(
    endpoint: string,
    options: {
      body?: any;
      requiresAuth?: boolean;
    } = {}
  ): Promise<ApiResponse> {
    const { body = null, requiresAuth = true } = options;
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('PATCH Request:', url);
    console.log('Headers:', headers);
    if (body) console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : null
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in PATCH ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        -3
      );
    }
  }

  /**
   * File upload request
   */
  async uploadFiles(options: {
    endpoint: string;
    files: File[];
    fieldName: string;
    fields?: Record<string, string> | null;
    requiresAuth?: boolean;
    httpMethod?: 'POST' | 'PUT';
  }): Promise<ApiResponse> {
    const {
      endpoint,
      files,
      fieldName,
      fields = null,
      requiresAuth = true,
      httpMethod = 'POST'
    } = options;

    const headers = getHeaders(requiresAuth, true); // isFormData = true
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`File Upload Request (${httpMethod}):`, url);
    console.log('Headers:', headers);
    console.log('Files:', files.map(f => f.name));
    console.log('FieldName:', fieldName);
    if (fields) console.log('Fields:', fields);

    try {
      const formData = new FormData();

      if (fields) {
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      files.forEach(file => {
        formData.append(fieldName, file);
      });

      const response = await fetch(url, {
        method: httpMethod,
        headers,
        body: formData
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error during file upload ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error during file upload. Please check your connection.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred during file upload: ${error instanceof Error ? error.message : String(error)}`,
        -3
      );
    }
  }
}
