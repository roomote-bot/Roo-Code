type TitleBarProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
};

export const TitleBar = ({ title, description }: TitleBarProps) => (
  <div>
    <div className="text-2xl font-semibold">{title}</div>
    {description && (
      <div className="text-sm font-medium text-muted-foreground">
        {description}
      </div>
    )}
  </div>
);
