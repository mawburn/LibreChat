import {
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSubmit,
} from 'react-router-dom';

import { useMemo } from 'react';

export class RouterService {
  private static instance: RouterService | null = null;

  static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }

    return RouterService.instance;
  }

  getFullUrl(): string {
    return window.location.href;
  }

  getOrigin(): string {
    return window.location.origin;
  }

  buildShareableUrl(path: string): string {
    return `${window.location.protocol}//${window.location.host}${path}`;
  }

  openNewWindow(url: string, options?: string): Window | null {
    return window.open(url, '_blank', options);
  }

  createResponse<T>(data: T) {
    return data;
  }

  handleRedirect(navigate: (path: string, options?: any) => void, url: string) {
    navigate(url, { replace: true });

    return null;
  }
}

export function useRouterService() {
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();
  const navigationState = useNavigation();

  const routerService = RouterService.getInstance();

  const router = useMemo(() => {
    return {
      navigateTo: (path: string, options?: { replace?: boolean; state?: any }) => {
        navigate(path, options);
      },
      navigateExternal: (url: string) => {
        window.location.href = url;
      },
      submitForm: (
        formData: FormData,
        options?: {
          method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
          action?: string;
          replace?: boolean;
        },
      ) => {
        submit(formData, options);
      },
      getQueryParam: (key: string): string | null => {
        return new URLSearchParams(location.search).get(key);
      },
      setQueryParams: (params: Record<string, string>, options: { replace?: boolean } = {}) => {
        const searchParams = new URLSearchParams(location.search);

        Object.entries(params).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            searchParams.delete(key);
          } else {
            searchParams.set(key, value);
          }
        });

        const search = searchParams.toString();
        const query = search ? `?${search}` : '';

        navigate(`${location.pathname}${query}`, { replace: options.replace });
      },
      getCurrentPath: () => location.pathname,
      getSearchParams: () => new URLSearchParams(location.search),
      isNavigating: () => navigationState.state !== 'idle',
      getFullUrl: routerService.getFullUrl,
      getOrigin: routerService.getOrigin,
      buildShareableUrl: routerService.buildShareableUrl,
      openNewWindow: routerService.openNewWindow,
    };
  }, [navigate, location, submit, navigationState, routerService]);

  return router;
}

export function useTypedLoaderData<T>() {
  return useLoaderData() as T;
}
