import { cn } from '@/lib/utils';

type SectionProps = React.HTMLAttributes<HTMLDivElement>;

export const Section = ({ className, children, ...rest }: SectionProps) => (
  <div className={cn('px-4 py-16', className)} {...rest}>
    <div className="mx-auto max-w-screen-lg">{children}</div>
  </div>
);
