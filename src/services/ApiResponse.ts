/**
 * ApiResponse class for handling API responses consistently
 * Based on the Flutter ApiService implementation
 */
export class ApiResponse {
  statusCode: number;
  body: {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    [key: string]: any;
  };
  isSuccessByStatusCode: boolean;
  apiReportedSuccess: boolean;
  message: string;
  rawError?: any;
  endpoint: string;

  constructor(
    statusCode: number,
    body: any,
    isSuccessByStatusCode: boolean,
    apiReportedSuccess: boolean,
    message: string,
    endpoint: string,
    rawError: any = null
  ) {
    this.statusCode = statusCode;
    this.body = body;
    this.isSuccessByStatusCode = isSuccessByStatusCode;
    this.apiReportedSuccess = apiReportedSuccess;
    this.message = message;
    this.endpoint = endpoint;
    this.rawError = rawError;
  }

  get isOverallSuccess(): boolean {
    return this.isSuccessByStatusCode && this.apiReportedSuccess;
  }

  static fromHttpResponse(response: Response, responseText: string, endpoint: string): ApiResponse {
    let body: any = {};
    let message = '';
    let apiSuccess = false;

    try {
      if (responseText) {
        body = JSON.parse(responseText);
        message = body.message || '';
        apiSuccess = Boolean(body.success);
      }
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      message = 'Failed to parse server response.';
      apiSuccess = false;
    }

    const successByStatusCode = response.status >= 200 && response.status < 300;

    if (!message && successByStatusCode && apiSuccess) {
      message = 'Operation successful.';
    } else if (!message && !successByStatusCode) {
      message = 'An unknown error occurred.';
    }

    return new ApiResponse(
      response.status,
      body,
      successByStatusCode,
      apiSuccess,
      message,
      endpoint,
      null
    );
  }

  static fromError(error: any, statusCode: number = 0): ApiResponse {
    let errorMessage = 'An unexpected error occurred.';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new ApiResponse(
      statusCode,
      { error: errorMessage, success: false },
      false,
      false,
      errorMessage,
      '',
      error
    );
  }
}
