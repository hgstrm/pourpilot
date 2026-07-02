"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AccountButton() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending || !session?.user) return null;

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-full"
      title={`Sign out ${session.user.email}`}
      aria-label={`Sign out ${session.user.email}`}
      onClick={signOut}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
