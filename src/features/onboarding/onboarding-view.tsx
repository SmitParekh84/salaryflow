"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { COUNTRIES, COUNTRY_CURRENCIES, CURRENCIES } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { SalaryCycle, SalaryProfile } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoginStep from "./login-step";

const CYCLES: { value: SalaryCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export function OnboardingView() {
  const router = useRouter();
  const completeOnboarding = useFinanceStore((s) => s.completeOnboarding);
  const loadSeed = useFinanceStore((s) => s.loadSeed);
  const addBill = useFinanceStore((s) => s.addBill);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<SalaryProfile>({
    amount: 0,
    salaryDay: 1,
    cycle: "monthly",
    currency: "INR",
    country: "India",
    savingsGoal: 0,
    emergencyFundGoal: 0,
    investmentAmount: 0,
  });

  // custom other items (title + amount) user can add in step 3
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const [customItems, setCustomItems] = useState<{ id: string; title: string; amount: number }[]>(
    [],
  );

  const patch = (p: Partial<SalaryProfile>) => setProfile((prev) => ({ ...prev, ...p }));

  function addCustom() {
    if (!customTitle.trim() || !customAmount || Number(customAmount) <= 0) return;
    setCustomItems((s) => [
      { id: String(Date.now()), title: customTitle.trim(), amount: Number(customAmount) },
      ...s,
    ]);
    setCustomTitle("");
    setCustomAmount("");
  }

  function removeCustom(id: string) {
    setCustomItems((s) => s.filter((c) => c.id !== id));
  }

  const finishAuthenticatedOnboarding = async (account: { email: string; name?: string }) => {
    completeOnboarding({ name: account.name || name, email: account.email }, profile);
    for (const c of customItems) {
      addBill({
        name: c.title,
        amount: c.amount,
        dueDay: profile.salaryDay,
        frequency: "monthly",
        category: "Other",
        paid: false,
      });
    }
    await syncWithServer?.();
    router.replace("/dashboard");
  };

  const steps = [
    {
      title: "Welcome to SalaryFlow",
      subtitle: "Let's set up your salary cycle in under a minute.",
      valid: name.trim().length > 0,
      content: (
        <div className="space-y-4">
          <div>
            <Label>What should we call you?</Label>
            <Input
              autoFocus
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Your salary",
      subtitle: "How much and when do you get paid?",
      valid: profile.amount > 0 && profile.salaryDay >= 1,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Currency</Label>
              <Select
                value={profile.currency}
                onChange={(e) => patch({ currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Country</Label>
              <Select
                value={profile.country}
                onChange={(event) => {
                  const country = event.target.value;
                  patch({ country, currency: COUNTRY_CURRENCIES[country] ?? profile.currency });
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Salary amount</Label>
            <Input
              type="number"
              placeholder="85000"
              value={profile.amount || ""}
              onChange={(e) => patch({ amount: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Salary day of month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={profile.salaryDay}
                onChange={(e) =>
                  patch({ salaryDay: Math.max(1, Math.min(31, Number(e.target.value))) })
                }
              />
            </div>
            <div>
              <Label>Cycle</Label>
              <Select
                value={profile.cycle}
                onChange={(e) => patch({ cycle: e.target.value as SalaryCycle })}
              >
                {CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Goals & investing",
      subtitle: "We'll set these aside before calculating safe-to-spend.",
      valid: true,
      content: (
        <div className="space-y-4">
          <div>
            <Label>Monthly savings goal</Label>
            <Input
              type="number"
              placeholder="15000"
              value={profile.savingsGoal || ""}
              onChange={(e) => patch({ savingsGoal: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Emergency fund target</Label>
            <Input
              type="number"
              placeholder="300000"
              value={profile.emergencyFundGoal || ""}
              onChange={(e) => patch({ emergencyFundGoal: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Monthly investment amount</Label>
            <Input
              type="number"
              placeholder="10000"
              value={profile.investmentAmount || ""}
              onChange={(e) => patch({ investmentAmount: Number(e.target.value) })}
            />
          </div>

          {/* Custom other items section */}
          <div className="mt-2">
            <Label>Other monthly items</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Title (e.g., Rent)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
              <Input
                placeholder="Amount"
                type="number"
                value={customAmount || ""}
                onChange={(e) => setCustomAmount(e.target.value ? Number(e.target.value) : "")}
              />
              <Button onClick={addCustom} className="whitespace-nowrap">
                Add
              </Button>
            </div>
            {customItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {customItems.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-surface-2 p-2 rounded"
                  >
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-sm text-muted">
                        {profile.currency} {c.amount}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCustom(c.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Save your progress",
      subtitle: "Use your email to sign in or create an account here.",
      valid: true,
      content: <LoginStep name={name} onAuthenticated={finishAuthenticatedOnboarding} />,
    },
  ];

  const current = steps[step];
  const persistAndFinish = async () => {
    completeOnboarding({ name }, profile);
    for (const c of customItems) {
      addBill({
        name: c.title,
        amount: c.amount,
        dueDay: profile.salaryDay,
        frequency: "monthly",
        category: "Other",
        paid: false,
      });
    }
    try {
      await syncWithServer?.();
    } catch {}
    router.replace("/dashboard");
  };

  const startDemo = () => {
    loadSeed();
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-base font-bold">SalaryFlow</span>
        </div>

        <div className="mb-6 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 card-shadow">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-bold">{current.title}</h2>
              <p className="mt-1 text-sm text-muted">{current.subtitle}</p>
              <div className="mt-6">{current.content}</div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setStep((s) => s - 1)}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {step === steps.length - 1 ? (
              <Button className="flex-1" variant="secondary" onClick={persistAndFinish}>
                Finish on this device
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={!current.valid}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <button
          onClick={startDemo}
          className="mx-auto mt-5 block text-xs text-muted hover:text-foreground"
        >
          Skip and explore with demo data →
        </button>
      </div>
    </div>
  );
}
