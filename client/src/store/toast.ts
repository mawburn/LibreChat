import { atom } from 'jotai';
import { NotificationSeverity } from '~/common';

type NotifyToast = {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  showIcon: boolean;
};

const toastState = atom<NotifyToast>({
  open: false,
  message: '',
  severity: NotificationSeverity.SUCCESS,
  showIcon: true,
});

export default { toastState };
