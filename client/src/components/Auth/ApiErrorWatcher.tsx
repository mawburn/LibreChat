import React from 'react';
import { useApiErrorBoundary } from '~/hooks/ApiErrorBoundaryContext';
import { useRouterService } from '~/routes/RouterService';

const ApiErrorWatcher = () => {
  const { error } = useApiErrorBoundary();
  const router = useRouterService();
  React.useEffect(() => {
    if (error?.response?.status === 500) {
      // do something with error
      // router.navigateTo('/login', { replace: true });
    }
  }, [error, router]);

  return null;
};

export default ApiErrorWatcher;
