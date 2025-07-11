import { renderHook, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

describe('Jotai cross-tab synchronization', () => {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  let storageEventListeners: Array<(event: StorageEvent) => void> = [];

  beforeEach(() => {
    storageEventListeners = [];

    window.addEventListener = jest.fn((event: string, handler: any) => {
      if (event === 'storage') {
        storageEventListeners.push(handler);
      }
    });

    window.removeEventListener = jest.fn((event: string, handler: any) => {
      if (event === 'storage') {
        const index = storageEventListeners.indexOf(handler);
        if (index > -1) {
          storageEventListeners.splice(index, 1);
        }
      }
    });
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  const dispatchStorageEvent = (
    key: string,
    newValue: string | null,
    oldValue: string | null = null,
  ) => {
    const event = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: window.localStorage,
    });

    storageEventListeners.forEach((listener) => listener(event));
  };

  it('should sync atom value when storage event occurs', () => {
    const testAtom = atomWithStorage('syncKey', 'initialValue');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(result.current[0]).toBe('initialValue');

    act(() => {
      dispatchStorageEvent('syncKey', '"updatedFromAnotherTab"');
    });

    expect(result.current[0]).toBe('updatedFromAnotherTab');
  });

  it('should sync complex objects across tabs', () => {
    const testAtom = atomWithStorage('objectKey', { count: 0, name: 'test' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    const newValue = { count: 42, name: 'updated' };

    act(() => {
      dispatchStorageEvent('objectKey', JSON.stringify(newValue));
    });

    expect(result.current[0]).toEqual(newValue);
  });

  it('should handle null values from storage events', () => {
    const testAtom = atomWithStorage<string | null>('nullableKey', 'initial');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    act(() => {
      dispatchStorageEvent('nullableKey', null);
    });

    expect(result.current[0]).toBe('initial');
  });

  it('should ignore storage events for different keys', () => {
    const testAtom = atomWithStorage('myKey', 'myValue');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result } = renderHook(() => useAtom(testAtom), { wrapper });

    act(() => {
      dispatchStorageEvent('differentKey', '"someOtherValue"');
    });

    expect(result.current[0]).toBe('myValue');
  });

  it('should register and unregister storage event listeners', () => {
    const testAtom = atomWithStorage('listenerKey', 'value');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { unmount } = renderHook(() => useAtom(testAtom), { wrapper });

    expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(storageEventListeners.length).toBeGreaterThan(0);

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
