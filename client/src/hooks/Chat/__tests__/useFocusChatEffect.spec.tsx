const mockTextAreaRef = { current: { focus: jest.fn() } };
let mockLog: jest.SpyInstance;

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

// Import the component under test and its dependencies
import { renderHook } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import useFocusChatEffect from '../useFocusChatEffect';
import { logger } from '~/utils';

describe('useFocusChatEffect', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockLog = jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.clearAllMocks();

    // Mock window.matchMedia
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // Set default location mock
    (useLocation as jest.Mock).mockReturnValue({
      pathname: '/c/new',
      search: '',
      state: { focusChat: true },
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/c/new',
        search: '',
      },
      writable: true,
    });

    // Synchronize the RouterService mock with window.location.search
    // This ensures that router.getSearchParams() returns the same as window.location.search
    global.__routerServiceMocks.updateCurrentLocation({
      pathname: '/c/new',
      search: '',
      state: { focusChat: true },
    });
  });

  describe('Basic functionality', () => {
    test('should focus textarea when location.state.focusChat is true', () => {
      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(mockTextAreaRef.current.focus).toHaveBeenCalled();
      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith('/c/new', {
        replace: true,
        state: {},
      });
      expect(mockLog).toHaveBeenCalled();
    });

    test('should not focus textarea when location.state.focusChat is false', () => {
      // Update RouterService mock
      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '',
        state: { focusChat: false },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(mockTextAreaRef.current.focus).not.toHaveBeenCalled();
      expect(global.__routerServiceMocks.navigateMock).not.toHaveBeenCalled();
    });

    test('should not focus textarea when textAreaRef.current is null', () => {
      const nullTextAreaRef = { current: null };

      renderHook(() => useFocusChatEffect(nullTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).not.toHaveBeenCalled();
    });

    test('should not focus textarea on touchscreen devices', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: true, // This indicates a touchscreen
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(mockTextAreaRef.current.focus).not.toHaveBeenCalled();
      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalled();
    });
  });

  describe('URL parameter handling', () => {
    // Helper function to run tests with different URL scenarios
    const testUrlScenario = ({
      windowLocationSearch,
      reactRouterSearch,
      expectedUrl,
      testDescription,
    }: {
      windowLocationSearch: string;
      reactRouterSearch: string;
      expectedUrl: string;
      testDescription: string;
    }) => {
      test(`${testDescription}`, () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
          value: {
            pathname: '/c/new',
            search: windowLocationSearch,
          },
          writable: true,
        });

        // Update the search parameters in the RouterService mock
        // This ensures we're testing that router.getSearchParams() is used, not window.location.search
        global.__routerServiceMocks.updateCurrentLocation({
          pathname: '/c/new',
          search: reactRouterSearch, // Use reactRouterSearch, not windowLocationSearch
          state: { focusChat: true },
        });

        renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

        expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({
            replace: true,
            state: {},
          }),
        );
      });
    };

    test('should use router.getSearchParams() not window.location.search', () => {
      // Set different values for window.location.search and router's search
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?from_window=true', // This should be ignored
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '?from_router=true', // This should be used
        state: { focusChat: true },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      // Verify we're using router's search, not window.location.search
      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new?from_router=true',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );
    });

    testUrlScenario({
      windowLocationSearch: '?agent_id=agent123', // This should be ignored now
      reactRouterSearch: '?endpoint=openAI&model=gpt-4',
      expectedUrl: '/c/new?endpoint=openAI&model=gpt-4',
      testDescription: 'should use router search params, not window location search',
    });

    testUrlScenario({
      windowLocationSearch: '?ignored=true',
      reactRouterSearch: '',
      expectedUrl: '/c/new',
      testDescription: 'should use empty path when router search params are empty',
    });

    testUrlScenario({
      windowLocationSearch: '?ignored=true',
      reactRouterSearch: '?agent_id=agent123&prompt=test',
      expectedUrl: '/c/new?agent_id=agent123&prompt=test',
      testDescription: 'should correctly format query string from router search params',
    });

    testUrlScenario({
      windowLocationSearch: '?agent_id=oldagent',
      reactRouterSearch: '?agent_id=newagent',
      expectedUrl: '/c/new?agent_id=newagent',
      testDescription: 'should prioritize router search params over window.location.search',
    });

    testUrlScenario({
      windowLocationSearch: '?ignored=true',
      reactRouterSearch: '?agent_id=agent/with%20spaces&prompt=test%20query',
      expectedUrl: '/c/new?agent_id=agent%2Fwith+spaces&prompt=test+query',
      testDescription: 'should handle URL parameters with special characters correctly',
    });

    testUrlScenario({
      windowLocationSearch: '?ignored=true',
      reactRouterSearch:
        '?agent_id=agent123&prompt=test&model=gpt-4&temperature=0.7&max_tokens=1000',
      expectedUrl:
        '/c/new?agent_id=agent123&prompt=test&model=gpt-4&temperature=0.7&max_tokens=1000',
      testDescription: 'should handle multiple URL parameters correctly',
    });

    testUrlScenario({
      windowLocationSearch: '?ignored=true',
      reactRouterSearch: '?agent_id=agent123&broken=param=with=equals',
      expectedUrl: '/c/new?agent_id=agent123&broken=param%3Dwith%3Dequals',
      testDescription: 'should handle and encode malformed URL parameters',
    });

    test('should handle navigation immediately after URL parameter changes', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?ignored=true',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '?endpoint=openAI&model=gpt-4',
        state: { focusChat: true },
      });

      const { rerender } = renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new?endpoint=openAI&model=gpt-4',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );

      jest.clearAllMocks();

      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?ignored=true',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new_changed',
        search: '?new=param',
        state: { focusChat: true },
      });

      rerender();

      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new_changed?new=param',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );
    });

    test('should handle undefined or null search params gracefully', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?ignored=true',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: undefined as any,
        state: { focusChat: true },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );

      jest.clearAllMocks();

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: null as any,
        state: { focusChat: true },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );
    });

    test('should handle navigation when location.state is null', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?agent_id=agent123',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '?endpoint=openAI&model=gpt-4',
        state: null,
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).not.toHaveBeenCalled();
      expect(mockTextAreaRef.current.focus).not.toHaveBeenCalled();
    });

    test('should handle navigation when location.state.focusChat is undefined', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '?agent_id=agent123',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '?endpoint=openAI&model=gpt-4',
        state: { someOtherProp: true },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).not.toHaveBeenCalled();
      expect(mockTextAreaRef.current.focus).not.toHaveBeenCalled();
    });

    test('should handle navigation when both search params are empty', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/c/new',
          search: '',
        },
        writable: true,
      });

      global.__routerServiceMocks.updateCurrentLocation({
        pathname: '/c/new',
        search: '',
        state: { focusChat: true },
      });

      renderHook(() => useFocusChatEffect(mockTextAreaRef as any));

      expect(global.__routerServiceMocks.navigateMock).toHaveBeenCalledWith(
        '/c/new',
        expect.objectContaining({
          replace: true,
          state: {},
        }),
      );
    });
  });
});
