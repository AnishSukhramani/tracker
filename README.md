This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Expense Advisor (optional)

The Expense Advisor feature (`/expense-advisor`) generates a one-shot, session-only spending report. Reports are **not saved** to the database or filesystem.

Add these to `.env.local` for the full research-backed playbook:

```bash
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

- `OPENAI_API_KEY` — powers research planning and playbook synthesis (server-side only).
- `TAVILY_API_KEY` — free tier web search for expense-cutting research ([tavily.com](https://tavily.com)).

Without these keys, Part 1 deterministic analysis still runs; Part 2 research playbook is skipped.

Configure tag meanings in `data/tag-dictionary.json` and needs/wants in `data/needs-wants-tags.json`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
