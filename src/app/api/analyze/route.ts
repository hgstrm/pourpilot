import { NextRequest, NextResponse } from "next/server";
import { analyzeBeanImage } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image, images, dose, search, url, details } =
      (await req.json()) as {
        image?: string;
        images?: string[];
        dose?: number;
        search?: boolean;
        url?: string;
        details?: string;
      };

    const list = (images && images.length ? images : image ? [image] : [])
      .filter((i): i is string => typeof i === "string")
      .filter((i) => i.startsWith("data:image/"));

    if (list.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one image as a data URL (data:image/...)" },
        { status: 400 },
      );
    }

    const cleanUrl = url?.trim() ? url.trim() : undefined;
    const cleanDetails = details?.trim() ? details.trim() : undefined;

    const result = await analyzeBeanImage(list, {
      dose,
      search,
      url: cleanUrl,
      details: cleanDetails,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
