# SalaryFlow 💸

A premium, salary-cycle-driven money app that answers one question every day:
**how much can I safely spend today?**

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**,
**Tailwind CSS v4**, **Zustand**, **Framer Motion**, **Recharts** and a
**MongoDB / Mongoose** backend. Installable as a **PWA** on Android, iOS, Windows
and macOS with offline support.

---

## ✨ Core idea — Safe To Spend

```
Safe to spend per day = (Income − Expenses − Investments − Planned savings) ÷ Days until next salary
Safe to spend today    = Safe to spend per day − Already spent today
```

The number is colour-coded **green / yellow / red** and recalculates instantly
whenever you add an expense.

---

## 🗂 Project structure (feature-based)

```
src/
├─ app/                     # Next.js App Router
│  ├─ (app)/                # Authenticated shell (sidebar + topbar)
│  │  ├─ dashboard/         # Safe-to-spend, stats, charts, insights
│  │  ├─ expenses/          # Expense list, search, filters, CRUD
│  │  ├─ bills/             # Recurring bills + due tracking
│  │  ├─ goals/             # Savings goals + ETA projection
│  │  ├─ investments/       # Portfolio + returns
│  │  ├─ analytics/         # Income vs expense, trends, category breakdown
│  │  └─ settings/          # Profile, currency, theme, export, reset
│  ├─ onboarding/           # Multi-step setup wizard
│  ├─ offline/              # PWA offline fallback page
│  ├─ api/                  # REST endpoints (health, expenses)
│  ├─ layout.tsx            # Root layout, theme, PWA registration
│  └─ page.tsx              # Landing page
├─ components/              # Shared shell + UI primitives (components/ui)
├─ features/                # Feature views (dashboard, expenses, …)
├─ hooks/                   # useSummary, useHydrated
├─ lib/                     # types, utils, constants, calculations, store, seed, export
└─ server/                  # Mongoose connection + models
public/
├─ manifest.webmanifest     # PWA manifest + shortcuts
├─ sw.js                    # Service worker (offline + push)
└─ icons/icon.svg           # App icon
```

---

## 🚀 Getting started

```bash
npm install
cp .env.example .env.local   # fill in database, auth, and SMTP settings
npm run dev                  # http://localhost:3000 (Turbopack)
```

Other scripts:

```bash
npm run build    # production build (Turbopack)
npm run start    # run production server
npm run lint     # ESLint
```

> The app is fully usable **without a database** — data persists to
> `localStorage` via Zustand. The MongoDB layer (`src/server`, `src/app/api`)
> is provided for cloud sync and multi-device use.

Click **“Load demo data”** on the dashboard, or **“Skip and explore with demo
data”** during onboarding, to populate a realistic dataset.

---

## 🔌 API

| Method | Route                    | Description                       |
| ------ | ------------------------ | --------------------------------- |
| GET    | `/api/health`            | DB connectivity check             |
| GET    | `/api/expenses?userId=…` | List a user's expenses            |
| POST   | `/api/expenses`          | Create an expense (Zod-validated) |

Environment variables (`.env.local`):

```
MONGODB_URI=...      # MongoDB connection string (db: salaryflow)
AUTH_SECRET=...      # At least 32 random characters
SMTP_HOST=...        # SMTP server used for account emails
SMTP_PORT=587        # Usually 587, or 465 with SMTP_SECURE=true
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="SalaryFlow <no-reply@your-domain.com>"
```

Registration and password-reset codes require SMTP. The API returns a clear
`503` response when mail is not configured or the provider rejects delivery;
it never reports a successful send when no message was accepted.

---

## 📱 PWA

- Web App Manifest with app shortcuts (Add expense, Dashboard, Goals)
- Service worker: network-first navigation, cache-first assets, offline page
- Push notification handler
- Installable on Android, iOS/iPadOS, Windows and macOS

The service worker registers only in production (`npm run build && npm run start`).

---

## 🎨 UI

- Apple/Linear-inspired design system with light + dark themes (`next-themes`)
- Glassmorphism, soft shadows, rounded 2xl cards
- Framer Motion micro-interactions, shimmer skeletons, empty states
- Recharts analytics (area, bar, donut)
- Fully responsive with a mobile bottom-nav and desktop sidebar

---

## 🐳 Docker

```bash
docker build -t salaryflow .
docker run -p 3000:3000 --env-file .env.local salaryflow
```

---

## 🚢 Deployment

- **Vercel** (recommended): import the repo, add env vars, deploy.
- **Docker**: build the image above and run on any container host.
- Set `MONGODB_URI` and `AUTH_SECRET` in your host's environment.

---

## ✅ Production checklist

- [x] Type-safe (strict TS, `tsc --noEmit` clean)
- [x] Lint clean (`eslint`)
- [x] Production build passes (all routes)
- [x] Input validation with Zod (forms + API)
- [x] Responsive + accessible (aria labels, keyboard escape, focus rings)
- [x] Offline-capable PWA
- [ ] Wire Auth.js providers (Google + credentials) to protected routes
- [ ] Swap localStorage persistence for API sync per authenticated user
