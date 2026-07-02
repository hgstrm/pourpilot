import { NextRequest, NextResponse } from "next/server";
import { analyzeBeanImage } from "@/lib/analyze";
import { safeError } from "@/lib/api-error";
import { requireApiUser } from "@/lib/auth-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    const {
      image,
      images,
      dose,
      search,
      url,
      details,
      brewMode,
      brewWaterMl,
      iceG,
    } = (await req.json()) as {
      image?: string;
      images?: string[];
      dose?: number;
      search?: boolean;
      url?: string;
      details?: string;
      brewMode?: "hot" | "iced";
      brewWaterMl?: number;
      iceG?: number;
    };

    const list = (images && images.length ? images : image ? [image] : [])
      .filter((i): i is string => typeof i === "string")
      .filter((i) => i.startsWith("data:image/"));

    const cleanUrl = url?.trim() ? url.trim() : undefined;
    const cleanDetails = details?.trim() ? details.trim() : undefined;
    const cleanBrewMode = brewMode === "iced" ? "iced" : "hot";

    let cleanBrewWaterMl: number | undefined;
    let cleanIceG: number | undefined;
    if (cleanBrewMode === "iced") {
      if (
        typeof brewWaterMl !== "number" ||
        !Number.isFinite(brewWaterMl) ||
        brewWaterMl < 40 ||
        brewWaterMl > 500
      ) {
        return NextResponse.json(
          { error: "Iced brew water must be between 40ml and 500ml." },
          { status: 400 },
        );
      }
      if (
        typeof iceG !== "number" ||
        !Number.isFinite(iceG) ||
        iceG < 0 ||
        iceG > 500
      ) {
        return NextResponse.json(
          { error: "Ice must be between 0g and 500g." },
          { status: 400 },
        );
      }
      cleanBrewWaterMl = Math.round(brewWaterMl);
      cleanIceG = Math.round(iceG);
    }

    const result = await analyzeBeanImage(list, {
      dose,
      search,
      url: cleanUrl,
      details: cleanDetails,
      brewMode: cleanBrewMode,
      brewWaterMl: cleanBrewWaterMl,
      iceG: cleanIceG,
    });
    return NextResponse.json(result);
  } catch (err) {
    return safeError("analyze", err, 500, "Couldn't build that recipe.");
  }
}
