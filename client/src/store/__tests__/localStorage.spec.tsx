import { renderHook, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Jotai localStorage persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should persist atom value to localStorage', () => {
    const testAtom = atomWithStorage('testKey', 'defaultValue');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(result.current[0]).toBe('defaultValue');

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', '"newValue"');
  });

  it('should read initial value from localStorage if exists', () => {
    localStorageMock.setItem('testKey', '"storedValue"');

    const testAtom = atomWithStorage('testKey', 'defaultValue');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(result.current[0]).toBe('storedValue');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
  });

  it('should handle complex objects in localStorage', () => {
    const complexDefault = {
      name: 'test',
      settings: {
        enabled: true,
        count: 42,
      },
    };

    const testAtom = atomWithStorage('complexKey', complexDefault);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    const newValue = {
      name: 'updated',
      settings: {
        enabled: false,
        count: 100,
      },
    };

    act(() => {
      result.current[1](newValue);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('complexKey', JSON.stringify(newValue));

    expect(result.current[0]).toEqual(newValue);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorageMock.setItem('badKey', 'not valid json');

    const testAtom = atomWithStorage('badKey', 'defaultValue');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should support updater functions like useState', () => {
    const testAtom = atomWithStorage('counterKey', 0);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('counterKey', '1');

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('counterKey', '2');
  });

  it('should handle null and undefined values', () => {
    const testAtom = atomWithStorage<string | null>('nullableKey', null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(result.current[0]).toBe(null);

    act(() => {
      result.current[1]('value');
    });
    expect(result.current[0]).toBe('value');

    act(() => {
      result.current[1](null);
    });
    expect(result.current[0]).toBe(null);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nullableKey', 'null');
  });
});
