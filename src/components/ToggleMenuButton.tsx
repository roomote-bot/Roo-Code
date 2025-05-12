import { type ForwardedRef, forwardRef } from 'react';

import { Button } from '@/components/ui/button';

type ToggleMenuButtonProps = {
  onClick?: () => void;
};

const ToggleMenuButtonInternal = (
  props: ToggleMenuButtonProps,
  ref?: ForwardedRef<HTMLButtonElement>,
) => (
  <Button
    className="p-2 focus-visible:ring-offset-0"
    variant="ghost"
    ref={ref}
    {...props}
  >
    <svg
      className="size-6 stroke-current"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 0h24v24H0z" stroke="none" />
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </Button>
);

const ToggleMenuButton = forwardRef(ToggleMenuButtonInternal);

export { ToggleMenuButton };
