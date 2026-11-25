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

Choose **Scan receipt** from the app menu to open an image picker on desktop or the device camera on mobile. The scanner first sends the receipt to the local PaddleOCR + PhoBERT service for OCR and category suggestions, then extracts merchant, total, and date. If that service is unavailable, the browser falls back to Tesseract.js and displays a notice. The app suggests fields where it can; review them and select an account before saving. Choose **Save draft** to keep it out of totals, or **Confirm review** to post it as a transaction immediately. The transaction form also supports attaching JPG, PNG, or PDF receipts.

The **Analytics** page summarizes confirmed income and expenses for the last six months, current-month spending by category, and spending against your saved monthly budgets. Receipt drafts are excluded.

### PostgreSQL backend

The backend stores user-owned financial accounts, transactions, and receipt files in PostgreSQL. Each user can create multiple cash, e-wallet, and bank accounts, set an opening balance, and archive accounts without removing their transaction history. Transactions are scoped to the signed-in user and synchronized across devices. Older browser-only transactions can be imported after signing in; the app asks for confirmation because those records are not associated with a login, and demo rows are excluded.

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a PostgreSQL database connection string and set `AUTH_SECRET` to a cryptographically random secret with at least 32 characters.
3. Apply [`db/migrations/001_initial_schema.sql`](./db/migrations/001_initial_schema.sql), [`db/migrations/002_transactions.sql`](./db/migrations/002_transactions.sql), [`db/migrations/003_financial_accounts.sql`](./db/migrations/003_financial_accounts.sql), [`db/migrations/004_budgets_goals.sql`](./db/migrations/004_budgets_goals.sql), [`db/migrations/005_remove_default_budgets.sql`](./db/migrations/005_remove_default_budgets.sql), [`db/migrations/006_password_reset_tokens.sql`](./db/migrations/006_password_reset_tokens.sql), and [`db/migrations/007_google_and_email_change.sql`](./db/migrations/007_google_and_email_change.sql) to the database, in order.
4. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` for account emails. Verify the sender domain with Resend; use an HTTPS `APP_URL` in production.
5. To enable Google sign-in, create a Google OAuth web client, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and add `${APP_URL}/api/auth/google/callback` as an authorized redirect URI.
6. To enable the LLM Advisor, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (defaults to `gpt-4o-mini`). Without a key, the Advisor uses the offline rule-based answers.
7. For PaddleOCR + PhoBERT receipt scanning, install Python 3.11, then in PowerShell run `py -3.11 -m venv receipt_ai_service\.venv`, `.\receipt_ai_service\.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu`, and `.\receipt_ai_service\.venv\Scripts\python.exe -m pip install -r receipt_ai_service\requirements.txt`. Start the service with `.\receipt_ai_service\.venv\Scripts\python.exe -m uvicorn app:app --app-dir receipt_ai_service --host 127.0.0.1 --port 8000`. Set `RECEIPT_AI_URL` if the service is not reachable at `http://127.0.0.1:8000`.
8. Run `npm run dev` or build and start the application.

The receipt model service runs locally and is not exposed outside the machine by default. Its first scan downloads PaddleOCR and PhoBERT model weights from their model registries; later scans use the local cache. If `RECEIPT_AI_URL` points to another host, that service receives the uploaded receipt. OCR/category similarity scores are experimental rather than calibrated probabilities, so always review suggestions. The provided receipt datasets contain OCR annotations but no expense-category labels; evaluate category accuracy on a labeled dataset before relying on automatic classifications.

Password sign-up and login use server-side scrypt hashes and an HTTP-only, signed session cookie. Google sign-in uses OAuth authorization code flow with PKCE and validated ID tokens; existing password accounts are not automatically linked by matching email, and can connect Google from Settings after signing in. Google-only accounts can set a password from Settings. The LLM Advisor uses read-only backend tools for exact financial calculations; when enabled, chat messages and requested summaries (such as category, budget, or goal progress) are sent to OpenAI, never raw transaction notes or receipt files. The receipt AI service processes receipt images locally; model weights are downloaded from model registries, but receipt content and OCR text are not sent to those registries or OpenAI. Password reset and email change use single-use, hashed tokens that expire after 60 minutes; password reset requests return the same response whether or not an account exists, and password or email changes invalidate existing sessions. Receipt uploads are limited to 10 MB and verified as JPG, PNG, or PDF. The receipt API requires a valid session and scopes read/delete operations to the owning account. Receipt content is stored in PostgreSQL `BYTEA`; database backups and retention must be managed by the operator. The current application is not a substitute for a production security assessment or operational rate limiting.

Settings supports changing the display name, password, sign-in email, and linked Google account. Email changes require confirming the new address; password-based accounts also verify the current password before sending the confirmation link.
