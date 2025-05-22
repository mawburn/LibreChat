import React from 'react';
import VectorStoreSidePanel from './VectorStore/VectorStoreSidePanel';
import FilesSectionSelector from './FilesSectionSelector';
import { Button } from '../ui';
import { Outlet } from 'react-router-dom';
import { useRouterService } from '~/routes/RouterService';
import { useTypedParams } from '~/routes/RouterService';
import { useLocalize } from '~/hooks';

export default function VectorStoreView() {
  const params = useTypedParams<{ vectorStoreId: string }>();
  const router = useRouterService();
  const localize = useLocalize();
  return (
    <div className="max-h-[100vh] bg-[#f9f9f9] p-0 lg:p-7">
      <div className="m-4 flex max-h-[10vh] w-full flex-row justify-between md:m-2">
        <FilesSectionSelector />
        <Button
          className="block lg:hidden"
          variant={'outline'}
          size={'sm'}
          onClick={() => {
            router.navigateTo('/d/vector-stores');
          }}
        >
          {localize('com_ui_go_back')}
        </Button>
      </div>
      <div className="flex max-h-[90vh] w-full flex-row divide-x">
        <div
          className={`max-h-full w-full xl:w-1/3 ${
            params.vectorStoreId ? 'hidden w-1/2 lg:block lg:w-1/2' : 'md:w-full'
          }`}
        >
          <VectorStoreSidePanel />
        </div>
        <div
          className={`max-h-full w-full overflow-y-auto xl:w-2/3 ${
            params.vectorStoreId ? 'lg:w-1/2' : 'hidden md:w-1/2 lg:block'
          }`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
