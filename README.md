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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Receipt scanning

Open **Add transaction** and choose **Scan receipt** to scan a JPG, PNG, or PDF invoice. OCR runs in the browser with English and Vietnamese language data. The scanner suggests a merchant, total, date, and category where it can; the user must review the fields and select an account before saving. Scanned transactions are saved as review drafts and do not count toward balances, budgets, or analytics until confirmed.

### PostgreSQL backend

The backend stores accounts and receipt files in PostgreSQL. Transaction history and the receipt IDs linked to those transactions still live in browser `localStorage`; transaction data is not synchronized between devices.

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a PostgreSQL database connection string and set `AUTH_SECRET` to a cryptographically random secret with at least 32 characters.
3. Apply [`db/migrations/001_initial_schema.sql`](./db/migrations/001_initial_schema.sql) to the database.
4. Run `npm run dev` or build and start the application.

Sign-up and login use server-side scrypt password hashes and an HTTP-only, signed session cookie. Receipt uploads are limited to 10 MB and verified as JPG, PNG, or PDF. The receipt API requires a valid session and scopes read/delete operations to the owning account. Receipt content is stored in PostgreSQL `BYTEA`; database backups and retention must be managed by the operator. Password reset and Google sign-in are not wired to an identity/email provider yet, and the current application is not a substitute for a production security assessment or operational rate limiting.
