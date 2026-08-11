"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Input, Label, Select } from "@/components/ui/input";
import { useHydrated } from "@/hooks/use-hydrated";
import { COUNTRIES, COUNTRY_CURRENCIES, CURRENCIES } from "@/lib/constants";
import { parseAmount } from "@/lib/number-input";
import { useFinanceStore } from "@/lib/store";
import type { SalaryCycle, SalaryProfile } from "@/lib/types";
import { currencySymbol } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CYCLES: { value: SalaryCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export function OnboardingView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useFinanceStore((s) => s.user.onboarded);
  const completeOnboarding = useFinanceStore((s) => s.completeOnboarding);
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

  /**
   * Money is drafted as strings so a cleared field stays blank rather than
   * collapsing to 0, which the numeric profile shape cannot represent.
   */
  const [money, setMoney] = useState({
    amount: "",
    salaryDay: "1",
    savingsGoal: "",
    emergencyFundGoal: "",
    investmentAmount: "",
  });
  const enteredMoney = {
    amount: parseAmount(money.amount),
    salaryDay: parseAmount(money.salaryDay),
    savingsGoal: parseAmount(money.savingsGoal),
    emergencyFundGoal: parseAmount(money.emergencyFundGoal),
    investmentAmount: parseAmount(money.investmentAmount),
  };

  // custom other items (title + amount) user can add in step 3
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customItems, setCustomItems] = useState<{ id: string; title: string; amount: number }[]>(
    [],
  );

  useEffect(() => {
    if (hydrated && onboarded) router.replace("/dashboard");
  }, [hydrated, onboarded, router]);

  const patch = (p: Partial<SalaryProfile>) => setProfile((prev) => ({ ...prev, ...p }));

  function addCustom() {
    const amount = parseAmount(customAmount);
    if (!customTitle.trim() || amount === null || amount <= 0) return;
    setCustomItems((s) => [{ id: String(Date.now()), title: customTitle.trim(), amount }, ...s]);
    setCustomTitle("");
    setCustomAmount("");
  }

  function removeCustom(id: string) {
    setCustomItems((s) => s.filter((c) => c.id !== id));
  }

  const steps = [
    {
      title: "Welcome to Aartha",
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
      valid:
      (enteredMoney.amount ?? 0) > 0 &&
      (enteredMoney.salaryDay ?? 0) >= 1 &&
      (enteredMoney.salaryDay ?? 0) <= 31,
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
            <Label htmlFor="onboarding-salary">Salary amount</Label>
            <AmountInput
              id="onboarding-salary"
              prefix={currencySymbol(profile.currency)}
              placeholder="85000"
              value={money.amount}
              onChange={(amount) => setMoney({ ...money, amount })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="onboarding-salary-day">Salary day of month</Label>
              <AmountInput
                id="onboarding-salary-day"
                decimals={0}
                value={money.salaryDay}
                onChange={(salaryDay) => setMoney({ ...money, salaryDay })}
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
            <Label htmlFor="onboarding-savingsGoal">Monthly savings goal</Label>
            <AmountInput
              id="onboarding-savingsGoal"
              prefix={currencySymbol(profile.currency)}
              placeholder="15000"
              value={money.savingsGoal}
              onChange={(savingsGoal) => setMoney({ ...money, savingsGoal })}
            />
          </div>
          <div>
            <Label htmlFor="onboarding-emergencyFundGoal">Emergency fund target</Label>
            <AmountInput
              id="onboarding-emergencyFundGoal"
              prefix={currencySymbol(profile.currency)}
              placeholder="300000"
              value={money.emergencyFundGoal}
              onChange={(emergencyFundGoal) => setMoney({ ...money, emergencyFundGoal })}
            />
          </div>
          <div>
            <Label htmlFor="onboarding-investmentAmount">Monthly investment amount</Label>
            <AmountInput
              id="onboarding-investmentAmount"
              prefix={currencySymbol(profile.currency)}
              placeholder="10000"
              value={money.investmentAmount}
              onChange={(investmentAmount) => setMoney({ ...money, investmentAmount })}
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
              <AmountInput
                placeholder="Amount"
                aria-label="Amount"
                prefix={currencySymbol(profile.currency)}
                value={customAmount}
                onChange={setCustomAmount}
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
  ];

  const current = steps[step];
  const persistAndFinish = async () => {
    const finalProfile: SalaryProfile = {
      ...profile,
      amount: enteredMoney.amount ?? 0,
      salaryDay: enteredMoney.salaryDay ?? 1,
      savingsGoal: enteredMoney.savingsGoal ?? 0,
      emergencyFundGoal: enteredMoney.emergencyFundGoal ?? 0,
      investmentAmount: enteredMoney.investmentAmount ?? 0,
    };
    completeOnboarding({ name }, finalProfile);
    for (const c of customItems) {
      addBill({
        name: c.title,
        amount: c.amount,
        dueDay: finalProfile.salaryDay,
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-base font-bold">Aartha</span>
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

        <Card className="p-6">
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
              <Button className="flex-1" onClick={persistAndFinish}>
                Finish setup <ArrowRight className="h-4 w-4" />
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
        </Card>
      </div>
    </div>
  );
}
