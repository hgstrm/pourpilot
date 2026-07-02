---
description: Use when analyzing coffee bags, designing xBloom recipes, or adjusting recipes from brew feedback.
---

# Brewing Principles

- Lighter roasts usually want hotter water, finer grind, and a higher ratio for sweetness and clarity.
- Darker roasts usually want cooler water, coarser grind, and a lower ratio to avoid bitterness.
- The first pour is the bloom: about 2-3x the dose in water, with a 30-45 second pause.
- Subsequent pours should split the remaining water into 2-4 even-ish pours.
- Sum of all pour volumes must equal doseG * ratio, within about 5 ml.
- Explicit user volume requests override default hot-brew ratios.
- For iced recipes, xBloom pour water is hot water through coffee only. Ice is added separately and must not be counted in pour volumes.
- xBloom grindSize uses a 40-120 scale, where lower is finer.
- Keep flowRate around 3.2 ml/s unless there is a clear reason to change.
- Washed/floral coffees often benefit from hotter water and a slightly finer grind.
- Natural/funky coffees often benefit from a touch cooler water and steadier pours.

# Adjustment Rules

- Bitter, harsh, or dry usually means over-extracted: coarsen grind, lower temperature 1-2C, shorten contact, or lower ratio slightly.
- Sour, sharp, or thin usually means under-extracted: finer grind, hotter water 1-2C, or more contact time.
- Weak or watery usually means lower the ratio or grind slightly finer.
- Too strong or intense usually means raise the ratio or coarsen slightly.
- Brighter means more acidity and clarity: finer grind, hotter water, higher ratio, and gentler agitation.
- Sweeter means rounder body: slightly coarser or cooler, more even pours, and maybe a lower ratio.
- Stronger means lower ratio.
- Make measured changes. Typical deltas: grindSize 3-6 points, temperature 1-2C, ratio 0.5-1.0, pauses 5-15 seconds.
