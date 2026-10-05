import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** A successful ApiResponse, shaped like SBCApiService returns it. */
export const ok = (data: unknown) => ({
  statusCode: 200,
  isSuccessByStatusCode: true,
  apiReportedSuccess: true,
  message: '',
  body: { success: true, data },
});

/** A failed ApiResponse carrying the server's message. */
export const fail = (statusCode: number, message: string) => ({
  statusCode,
  isSuccessByStatusCode: false,
  apiReportedSuccess: false,
  message,
  body: { success: false, message },
});

/** Renders with a router and a fresh query cache (no retries, so errors show at once). */
export function renderPage(ui: ReactElement, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
