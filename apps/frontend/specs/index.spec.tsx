import React from 'react';
import { render } from '@testing-library/react';
import Page from '../src/app/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Page', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <QueryClientProvider client={queryClient}>
        <Page />
      </QueryClientProvider>
    );
    expect(baseElement).toBeTruthy();
  });
});
