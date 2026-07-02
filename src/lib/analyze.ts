import { generateObject, generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  analysisSchema,
  beanInfoSchema,
  recipeSchema,
  type AnalysisResult,
  type BeanInfo,
  type RecipeOutput,
} from "./recipe-schema";
import { getModel, withRetry } from "./ai";
import { normalizePours } from "./client-types";

const READ_PROMPT = `You are reading a photo of a coffee bag.
Extract ONLY what is actually printed/visible on the bag: name, roaster, origin, process, varietal, roast level, tasting notes.
If something is not visible, set it to null (or an empty array for notes). NEVER invent or guess specific facts.`;

const TEXT_CONTEXT_PROMPT = `You are reading optional coffee context typed by a user.
Extract only bean facts the user directly gave: coffee name, roaster, origin, process, varietal, roast level, and tasting notes.
The text may also include brewing preferences; do not turn preferences into bean facts.
If something is not directly stated, set it to null (or an empty array for notes).`;

const RESEARCH_PROMPT = `You are a specialty coffee researcher. You are given partial info read off a coffee bag.
Use web search to look up the SPECIFIC coffee (by roaster + name) and fill in the missing details:
origin/region, process (washed/natural/honey/anaerobic), varietal, roast level, and the roaster's published tasting notes.
Prefer the roaster's own product page. Only state facts you find; if you still can't confirm something, leave it null.
Then return the completed bean info as structured data.`;

const RECIPE_PROMPT = `You are a world-class specialty coffee brewer designing a pour-over recipe for the xBloom Studio (Omni dripper).

Given the bean info, design ONE great pour-over recipe tailored to these beans.

Brewing principles:
- Lighter roasts: hotter water (93-96C), finer grind, higher ratio (1:15-1:17) for sweetness and clarity (Kasuya 4:6 / Hoffmann style).
- Darker roasts: cooler water (88-92C), coarser grind, lower ratio (1:14-1:16) to avoid bitterness.
- The FIRST pour is the bloom: ~2-3x the dose in water, 30-45s pause, agitate after.
- Subsequent pours: split remaining water into 2-4 even-ish pours. Spiral/circular patterns, small pauses.
- Sum of all pour volumes MUST equal doseG * ratio (within ~5ml).
- Explicit user volume requests override default hot-brew ratios. Choose dose/ratio so the pour volumes hit the requested water amount.
- For iced recipes: the xBloom pour water is hot water through coffee only. Ice is added separately and MUST NOT be counted in pour volumes.
- grindSize uses the xBloom 40-120 scale (lower = finer). Filter typically ~60-90; lighter/brighter = finer.
- Keep flowRate ~3.2 ml/s unless there's reason to change.
- Let the tasting notes and process guide subtle choices (e.g. naturals/funky -> a touch cooler & more even; washed/floral -> hotter & finer).

Return valid structured output only.`;

/** A bean is "sparse" if the bag didn't give us enough to brew well. */
function isSparse(bean: BeanInfo): boolean {
  const missing =
    !bean.origin || !bean.process || bean.roastLevel === "unknown";
  const fewNotes = (bean.tastingNotes?.length ?? 0) < 2;
  return missing || fewNotes;
}

function emptyBean(): BeanInfo {
  return {
    name: null,
    roaster: null,
    origin: null,
    process: null,
    varietal: null,
    roastLevel: "unknown",
    tastingNotes: [],
  };
}

/** Pass 1: read what's actually on the bag (one or more photos). */
async function readBag(imageDataUrls: string[]): Promise<BeanInfo> {
  const intro =
    imageDataUrls.length > 1
      ? "Read this coffee bag. Multiple photos of the same bag are provided (e.g. front and back) — combine details from all of them."
      : "Read this coffee bag.";
  const { object } = await withRetry(async () =>
    generateObject({
      model: await getModel(),
      schema: beanInfoSchema,
      system: READ_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: intro },
            ...imageDataUrls.map(toImageFilePart),
          ],
        },
      ],
    }),
  );
  return object;
}

function toImageFilePart(dataUrl: string) {
  return {
    type: "file",
    data: { type: "data", data: dataUrl },
    mediaType: mediaTypeFromDataUrl(dataUrl),
  } as const;
}

function mediaTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match?.[1] || "image";
}

/** Optional context path: parse typed bean facts when no photo is supplied. */
async function readTextContext(details: string): Promise<BeanInfo> {
  const { object } = await withRetry(async () =>
    generateObject({
      model: await getModel(),
      schema: beanInfoSchema,
      system: TEXT_CONTEXT_PROMPT,
      prompt: details,
    }),
  );
  return object;
}

export interface ResearchResult {
  bean: BeanInfo;
  sources: string[];
  searched: boolean;
}

/** Pass 2: enrich sparse bean info via native web search. */
async function researchBean(
  bean: BeanInfo,
  url?: string,
): Promise<ResearchResult> {
  const query = [bean.roaster, bean.name].filter(Boolean).join(" ");

  // If the user gave a product URL, point the model straight at it.
  const task = url
    ? `Open this coffee product page and read it: ${url}
Also use it as the primary source. What we read off the bag (some fields may be null):
${JSON.stringify(bean, null, 2)}

From that page, tell me the origin/region, process, varietal, roast level, and the roaster's published tasting notes. Cite the page.`
    : `Research this specific coffee: "${query}".
What we already read off the bag (some fields may be null):
${JSON.stringify(bean, null, 2)}

Search the web (prefer the roaster's product page) and tell me the origin/region, process, varietal, roast level, and the roaster's published tasting notes. Cite what you find.`;

  // STEP A: search the web (plain text answer so the tool actually runs).
  const search = await withRetry(async () =>
    generateText({
      model: await getModel(),
      system: RESEARCH_PROMPT,
      prompt: task,
      tools: {
        web_search: openai.tools.webSearch({ searchContextSize: "medium" }),
      },
      toolChoice: { type: "tool", toolName: "web_search" },
      stopWhen: stepCountIs(4),
    }),
  );

  // Instrumentation: prove whether search actually happened.
  const calls = search.steps.flatMap((s) => s.toolCalls ?? []);
  const sources = dedupeUrls(
    (search.sources ?? []).map((s) => ("url" in s ? s.url : "")).filter(Boolean),
  );
  console.log(
    `[analyze] research query="${query}" web_search calls=${calls.length} sources=${sources.length}`,
  );
  if (sources.length) console.log("[analyze] sources:", sources.slice(0, 5));

  if (!search.text) return { bean, sources, searched: calls.length > 0 };

  // STEP B: turn the researched prose into structured BeanInfo (no tools here).
  const { object: found } = await withRetry(async () =>
    generateObject({
      model: await getModel(),
      schema: beanInfoSchema,
      system:
        "Convert the research notes into structured bean info. Only include facts present in the notes; otherwise null.",
      prompt: `Original bag read:\n${JSON.stringify(bean, null, 2)}\n\nResearch notes:\n${search.text}`,
    }),
  );

  return {
    bean: mergeBean(bean, found),
    sources,
    searched: calls.length > 0,
  };
}

/** Strip tracking params and collapse duplicate source URLs. */
function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    let clean = raw;
    try {
      const u = new URL(raw);
      u.searchParams.delete("utm_source");
      u.searchParams.delete("utm_medium");
      u.searchParams.delete("utm_campaign");
      clean = u.toString();
    } catch {
      /* keep raw */
    }
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

/** Keep bag-read values; only fill nulls/gaps from research. */
function mergeBean(base: BeanInfo, found: BeanInfo): BeanInfo {
  return {
    name: base.name || found.name,
    roaster: base.roaster ?? found.roaster,
    origin: base.origin ?? found.origin,
    process: base.process ?? found.process,
    varietal: base.varietal ?? found.varietal,
    roastLevel:
      base.roastLevel !== "unknown" ? base.roastLevel : found.roastLevel,
    tastingNotes:
      base.tastingNotes && base.tastingNotes.length >= 2
        ? base.tastingNotes
        : found.tastingNotes,
  };
}

/** Pass 3: design the recipe from the (possibly enriched) bean info. */
async function designRecipe(
  bean: BeanInfo,
  hints?: {
    dose?: number;
    details?: string;
    brewMode?: "hot" | "iced";
    brewWaterMl?: number;
    iceG?: number;
  },
): Promise<RecipeOutput> {
  const doseLine = hints?.dose
    ? `Use a ${hints.dose}g dose.`
    : "Use a sensible default dose (typically 15g) unless the bean suggests otherwise.";

  const styleLine =
    hints?.brewMode === "iced"
      ? `Design this as an iced Japanese-style pour-over brewed over ice.
The xBloom recipe must pour exactly ${hints.brewWaterMl ?? 150}ml of hot water through the coffee.
The user will add ${hints.iceG ?? 100}g ice to the cup/carafe separately; do not include that ice in the pour volumes.
Choose a practical dose and lower brew-water ratio for concentrate strength, usually around 1:8-1:11 before ice dilution. Mention the ice amount in the recipe name or reasoning.`
      : "Design this as a hot pour-over unless the user's notes explicitly request iced coffee.";

  const detailsLine = hints?.details
    ? `\n\nIMPORTANT — the user added these notes/preferences; honor them:\n"""${hints.details}"""`
    : "";

  const { object } = await withRetry(async () =>
    generateObject({
      model: await getModel(),
      schema: recipeSchema,
      system: RECIPE_PROMPT,
      prompt: `Bean info:
${JSON.stringify(bean, null, 2)}

${styleLine}

${doseLine}${detailsLine}`,
    }),
  );
  return object;
}

export type AnalyzeResponse = AnalysisResult & {
  sources: string[];
  searched: boolean;
};

export const analyzeResponseSchema = analysisSchema.extend({
  sources: z.array(z.string()),
  searched: z.boolean(),
});

export async function analyzeBeanImage(
  images: string | string[] = [],
  hints?: {
    dose?: number;
    search?: boolean;
    url?: string;
    details?: string;
    brewMode?: "hot" | "iced";
    brewWaterMl?: number;
    iceG?: number;
  },
): Promise<AnalyzeResponse> {
  const imageList = Array.isArray(images) ? images : images ? [images] : [];

  // Pass 1 — read the bag when photos exist. Without photos, typed notes are
  // treated as optional bean facts while preferences remain recipe hints.
  let bean = imageList.length > 0 ? await readBag(imageList) : emptyBean();
  if (imageList.length === 0 && hints?.details?.trim()) {
    bean = await readTextContext(hints.details.trim());
  }

  // Pass 2 — enrich via web search. A product URL always triggers research;
  // otherwise only when the bag is sparse (or explicitly requested).
  // Failures are non-fatal.
  const hasSearchableBean = Boolean(bean.name || bean.roaster);
  const shouldSearch =
    Boolean(hints?.url) ||
    (imageList.length > 0
      ? (hints?.search ?? isSparse(bean))
      : Boolean(hints?.search && hasSearchableBean));
  let sources: string[] = [];
  let searched = false;
  if (shouldSearch) {
    try {
      const res = await researchBean(bean, hints?.url);
      bean = res.bean;
      sources = res.sources;
      searched = res.searched;
    } catch (e) {
      console.warn("[analyze] web research failed, continuing:", e);
    }
  }

  // Pass 3 — design the recipe, then force pours to sum to dose × ratio.
  const recipe = normalizePours(await designRecipe(bean, hints));

  // Validate the combined shape against the original schema.
  const result = analysisSchema.parse({ bean, recipe });
  return { ...result, sources, searched };
}
