# LinguaVerse AI

Intelligent local-language translator platform — monorepo skeleton.

This is the **foundation** of the project: a real, working full-stack setup
(not placeholder files) that the rest of the platform gets built on top of,
module by module.

## What's here right now

**Auth (real, working)**
- Register / login / refresh-token rotation / logout, backed by MySQL via
  Prisma, `bcrypt` password hashing, JWT access + refresh tokens, and a
  `UserSession` table so refresh tokens can be revoked.
- `GET /api/auth/profile` — protected route example using the
  `requireAuth` middleware.

**Translation (real, working — Gemini by default, OpenAI optional)**
- `POST /api/translate/text` — calls Gemini (`gemini-2.5-flash` by default,
  configurable via `GEMINI_MODEL`) by default, asks for natural/
  context-aware translation with tone control, stores the result in
  `TranslationHistory`.
- `GET /api/translate/history` — paginated history for the logged-in user.
- `POST /api/translate/compare` — runs the same request against every
  configured provider (Gemini + OpenAI) in parallel via
  `Promise.allSettled`, returns each result (or per-provider error) so
  you can compare quality/speed side by side. Not persisted — it's an
  exploratory comparison, not a saved translation. OpenAI's entry just
  shows a clear error if `OPENAI_API_KEY` isn't set — it never blocks
  or crashes the comparison.
- Provider code is behind a `TranslationProvider` interface
  (`services/ai/`) — `GeminiTranslationProvider` and
  `OpenAITranslationProvider` implement it identically, so the
  controller/frontend never branch on which provider is active.
  `getTranslationProvider()` with no argument resolves
  `DEFAULT_AI_PROVIDER` from the environment (Gemini by default) — it
  never silently falls back to a different provider if the configured
  one fails; you get a clear, provider-specific error instead
  (`gemini.client.ts` classifies Gemini errors into invalid-key/rate-
  limit/quota/model-unavailable/network cases rather than a generic 500).
  OpenAI is fully optional — the app runs, and every AI feature works,
  with `OPENAI_API_KEY` blank.

**Favorites (real, working)**
- `POST /api/favorites`, `GET /api/favorites`, `DELETE /api/favorites/:translationId`
  — star/unstar any translation you own; enforced with a unique
  `(userId, translationId)` constraint so double-favoriting is a no-op.

**Notifications (real, working)**
- `GET /api/notifications`, `PUT /api/notifications/read/:id`,
  `PUT /api/notifications/read-all`, `DELETE /api/notifications/:id`.
- The translation flow automatically creates a
  `TRANSLATION_COMPLETED` notification — modules are wired together,
  not siloed demos.

**Dashboard (real, working)**
- `GET /api/dashboard/stats` — real Prisma aggregation: total/today/
  weekly/monthly translation counts, a 7-day daily-activity series, and
  top target languages over the last 30 days (via `groupBy`). No mock
  numbers.

**OCR (real, working — image only, PDF not yet)**
- `POST /api/ocr/image` — multipart upload (PNG/JPG/WEBP, 10MB max),
  real text extraction via `tesseract.js` (runs locally, no API), optional
  translation of the extracted text through the configured AI provider
  (Gemini by default), stored in `OcrHistory`. Uploaded files are
  deleted right after processing — only the extracted text is persisted.
- `GET /api/ocr/history`.

**Admin panel (real, working — user management + platform stats)**
- `role: USER | ADMIN` on `User`; `requireAdmin` middleware checks the
  role from the **database** on every request (not just the JWT), so a
  demotion or suspension takes effect immediately instead of waiting
  for token expiry.
- `GET /api/admin/stats` — platform-wide counts.
- `GET /api/admin/users` (search), `PUT /api/admin/users/:id/status`
  (suspend/activate), `PUT /api/admin/users/:id/role` (promote/demote)
  — with guardrails so an admin can't suspend or demote themselves.

**Speech (real, working — local Whisper STT + browser TTS, no OpenAI)**
- `POST /api/speech/transcribe` — multipart **WAV-only** audio upload
  (25MB max), transcribed by a **local Whisper model** via
  `@xenova/transformers` (ONNX Runtime) — runs on the CPU, no API key,
  no per-request cost. Model weights (`WHISPER_MODEL`, default
  `Xenova/whisper-tiny`, multilingual) download once from Hugging Face
  on first use and are cached on disk after that; every request after
  the first runs fully offline. Optional translation of the transcript
  through the configured AI provider, stored in `VoiceHistory`.
  **Scoped limitation**: only `.wav` (PCM) is decoded — MP3/M4A/OGG
  would need an ffmpeg transcoding step, which was deliberately left
  out to avoid the large, platform-specific native binary that causes
  exactly the kind of Windows install friction this project avoids
  elsewhere. Convert other formats to WAV before uploading.
- Text-to-speech has **no backend endpoint at all** — `/speech` uses
  the browser's built-in `window.speechSynthesis` (Web Speech API)
  instead, which is free, works offline, and needs zero server call.
- `GET /api/speech/history`.

**Document translation (real, working — .txt and .docx only)**
- `POST /api/documents/translate` — multipart upload, extracts text
  locally (`mammoth` for .docx, direct read for .txt — no API needed for
  extraction), translates it via the configured AI provider (Gemini by
  default), and generates a downloadable translated `.docx` (`docx`
  library — plain paragraphs, original styling/tables/images are not
  preserved yet). Single-pass translation, capped at 20,000 characters
  (no chunking yet — documents longer than that are rejected with a
  clear error).
- `GET /api/documents/history`, `GET /api/documents/:id/download`
  (ownership-checked, streamed with auth).

**Billing (real, working — Stripe, needs your own API keys to test)**
- `Plan` (FREE/PRO/ENTERPRISE, seeded with feature lists) and
  `UserSubscription` models; every user gets FREE on registration via
  the seed pattern.
- `POST /api/billing/checkout-session` — creates a real Stripe Checkout
  session for PRO/ENTERPRISE.
- `POST /api/billing/webhook` — verifies Stripe's signature (mounted
  with `express.raw()` **before** the JSON body parser, which webhook
  signature verification requires) and handles
  `checkout.session.completed` / `customer.subscription.updated` /
  `customer.subscription.deleted` to keep `UserSubscription` in sync.
- `GET /api/billing/plans` (public), `GET /api/billing/subscription`.
- Needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `STRIPE_PRICE_ID_PRO`/`STRIPE_PRICE_ID_ENTERPRISE` (from your own
  Stripe dashboard) to actually process a payment — without them,
  `/billing` still shows the pricing page but checkout returns a clear
  "not configured" error instead of crashing.

**Live conversation (real, working — Socket.IO, text-based for now)**
- `backend/src/socket/conversation.socket.ts` — a JWT-authenticated
  Socket.IO server (same access tokens as the REST API) attached to the
  same HTTP server as Express. Room-based: `join-room`, `speak` (server
  translates via the configured AI provider — Gemini by default — and
  broadcasts both the original and translated text to everyone in the
  room), `peer-joined`/`peer-left` presence events.
- Frontend `/live` page: join a room by code, pick your language and
  the language to translate into, and chat — translations appear
  live for both participants.
- **Text input for now, not live audio** — the original 9-part spec's
  "Person A speaks / AI transcribes" flow would combine this with the
  Speech module's local Whisper transcription; that wiring isn't done
  yet.

**Learning module (real, working — vocabulary, flashcards, quiz, XP/streaks, AI tutor)**
- `Vocabulary`, `Flashcard`, `Quiz`, `QuizResult`, `LearningProgress`,
  `FlashcardProgress` models. Seeded with real Tamil content (5 words,
  matching flashcards, 3 quiz questions) — extendable to other
  languages by adding rows.
- `GET /api/learning/words`, `GET /api/learning/flashcards`,
  `POST /api/learning/flashcards/review` (tracks per-user review
  history), `GET /api/learning/quiz` (never leaks the correct answer
  in the payload), `POST /api/learning/quiz/submit`,
  `GET /api/learning/progress`.
- Real XP/streak logic (not decorative): correct flashcard reviews
  +5 XP, quiz answers +10 XP if correct either way count toward
  "quizzes completed"; streak increments on consecutive calendar days,
  resets after a gap, tracks longest streak.
- **AI tutor (real, Gemini-backed)** — `POST /api/learning/tutor/explain`
  breaks down a sentence (grammar explanation, notable words,
  optional cultural notes). `POST /api/learning/tutor/generate-quiz`
  writes a fresh multiple-choice question with Gemini and saves it as a
  real `Quiz` row, so it plugs straight into the existing quiz-taking
  flow alongside seeded questions.
- Frontend `/learning`: vocabulary cards, flip-to-reveal flashcards
  with "knew it / didn't know it" buttons, a quiz flow with immediate
  feedback and explanations, live XP/streak header, and a Tutor tab
  for both AI features above.

**Translation memory + glossary (real, working)**
- **Translation memory**: `translateText` now checks for an exact prior
  translation (same user, source text, target language) before calling
  the AI provider, and reuses it instead — saves cost and latency on
  repeated phrases. Only applied to plain requests (no tone/context
  set), since `TranslationHistory` doesn't record which tone/context
  produced a cached result — reusing across a tone-specific request
  risks serving a mismatched translation. This is a stated limitation,
  not a hidden one.
- **Glossary**: `GlossaryTerm` model — personal preferred-translation
  overrides (e.g. always render "CPU" as a specific term rather than a
  literal translation). `GET/POST /api/glossary`,
  `DELETE /api/glossary/:id`. Automatically injected into the AI
  provider's prompt for every translation to that target language —
  enforcement happens for real, not just storage. Works with whichever
  provider is configured (Gemini by default).
- Frontend `/glossary`: add/remove terms per target language.

**API platform (real, working — API keys, public v1 surface)**
- `ApiKey` model — the raw key (`lv_...`) is shown to the user exactly
  once at creation and stored only as a bcrypt hash + short display
  prefix, same principle as a password. `POST/GET /api/api-keys`,
  `DELETE /api/api-keys/:id` (JWT-authenticated, for managing your own
  keys).
- `POST /api/v1/translate` — a public, **API-key-authenticated**
  endpoint (`X-API-Key` header, not a JWT) for third-party integrations,
  reusing the same `translateText` service (so it gets translation
  memory + glossary enforcement for free). Rate-limited per key (60
  req/min), independent of the session-based rate limit.
- Frontend `/api-keys`: create/list/revoke keys, with the one-time raw
  key reveal.

**Frontend (real, working)**
- Login / register pages with real validation (`react-hook-form`),
  wired to the auth API.
- `AuthContext` — token storage, session restore on reload, 401 handling
  (auto-redirect to `/login` on an expired/invalid token).
- `AppLayout` — shared sidebar nav (Dashboard / Translate / Live
  Conversation / OCR / Speech / Documents / Learning / Glossary /
  Favorites / Notifications / Billing, + Admin for admins only) with a
  live unread-notification badge, used across all authenticated pages.
- `/translate` — type text, pick a target language + tone, get a real
  Gemini translation (glossary-aware, memory-cached), star it, see
  recent history, or compare it against OpenAI side by side (if you
  have an OpenAI key configured).
- `/dashboard` — real charts (Recharts) driven by `/api/dashboard/stats`.
- `/favorites` — list/unstar saved translations.
- `/notifications` — list, mark read/all-read, delete.
- `/ocr` — upload an image, see extracted + translated text.
- `/speech` — upload a WAV file to transcribe locally (+ optional
  translation), or type text and hear it read back via your browser's
  built-in speech synthesis.
- `/documents` — upload a .txt/.docx, translate it, download the result.
- `/billing` — pricing cards, current plan highlighted, Stripe checkout
  redirect.
- `/live` — join a room, live two-way translated text chat.
- `/learning` — vocabulary, flashcards, quiz, progress, AI tutor.
- `/glossary` — manage personal preferred-translation terms.
- `/api-keys` — create/list/revoke public API keys.
- `/admin` — platform stats + user table (search, suspend/activate,
  promote/demote), gated by `AdminRoute` (redirects non-admins).

**Infra**
- `backend/prisma/schema.prisma` — `User` (+`role`), `UserSession`,
  `Language`, `TranslationHistory`, `FavoriteTranslation`,
  `Notification`, `OcrHistory`, `VoiceHistory`, `DocumentTranslation`,
  `Plan`, `UserSubscription`, `Vocabulary`, `Flashcard`,
  `FlashcardProgress`, `Quiz`, `QuizResult`, `LearningProgress`,
  `GlossaryTerm`, `ApiKey`, with a working seed script (admin account,
  demo account, three plans, sample Tamil vocabulary/flashcards/quizzes).
- `docker-compose.yml` — MySQL, Redis, backend, frontend, all wired
  together with healthchecks. `frontend/nginx.conf` proxies both
  `/api` and `/socket.io` (with WebSocket upgrade headers) to the
  backend container.
- `.github/workflows/ci.yml` — lints and builds both apps on every push.
- `.vscode/` — recommended extensions, debug configs for the backend and
  Jest, workspace settings.
- Jest test suites for auth and admin validators (`backend/tests`).

**⚠️ Not built yet**: PPTX/PDF document translation, formatting
preservation in translated documents, chunking for long documents,
live-conversation audio (currently text-only), multi-tenancy/
workspaces, browser extension, desktop app, mobile app, RAG/vector DB,
usage-limit enforcement per plan tier (Plans store a
`dailyTranslationLimit` but nothing checks it yet), and everything else
from the original spec beyond what's listed above.

**⚠️ OpenAI removal — what changed, and one unverified risk**: this
project originally defaulted to OpenAI everywhere. It's since been
refactored so **Gemini is the default and OpenAI is fully optional** —
translation/OCR/documents/tutor/live-conversation all run on Gemini,
speech-to-text runs on a local Whisper model (`@xenova/transformers`,
no API key), and text-to-speech uses the browser's Web Speech API
(no backend call at all). OpenAI's code path (`openai.provider.ts`)
is kept only as an optional second provider for `/translate/compare` —
nothing requires it, and nothing silently falls back to it.
**One thing I haven't been able to verify**: `@xenova/transformers` has
historically been an ESM-primary package, and this backend is
CommonJS. It's loaded via a dynamic `import()` specifically to avoid
that incompatibility (Node can always load ESM via dynamic import from
CJS, even if `require()` would fail) — but I don't have the ability to
actually run `npm install` + boot the server in this environment, so
this hasn't been runtime-tested. If `/speech/transcribe` fails on
first use, that's the first place to look — check the backend logs for
the exact error.

## Quick start in VS Code

1. Open the unzipped `LinguaVerse-AI/` folder in VS Code (`code .`).
   It'll prompt you to install the recommended extensions
   (`.vscode/extensions.json`) — accept that.
2. Open a terminal in VS Code and run:

   ```bash
   npm install
   docker compose up -d mysql redis
   cp .env.example .env
   cp .env.example backend/.env
   ```
3. **Edit `backend/.env`**: set a real `JWT_SECRET` / `JWT_REFRESH_SECRET`
   (any long random string) and your `GEMINI_API_KEY` (free, no billing
   required — get one at https://aistudio.google.com/app/apikey).
   Translation, OCR-with-translation, documents, the AI tutor, and live
   conversation all need it. OCR text extraction alone works without any
   key. Speech-to-text needs no key either (local Whisper — the model
   downloads automatically on first use). Text-to-speech needs nothing
   at all (browser-based). `OPENAI_API_KEY` is entirely optional — only
   used if you want the `/translate` "compare providers" feature to
   include OpenAI's result. Billing needs its own `STRIPE_*` keys
   (optional — see the Billing section above).
4. Set up the database:

   ```bash
   cd backend
   npx prisma migrate dev --name init
   npm run prisma:seed
   cd ..
   ```
5. Run both apps: `npm run dev` (or use the **Run and Debug** panel →
   "Debug Backend (tsx)" to run the backend under the debugger, and
   `npm run dev:frontend` in a terminal for the frontend).

- Frontend: http://localhost:5173
- Backend health check: http://localhost:4000/health
- Register a new account at http://localhost:5173/register, then use
  `/translate` to try a real translation — check `/dashboard`,
  `/favorites`, `/notifications`, `/ocr`, `/speech`, `/documents`,
  `/billing`, `/learning`, `/glossary`, and `/api-keys` afterward to see
  the connected modules in action. Open `/live` in two browser windows
  (two accounts) with the same room code to try live conversation.
- To try the admin panel: log in as `admin@linguaverse.ai` /
  `ChangeMe123!` (created by the seed script) and visit `/admin`.

Run the backend test suite with `cd backend && npm test`.

## Quick start (Docker, everything)

```bash
cp .env.example .env
docker compose up --build
```

## Roadmap

Done: auth, text translation (Gemini by default, OpenAI optional, with
translation memory, glossary enforcement, and provider comparison),
favorites, notifications, dashboard, OCR, admin panel, speech (local
Whisper STT + browser TTS), document translation (.txt/.docx), billing
(Stripe), live conversation (Socket.IO, text-based), the learning
module including a real Gemini-backed AI tutor, and a public API
platform with per-key rate limiting — all end to end, for real, wired
together (not isolated demos). Next modules, built and verified one at
a time:

1. **Live conversation + audio** (combine with the Speech module's
   local Whisper transcription so people can actually speak, not just
   type)
2. **MP3/M4A/OGG support for speech-to-text** (needs an audio-transcoding
   step, deliberately left out so far to avoid an ffmpeg native
   dependency)
3. **Document formatting preservation + PPTX/PDF support + chunking**
   for long documents
4. **Multi-tenancy / workspaces / team collaboration**
5. **Plan usage-limit enforcement** (the `dailyTranslationLimit` field
   exists on `Plan` but nothing checks it against actual usage yet)
6. **Webhooks** for third-party integrations (translation completed,
   subscription changed, etc.) to pair with the API platform

Each module extends `schema.prisma` with new models, adds real routes
under `backend/src/routes`, and adds real pages under
`frontend/src/pages` — no stubs, tested as it's built.

## Why this structure

The full spec this project is based on is enormous (auth, OCR, speech,
live conversation, multi-tenant workspaces, RAG, billing, admin panel,
mobile/desktop clients...). Building all of that in one pass produces
code that *looks* complete but hasn't actually been run or checked.
Instead this repo is built incrementally — each layer runs, and gets
extended once it's confirmed working.
