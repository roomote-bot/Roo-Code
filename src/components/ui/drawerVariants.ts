import { cva } from 'class-variance-authority';

export const drawerVariants = cva(
  'fixed z-50 bg-background shadow-lg transition-transform duration-300 ease-in-out',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b',
        right: 'inset-y-0 right-0 border-l',
        bottom: 'inset-x-0 bottom-0 border-t',
        left: 'inset-y-0 left-0 border-r',
      },
      size: {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        full: 'sm:max-w-full',
      },
    },
    defaultVariants: {
      side: 'right',
      size: 'md',
    },
  },
);

export const drawerTransformVariants = {
  top: {
    open: 'translate-y-0',
    closed: '-translate-y-full',
  },
  right: {
    open: 'translate-x-0',
    closed: 'translate-x-full',
  },
  bottom: {
    open: 'translate-y-0',
    closed: 'translate-y-full',
  },
  left: {
    open: 'translate-x-0',
    closed: '-translate-x-full',
  },
};
