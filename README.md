# 🏸 Badminton Video Analysis

A coaching app: a coach uploads a match clip, the system analyzes movement and
technique, and returns each player's **weaknesses** with a plain-English report.

## Why this architecture (and why raw Gemini failed)

Feeding raw video into a multimodal LLM ("what's this player's weakness?") fails
because LLMs can't do precise spatial/temporal reasoning — they can't reliably
track *where* players are or *how* they move. So we use a **two-stage pipeline**:

1. **Computer vision** turns the video into structured numbers (positions,
   movement, court coverage, shot events).
2. **An LLM (Claude)** reasons over those numbers to write the coaching report.

We **compose pre-trained models** (pose/tracking) instead of training one from
scratch — far faster, more reliable, and the right approach for a one-day start.

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   WEB APP       │     │    SUPABASE      │     │  PYTHON WORKER     │
│   (Next.js)     │────▶│  Auth · Postgres │◀───▶│  (your GPU box)    │
│  upload · view  │◀────│  Storage · RLS   │     │  CV + Claude       │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

## Repo layout

| Folder      | What it is                                                    |
|-------------|---------------------------------------------------------------|
| `web/`      | **Next.js web app (primary)**: coach auth, upload, view report |
| `worker/`   | Python worker: watches Supabase, analyzes, writes results      |
| `supabase/` | `schema.sql` — tables, RLS, storage bucket, realtime           |
| `mobile/`   | Expo (React Native) app — kept for a later native version      |

## Status

**Phase 1 (built): full end-to-end skeleton.** Coach signs in → uploads a clip →
worker produces metrics (currently placeholder) → **Claude writes a real report**
→ app shows it live. Everything is wired and demoable.

**Phase 2 (next): real computer vision** replaces the placeholder metrics with
YOLOv8-pose tracking + court coverage. See [worker/README.md](worker/README.md).

---

## Setup (≈15 min)

### 1. Create the Supabase backend
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   (This creates the tables, RLS policies, the private `videos` storage bucket, and realtime.)
3. For fast testing: **Authentication → Providers → Email** → turn **off**
   "Confirm email" (so sign-up logs you straight in).
4. **Project Settings → API** — copy the **Project URL**, the **anon/publishable key**,
   and the **service_role key** (keep this last one secret).

### 2. Web app
```bash
cd web
copy .env.local.example .env.local   # macOS/Linux: cp
# put your Project URL + anon key into web/.env.local
npm run dev
```
Open **http://localhost:3000**, sign up as a coach, and upload a clip.

> Deploy it later: push to GitHub → import into [Vercel](https://vercel.com) →
> set the **Root Directory** to `web`, add the two `NEXT_PUBLIC_*` env vars →
> Deploy. You get a public URL your client can open in any browser.

### 3. Worker (on the GPU machine)
```bash
cd worker
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # put Project URL + service_role key + Anthropic key
python analyze.py
```

Now upload a clip in the app — watch it flip `uploaded → processing → done` and
the report appear. 🎉

## Security notes
- The **anon key** is safe in the app (public by design, protected by RLS).
- The **service_role key** and **Anthropic key** live ONLY in `worker/.env`,
  never in the app. Both `.env` files are git-ignored.
