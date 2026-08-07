# SalaryFlow — Build Plan

Premium salary-cycle PWA. Next.js 16 (App Router, Turbopack), React 19, TS, Tailwind v4,
Zustand (persisted), Framer Motion, Recharts, next-themes, RHF+Zod, Lucide.

## Architecture (feature-based)
- src/lib: types, utils, calculations (safe-to-spend), currency, seed data, store (zustand)
- src/components/ui: reusable primitives (Card, Button, Progress, Badge, Input, Modal, Skeleton)
- src/components: shared shell (Sidebar, TopBar, ThemeToggle, StatCard, EmptyState)
- src/features: dashboard, expenses, goals, bills, investments, analytics, settings
- src/app: landing (/), onboarding, (app)/dashboard|expenses|goals|bills|investments|analytics|settings
- API + Mongoose models available for persistence (Mongo cluster via env)

## Core feature
Safe To Spend = remaining balance / remaining days until salary. Color-coded green/yellow/red.

## Milestones
1. [x] Scaffold + deps
2. [ ] Design system (globals.css, tokens, dark mode)
3. [ ] Types + calculations + store + seed
4. [ ] UI primitives
5. [ ] App shell (sidebar/topbar/theme)
6. [ ] Onboarding flow
7. [ ] Dashboard
8. [ ] Expenses / Goals / Bills / Investments / Analytics / Settings
9. [ ] PWA (manifest + SW + icons)
10. [ ] Build + verify
