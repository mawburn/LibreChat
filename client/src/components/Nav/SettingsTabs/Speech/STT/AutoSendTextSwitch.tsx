import { useAtom, useAtomValue } from 'jotai';
import { Switch } from '~/components/ui';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function AutoSendTextSwitch({
  onCheckedChange,
}: {
  onCheckedChange?: (value: boolean) => void;
}) {
  const localize = useLocalize();
  const [autoSendText, setAutoSendText] = useAtom<boolean>(store.autoSendText);
  const SpeechToText = useAtomValue<boolean>(store.SpeechToText);

  const handleCheckedChange = (value: boolean) => {
    setAutoSendText(value);
    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>{localize('com_nav_auto_send_text')}</div>
      <Switch
        id="AutoSendText"
        checked={autoSendText}
        onCheckedChange={handleCheckedChange}
        className="ml-4"
        data-testid="AutoSendText"
        disabled={!SpeechToText}
      />
    </div>
  );
}
