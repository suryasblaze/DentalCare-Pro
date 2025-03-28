import { cn } from "@/lib/utils";

interface PageHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  heading,
  text,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("grid gap-1", className)}>
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      {text && <p className="text-muted-foreground">{text}</p>}
      {children}
    </div>
  );
}