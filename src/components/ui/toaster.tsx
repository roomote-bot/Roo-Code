'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/toast-context';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
    </>
  );
}
