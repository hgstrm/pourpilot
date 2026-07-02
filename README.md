# ☕ PourPilot

An unofficial brewing companion for [xBloom Studio](https://xbloom.com).
Snap a photo of a coffee bag, let AI read the label (and look the bean up
online), design a pour-over recipe, and send it straight to your xBloom — it
appears in the xBloom app, ready to brew. Save recipes, log how each brew
tasted, and let the AI dial them in.

Phone-first. Built to use standing next to the machine.

> **Unofficial project — not affiliated with xBloom.** It uses a community
> reverse-engineered API that may break at any time. Please read
> [DISCLAIMER.md](./DISCLAIMER.md) before using.

---

## ✨ Features

- **📷 Photo → recipe** — vision model reads the bag (front + back), designs a
  pour-over tailored to the beans using brewing science.
- **🔎 Smart lookup** — sparse bag? Paste the product URL or let it search the
  web for the roaster's origin/process/notes. Sources are shown so you can
  verify.
- **📝 Your notes** — tell the AI your preferences ("brighter, 18g dose").
- **☕ One-tap to xBloom** — recipe syncs to your xBloom app instantly. Edits
  re-push in place.
- **🧠 Taste feedback loop** — "too bitter / sour / weak" → AI adjusts grind,
  temp, and ratio using real extraction theory. One-tap "brighter / sweeter"
  variations too.
- **📖 Brew log** — rate each brew and keep tasting notes per recipe.
- **📥 Import** — pull recipes already on your xBloom account in to tweak.
- **🤖 Eve assistant** — chat with an agent that can analyze, adjust, save, and
  approval-gate xBloom pushes.
- **🎨 Light & dark** — light by default, toggle persisted.
- **📱 PWA** — Add to Home Screen for an app-like feel.

---

## 🚀 Quick start (self-host)

This is a **self-hosted template**: you run your own copy with your own
accounts. Bring a database and auth secret first; app credentials can be added
from Settings after sign-in.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhgstrm%2Fpourpilot&env=BETTER_AUTH_SECRET,BETTER_AUTH_URL&envDescription=Better%20Auth%20setup.%20Add%20xBloom%20and%20AI%20Gateway%20credentials%20from%20Settings%20after%20sign-in.&envLink=https%3A%2F%2Fgithub.com%2Fhgstrm%2Fpourpilot%23environment-variables&project-name=pourpilot&repository-name=pourpilot)

Then, in your new Vercel project:

1. **Storage → Neon** — add the Neon integration. It sets `DATABASE_URL`
   automatically. (Tables are created on first use.)
2. Set `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
3. Set `BETTER_AUTH_URL` to the deployed app URL.
4. Deploy, then create the first account from `/sign-up`.
5. Open `/settings` and add `AI_GATEWAY_API_KEY`, `XBLOOM_EMAIL`, and
   `XBLOOM_PASSWORD` if you did not set them as deployment env vars.

---

## 🛠️ Local development

Requires Node 24+ and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/hgstrm/pourpilot.git
cd pourpilot
pnpm install
cp .env.example .env.local   # fill in the values (see below)
pnpm dev
```

Open http://localhost:3000.

### Verify the xBloom connection on its own

```bash
pnpm xbloom:test                  # pushes a sample recipe, lists to confirm
XBLOOM_CLEANUP=1 pnpm xbloom:test # same, then deletes the test recipe
```

---

## 🔑 Environment variables

| Var | Required | What |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string (or `POSTGRES_URL`) |
| `BETTER_AUTH_SECRET` | yes | Secret for Better Auth cookies/sessions; generate with `openssl rand -base64 32` |
| `XBLOOM_EMAIL` | no | Your xBloom account email; env wins, otherwise add in Settings |
| `XBLOOM_PASSWORD` | no | Your xBloom account password; env wins, otherwise add in Settings |
| `AI_GATEWAY_API_KEY` | no | [Vercel AI Gateway](https://vercel.com/ai-gateway) key; env wins, otherwise add in Settings |
| `BETTER_AUTH_URL` | no | Public base URL of the app, e.g. `https://pourpilot.example.com` |
| `AI_MODEL` | no | Model id, default `openai/gpt-4o` (must support vision + web search) |
| `EVE_MODEL` | no | Eve assistant model id, default `openai/gpt-4o-mini`; set separately from `AI_MODEL` to reduce assistant-loop rate limits |

The first account can always be created on a new instance. After that, signups
are closed; PourPilot is designed as a single-owner app.

Values saved in Settings are stored server-side in Postgres and masked when read
back by the app. Deployment env vars always take priority. The Eve assistant
runtime still uses deployment env or Vercel OIDC for its own model calls; the
settings page powers recipe generation/adjustment and xBloom sync.

---

## 🧩 How it works

```
photo(s) ─▶ /api/analyze ─▶ read bag (vision) ─▶ research (web search, if sparse)
                                                       │
                                                       ▼
                                              design recipe (AI)
                                                       │
   review & tweak ◀──────────────────────────────────┘
        │
        ├─ save ─▶ Neon Postgres (recipes, brews)
        └─ send ─▶ /api/push ─▶ xBloom cloud API (RSA-encrypted) ─▶ xBloom app
```

- **Framework:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Agent:** Eve, mounted into Next.js with same-origin `/eve/v1/*` routes.
- **AI:** Vercel AI Gateway via the AI SDK; structured output validated with
  Zod; native web search tool for bean lookups.
- **Storage:** Neon serverless Postgres.
- **xBloom client** (`src/lib/xbloom/client.ts`): logs in, RSA-encrypts the
  payload, and creates/edits/lists/deletes recipes.

---

## 🙏 Credits

The xBloom API integration is based on the reverse-engineering work in
[**denull0/xbloom-agent**](https://github.com/denull0/xbloom-agent) — huge
thanks. Go star it.

---

## 🤝 Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Be kind
([Code of Conduct](./CODE_OF_CONDUCT.md)).

## 📄 License

[MIT](./LICENSE) · See [DISCLAIMER.md](./DISCLAIMER.md) for important notes
about the unofficial xBloom API.
