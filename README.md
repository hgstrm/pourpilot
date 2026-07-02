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
accounts. Your xBloom credentials live only in your deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhgstrm%2Fpourpilot&env=XBLOOM_EMAIL,XBLOOM_PASSWORD,AI_GATEWAY_API_KEY&envDescription=xBloom%20login%20and%20a%20Vercel%20AI%20Gateway%20key&envLink=https%3A%2F%2Fgithub.com%2Fhgstrm%2Fpourpilot%23environment-variables&project-name=pourpilot&repository-name=pourpilot)

Then, in your new Vercel project:

1. **Storage → Neon** — add the Neon integration. It sets `DATABASE_URL`
   automatically. (Tables are created on first use.)
2. **AI Gateway** — enable it and add `AI_GATEWAY_API_KEY` (used for the vision
   model + web search). Make sure the gateway has credits.
3. Confirm `XBLOOM_EMAIL` and `XBLOOM_PASSWORD` are set.
4. **Settings → Deployment Protection → On.** ⚠️ Important: this keeps your
   deployment private to you. Anyone who can reach the app brews into *your*
   xBloom account.

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
| `XBLOOM_EMAIL` | yes | Your xBloom account email (server-side only) |
| `XBLOOM_PASSWORD` | yes | Your xBloom account password (server-side only) |
| `AI_GATEWAY_API_KEY` | yes | [Vercel AI Gateway](https://vercel.com/ai-gateway) key (vision + web search) |
| `DATABASE_URL` | yes | Neon Postgres connection string (or `POSTGRES_URL`) |
| `AI_MODEL` | no | Model id, default `openai/gpt-4o` (must support vision + web search) |
| `EVE_MODEL` | no | Eve assistant model id, default `openai/gpt-4o-mini`; set separately from `AI_MODEL` to reduce assistant-loop rate limits |

Credentials are used **server-side only** — the browser never sees your xBloom
password, and it's never written to the database.

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
