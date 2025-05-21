/* This file is automatically executed before running tests
 * https://create-react-app.dev/docs/running-tests/#initializing-test-environment
 */

// react-testing-library renders your components to document.body,
// this adds jest-dom's custom assertions
// https://github.com/testing-library/jest-dom#table-of-contents
import '@testing-library/jest-dom';

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock canvas when run unit test cases with jest.
// 'react-lottie' uses canvas
import 'jest-canvas-mock';

// Polyfill for TextEncoder/TextDecoder which is required by React Router v7
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock window.history
global.mockReplaceState = jest.fn();
Object.defineProperty(window, 'history', {
  writable: true,
  value: {
    replaceState: global.mockReplaceState,
    pushState: jest.fn(),
    state: {},
    go: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => {
      const i18n = require('~/locales/i18n').default;
      return {
        t: (key, options) => i18n.t(key, options),
        i18n: {
          ...i18n,
          changeLanguage: jest.fn(),
        },
      };
    },
    initReactI18next: {
      type: '3rdParty',
      init: jest.fn(),
    },
  };
});

// Mock the RouterService for all tests
jest.mock('~/routes/RouterService', () => {
  // Use a factory pattern to allow easy access to these mocks in tests
  const mockNavigate = jest.fn();
  const mockSubmit = jest.fn();
  const mockSetQueryParams = jest.fn();

  // Create a mock implementation of RouterService
  const mockRouterService = {
    getInstance: jest.fn().mockImplementation(() => ({
      getFullUrl: jest.fn().mockReturnValue('https://example.com/test'),
      getOrigin: jest.fn().mockReturnValue('https://example.com'),
      buildShareableUrl: jest.fn().mockImplementation((path) => `https://example.com${path}`),
      openNewWindow: jest.fn(),
      createResponse: jest.fn().mockImplementation((data) => data),
      handleRedirect: jest.fn(),
      reloadPage: jest.fn(),
    })),
  };

  // Default location state
  let currentLocation = {
    pathname: '/test',
    search: '?param=value',
    state: { focusChat: true },
  };

  // Default search params
  let currentSearchParams = new URLSearchParams('param=value');
  
  // For tests that need specific search params
  global.__updateSearchParams = (params) => {
    currentSearchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      currentSearchParams.set(key, value);
    });
    
    // Update location search as well
    const search = currentSearchParams.toString();
    const query = search ? `?${search}` : '';
    currentLocation = {
      ...currentLocation,
      search: query,
    };
  };

  // Create a mock hook implementation
  const useRouterServiceMock = jest.fn().mockImplementation(() => ({
    navigateTo: mockNavigate,
    navigateExternal: jest.fn(),
    submitForm: mockSubmit,
    getQueryParam: jest.fn().mockImplementation((key) => {
      const params = { token: 'test-token', userId: 'test-user-id' };
      return params[key] || currentSearchParams.get(key);
    }),
    setQueryParams: (params, options) => {
      mockSetQueryParams(params, options);

      // Update the current search params
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          currentSearchParams.delete(key);
        } else {
          currentSearchParams.set(key, value);
        }
      });

      // Update the location to reflect the new search params
      const search = currentSearchParams.toString();
      const query = search ? `?${search}` : '';
      currentLocation = {
        ...currentLocation,
        search: query,
      };

      // Call the global mock created outside this function
      global.mockReplaceState(null, '', `${currentLocation.pathname}${query}`);
    },
    getCurrentPath: jest.fn().mockImplementation(() => currentLocation.pathname),
    getCurrentLocation: jest.fn().mockImplementation(() => currentLocation),
    getSearchParams: jest.fn().mockImplementation(() => currentSearchParams),
    isNavigating: jest.fn().mockReturnValue(false),
    getFullUrl: jest.fn().mockReturnValue('https://example.com/test'),
    getOrigin: jest.fn().mockReturnValue('https://example.com'),
    buildShareableUrl: jest.fn().mockImplementation((path) => `https://example.com${path}`),
    openNewWindow: jest.fn(),
    reloadPage: jest.fn(),
  }));

  // Export the mocks for test files to access
  global.__routerServiceMocks = {
    navigateMock: mockNavigate,
    submitMock: mockSubmit,
    setQueryParamsMock: mockSetQueryParams,
    replaceStateMock: global.mockReplaceState,
    updateCurrentLocation: (location) => {
      currentLocation = {
        ...currentLocation,
        ...location,
      };

      // Also update search params if search is provided
      if (location.search !== undefined && location.search !== null) {
        const searchStr = location.search || '';
        currentSearchParams = new URLSearchParams(
          searchStr.startsWith('?') ? searchStr.substring(1) : searchStr,
        );
      }
    },
  };

  return {
    RouterService: mockRouterService,
    useRouterService: useRouterServiceMock,
    useTypedLoaderData: jest.fn().mockImplementation(() => ({})),
    useTypedParams: jest.fn().mockImplementation(() => ({})),
  };
});
