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

Choose **Scan receipt** from the app menu to open an image picker on desktop or the device camera on mobile. The captured/selected image opens the transaction form and OCR runs automatically in the browser with English and Vietnamese language data. The scanner suggests a merchant, total, date, and category where it can; review the fields and select an account before saving. Choose **Save draft** to keep it out of totals, or **Confirm review** to post it as a transaction immediately. The transaction form also supports attaching JPG, PNG, or PDF receipts.

### PostgreSQL backend

The backend stores user-owned financial accounts, transactions, and receipt files in PostgreSQL. Each user can create multiple cash, e-wallet, and bank accounts, set an opening balance, and archive accounts without removing their transaction history. Transactions are scoped to the signed-in user and synchronized across devices. Older browser-only transactions can be imported after signing in; the app asks for confirmation because those records are not associated with a login, and demo rows are excluded.

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a PostgreSQL database connection string and set `AUTH_SECRET` to a cryptographically random secret with at least 32 characters.
3. Apply [`db/migrations/001_initial_schema.sql`](./db/migrations/001_initial_schema.sql), [`db/migrations/002_transactions.sql`](./db/migrations/002_transactions.sql), and [`db/migrations/003_financial_accounts.sql`](./db/migrations/003_financial_accounts.sql) to the database, in order. The last migration creates per-user accounts, preserves existing Cash/MoMo/Vietcombank transaction assignments, and initializes those legacy accounts with a zero opening balance that can be edited in Accounts.
4. Run `npm run dev` or build and start the application.

Sign-up and login use server-side scrypt password hashes and an HTTP-only, signed session cookie. Receipt uploads are limited to 10 MB and verified as JPG, PNG, or PDF. The receipt API requires a valid session and scopes read/delete operations to the owning account. Receipt content is stored in PostgreSQL `BYTEA`; database backups and retention must be managed by the operator. Password reset and Google sign-in are not wired to an identity/email provider yet, and the current application is not a substitute for a production security assessment or operational rate limiting.
