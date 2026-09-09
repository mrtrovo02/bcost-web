import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();

  window.localStorage.clear();
  window.sessionStorage.clear();

  for (const cookie of document.cookie.split(';')) {
    const cookieName = cookie.split('=')[0]?.trim();
    if (cookieName) {
      document.cookie = `${cookieName}=; path=/; max-age=0`;
    }
  }
});
