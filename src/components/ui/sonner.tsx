"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const mobileToastOffset = {
  top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
  right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
  left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
} satisfies NonNullable<ToasterProps["mobileOffset"]>;

function Toaster({ ...props }: ToasterProps) {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      mobileOffset={mobileToastOffset}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
