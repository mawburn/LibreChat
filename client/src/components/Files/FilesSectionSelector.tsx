/* eslint-disable i18next/no-literal-string */
import { Button } from '../ui';
import { useRouterService } from '~/routes/RouterService';

export default function FilesSectionSelector() {
  const router = useRouterService();
  const currentPath = router.getCurrentPath();
  let selectedPage = '/vector-stores';

  if (currentPath.includes('vector-stores')) {
    selectedPage = '/vector-stores';
  }
  if (currentPath.includes('files')) {
    selectedPage = '/files';
  }

  const darkButton = { backgroundColor: 'black', color: 'white' };
  const lightButton = { backgroundColor: '#f9f9f9', color: 'black' };

  return (
    <div className="flex h-12 w-52 flex-row justify-center rounded border bg-white p-1">
      <div className="flex w-2/3 items-center pr-1">
        <Button
          className="w-full rounded rounded-lg border"
          style={selectedPage === '/vector-stores' ? darkButton : lightButton}
          onClick={() => {
            selectedPage = '/vector-stores';
            router.navigateTo('/d/vector-stores');
          }}
        >
          Vector Stores
        </Button>
      </div>
      <div className="flex w-1/3 items-center">
        <Button
          className="w-full rounded rounded-lg border"
          style={selectedPage === '/files' ? darkButton : lightButton}
          onClick={() => {
            selectedPage = '/files';
            router.navigateTo('/d/files');
          }}
        >
          Files
        </Button>
      </div>
    </div>
  );
}
