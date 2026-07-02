"use client";

import Link from "next/link";
import { BookOpen, Bot, Calculator, Home, Settings } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GlobalNavKey =
  | "home"
  | "cold-brew"
  | "assistant"
  | "recipes"
  | "settings";

const ITEMS = [
  {
    key: "home",
    href: "/",
    label: "Recipe maker",
    icon: Home,
  },
  {
    key: "cold-brew",
    href: "/cold-brew",
    label: "Cold brew calculator",
    icon: Calculator,
  },
  {
    key: "assistant",
    href: "/assistant",
    label: "Assistant",
    icon: Bot,
  },
  {
    key: "recipes",
    href: "/recipes",
    label: "Saved recipes",
    icon: BookOpen,
  },
  {
    key: "settings",
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

export function GlobalNavActions({
  current,
  className,
}: {
  current?: GlobalNavKey;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-end gap-1.5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {ITEMS.filter((item) => item.key !== current).map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.key}
            asChild
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <Link href={item.href} aria-label={item.label} title={item.label}>
              <Icon className="size-4" />
            </Link>
          </Button>
        );
      })}
      <AccountButton />
      <ThemeToggle />
    </div>
  );
}
