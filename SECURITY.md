# Security

## Reporting a vulnerability

If you find a security issue, **please do not open a public issue.** Instead,
use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository, or contact the maintainer directly.

## Handling credentials

- This app reads your xBloom credentials from server-side environment
  variables only. They are never exposed to the browser or stored in the
  database.
- **Always enable Deployment Protection** on your hosted instance. Without it,
  anyone who can reach the app can create recipes on your xBloom account.
- Never commit `.env.local` or real credentials.

See also [DISCLAIMER.md](./DISCLAIMER.md).
