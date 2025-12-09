import type { ReactNode } from "react";
type LabelProps = {
  children: ReactNode;
  htmlFor?: string;
};
export function Label({ children, htmlFor }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">
      {children}
    </label>
  );
}
