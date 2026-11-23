import { ApiResponse } from './ApiResponse';
import { getHeaders, getBaseUrl } from '../utils/apiHelpers';
import { onServerSaysUpdate } from '../utils/appUpdate';
import { isAccountBanned, reportAccountBanned } from '../components/security/accountBanned';

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
    const contentType = response.headers.get('content-type');
    const isJsonHeader = contentType?.includes('application/json') ?? false;

    const responseText = await response.text();

    // A route this (old) screen still calls was retired by the server: load the new app.
    if (response.status === 410 && responseText.includes('APP_UPDATE_REQUIRED')) onServerSaysUpdate();

    // 304 Not Modified frequently omits Content-Type per RFC 7232, even though
    // the browser cache serves the original JSON body. Treat any 304 with a
    // non-empty body that parses as JSON as a JSON response, so callers get
    // the real payload instead of the file-response placeholder.
    let treatAsJson = isJsonHeader;
    if (!treatAsJson && response.status === 304 && responseText.trim().length > 0) {
      try {
        JSON.parse(responseText);
        treatAsJson = true;
      } catch {
        // fall through to file-response branch
      }
    }

    if (treatAsJson) {
      const parsed = ApiResponse.fromHttpResponse(response, responseText, response.url);
      // The account was suspended: the app forgets the session and shows /compte-suspendu.
      if (isAccountBanned(parsed)) reportAccountBanned(parsed.body?.message);
      return parsed;
    } else {
      // For non-JSON responses (like files)
      const success =
        (response.status >= 200 && response.status < 300) || response.status === 304;
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

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        return await this.handleHttpResponse(response);
      } catch (error) {
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
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

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
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

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: body ? JSON.stringify(body) : null
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
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

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : null
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
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
    /** Files under their own field names (e.g. id_front, selfie), after `files`. */
    namedFiles?: Record<string, Blob> | null;
  }): Promise<ApiResponse> {
    const {
      endpoint,
      files,
      fieldName,
      namedFiles = null,
      fields = null,
      requiresAuth = true,
      httpMethod = 'POST'
    } = options;

    const headers = getHeaders(requiresAuth, true); // isFormData = true
    const url = `${this.baseUrl}${endpoint}`;

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
      if (namedFiles) {
        Object.entries(namedFiles).forEach(([name, blob]) => formData.append(name, blob, `${name}.jpg`));
      }

      const response = await fetch(url, {
        method: httpMethod,
        headers,
        body: formData
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
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
