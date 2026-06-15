# Contributing

Thanks for your interest! This is a small hobby project, so keep things simple.

## Getting set up

See the [README](./README.md#-local-development) for local dev. You'll need
Node 20+, pnpm, a Neon database URL, and a Vercel AI Gateway key.

## Before opening a PR

```bash
pnpm tsc --noEmit   # typecheck
pnpm build          # must build clean
```

- Keep changes focused; one feature/fix per PR.
- Match the existing code style (TypeScript, no new deps unless needed).
- Don't commit secrets. `.env.local` is gitignored — keep it that way.
- If you touch the xBloom API client, please test against a real account and
  describe what you verified.

## Ideas / bugs

Open an issue. For the xBloom API specifically, note that it's unofficial and
may change — see [DISCLAIMER.md](./DISCLAIMER.md).
