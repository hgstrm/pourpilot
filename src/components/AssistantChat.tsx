"use client";

import { FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import { useEveAgent, type EveMessagePart } from "eve/react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  Coffee,
  Droplets,
  ExternalLink,
  Gauge,
  ImagePlus,
  Loader2,
  Save,
  Scale,
  Send,
  SlidersHorizontal,
  Thermometer,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GlobalNavActions } from "@/components/GlobalNavActions";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Upload = {
  data: string;
  filename: string;
  mediaType: string;
};

type RecipePreview = {
  name: string;
  doseG: number;
  ratio: number;
  grindSize: number;
  grindRpm?: number;
  pours: PourPreview[];
  reasoning?: string;
  changeNote?: string;
};

type PourPreview = {
  volumeMl: number;
  temperatureC: number;
  pauseSeconds: number;
  pattern?: string;
  flowRate?: number;
};

type BeanPreview = {
  name?: string | null;
  roaster?: string | null;
  origin?: string | null;
  process?: string | null;
  roastLevel?: string | null;
  tastingNotes?: string[];
};

type SavedRecipePreview = {
  id?: string;
  name: string;
  bean?: BeanPreview | null;
  recipe: RecipePreview;
  xbloomId?: number | null;
  shareUrl?: string | null;
  updatedAt?: string;
};

type ChangePreview = {
  label: string;
  before: string;
  after: string;
  detail?: string;
};

export function AssistantChat() {
  const [draft, setDraft] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedRecipe, setSelectedRecipe] =
    useState<SavedRecipePreview | null>(null);
  const [recipeNeededNotice, setRecipeNeededNotice] = useState<{
    prompt: string;
  } | null>(null);
  const agent = useEveAgent({
    onError(error) {
      toast.error(friendlyErrorMessage(error));
    },
  });

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const hasMessages =
    agent.data.messages.length > 0 || recipeNeededNotice !== null;
  const agentError = agent.error ? friendlyErrorMessage(agent.error) : null;
  const placeholder = uploads.length
    ? "Add brew goals, product links, or style notes..."
    : selectedRecipe
      ? `Ask about ${selectedRecipe.name}...`
    : "Ask for a recipe, paste feedback, or add bag photos...";

  async function addPhoto(file: File) {
    const data = await fileToDataUrl(file);
    setUploads((current) =>
      [
        ...current,
        {
          data,
          filename: file.name || `bag-${current.length + 1}.jpg`,
          mediaType: file.type || mediaTypeFromDataUrl(data),
        },
      ].slice(0, 3),
    );
    haptics.light();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message && uploads.length === 0) return;

    if (
      shouldBlockRecipeAdjustment(
        message,
        agent.data.messages,
        uploads.length > 0,
        selectedRecipe,
      )
    ) {
      setRecipeNeededNotice({ prompt: message });
      setDraft("");
      haptics.warn();
      return;
    }

    await sendToEve(message, uploads);
  }

  async function sendToEve(message: string, files: Upload[] = []) {
    const selectedContext =
      selectedRecipe &&
      files.length === 0 &&
      shouldAttachSelectedRecipeContext(message)
        ? selectedRecipeClientContext(selectedRecipe)
        : undefined;
    const text = files.length
      ? [
          message || "Analyze these coffee bag photos and design a recipe.",
          "Use the analyze_bag tool with the image data URLs from clientContext.images.",
        ].join("\n\n")
      : message;

    try {
      await agent.send({
        message: files.length
          ? [
              { type: "text", text },
              ...files.map((upload) => ({
                type: "file" as const,
                data: upload.data,
                mediaType: upload.mediaType,
                filename: upload.filename,
              })),
            ]
          : text,
        clientContext: files.length
          ? {
              images: files.map((upload) => upload.data),
              filenames: files.map((upload) => upload.filename),
            }
          : selectedContext,
      });
      setDraft("");
      setUploads([]);
      setRecipeNeededNotice(null);
    } catch (error) {
      toast.error(friendlyErrorMessage(error));
    }
  }

  function pickRecipe(recipe: SavedRecipePreview) {
    setSelectedRecipe(recipe);
    setRecipeNeededNotice(null);
    haptics.success();
    toast.success(`Picked ${recipe.name}`);
  }

  return (
    <main className="app-wrap">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="rounded-full">
            <Link href="/" aria-label="Back to recipe maker">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Bot className="size-5 text-primary" />
              Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Eve-native recipe workbench
            </p>
          </div>
        </div>
        <GlobalNavActions current="assistant" />
      </header>

      <div className="flex flex-col gap-3 pb-44">
        {!hasMessages && (
          <Card className="gap-3">
            <p className="font-semibold">What can I brew?</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Analyze these beans for iced coffee",
                "Make this recipe sweeter",
                "List saved recipes",
                "Send this to xBloom",
              ].map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setDraft(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {agentError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Request failed</p>
              <p className="mt-1 text-destructive/90">{agentError}</p>
            </div>
          </div>
        )}

        {recipeNeededNotice && (
          <>
            <article className="flex justify-end">
              <div className="max-w-[88%] rounded-xl border bg-primary px-3.5 py-3 text-sm text-primary-foreground shadow-sm">
                {recipeNeededNotice.prompt}
              </div>
            </article>
            <article className="flex justify-start">
              <RecipeContextNeededCard
                isBusy={isBusy}
                onListSaved={() => void sendToEve("List saved recipes")}
                onPasteRecipe={() => {
                  setDraft(
                    "Here is the recipe I want to adjust:\n\n",
                  );
                  setRecipeNeededNotice(null);
                }}
              />
            </article>
          </>
        )}

        {agent.data.messages.map((message, messageIndex) => {
          const suppressText =
            message.role === "assistant" && messageHasSavedRecipes(message);
          const hasVisibleParts = message.parts.some(hasVisibleMessagePart);
          const isLastMessage =
            messageIndex === agent.data.messages.length - 1;

          return (
            <article
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "rounded-xl border px-3.5 py-3 text-sm shadow-sm",
                  message.role === "user"
                    ? "max-w-[88%] bg-primary text-primary-foreground"
                    : "max-w-full bg-card text-card-foreground",
                )}
              >
                <div className="flex flex-col gap-2">
                  {message.parts.map((part, index) => (
                    <MessagePart
                      key={`${message.id}-${index}`}
                      part={part}
                      suppressText={suppressText}
                      onRespond={async (requestId, optionId) => {
                        try {
                          await agent.send({
                            inputResponses: [{ requestId, optionId }],
                          });
                        } catch (error) {
                          toast.error(friendlyErrorMessage(error));
                        }
                      }}
                      onPickRecipe={pickRecipe}
                      selectedRecipeId={selectedRecipe?.id}
                    />
                  ))}
                  {!hasVisibleParts && message.role === "assistant" && (
                    <EmptyAssistantMessage
                      agentError={isLastMessage ? agentError : null}
                      status={message.metadata?.status}
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {isBusy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Eve is brewing...
          </p>
        )}
      </div>

      <form onSubmit={submit} className="action-bar flex-col">
        {selectedRecipe && (
          <div className="flex items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-sm shadow-sm">
            <Check className="size-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate">
              Using <span className="font-semibold">{selectedRecipe.name}</span>
            </span>
            {selectedRecipe.id && (
              <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                <Link href={`/recipes/${selectedRecipe.id}`}>Open</Link>
              </Button>
            )}
            <button
              type="button"
              aria-label="Clear selected recipe"
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              onClick={() => setSelectedRecipe(null)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {uploads.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {uploads.map((upload, index) => (
              <div
                key={`${upload.filename}-${index}`}
                className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upload.data}
                  alt=""
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/65 text-white"
                  onClick={() =>
                    setUploads((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border bg-card text-primary shadow-sm">
            <ImagePlus className="size-5" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void addPhoto(file);
                event.target.value = "";
              }}
            />
          </label>
          <Textarea
            rows={2}
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isBusy}
            className="max-h-32 min-h-11 resize-none rounded-xl bg-card"
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            disabled={isBusy || (!draft.trim() && uploads.length === 0)}
            aria-label="Send"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}

function MessagePart({
  part,
  suppressText,
  onRespond,
  onPickRecipe,
  selectedRecipeId,
}: {
  part: EveMessagePart;
  suppressText?: boolean;
  onRespond: (requestId: string, optionId: string) => Promise<void>;
  onPickRecipe: (recipe: SavedRecipePreview) => void;
  selectedRecipeId?: string;
}) {
  if (part.type === "text") {
    if (suppressText) return null;
    return <p className="whitespace-pre-wrap leading-relaxed">{part.text}</p>;
  }

  if (part.type === "reasoning") {
    return (
      <p className="whitespace-pre-wrap border-l-2 border-primary pl-2 text-muted-foreground">
        {part.text}
      </p>
    );
  }

  if (part.type === "authorization") {
    return <p className="text-muted-foreground">{part.description}</p>;
  }

  if (part.type !== "dynamic-tool") return null;

  const request = part.toolMetadata?.eve?.inputRequest;
  const title = toolLabel(part.toolName);

  if (part.toolName === "load_skill") {
    return null;
  }

  if (request && part.state === "approval-requested") {
    return (
      <div className="rounded-lg border bg-secondary/40 p-3">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-muted-foreground">{request.prompt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {request.options?.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={option.style === "danger" ? "destructive" : "default"}
              size="sm"
              onClick={() => onRespond(request.requestId, option.id)}
            >
              {option.id === "approve" && <Check className="size-4" />}
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-destructive">
        {title}: {part.errorText}
      </p>
    );
  }

  if (part.state === "output-denied") {
    return (
      <p className="rounded-lg border bg-secondary/40 p-2 text-muted-foreground">
        {title} was not approved.
      </p>
    );
  }

  if (part.state === "output-available") {
    if (part.toolName === "adjust_recipe") {
      return <AdjustedRecipeResult input={part.input} output={part.output} />;
    }

    if (part.toolName === "list_saved_recipes") {
      return (
        <SavedRecipeListResult
          output={part.output}
          onPickRecipe={onPickRecipe}
          selectedRecipeId={selectedRecipeId}
        />
      );
    }

    if (part.toolName === "save_recipe") {
      return (
        <SavedRecipeResult
          output={part.output}
          onPickRecipe={onPickRecipe}
          selectedRecipeId={selectedRecipeId}
        />
      );
    }

    if (part.toolName === "push_to_xbloom") {
      return <PushRecipeResult output={part.output} />;
    }

    return (
      <p className="rounded-lg border bg-secondary/40 p-2 text-muted-foreground">
        {title} complete.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      {title}
    </p>
  );
}

function AdjustedRecipeResult({
  input,
  output,
}: {
  input: unknown;
  output: unknown;
}) {
  const result = parseAdjustedRecipeResult(input, output);

  if (!result) return <ToolComplete title="adjust recipe" />;

  const note = result.recipe.changeNote || result.recipe.reasoning;
  const recipeHref =
    result.recipeUrl ?? (result.savedId ? `/recipes/${result.savedId}` : null);

  return (
    <section className="rounded-lg border border-primary/25 bg-secondary/35 p-3 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <SlidersHorizontal className="size-3.5" />
            Recipe adjusted
          </p>
          <h2 className="mt-1 truncate text-base font-bold">
            {result.recipe.name}
          </h2>
        </div>
        {recipeHref && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={recipeHref}>
              Open
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {note && <p className="mt-2 leading-relaxed text-muted-foreground">{note}</p>}

      {result.changes.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {result.changes.map((change) => (
            <div
              key={`${change.label}-${change.before}-${change.after}`}
              className="rounded-md border bg-background/65 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{change.label}</p>
                {change.detail && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground">
                    {change.detail}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {change.before}
                {" -> "}
                {change.after}
              </p>
            </div>
          ))}
        </div>
      )}

      <RecipeMetrics recipe={result.recipe} />
      <PourTimeline recipe={result.recipe} />
    </section>
  );
}

function SavedRecipeListResult({
  output,
  onPickRecipe,
  selectedRecipeId,
}: {
  output: unknown;
  onPickRecipe: (recipe: SavedRecipePreview) => void;
  selectedRecipeId?: string;
}) {
  const recipes = parseSavedRecipeList(output);

  if (!recipes) return <ToolComplete title="list saved recipes" />;

  if (recipes.length === 0) {
    return (
      <section className="rounded-lg border bg-secondary/35 p-4 text-center">
        <Coffee className="mx-auto size-6 text-primary" />
        <p className="mt-2 font-semibold">No saved recipes yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-secondary/35 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <Coffee className="size-4 text-primary" />
          Saved recipes
        </p>
        <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
          {recipes.length}
        </span>
      </div>
      <div className="grid gap-2">
        {recipes.map((recipe) => (
          <RecipePreviewCard
            key={recipe.id ?? recipe.name}
            saved={recipe}
            onPickRecipe={onPickRecipe}
            isSelected={Boolean(recipe.id && recipe.id === selectedRecipeId)}
          />
        ))}
      </div>
    </section>
  );
}

function SavedRecipeResult({
  output,
  onPickRecipe,
  selectedRecipeId,
}: {
  output: unknown;
  onPickRecipe: (recipe: SavedRecipePreview) => void;
  selectedRecipeId?: string;
}) {
  const saved = parseSavedRecipe(output);

  if (!saved) return <ToolComplete title="save recipe" />;

  return (
    <section className="rounded-lg border border-accent/40 bg-accent/10 p-3">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Save className="size-4 text-accent" />
        Recipe saved
      </div>
      <RecipePreviewCard
        saved={saved}
        onPickRecipe={onPickRecipe}
        isSelected={Boolean(saved.id && saved.id === selectedRecipeId)}
      />
    </section>
  );
}

function PushRecipeResult({ output }: { output: unknown }) {
  const record = asRecord(output);
  const shareUrl = stringValue(record?.shareUrl);
  const updated = Boolean(record?.updated);

  if (!record) return <ToolComplete title="push to xBloom" />;

  return (
    <section className="rounded-lg border border-accent/40 bg-accent/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {updated ? "xBloom recipe updated" : "Recipe sent to xBloom"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {shareUrl
              ? "The xBloom share link is ready."
              : "xBloom accepted the recipe."}
          </p>
        </div>
        {shareUrl && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <a href={shareUrl} target="_blank" rel="noreferrer">
              xBloom
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}

function RecipePreviewCard({
  saved,
  onPickRecipe,
  isSelected = false,
}: {
  saved: SavedRecipePreview;
  onPickRecipe?: (recipe: SavedRecipePreview) => void;
  isSelected?: boolean;
}) {
  const href = saved.id ? `/recipes/${saved.id}` : null;
  const bean = beanLine(saved.bean);

  return (
    <div className="rounded-lg border bg-background/65 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{saved.name}</h3>
          {bean && (
            <p className="mt-0.5 truncate text-muted-foreground">{bean}</p>
          )}
        </div>
        {saved.xbloomId && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
            xBloom
          </span>
        )}
      </div>

      <RecipeMetrics recipe={saved.recipe} compact />

      <div className="mt-3 flex flex-wrap gap-2">
        {onPickRecipe && (
          <Button
            type="button"
            size="sm"
            variant={isSelected ? "secondary" : "default"}
            onClick={() => onPickRecipe(saved)}
            disabled={isSelected}
          >
            <Check className="size-3.5" />
            {isSelected ? "Picked" : "Pick this"}
          </Button>
        )}
        {href && (
          <Button asChild size="sm" variant="outline">
            <Link href={href}>
              Open recipe
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
        {saved.shareUrl && (
          <Button asChild size="sm" variant="secondary">
            <a href={saved.shareUrl} target="_blank" rel="noreferrer">
              xBloom
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function RecipeMetrics({
  recipe,
  compact = false,
}: {
  recipe: RecipePreview;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2",
        compact ? "mt-2" : "mt-3 sm:grid-cols-4",
      )}
    >
      <Metric icon={<Scale className="size-3.5" />} label="Dose" value={`${formatNumber(recipe.doseG)}g`} />
      <Metric icon={<Droplets className="size-3.5" />} label="Water" value={`${totalWater(recipe)}ml`} />
      <Metric icon={<Gauge className="size-3.5" />} label="Ratio" value={`1:${formatNumber(recipe.ratio)}`} />
      <Metric icon={<Thermometer className="size-3.5" />} label="Temp" value={`${weightedTemperature(recipe)}C`} />
      {!compact && (
        <>
          <Metric icon={<SlidersHorizontal className="size-3.5" />} label="Grind" value={`${recipe.grindSize}`} />
          <Metric icon={<Timer className="size-3.5" />} label="Pours" value={`${recipe.pours.length}`} />
        </>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-card/75 px-2 py-1.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function PourTimeline({ recipe }: { recipe: RecipePreview }) {
  return (
    <div className="mt-3 rounded-md border bg-background/55 p-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Timer className="size-3.5" />
        Pour plan
      </p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {recipe.pours.map((pour, index) => (
          <div
            key={`${index}-${pour.volumeMl}-${pour.temperatureC}`}
            className="min-w-20 rounded-md border bg-card px-2 py-1.5"
          >
            <p className="font-semibold">P{index + 1}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {pour.volumeMl}ml / {pour.temperatureC}C
            </p>
            {pour.pauseSeconds > 0 && (
              <p className="font-mono text-xs text-muted-foreground">
                +{pour.pauseSeconds}s
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolComplete({ title }: { title: string }) {
  return (
    <p className="rounded-lg border bg-secondary/40 p-2 text-muted-foreground">
      {title} complete.
    </p>
  );
}

function RecipeContextNeededCard({
  isBusy,
  onListSaved,
  onPasteRecipe,
}: {
  isBusy: boolean;
  onListSaved: () => void;
  onPasteRecipe: () => void;
}) {
  return (
    <section className="max-w-full rounded-xl border border-primary/25 bg-card px-3.5 py-3 text-sm shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Coffee className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Which recipe are we fixing?</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            I need an existing recipe before I can make it sweeter, brighter,
            stronger, or otherwise adjust it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onListSaved}
              disabled={isBusy}
            >
              <Coffee className="size-3.5" />
              List saved recipes
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onPasteRecipe}
              disabled={isBusy}
            >
              Paste recipe
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link href="/">Create one</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyAssistantMessage({
  agentError,
  status,
}: {
  agentError: string | null;
  status: "complete" | "failed" | "streaming" | "submitted" | undefined;
}) {
  if (agentError) {
    return (
      <p className="flex items-start gap-2 text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        Request failed before Eve returned a visible reply.
      </p>
    );
  }

  if (status === "complete" || status === "failed") {
    return (
      <p className="text-muted-foreground">
        Eve finished without a visible response.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin text-primary" />
      Eve is brewing...
    </p>
  );
}

function hasVisibleMessagePart(part: EveMessagePart): boolean {
  if (part.type === "text" || part.type === "reasoning") {
    return part.text.trim().length > 0;
  }

  if (part.type === "authorization") return true;
  if (part.type !== "dynamic-tool") return false;
  return part.toolName !== "load_skill";
}

function messageHasSavedRecipes(message: {
  parts: readonly EveMessagePart[];
}): boolean {
  return message.parts.some(
    (part) =>
      part.type === "dynamic-tool" &&
      part.toolName === "list_saved_recipes" &&
      part.state === "output-available",
  );
}

function shouldBlockRecipeAdjustment(
  message: string,
  messages: readonly { parts: readonly EveMessagePart[] }[],
  hasUploads: boolean,
  selectedRecipe: SavedRecipePreview | null,
): boolean {
  if (hasUploads) return false;
  if (selectedRecipe) return false;
  if (!isRecipeAdjustmentRequest(message)) return false;
  if (messageHasRecipeDetails(message)) return false;
  return !messagesContainRecipe(messages);
}

function shouldAttachSelectedRecipeContext(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    isRecipeAdjustmentRequest(message) ||
    /\b(this|that|it|selected|recipe|brew|cup)\b/.test(lower) ||
    /\b(send|push|sync|update).*\bxbloom\b/.test(lower)
  );
}

function selectedRecipeClientContext(recipe: SavedRecipePreview) {
  return {
    selectedRecipe: {
      savedId: recipe.id ?? null,
      name: recipe.name,
      bean: recipe.bean ?? null,
      recipe: recipe.recipe,
      xbloomId: recipe.xbloomId ?? null,
      shareUrl: recipe.shareUrl ?? null,
    },
    instruction:
      "The user picked this saved recipe in the UI. If they ask to adjust it, call adjust_recipe with selectedRecipe.savedId, selectedRecipe.recipe, selectedRecipe.bean, and their feedback.",
  };
}

function isRecipeAdjustmentRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const hasAdjustmentVerb =
    /\b(adjust|fix|tweak|change|improve|refine|make|dial|calibrate)\b/.test(
      lower,
    );
  const hasTasteGoal =
    /\b(sweeter|brighter|stronger|weaker|bitter|sour|harsh|dry|watery|thin|intense|acidic|rounder|body|lighter|cooler|hotter|finer|coarser)\b/.test(
      lower,
    );
  const referencesRecipe = /\b(recipe|brew|cup|it|this)\b/.test(lower);

  return (
    (hasAdjustmentVerb && (hasTasteGoal || referencesRecipe)) ||
    /\btoo\s+(bitter|sour|weak|strong|thin|watery|harsh)\b/.test(lower)
  );
}

function messageHasRecipeDetails(message: string): boolean {
  const lower = message.toLowerCase();
  const signals = [
    /\b\d{1,2}(?:\.\d)?\s*g\b/.test(lower),
    /\b1\s*:\s*\d{1,2}(?:\.\d)?\b|\bratio\b/.test(lower),
    /\bgrind(?:\s+size)?\s*\d{2,3}\b/.test(lower),
    /\bpour\b|\b\d{2,3}\s*ml\b/.test(lower),
    /\b\d{2}\s*c\b|\btemperature\b/.test(lower),
  ];

  return signals.filter(Boolean).length >= 2;
}

function messagesContainRecipe(
  messages: readonly { parts: readonly EveMessagePart[] }[],
): boolean {
  return messages.some((message) =>
    message.parts.some((part) => {
      if (part.type === "text" || part.type === "reasoning") {
        return messageHasRecipeDetails(part.text);
      }

      if (part.type !== "dynamic-tool" || part.state !== "output-available") {
        return false;
      }

      if (asRecipe(part.output)) return true;

      const outputRecord = asRecord(part.output);
      if (asRecipe(outputRecord?.recipe)) return true;

      const savedRecipe = parseSavedRecipe(part.output);
      if (savedRecipe) return true;

      return false;
    }),
  );
}

function parseAdjustedRecipeResult(input: unknown, output: unknown):
  | {
      recipe: RecipePreview;
      saved: boolean;
      savedId?: string;
      recipeUrl?: string;
      changes: ChangePreview[];
    }
  | null {
  const outputRecord = asRecord(output);
  const inputRecord = asRecord(input);
  const recipe = asRecipe(outputRecord?.recipe) ?? asRecipe(output);
  if (!recipe) return null;

  const beforeRecipe = asRecipe(inputRecord?.recipe);
  const savedId =
    stringValue(outputRecord?.savedId) ?? stringValue(inputRecord?.savedId);
  const recipeUrl =
    stringValue(outputRecord?.recipeUrl) ??
    (savedId ? `/recipes/${savedId}` : undefined);
  const changes =
    parseChangeList(outputRecord?.changes) ??
    (beforeRecipe ? summarizeRecipeChanges(beforeRecipe, recipe) : []);

  return {
    recipe,
    saved: Boolean(outputRecord?.saved ?? savedId),
    savedId,
    recipeUrl,
    changes,
  };
}

function parseSavedRecipeList(output: unknown): SavedRecipePreview[] | null {
  if (!Array.isArray(output)) return null;
  return output
    .map((item) => parseSavedRecipe(item))
    .filter((item): item is SavedRecipePreview => Boolean(item));
}

function parseSavedRecipe(output: unknown): SavedRecipePreview | null {
  const record = asRecord(output);
  if (!record) return null;

  const recipe = asRecipe(record.recipe);
  if (!recipe) return null;

  return {
    id: stringValue(record.id),
    name: stringValue(record.name) ?? recipe.name,
    bean: asBean(record.bean),
    recipe,
    xbloomId: numberValue(record.xbloomId),
    shareUrl: stringValue(record.shareUrl),
    updatedAt: stringValue(record.updatedAt),
  };
}

function asRecipe(value: unknown): RecipePreview | null {
  const record = asRecord(value);
  if (!record) return null;

  const name = stringValue(record.name);
  const doseG = numberValue(record.doseG);
  const ratio = numberValue(record.ratio);
  const grindSize = numberValue(record.grindSize);
  const pours = Array.isArray(record.pours)
    ? record.pours.map(asPour).filter((pour): pour is PourPreview => Boolean(pour))
    : [];

  if (!name || doseG === undefined || ratio === undefined || grindSize === undefined) {
    return null;
  }

  if (pours.length === 0) return null;

  return {
    name,
    doseG,
    ratio,
    grindSize,
    grindRpm: numberValue(record.grindRpm),
    pours,
    reasoning: stringValue(record.reasoning),
    changeNote: stringValue(record.changeNote),
  };
}

function asPour(value: unknown): PourPreview | null {
  const record = asRecord(value);
  if (!record) return null;

  const volumeMl = numberValue(record.volumeMl);
  const temperatureC = numberValue(record.temperatureC);
  const pauseSeconds = numberValue(record.pauseSeconds);

  if (
    volumeMl === undefined ||
    temperatureC === undefined ||
    pauseSeconds === undefined
  ) {
    return null;
  }

  return {
    volumeMl,
    temperatureC,
    pauseSeconds,
    pattern: stringValue(record.pattern),
    flowRate: numberValue(record.flowRate),
  };
}

function asBean(value: unknown): BeanPreview | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    name: stringValue(record.name),
    roaster: stringValue(record.roaster),
    origin: stringValue(record.origin),
    process: stringValue(record.process),
    roastLevel: stringValue(record.roastLevel),
    tastingNotes: Array.isArray(record.tastingNotes)
      ? record.tastingNotes.filter(
          (note): note is string => typeof note === "string",
        )
      : undefined,
  };
}

function parseChangeList(value: unknown): ChangePreview[] | null {
  if (!Array.isArray(value)) return null;

  const changes = value
    .map((item) => {
      const record = asRecord(item);
      const label = stringValue(record?.label);
      const before = stringValue(record?.before);
      const after = stringValue(record?.after);
      if (!label || !before || !after) return null;
      const detail = stringValue(record?.detail);
      return detail
        ? { label, before, after, detail }
        : { label, before, after };
    })
    .filter((item): item is ChangePreview => Boolean(item));

  return changes;
}

function summarizeRecipeChanges(
  before: RecipePreview,
  after: RecipePreview,
): ChangePreview[] {
  const changes: ChangePreview[] = [];

  if (before.grindSize !== after.grindSize) {
    changes.push({
      label: "Grind",
      before: `${before.grindSize}`,
      after: `${after.grindSize}`,
      detail: after.grindSize < before.grindSize ? "finer" : "coarser",
    });
  }

  if (before.ratio !== after.ratio) {
    changes.push({
      label: "Ratio",
      before: `1:${formatNumber(before.ratio)}`,
      after: `1:${formatNumber(after.ratio)}`,
      detail: after.ratio < before.ratio ? "stronger cup" : "lighter cup",
    });
  }

  const beforeTemp = weightedTemperature(before);
  const afterTemp = weightedTemperature(after);
  if (beforeTemp !== afterTemp) {
    changes.push({
      label: "Water temp",
      before: `${beforeTemp}C`,
      after: `${afterTemp}C`,
      detail: afterTemp > beforeTemp ? "hotter extraction" : "cooler extraction",
    });
  }

  const beforeWater = totalWater(before);
  const afterWater = totalWater(after);
  if (beforeWater !== afterWater) {
    changes.push({
      label: "Brew water",
      before: `${beforeWater}ml`,
      after: `${afterWater}ml`,
      detail: afterWater > beforeWater ? "more dilution" : "more concentrate",
    });
  }

  const beforeBloom = before.pours[0]?.pauseSeconds;
  const afterBloom = after.pours[0]?.pauseSeconds;
  if (beforeBloom !== undefined && afterBloom !== undefined && beforeBloom !== afterBloom) {
    changes.push({
      label: "Bloom pause",
      before: `${beforeBloom}s`,
      after: `${afterBloom}s`,
      detail: afterBloom > beforeBloom ? "longer saturation" : "shorter bloom",
    });
  }

  return changes.slice(0, 5);
}

function beanLine(bean: BeanPreview | null | undefined): string | null {
  if (!bean) return null;
  const parts = [bean.roaster, bean.name, bean.origin].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function totalWater(recipe: RecipePreview): number {
  return recipe.pours.reduce((sum, pour) => sum + pour.volumeMl, 0);
}

function weightedTemperature(recipe: RecipePreview): number {
  const water = totalWater(recipe);
  if (!water) return Math.round(recipe.pours[0]?.temperatureC ?? 0);

  return Math.round(
    recipe.pours.reduce(
      (sum, pour) => sum + pour.volumeMl * pour.temperatureC,
      0,
    ) / water,
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toolLabel(name: string): string {
  return name.replaceAll("_", " ");
}

function mediaTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);/.exec(dataUrl);
  return match?.[1] ?? "image/jpeg";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function friendlyErrorMessage(error: unknown): string {
  const message = errMsg(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("gatewayratelimiterror") ||
    lower.includes("free tier requests") ||
    lower.includes("rate-limited") ||
    lower.includes("rate limited") ||
    lower.includes("rate limit") ||
    lower.includes("429")
  ) {
    return "AI Gateway is rate-limiting the current model. Try again shortly, add credits, or set EVE_MODEL to another model.";
  }

  if (
    lower.includes("tooloutputserializationerror") ||
    lower.includes("non-json-serializable")
  ) {
    return "Eve received a tool result it could not render. Refresh and try again.";
  }

  return message;
}
