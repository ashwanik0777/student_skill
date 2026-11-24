# TestPrep — AI test series for boards & entrance exams

Daily AI-personalised tests for **Class 10–12** (CBSE, ICSE/ISC, UP Board, Bihar Board — Science, Commerce and Arts) and **JEE, NEET, CUET & NDA**, with a full-screen exam mode, instant explanations, insights, an AI tutor, a doubt forum, streaks, badges, leaderboards and offline support.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Partial Prerendering, Server Actions, `proxy.ts`) |
| UI | React 19, Tailwind CSS v4, lucide-react, Radix primitives; charts are server-rendered SVG/CSS (no chart library) |
| Fonts | Bricolage Grotesque (headings), Geist (UI), Geist Mono (numbers), Noto Sans Devanagari (Hindi) |
| Auth | Better Auth — email/password + optional Google, stored in your own database |
| Database | Neon Postgres + Drizzle ORM on node-postgres (`pg`) |
| AI | Vercel AI SDK 7 + OpenAI (questions, feedback, insights, study plans, tutor chat, forum answers) |
| Offline | PWA manifest, service worker, IndexedDB outbox |

## Getting started

```bash
npm install
# create a .env file with the variables listed below
npm run db:push           # create/update tables in Postgres
npm run dev               # http://localhost:3000
```

Production: `npm run build && npm start`. The service worker (offline mode) only registers in production builds.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon/Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Random 32+ byte secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | yes | Public URL of the app, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables "Continue with Google". Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `OPENAI_API_KEY` | no* | Without it (or without credits) the app falls back to the built-in question bank and rule-based feedback |
| `OPENAI_MODEL` | no | Defaults to `gpt-5.4-mini` |

## Courses, syllabus & question bank (managed in the admin panel)

Nothing about courses lives in code. Boards, streams, competitive exams, courses, subjects, chapter lists and the
fallback question bank are rows in the database, edited from **/admin → Content**:

| Page | What you manage |
| --- | --- |
| **Courses** | One course per board × class (× stream) or exam (× stream): name, cohort (who shares a leaderboard/forum), AI audience line, daily-test size and time, Sunday test mix, on/off. Add a course by copying an existing one. |
| **Boards, streams & exams** | The options students pick from at sign-up. |
| **Subjects & chapters** | Subjects (name, icon, colour) and *chapter lists* such as "NCERT Class 10 · Mathematics". A chapter list is shared by every course that teaches it; chapters can be added one by one or pasted (`Unit | Chapter`). |
| **Question bank** | Hand-checked MCQs per chapter list; add, edit, hide, delete or import a JSON array. Used whenever the AI is unavailable. |
| **Settings** | Course-change rules (fix-mistake days, promotion window, exam-switch cooldown), sign-ups on/off, a notice on the sign-in page. |

The starter catalog (4 boards, 5 streams, 4 exams, 52 courses, 18 subjects, 50 chapter lists / 624 chapters,
354 questions) is in `scripts/catalog-seed.json`; `npm run catalog:seed` loads whatever is missing without touching
edited rows. The app reads the catalog through one cached query (`src/lib/catalog/server.ts`, tag `catalog`) that
every admin edit invalidates, so changes are live immediately.

Students pick a course at sign-up and can change it only under the rules on the Settings page: fix mistakes for a few
days, move up one class per yearly window (never back), switch competitive exam after a cooldown. XP, streaks and
badges follow the student across courses.

## How it works

- **Daily tests** — one test per subject of the student's course per IST day (size and time set per course in the admin panel). Chapters are picked with a weighted sampler that favours weak and untested chapters; questions come from the AI (validated + options shuffled) and are topped up from the question bank when AI is unavailable.
- **Sunday super test** — a longer mixed test per track (PCMB for Class 10, stream mix for 11–12, 30-question mocks for JEE/NEET/NDA).
- **Exam mode** — strict tests open full-screen; hiding the tab submits via `sendBeacon`, leaving full screen starts a 10 s countdown, the timer is server-anchored and answers persist in `localStorage`. Answer keys never reach the browser before submission; grading happens on the server.
- **Gamification** — XP per correct answer + completion bonuses, levels, IST-day streaks and 20 badges (`src/lib/gamification.ts`).
- **AI circuit breaker** — on quota/auth errors the app stops calling the provider for 5 minutes and serves fallbacks instantly (`src/lib/ai/model.ts`). AI endpoints are rate-limited per user (`src/lib/rate-limit.ts`).

## Admin panel & staff roles

The admin area lives at `/admin` (students get a 404 there).

| Role | Can do |
| --- | --- |
| **Super admin** | Everything, including **Staff & roles**: add sub-admins, choose their permissions, reset their password, suspend them or remove their access. |
| **Sub-admin** | Any mix of the super admin's rights: analytics, students (view / manage), courses & syllabus, question bank, doubt-forum moderation, announcements, staff, settings, audit log. A sub-admin with *Manage staff* can only grant permissions they hold themselves. Changes apply on their next click. |

Create the first admin (or promote an existing account) from the server — admins are never created from the web UI:

```bash
npm run admin:create -- --email you@school.com --password "a-strong-password" --name "Your Name"
```

Sections: **Overview** (sign-ups, active students, tests, scores — cached and refreshed every minute), **Students** (search, filter, profile, recent tests, course history, account actions), **Doubt forum** moderation, **Announcements** (shown on student dashboards, per cohort, dismissible), **Staff & roles** and an append-only **Audit log** of every staff action. Suspended accounts are signed out immediately, can't sign in again and are hidden from leaderboards.

Permissions are defined in `src/lib/admin/permissions.ts`; every admin page and Server Action checks them on the server.

## Performance notes

- Every page streams: static shell first, per-user data behind `<Suspense>` (Partial Prerendering).
- Database: node-postgres sends each query in **one** network round trip (postgres.js with `prepare: false` needed two), the pool keeps connections warm for 5 minutes and is warmed up at boot (`src/instrumentation.ts`).
- The signed-in user's row is cached across requests (`"use cache"` + tag `user:<id>`); every action that changes it calls `updateTag`, so suspensions, revoked sessions and role changes still apply instantly. Better Auth's cookie cache (30 min) avoids session lookups.
- Shared data is cached per cohort and refreshed in the background: leaderboards, forum counts, announcements, admin overview.
- Submitting a test is 3 round trips: a parallel read, one atomic statement (complete attempt + answers + stats, safe against double submits) and one badge query.
- Heavy client code loads on demand (tutor Markdown/KaTeX); charts render on the server; the Devanagari and mono fonts aren't preloaded.
- The database is in **us-east-1**. For students in India, moving it to an Asia region (e.g. Singapore) cuts every round trip roughly 3–4×.

## Project structure

```
src/
  app/
    (marketing)/        landing page
    (auth)/             sign-in, sign-up
    (app)/              dashboard, tests, practice, results, insights, tutor, community, leaderboard, achievements, profile
    admin/              admin panel: overview, students, forum, announcements, courses, syllabus, question bank, staff, settings, audit
    test/[testId]/      full-screen exam
    offline/            offline centre (works without network)
    onboarding/         profile setup after sign-up
    api/                auth, chat (streaming), attempt submit, offline package + sync
  components/           UI kit, app shell, feature components
  lib/
    ai/                 model, question generation, reports
    db/                 Drizzle schema + client
    services/           tests, analytics, leaderboard, forum, chat, badges
    admin/              permissions, admin + catalog queries, audit log
    catalog/            DB-driven catalog: cached loader, shared helpers, rules, icons, client context
    actions/            server actions
    offline/            IndexedDB store + outbox
  proxy.ts              optimistic auth redirect
public/sw.js            service worker
```

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `db:push`, `db:studio`, `admin:create`, `catalog:seed`.
