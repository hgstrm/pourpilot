"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent, type EveMessagePart } from "eve/react";
import type { RecipeOutput, BeanInfo } from "@/lib/recipe-schema";
import { recipeSchema } from "@/lib/recipe-schema";
import { FEEDBACK_PRESETS } from "@/lib/adjust";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2, Sparkles } from "lucide-react";

export function AdjustBar({
  recipe,
  bean,
  savedId,
  onAdjusted,
  onError,
}: {
  recipe: RecipeOutput;
  bean?: BeanInfo | null;
  savedId?: string | null;
  onAdjusted: (next: RecipeOutput, note: string) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [lastNote, setLastNote] = useState<string | null>(null);
  const handledToolCalls = useRef(new Set<string>());
  const busyRef = useRef<string | null>(null);
  const agent = useEveAgent({
    onError(error) {
      haptics.warn();
      setBusy(null);
      onError(eveErrorMessage(error));
    },
  });

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const stopAgentRef = useRef(agent.stop);

  useEffect(() => {
    stopAgentRef.current = agent.stop;
  }, [agent.stop]);

  useEffect(() => {
    for (const message of agent.data.messages) {
      for (const part of message.parts) {
        const result = parseAdjustRecipePart(part);
        if (!result || handledToolCalls.current.has(result.toolCallId)) {
          continue;
        }

        handledToolCalls.current.add(result.toolCallId);
        haptics.success();
        setBusy(null);
        setLastNote(result.note);
        onAdjusted(result.recipe, result.note);
      }
    }
  }, [agent.data.messages, onAdjusted]);

  useEffect(() => {
    if (!busy) return;

    const timeout = window.setTimeout(() => {
      if (!busyRef.current) return;
      stopAgentRef.current();
      setBusy(null);
      haptics.warn();
      onError("Recipe adjustment is taking too long. Try again in a moment.");
    }, 90000);

    return () => window.clearTimeout(timeout);
  }, [busy, onError]);

  async function adjust(feedback: string, key: string) {
    setBusy(key);
    setLastNote(null);
    haptics.light();
    try {
      await agent.send({
        message: `Use adjust_recipe to improve the selected recipe. Feedback: ${feedback}`,
        clientContext: {
          selectedRecipe: {
            savedId: savedId ?? null,
            recipe,
            bean: bean ?? null,
          },
          instruction:
            "Call adjust_recipe with selectedRecipe.savedId, selectedRecipe.recipe, selectedRecipe.bean, and the user's feedback. Return a concise summary of what changed.",
        },
      });
    } catch (e) {
      haptics.warn();
      onError(eveErrorMessage(e));
      setBusy(null);
    }
  }

  return (
    <Card className="gap-3 border-primary/20 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recipe tune-up
            </span>
          </div>
          <p className="mt-1 font-semibold">Improve this recipe</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
          <Bot className="size-3.5" />
          Assistant
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        How did it taste? Tune grind, water, temp, and pour timing
        against this exact recipe.
      </p>

      <div className="flex flex-wrap gap-2">
        {FEEDBACK_PRESETS.map((p) => (
          <Button
            key={p.key}
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={busy !== null}
            onClick={() => adjust(p.feedback, p.key)}
          >
            {busy === p.key && <Loader2 className="size-4 animate-spin" />}
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Input
          placeholder="Or describe it… e.g. 'a bit muddy, want cleaner'"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim() && !busy) {
              adjust(custom.trim(), "custom");
            }
          }}
        />
        <Button
          variant="outline"
          disabled={!custom.trim() || busy !== null}
          onClick={() => adjust(custom.trim(), "custom")}
        >
          {busy === "custom" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Adjust"
          )}
        </Button>
      </div>

      {lastNote && (
        <p className="rounded-lg border bg-secondary/40 p-2 text-sm text-muted-foreground">
          {lastNote}
        </p>
      )}
    </Card>
  );
}

function parseAdjustRecipePart(part: EveMessagePart):
  | {
      toolCallId: string;
      recipe: RecipeOutput;
      note: string;
    }
  | null {
  if (
    part.type !== "dynamic-tool" ||
    part.toolName !== "adjust_recipe" ||
    part.state !== "output-available"
  ) {
    return null;
  }

  const record = asRecord(part.output);
  const rawRecipe = asRecord(record?.recipe) ?? asRecord(part.output);
  if (!rawRecipe) return null;

  const parsed = recipeSchema.safeParse(rawRecipe);
  if (!parsed.success) return null;

  return {
    toolCallId: part.toolCallId,
    recipe: parsed.data,
    note:
      stringValue(rawRecipe.changeNote) ??
      stringValue(record?.changeNote) ??
      "Recipe adjusted.",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function eveErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Recipe adjustment failed";
  const lower = message.toLowerCase();

  if (
    lower.includes("gatewayratelimiterror") ||
    lower.includes("free tier requests") ||
    lower.includes("rate-limited") ||
    lower.includes("rate limited") ||
    lower.includes("rate limit") ||
    lower.includes("429")
  ) {
    return "AI Gateway is rate-limiting the recipe assistant right now. Try again shortly or switch EVE_MODEL.";
  }

  return message;
}
