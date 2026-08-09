"use client";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Wallet,
    title: "Safe-to-Spend, daily",
    desc: "Know exactly how much you can spend today without breaking your budget.",
  },
  {
    icon: TrendingUp,
    title: "Salary-cycle native",
    desc: "Weekly, biweekly or monthly — your money is tracked around payday.",
  },
  {
    icon: Target,
    title: "Goals that finish",
    desc: "Set savings goals and see the exact month you'll reach them.",
  },
  {
    icon: BarChart3,
    title: "Beautiful analytics",
    desc: "Understand your spending with clean, interactive charts.",
  },
  {
    icon: BellRing,
    title: "Smart reminders",
    desc: "Bill due dates, overspending alerts and salary countdowns.",
  },
  {
    icon: ShieldCheck,
    title: "Private & offline",
    desc: "Installable PWA that works offline. Your data stays with you.",
  },
];

export function LandingHero() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand size="lg" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Open app
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-16 pb-24 text-center sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Your money, perfectly paced to payday
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Always know how much you can{" "}
            <span className="bg-clip-text text-transparent [background-image:var(--brand-gradient)]">
              safely spend today
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted sm:text-lg"
          >
            SalaryFlow divides what&apos;s left by the days until your next salary,
            so every day you get one clear number. Zero finance knowledge required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/onboarding">
              <Button size="lg" className="w-full sm:w-auto">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                View live demo
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="floaty mx-auto mt-16 max-w-md"
          >
            <div className="glass rounded-3xl border p-6 text-left card-shadow">
              <p className="text-xs font-medium text-muted">Safe to spend today</p>
              <p className="mt-1 text-5xl font-bold tracking-tight text-success">
                ₹1,240
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full w-2/3 rounded-full [background-image:var(--success-gradient)]" />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span>12 days to salary</span>
                <span className="font-semibold text-foreground">₹14,880 left</span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        SalaryFlow — built with Next.js 16. Installable everywhere.
      </footer>
    </div>
  );
}
