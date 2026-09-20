import type { ComponentProps } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface Props extends Omit<ComponentProps<typeof Button>, "children" | "aria-label"> {
  /** Shown as the tooltip and used as the accessible name. */
  label: string;
  children: React.ReactNode;
}

export function IconButton({
  label,
  children,
  variant = "ghost",
  size = "icon-xs",
  ...props
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant={variant} size={size} aria-label={label} {...props} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
