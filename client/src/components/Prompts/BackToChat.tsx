import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '~/components/ui';
import { useLocalize } from '~/hooks';
import { useRouterService } from '~/routes/RouterService';
import { cn } from '~/utils';

export default function BackToChat({ className }: { className?: string }) {
  const router = useRouterService();
  const localize = useLocalize();
  const clickHandler = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button === 0 && !(event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      router.navigateTo('/c/new');
    }
  };
  return (
    <a
      className={cn(buttonVariants({ variant: 'outline' }), className)}
      href="/"
      onClick={clickHandler}
    >
      <ArrowLeft className="icon-xs mr-2" />
      {localize('com_ui_back_to_chat')}
    </a>
  );
}
