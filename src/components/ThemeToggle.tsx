"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={() => {
        setTheme(isDark ? "light" : "dark");
        haptics.light();
      }}
    >
      {mounted && isDark ? (
        <Sun className="size-4.5" />
      ) : (
        <Moon className="size-4.5" />
      )}
    </Button>
  );
}
