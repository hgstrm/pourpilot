# xBloom Recipe Maker

Snap a photo of a coffee bag → AI reads the label and designs a pour-over recipe
→ tweak it → send it straight to your **xBloom Studio** (it appears in the
xBloom iOS app, ready to brew). Save recipes, edit them later, and re-push
changes in place.

Phone-first UI — built to use standing next to the machine.

## How it works

1. **Capture** — take/upload a photo of the bean bag.
2. **Analyze** (`/api/analyze`) — a vision model (via **Vercel AI Gateway**)
   extracts bean info (origin, process, roast, notes) and designs a recipe
   using brewing science, returned as validated structured output.
3. **Review & tweak** — adjust dose, ratio, grind, RPM, and each pour.
4. **Save** — stored in **Neon Postgres**.
5. **Send to xBloom** (`/api/push`) — logs into the xBloom cloud API with your
   account (server-side, env-only), RSA-encrypts the payload, and creates the
   recipe. Re-pushing a saved recipe **edits it in place** on xBloom.

The xBloom client (`src/lib/xbloom/client.ts`) talks to the same private API
the xBloom app uses. Credit for the reverse-engineering:
[github.com/denull0/xbloom-agent](https://github.com/denull0/xbloom-agent).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
pnpm dev
```

### Test the xBloom push path on its own

```bash
pnpm xbloom:test                 # pushes a sample recipe, lists to confirm
XBLOOM_CLEANUP=1 pnpm xbloom:test # same, then deletes the test recipe
```

## Environment variables

| Var | Required | What |
| --- | --- | --- |
| `XBLOOM_EMAIL` | yes | Your xBloom account email (server-side only) |
| `XBLOOM_PASSWORD` | yes | Your xBloom account password (server-side only) |
| `AI_GATEWAY_API_KEY` | yes | Vercel AI Gateway key for the vision model |
| `AI_MODEL` | no | Model id, default `openai/gpt-4o` |
| `DATABASE_URL` | yes | Neon Postgres connection string (or `POSTGRES_URL`) |

The Neon `recipes` table is created automatically on first use.

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. **Storage → Neon**: add the Neon integration. It sets `DATABASE_URL`
   automatically.
3. **AI Gateway**: enable it / add `AI_GATEWAY_API_KEY` in project env vars.
4. Add `XBLOOM_EMAIL` and `XBLOOM_PASSWORD` as env vars.
5. **Settings → Deployment Protection**: turn it on so only you can reach the
   app (your xBloom credentials live in server env and are never exposed to the
   browser, but protection keeps the whole app private).

## Notes

- Credentials are used **server-side only** — the browser never sees your
  xBloom password.
- "Send to xBloom" logs in fresh each push (no token stored). Simple and safe
  for a single-user, protected deployment.
- Deleting a saved recipe here does **not** delete it from your xBloom app.
