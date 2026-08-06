# AI R&A Submissions

AI-powered Review & Approval platform for Alyssa Nobriga International. Full product vision lives
in the original PRD; this repo currently implements the **MVP core loop**:

```
Submitter fills out form
        ↓
AI reviews (context, decision clarity, evidence, recommendation, organization, readability, Loom check)
        ↓
Needs Revision? → coaching feedback + suggested rewrite → submitter revises → AI reviews again
        ↓
Approved → ClickUp task auto-created, assigned to Mae, status "Submission"
```

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + Postgres (Vercel Postgres, Neon, Supabase — any standard Postgres connection string)
- Tailwind CSS
- Anthropic Claude for the AI review engine, behind a provider interface (`lib/ai/types.ts`) so
  OpenAI/Gemini can be added later without touching review logic
- ClickUp REST API v2 for task creation
- Vercel Blob for attachment storage (falls back to local disk in dev — see Attachments below)
- Brand styling (colors/fonts) sampled directly from alyssanobriga.com: navy (`#051C46`) Playfair
  Display headings, gold (`#B6A28C`) accents, teal (`#0ABAB5`) CTAs, Montserrat body/button text

## Setup (local dev)

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL (a Postgres connection string) and ANTHROPIC_API_KEY at minimum —
# ClickUp/Blob/Sheets vars can stay blank (dry-run / local-disk fallback)
npx prisma migrate dev --name init
npm run dev
```

Visit `http://localhost:3000`, click **New Submission**, fill out the form, submit. The AI review
runs synchronously and you'll land on the submission's status page showing scores and, if
rejected, specific feedback plus a revise-and-resubmit form.

Local dev needs *some* Postgres to point `DATABASE_URL` at (Vercel Postgres/Neon both have a free
tier and work fine for this) — SQLite was dropped once this became a real deployed app rather than
a local-only prototype.

### Dry-run mode

If `CLICKUP_API_TOKEN` or `CLICKUP_LIST_ID` are unset, approved submissions skip the ClickUp API
call and are marked approved with no task link — lets you exercise the whole loop before ClickUp
credentials and custom fields are provisioned.

### Attachments

The Attachment field is a real file upload, not a URL. `lib/upload.ts` uses Vercel Blob storage
whenever `BLOB_READ_WRITE_TOKEN` is set (auto-injected by Vercel once Blob storage is attached to
the project — nothing to configure by hand in production), and falls back to writing
`public/uploads/` on local disk otherwise, so local dev needs no Blob credentials at all. Set
`APP_BASE_URL` once deployed so ClickUp task descriptions link to a real, externally-reachable URL
instead of a relative path (Blob URLs are already absolute, so this only matters for local-disk
uploads).

## Deploying to Vercel

1. **Import the repo**: on [vercel.com](https://vercel.com), New Project → import
   `ANI-Alyssa/ai-ra-submissions` from GitHub. Framework preset (Next.js) is auto-detected.
2. **Add Postgres**: in the new project, go to Storage → Create Database → Postgres (or connect
   an existing Neon/Supabase database). Vercel sets `DATABASE_URL` automatically for you when using
   its own Postgres; otherwise paste your connection string into the project's Environment
   Variables settings.
3. **Add Blob storage**: Storage → Create → Blob. This auto-injects `BLOB_READ_WRITE_TOKEN` — no
   copy-pasting needed.
4. **Set the remaining env vars** (Project Settings → Environment Variables) — everything in
   `.env.example` except `DATABASE_URL`/`BLOB_READ_WRITE_TOKEN` (handled by the steps above):
   `APP_PASSWORD`, `APP_PASSWORD_SECRET`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_APPROVAL_THRESHOLD`,
   `APP_BASE_URL` (your Vercel deployment URL, e.g. `https://ai-ra-submissions.vercel.app`),
   `CLICKUP_API_TOKEN`, `CLICKUP_LIST_ID`, `CLICKUP_MAE_ASSIGNEE_ID`, `CLICKUP_CUSTOM_FIELD_MAP`,
   `CLICKUP_DEPARTMENT_FIELD_ID`, `CLICKUP_DEPARTMENT_OPTIONS`, and (if using the Google Sheets
   sync) `GOOGLE_SHEETS_WEBHOOK_URL` / `GOOGLE_SHEETS_SHARED_SECRET`.
5. **Run the first migration against the new database**: once `DATABASE_URL` is set, run
   `npx prisma migrate deploy` locally with that same `DATABASE_URL` in your environment (or via
   `vercel env pull` to grab it), to create the tables before the first real deploy hits them.
6. **Deploy**. The `postinstall` script (`prisma generate`) runs automatically on every Vercel
   build — no extra build configuration needed.

## What's implemented (MVP)

- Shared-password gate (`middleware.ts` + `/login`) — interim access control until real RBAC (§20)
  lands; one team password, no per-user accounts
- Submission form with all required/optional fields from the PRD (§7)
- AI review engine scoring Context, Decision Clarity, Evidence, Recommendation, Organization,
  Readability, plus Risk, Confidence, and Estimated Review Time (§8–10)
- Loom intelligence — AI decides whether a Loom should exist for this request and hard-blocks
  approval if one should exist but is missing (§8)
- Actionable rejection feedback: reasons, missing information, recommendations, suggested
  rewrite in Alyssa's preferred format, review tips (§11–12)
- Full revision history stored per submission (`SubmissionVersion` + `AIReview` per version)
- Auto ClickUp task creation on approval into the real "Mae Submissions" list, assigned to Mae,
  status `submissions`, with Context/Decision Needed/Assets to Review/Loom Link/ANI Department/
  Submitted By all populated as real ClickUp custom fields (not just description text) — "Submitted
  By" resolves the typed name to a real ClickUp account via a name→user-ID lookup and a dedicated
  API call, since "users"-type fields can't be set through the generic custom fields array (§13)
- Optional sync of approved submissions into Alyssa's existing "Tasks + Approvals" Google Sheet,
  via an Apps Script webhook (non-fatal — a Sheets hiccup never blocks an approval)

## Not yet implemented (see PRD for full spec)

These are separate phases, not stubs left half-built — building them means new routes/pages on
top of the existing schema, not a rewrite:

- **Mae Dashboard** (§14) — review queue, approve/return/override, forward to Alyssa
- **Alyssa Dashboard** (§15) — simplified final-approval view
- **AI Learning System** (§16) — aggregating override/revision data into model feedback
- **Weekly Intelligence Report** (§17) & **Submitter Scorecards** (§18) & **Org Dashboard** (§19)
- **Admin Panel** (§20) — configurable Mae-stage toggle, threshold, departments, prompt
  versioning, all currently controlled via `.env` and `lib/ai/prompt.ts`
- **Role-based access control** — the shared password gates the whole app but doesn't distinguish
  submitters from Mae/Alyssa; anyone who's logged in can still view any submission by ID. Real
  per-user roles are needed before this goes further than internal team use
- **AI Knowledge Base** (§21) — the review prompt is static today; learning from historical
  approvals is a future phase

## Project structure

```
app/
  submit/                     submission form (client component)
  submissions/[id]/           status + feedback + revise form
  api/submissions/            POST create, GET one, POST revise
lib/
  ai/                         provider-agnostic AI review engine
    types.ts                  AIProvider interface, input/output types
    prompt.ts                 system prompt encoding Alyssa's review profile + rubric
    anthropicProvider.ts      Claude implementation (tool-forced structured output)
    reviewEngine.ts           provider factory (AI_PROVIDER env var)
  clickup/client.ts           ClickUp task creation, dry-run fallback
  googleSheets/client.ts      "Tasks + Approvals" sheet sync via Apps Script webhook, non-fatal
  submissionService.ts        create/revise orchestration: DB + AI + ClickUp + Sheets
  upload.ts                   Vercel Blob storage, local-disk fallback for dev
  uploadClient.ts             browser-side helper that posts to /api/uploads
  validation.ts                zod schemas for form input
prisma/schema.prisma          Submission, SubmissionVersion, AIReview models
google-apps-script/Code.gs    paste into the Sheet's Apps Script editor, deploy as Web App
```
