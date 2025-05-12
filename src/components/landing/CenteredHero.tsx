type CenteredHeroProps = {
  title: React.ReactNode;
  description: string;
  buttons?: React.ReactNode;
};

export const CenteredHero = ({
  title,
  description,
  buttons,
}: CenteredHeroProps) => (
  <>
    <div className="mt-3 text-center text-5xl font-bold tracking-tight">
      {title}
    </div>
    <div className="mx-auto mt-5 max-w-screen-md text-center text-xl text-muted-foreground">
      {description}
    </div>
    {buttons && (
      <div className="mt-8 flex justify-center gap-x-5 gap-y-3 max-sm:flex-col">
        {buttons}
      </div>
    )}
  </>
);
