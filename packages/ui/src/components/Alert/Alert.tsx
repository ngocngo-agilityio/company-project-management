import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  /** Short bold line. The icon and the words carry the meaning, never the colour alone. */
  title: ReactNode;
  /** Optional button or link shown under the text, for example "Try again". */
  action?: ReactNode;
};

/** Error box for a failed action. Read out by screen readers as soon as it appears. */
export function Alert({ title, action, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex w-full items-start gap-2.5 rounded-10 bg-danger-soft p-3 text-left text-danger", className)}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-button font-semibold">{title}</p>
        {children ? <p className="text-body-small">{children}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
