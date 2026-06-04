import React from 'react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});

jest.mock('react-markdown', () => {
  return function DummyMarkdown({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock('remark-gfm', () => {
  return {};
});

jest.mock('rehype-sanitize', () => {
  const defaultSchema = {
    attributes: {
      code: [],
      span: [],
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};
  return {
    __esModule: true,
    default: () => noop,
    defaultSchema,
  };
});

jest.mock('react-syntax-highlighter', () => {
  return {
    Prism: function DummyPrism({ children }: { children: React.ReactNode }) {
      return <pre>{children}</pre>;
    },
  };
});

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => {
  return {
    vscDarkPlus: {},
  };
});
