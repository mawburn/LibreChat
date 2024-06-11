import { ForkOptions } from 'librechat-data-provider';
import { Dropdown, Switch } from '~/components/ui';
import { useLocalize } from '~/hooks';
import store from '~/store';
import { useAtom } from 'jotai';

export const ForkSettings = () => {
  const localize = useLocalize();
  const [forkSetting, setForkSetting] = useAtom(store.forkSetting);
  const [splitAtTarget, setSplitAtTarget] = useAtom(store.splitAtTarget);
  const [remember, setRemember] = useAtom<boolean>(store.rememberForkOption);

  const forkOptions = [
    { value: ForkOptions.DIRECT_PATH, display: localize('com_ui_fork_visible') },
    { value: ForkOptions.INCLUDE_BRANCHES, display: localize('com_ui_fork_branches') },
    { value: ForkOptions.TARGET_LEVEL, display: localize('com_ui_fork_all_target') },
  ];

  return (
    <>
      <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div> {localize('com_ui_fork_change_default')} </div>
          <Dropdown
            value={forkSetting}
            onChange={setForkSetting}
            options={forkOptions}
            width={200}
            position={'left'}
            maxHeight="199px"
            testId="fork-setting-dropdown"
          />
        </div>
      </div>
      <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div> {localize('com_ui_fork_default')} </div>
          <Switch
            id="rememberForkOption"
            checked={remember}
            onCheckedChange={setRemember}
            className="ml-4 mt-2"
            data-testid="rememberForkOption"
          />
        </div>
      </div>
      <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div> {localize('com_ui_fork_split_target_setting')} </div>
          <Switch
            id="splitAtTarget"
            checked={splitAtTarget}
            onCheckedChange={setSplitAtTarget}
            className="ml-4 mt-2"
            data-testid="splitAtTarget"
          />
        </div>
      </div>
    </>
  );
};
