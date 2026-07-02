"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const nextPath = safeNextPath(
      new URLSearchParams(window.location.search).get("next"),
    );

    const result = isSignUp
      ? await authClient.signUp.email({
          name: name.trim() || email.trim(),
          email: email.trim(),
          password,
          callbackURL: nextPath,
        })
      : await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: nextPath,
        });

    setBusy(false);

    if (result.error) {
      toast.error(result.error.message || "Authentication failed");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <main className="app-wrap flex min-h-dvh items-center">
      <Card className="w-full gap-5 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {isSignUp ? "Create owner account" : "Sign in"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "First account unlocks this PourPilot instance."
                : "Welcome back to PourPilot."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="A. Brewer"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <Button type="submit" size="lg" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              Already set up?{" "}
              <Link className="font-semibold text-primary" href="/sign-in">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New self-host?{" "}
              <Link className="font-semibold text-primary" href="/sign-up">
                Create the first account
              </Link>
            </>
          )}
        </p>

        {isSignUp && (
          <p className="rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground">
            After the first account exists, signups are closed unless
            `ALLOW_SIGNUPS=true` is set.
          </p>
        )}
      </Card>
    </main>
  );
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up")) return "/";
  return value;
}
