import { cn } from '@/lib/utils';

type SectionProps = React.HTMLAttributes<HTMLDivElement> & {
  divider?: boolean;
};

export const Section = ({
  className,
  divider = true,
  ...rest
}: SectionProps) => (
  <div className={cn({ 'border-b border-dashed': divider })}>
    <div
      className={cn(
        'max-w-screen-lg border-l border-r border-dashed mx-auto px-4 sm:px-6 lg:px-8',
        className,
      )}
      {...rest}
    />
  </div>
);
