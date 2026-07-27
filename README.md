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
- Prisma + SQLite for local dev (swap `DATABASE_URL` to a Postgres connection string for production —
  no schema changes needed, just change the `datasource` provider in `prisma/schema.prisma`)
- Tailwind CSS
- Anthropic Claude for the AI review engine, behind a provider interface (`lib/ai/types.ts`) so
  OpenAI/Gemini can be added later without touching review logic
- ClickUp REST API v2 for task creation
- Brand styling (colors/fonts) sampled directly from alyssanobriga.com: navy (`#051C46`) Playfair
  Display headings, gold (`#B6A28C`) accents, teal (`#0ABAB5`) CTAs, Montserrat body/button text

## Setup

```bash
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY at minimum — ClickUp vars can stay blank (dry-run mode)
npx prisma migrate dev --name init
npm run dev
```

Visit `http://localhost:3000`, click **New Submission**, fill out the form, submit. The AI review
runs synchronously and you'll land on the submission's status page showing scores and, if
rejected, specific feedback plus a revise-and-resubmit form.

### Dry-run mode

If `CLICKUP_API_TOKEN` or `CLICKUP_LIST_ID` are unset, approved submissions skip the ClickUp API
call and are marked approved with no task link — lets you exercise the whole loop before ClickUp
credentials and custom fields are provisioned.

### Attachments

The Attachment field is a real file upload, not a URL — files are saved to `public/uploads/`
(`lib/upload.ts`) and served back at `/uploads/<file>`. This is local disk storage, fine for
single-machine dev/testing; once this app is actually deployed, swap `saveUploadedFile()` for real
object storage (S3/Supabase/etc.) so uploads survive redeploys and are reachable from outside
localhost — nothing else in the upload flow needs to change. Set `APP_BASE_URL` once deployed so
ClickUp task descriptions link to a real, externally-reachable URL instead of a relative path.

## What's implemented (MVP)

- Submission form with all required/optional fields from the PRD (§7)
- AI review engine scoring Context, Decision Clarity, Evidence, Recommendation, Organization,
  Readability, plus Risk, Confidence, and Estimated Review Time (§8–10)
- Loom intelligence — AI decides whether a Loom should exist for this request and hard-blocks
  approval if one should exist but is missing (§8)
- Actionable rejection feedback: reasons, missing information, recommendations, suggested
  rewrite in Alyssa's preferred format, review tips (§11–12)
- Full revision history stored per submission (`SubmissionVersion` + `AIReview` per version)
- Auto ClickUp task creation on approval, assigned to Mae, status "Submission", with AI summary/
  score/confidence in the task description (§13)

## Not yet implemented (see PRD for full spec)

These are separate phases, not stubs left half-built — building them means new routes/pages on
top of the existing schema, not a rewrite:

- **Mae Dashboard** (§14) — review queue, approve/return/override, forward to Alyssa
- **Alyssa Dashboard** (§15) — simplified final-approval view
- **AI Learning System** (§16) — aggregating override/revision data into model feedback
- **Weekly Intelligence Report** (§17) & **Submitter Scorecards** (§18) & **Org Dashboard** (§19)
- **Admin Panel** (§20) — configurable Mae-stage toggle, threshold, departments, prompt
  versioning, all currently controlled via `.env` and `lib/ai/prompt.ts`
- **Role-based access control** — there is currently no auth; anyone with the URL can submit or
  view a submission by ID. Needed before this goes further than local/internal testing
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
  submissionService.ts        create/revise orchestration: DB + AI + ClickUp
  upload.ts                   local file storage for attachments
  uploadClient.ts             browser-side helper that posts to /api/uploads
  validation.ts                zod schemas for form input
prisma/schema.prisma          Submission, SubmissionVersion, AIReview models
```
