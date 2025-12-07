// src/__tests__/setup.ts
import { vi } from 'vitest';

// In-memory store for localStorage mock
let store: Record<string, string> = {};
let sessionStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
  length: Object.keys(store).length,
  key: vi.fn((index: number) => Object.keys(store)[index] || null),
};

const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStore[key];
  }),
  clear: vi.fn(() => {
    sessionStore = {};
  }),
  length: Object.keys(sessionStore).length,
  key: vi.fn((index: number) => Object.keys(sessionStore)[index] || null),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  store = {};
  sessionStore = {};
  
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  localStorageMock.key.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  sessionStorageMock.key.mockClear();
});