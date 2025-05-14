'use client';

import type { VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
import { drawerTransformVariants, drawerVariants } from './drawerVariants';

export type DrawerProps = VariantProps<typeof drawerVariants> & {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
};

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  className,
  overlayClassName,
  ...props
}: DrawerProps) {
  // Handle ESC key press to close the drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle focus trap
  const drawerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // Get the transform class based on the side
  const transformClass =
    drawerTransformVariants[side as keyof typeof drawerTransformVariants];
  const openClass = transformClass ? transformClass.open : '';
  const closedClass = transformClass ? transformClass.closed : '';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity',
          overlayClassName,
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          drawerVariants({ side, size }),
          isOpen ? openClass : closedClass,
          className,
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
