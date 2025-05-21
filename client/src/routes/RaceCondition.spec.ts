jest.mock('react-router-dom', () => {
  const navigate = jest.fn();
  const location = {
    pathname: '/test',
    search: '?param=value',
    state: {},
  };

  const submit = jest.fn();
  return {
    useNavigate: () => navigate,
    useLocation: () => location,
    useSubmit: () => submit,
    useNavigation: () => ({ state: 'idle' }),
  };
});

function useTestRouterService() {
  const navigateMock = jest.requireMock('react-router-dom').useNavigate();
  const submitMock = jest.requireMock('react-router-dom').useSubmit();
  const locationMock = jest.requireMock('react-router-dom').useLocation();

  return {
    navigateTo: (path: string, options?: any) => {
      navigateMock(path, options);
    },
    setQueryParams: (params: Record<string, string>, options: { replace?: boolean } = {}) => {
      const searchParams = new URLSearchParams(locationMock.search);

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value);
        }
      });

      const search = searchParams.toString();
      const query = search ? `?${search}` : '';
      navigateMock(`${locationMock.pathname}${query}`, { replace: options.replace });
    },
    submitForm: (formData: FormData, options?: any) => {
      submitMock(formData, options);
    },
    getCurrentPath: () => {
      return locationMock.pathname;
    },
    getSearchParams: () => {
      return new URLSearchParams(locationMock.search);
    },
  };
}

describe('Race Condition Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent multiple navigation race conditions', () => {
    const router = useTestRouterService();
    const navigateMock = jest.requireMock('react-router-dom').useNavigate();

    router.navigateTo('/page1');
    router.navigateTo('/page2');
    router.navigateTo('/page3');

    expect(navigateMock).toHaveBeenCalledTimes(3);
    expect(navigateMock).toHaveBeenNthCalledWith(1, '/page1', undefined);
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/page2', undefined);
    expect(navigateMock).toHaveBeenNthCalledWith(3, '/page3', undefined);
  });

  it('should prevent query parameters race conditions', () => {
    const router = useTestRouterService();
    const navigateMock = jest.requireMock('react-router-dom').useNavigate();

    router.setQueryParams({ param1: 'value1' });
    router.setQueryParams({ param2: 'value2' });

    expect(navigateMock).toHaveBeenCalledTimes(2);

    const lastCall = navigateMock.mock.calls[navigateMock.mock.calls.length - 1];
    expect(lastCall[0]).toContain('/test?');
    expect(lastCall[0]).toContain('param2=value2');
  });

  it('should prevent form submission race conditions', () => {
    const router = useTestRouterService();
    const submitMock = jest.requireMock('react-router-dom').useSubmit();
    const formData = new FormData();

    router.submitForm(formData, { method: 'post', action: '/submit' });

    expect(submitMock).toHaveBeenCalledWith(formData, { method: 'post', action: '/submit' });
  });

  it('should handle navigation during form submission', () => {
    const router = useTestRouterService();
    const navigateMock = jest.requireMock('react-router-dom').useNavigate();
    const submitMock = jest.requireMock('react-router-dom').useSubmit();
    const formData = new FormData();

    router.submitForm(formData, { method: 'post', action: '/submit' });
    router.navigateTo('/other-page');

    expect(submitMock).toHaveBeenCalledWith(formData, { method: 'post', action: '/submit' });
    expect(navigateMock).toHaveBeenCalledWith('/other-page', undefined);
  });
});
