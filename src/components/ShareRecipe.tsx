"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Share2 } from "lucide-react";
import { haptics } from "@/lib/haptics";

export function ShareRecipe({
  open,
  onOpenChange,
  shareUrl,
  recipeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  recipeName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      haptics.success();
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — try long-pressing the link.");
    }
  }

  async function nativeShare() {
    if (!("share" in navigator)) {
      copyLink();
      return;
    }
    try {
      await navigator.share({
        title: recipeName,
        text: `Check out my pour-over recipe: ${recipeName}`,
        url: shareUrl,
      });
      haptics.success();
    } catch {
      /* user cancelled share sheet — that's fine */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share recipe</DialogTitle>
          <DialogDescription>{recipeName}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="rounded-xl border bg-white p-3">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#1c1612"
              level="M"
            />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground break-all">
          {shareUrl}
        </p>

        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="flex-1"
            onClick={copyLink}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button className="flex-1" onClick={nativeShare}>
            <Share2 className="size-4" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
