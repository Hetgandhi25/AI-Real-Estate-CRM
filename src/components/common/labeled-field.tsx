import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LabeledFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
};

/** Accessible label + control wrapper (visually hidden label when hideLabel). */
export function LabeledField({ id, label, children, className, hideLabel }: LabeledFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-foreground",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
