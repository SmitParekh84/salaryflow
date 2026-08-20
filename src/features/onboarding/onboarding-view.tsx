"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Input, Label, Select } from "@/components/ui/input";
import { useAuthReady } from "@/components/auth-provider";
import { useHydrated } from "@/hooks/use-hydrated";
import { BUDGET_RULE_TEMPLATES, recommendBudgetRule } from "@/lib/budget-rules";
import { COUNTRIES, COUNTRY_CURRENCIES, CURRENCIES } from "@/lib/constants";
import { suggestEmergencyFund } from "@/lib/emergency-fund";
import { parseAmount } from "@/lib/number-input";
import { useFinanceStore } from "@/lib/store";
import type { BankAccountType, SalaryCycle, SalaryProfile } from "@/lib/types";
import { currencySymbol, formatMoney } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type OnboardingStep = {
  title: string;
  subtitle: string;
  /** Whether Continue is enabled. An optional step is always valid. */
  valid: boolean;
  /** Optional steps show "Skip for now" and write nothing when skipped. */
  optional?: boolean;
  content: React.ReactNode;
};

/** Sentinel for "I do not want a budget rule", distinct from any template key. */
const NO_BUDGET_RULE = "none";

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
  const addAccount = useFinanceStore((s) => s.addAccount);
  const addBudgetRule = useFinanceStore((s) => s.addBudgetRule);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  /**
   * The name given at sign-up. Registration stores it, `/api/auth/me` returns
   * it and AuthProvider writes it here — so asking "what should we call you?"
   * again was asking for something the app was already holding.
   */
  const accountName = useFinanceStore((s) => s.user.name);

  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [name, setName] = useState(accountName);

  // The session resolves after mount, so the name usually arrives a beat late.
  // Adjusting during render is React's supported way to follow a changed
  // source; an effect would render the empty question first and then blank it.
  const [syncedName, setSyncedName] = useState(accountName);
  if (accountName !== syncedName) {
    setSyncedName(accountName);
    if (accountName) setName(accountName);
  }

  /**
   * Whether the name is known is only answerable once the session has
   * resolved. Rendering before then asks "what should we call you?" and then
   * snatches the question away a moment later, which is worse than a brief
   * wait on a screen that is behind a login anyway.
   */
  const authReady = useAuthReady();
  const knowsName = accountName.trim().length > 0;
  const greeting = accountName.trim().split(/\s+/)[0];
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

  /**
   * The first bank account. Optional, but it is what makes the rest of the app
   * move money: a bill or expense with no account behind it records the
   * spending and leaves every balance untouched.
   */
  const [account, setAccount] = useState({
    bankName: "",
    accountType: "Savings" as BankAccountType,
    balance: "",
  });
  const accountEntered = account.bankName.trim().length > 0;

  const [ruleKey, setRuleKey] = useState<string | null>(null);
  const recommendation = recommendBudgetRule({
    emergencyFundGoal: enteredMoney.emergencyFundGoal ?? 0,
    investmentAmount: enteredMoney.investmentAmount ?? 0,
  });
  /**
   * Until the user touches the step this tracks their answers, so the
   * suggestion stays current as they fill the earlier steps in.
   *
   * A shown-as-selected template is genuinely selected: finishing applies it.
   * Drawing a highlight around a choice and then not applying it unless it is
   * tapped again is the kind of detail that makes people distrust a form.
   * Declining is its own explicit option below.
   */
  const selectedRuleKey = ruleKey ?? recommendation.key;

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

  // Built from the salary entered a step earlier. Nothing else is known yet at
  // onboarding — there are no expenses to fall back on.
  const emergencySuggestion = suggestEmergencyFund({
    monthlySalary: enteredMoney.amount ?? 0,
  });

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

  const nameStep: OnboardingStep = {
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
  };

  const steps: OnboardingStep[] = [
    ...(knowsName ? [] : [nameStep]),
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
      title: "Where your money sits",
      subtitle: "Add the account you are paid into. You can add the rest later.",
      valid: true,
      optional: true,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="onboarding-bank">Bank name</Label>
            <Input
              id="onboarding-bank"
              placeholder="Bank of Baroda"
              value={account.bankName}
              onChange={(event) => setAccount({ ...account, bankName: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="onboarding-account-type">Account type</Label>
              <Select
                id="onboarding-account-type"
                value={account.accountType}
                onChange={(event) =>
                  setAccount({ ...account, accountType: event.target.value as BankAccountType })
                }
              >
                {(["Savings", "Salary", "Current", "Other"] as BankAccountType[]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="onboarding-balance">Current balance</Label>
              <AmountInput
                id="onboarding-balance"
                prefix={currencySymbol(profile.currency)}
                placeholder="0"
                value={account.balance}
                onChange={(balance) => setAccount({ ...account, balance })}
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            Bills and expenses are paid from an account, and that is what moves the balance. Skip
            this and they will be recorded as spending without changing any balance until you add
            one.
          </p>
        </div>
      ),
    },
    {
      title: "Goals & investing",
      subtitle: "We'll set these aside before calculating safe-to-spend.",
      valid: true,
      optional: true,
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
            {emergencySuggestion && (
              <p className="mt-1.5 text-xs text-muted">
                {emergencySuggestion.months} months of your salary is{" "}
                {formatMoney(emergencySuggestion.amount, profile.currency)}.{" "}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-xs"
                  onClick={() =>
                    setMoney({
                      ...money,
                      emergencyFundGoal: String(emergencySuggestion.amount),
                    })
                  }
                >
                  Use this
                </Button>
              </p>
            )}
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
            {/* Three controls abreast leaves each one about a hundred pixels
                wide on a phone, which is not enough to read "Title (e.g.,
                Rent)" or an amount with its currency symbol. Below `sm` the
                title takes its own line and only the amount shares one with the
                button. */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Title (e.g., Rent)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="sm:flex-1"
              />
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <AmountInput
                    placeholder="Amount"
                    aria-label="Amount"
                    prefix={currencySymbol(profile.currency)}
                    value={customAmount}
                    onChange={setCustomAmount}
                  />
                </div>
                <Button onClick={addCustom} className="whitespace-nowrap">
                  Add
                </Button>
              </div>
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
      title: "How you want to split your income",
      subtitle: "A starting rule. Change it any time in Settings.",
      valid: true,
      optional: true,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted">{recommendation.reason}</p>
          <div className="space-y-2">
            {BUDGET_RULE_TEMPLATES.map((template) => {
              const selected = template.key === selectedRuleKey;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setRuleKey(template.key)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-primary/40 bg-primary/10"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{template.name}</span>
                    {template.key === recommendation.key && (
                      <span className="shrink-0 text-[11px] text-primary">Suggested</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{template.description}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setRuleKey(NO_BUDGET_RULE)}
              aria-pressed={selectedRuleKey === NO_BUDGET_RULE}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selectedRuleKey === NO_BUDGET_RULE
                  ? "border-primary/40 bg-primary/10"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              <span className="text-sm font-medium">No rule for now</span>
              <span className="mt-0.5 block text-xs text-muted">
                Your savings goal is used on its own. You can pick a rule later in Settings.
              </span>
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const persistAndFinish = async () => {
    /*
     * Guard against a second press. Finishing writes a profile, an account, a
     * budget rule and a bill per custom item, and none of those writes is keyed
     * on anything that would collapse a duplicate — so a double tap, which a
     * phone makes easy while the sync at the end is still running, left the
     * account with two banks, two active rules and every bill twice.
     */
    if (finishing) return;
    setFinishing(true);
    const finalProfile: SalaryProfile = {
      ...profile,
      amount: enteredMoney.amount ?? 0,
      salaryDay: enteredMoney.salaryDay ?? 1,
      savingsGoal: enteredMoney.savingsGoal ?? 0,
      emergencyFundGoal: enteredMoney.emergencyFundGoal ?? 0,
      investmentAmount: enteredMoney.investmentAmount ?? 0,
    };
    completeOnboarding({ name }, finalProfile);

    /**
     * The account is created before the bills so they can point at it. A bill
     * with no account records spending and moves no balance, which is the
     * silent failure the bills screen now warns about — better not to create it
     * that way in the first place.
     *
     * It is the user's only account, so it becomes the default for everything:
     * that is what makes "Paid from" pre-fill correctly everywhere else.
     */
    let firstAccountId: string | undefined;
    if (accountEntered) {
      firstAccountId = addAccount({
        bankName: account.bankName.trim(),
        accountType: account.accountType,
        balance: parseAmount(account.balance) ?? 0,
        status: "active",
        defaultFor: ["everyday", "subscriptions", "investments"],
      });
    }

    // Declining leaves them with no rule, which is a state the app handles:
    // the savings goal then stands on its own.
    const template = BUDGET_RULE_TEMPLATES.find((item) => item.key === selectedRuleKey);
    if (template) {
      addBudgetRule({
        name: template.name,
        templateKey: template.key,
        active: true,
        allocations: template.allocations,
      });
    }

    for (const c of customItems) {
      addBill({
        name: c.title,
        amount: c.amount,
        dueDay: finalProfile.salaryDay,
        frequency: "monthly",
        category: "Other",
        paid: false,
        accountId: firstAccountId,
      });
    }
    try {
      await syncWithServer?.();
    } catch {
      // Everything above is already in the local store, and the next successful
      // sync carries it up. Blocking the finish on a failed request would trap
      // someone on this screen with their setup already saved.
    }
    router.replace("/dashboard");
  };

  return (
    /*
     * `dvh` rather than `vh`: the salary step is tall, and on a phone `100vh`
     * measures the viewport as if the browser's own bars were not there, so the
     * card was centred against a height taller than the screen and its footer
     * sat under the address bar. Top-aligned below `sm` for the same reason —
     * centring a card taller than the screen clips its head, and it is the head
     * that says which step you are on.
     */
    <div className="flex min-h-dvh items-start justify-center px-4 py-8 sm:items-center sm:py-4">
      <div className="w-full max-w-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-base font-bold">Aartha</span>
        </div>

        {knowsName && (
          <p className="mb-4 text-sm text-muted">
            Welcome, {greeting}. Just {steps.length} short {steps.length === 1 ? "step" : "steps"}.
          </p>
        )}

        {!authReady && (
          <Card className="p-6">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
            <div className="mt-3 h-4 w-56 animate-pulse rounded bg-surface-2" />
            <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-surface-2" />
          </Card>
        )}

        {/* The bar is the only thing that says how much is left, so it carries
            the count for a screen reader rather than being seven blank divs. */}
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${steps.length}`}
          className={authReady ? "mb-6 flex gap-1.5" : "hidden"}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        {authReady && (
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
                <Button className="flex-1" onClick={persistAndFinish} disabled={finishing}>
                  {finishing ? "Saving your setup…" : "Finish setup"}
                  {!finishing && <ArrowRight className="h-4 w-4" />}
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

            {/* An optional step says so plainly. Calling every step required and
              then accepting empty answers is how a form teaches people to type
              a placeholder value just to get past it. */}
            {current.optional && step < steps.length - 1 && (
              <div className="mt-3 text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Skip for now
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
