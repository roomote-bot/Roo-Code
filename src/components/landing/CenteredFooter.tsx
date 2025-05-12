import React from 'react';

type CenteredFooterProps = {
  name: string;
  iconList: React.ReactNode;
  legalLinks: React.ReactNode;
  children?: React.ReactNode;
};

export const CenteredFooter = ({
  name,
  iconList,
  legalLinks,
  children,
}: CenteredFooterProps) => (
  <div className="flex flex-col items-center text-center">
    {children && (
      <ul className="mt-4 flex gap-x-8 text-lg max-sm:flex-col [&_a:hover]:opacity-100 [&_a]:opacity-60">
        {children}
      </ul>
    )}
    <ul className="mt-4 flex flex-row gap-x-5 text-muted-foreground [&_svg:hover]:text-primary [&_svg:hover]:opacity-100 [&_svg]:size-5 [&_svg]:fill-current [&_svg]:opacity-60">
      {iconList}
    </ul>
    <div className="mt-6 flex w-full items-center justify-between gap-y-2 border-t pt-3 text-sm text-muted-foreground max-md:flex-col">
      <div>
        © Copyright {new Date().getFullYear()} {name}.
      </div>
      <ul className="flex gap-x-4 font-medium [&_a:hover]:opacity-100 [&_a]:opacity-60">
        {legalLinks}
      </ul>
    </div>
  </div>
);
