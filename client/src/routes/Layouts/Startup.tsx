import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { TStartupConfig } from 'librechat-data-provider';
import { useGetStartupConfig } from '~/data-provider';
import AuthLayout from '~/components/Auth/AuthLayout';
import { TranslationKeys, useLocalize } from '~/hooks';
import { useRouterService } from '../RouterService';

const headerMap: Record<string, TranslationKeys> = {
  '/login': 'com_auth_welcome_back',
  '/register': 'com_auth_create_account',
  '/forgot-password': 'com_auth_reset_password',
  '/reset-password': 'com_auth_reset_password',
  '/login/2fa': 'com_auth_verify_your_identity',
};

export default function StartupLayout({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [error, setError] = useState<TranslationKeys | null>(null);
  const [headerText, setHeaderText] = useState<TranslationKeys | null>(null);
  const [startupConfig, setStartupConfig] = useState<TStartupConfig | null>(null);
  const {
    data,
    isFetching,
    error: startupConfigError,
  } = useGetStartupConfig({
    enabled: isAuthenticated ? startupConfig === null : true,
  });
  const localize = useLocalize();
  const router = useRouterService();

  useEffect(() => {
    if (isAuthenticated) {
      router.navigateTo('/c/new', { replace: true });
    }
    if (data) {
      setStartupConfig(data);
    }
  }, [isAuthenticated, router, data]);

  useEffect(() => {
    document.title = startupConfig?.appTitle || 'LibreChat';
  }, [startupConfig?.appTitle]);

  const currentPath = router.getCurrentPath();

  useEffect(() => {
    setError(null);
    setHeaderText(null);
  }, [currentPath]);

  const contextValue = {
    error,
    setError,
    headerText,
    setHeaderText,
    startupConfigError,
    startupConfig,
    isFetching,
  };

  return (
    <AuthLayout
      header={headerText ? localize(headerText) : localize(headerMap[currentPath])}
      isFetching={isFetching}
      startupConfig={startupConfig}
      startupConfigError={startupConfigError}
      pathname={currentPath}
      error={error}
    >
      <Outlet context={contextValue} />
    </AuthLayout>
  );
}
