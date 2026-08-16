"use client";

import { CATEGORY_ICON_OPTIONS, CategoryGlyph, CategoryIcon } from "@/components/category-icon";
import { NavModeToggle } from "@/components/sidebar";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { AboutYouForm } from "@/features/chat/about-you-form";
import { ChangePasswordForm } from "@/features/settings/change-password-form";
import { useSummary } from "@/hooks/use-summary";
import { CATEGORIES, COUNTRIES, COUNTRY_CURRENCIES, CURRENCIES } from "@/lib/constants";
import { download, exportExpensesCsv } from "@/lib/export";
import { toInputValue } from "@/lib/number-input";
import { salaryProfileSchema } from "@/lib/schemas";
import {
  availableFinancialYears,
  currentFinancialYearStart,
  financialYearLabel,
} from "@/lib/financial-year";
import { useFinanceStore } from "@/lib/store";
import { PICKER_DEFAULT_COLOR } from "@/lib/theme";
import type { CategoryIconName } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { cn, currencySymbol, formatMoney, uid } from "@/lib/utils";
import {
  ChevronRight,
  Download,
  Eye,
  FileJson,
  Landmark,
  ListChecks,
  LogOut,
  MonitorCog,
  Moon,
  PiggyBank,
  Shapes,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export type SettingsSection =
  | "profile"
  | "money"
  | "accounts"
  | "categories"
  | "planning"
  | "system";

const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: "profile", label: "Profile", description: "Your personal details", icon: UserRound },
  {
    id: "money",
    label: "Money setup",
    description: "Salary, country and currency",
    icon: SlidersHorizontal,
  },
  {
    id: "accounts",
    label: "Financial accounts",
    description: "Banks, cards and visibility",
    icon: WalletCards,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Organize expenses your way",
    icon: Shapes,
  },
  {
    id: "planning",
    label: "Goals & rules",
    description: "Targets and budget strategy",
    icon: Target,
  },
  { id: "system", label: "System", description: "Appearance, data and access", icon: MonitorCog },
];

function draftFromProfile(profile: {
  amount?: number;
  salaryDay?: number;
  savingsGoal?: number;
  emergencyFundGoal?: number;
}) {
  return {
    amount: toInputValue(profile.amount, 0),
    salaryDay: toInputValue(profile.salaryDay, 0),
    savingsGoal: toInputValue(profile.savingsGoal, 0),
    emergencyFundGoal: toInputValue(profile.emergencyFundGoal, 0),
  };
}

export function SettingsView({ initialSection = "profile" }: { initialSection?: SettingsSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useFinanceStore((s) => s.user);
  const profile = useFinanceStore((s) => s.profile);
  const activeBudgetRule = useFinanceStore((s) => s.budgetRules.find((rule) => rule.active));
  const goals = useFinanceStore((s) => s.goals);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const bills = useFinanceStore((s) => s.bills);
  const salaryHistory = useFinanceStore((s) => s.salaryHistory);
  const accounts = useFinanceStore((s) => s.accounts);
  const creditCards = useFinanceStore((s) => s.creditCards);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const updateUser = useFinanceStore((s) => s.updateUser);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const store = useFinanceStore;
  const summary = useSummary();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  const requestedSection = searchParams.get("section");
  const hasRequestedSection = SETTINGS_SECTIONS.some((item) => item.id === requestedSection);
  const section = hasRequestedSection ? (requestedSection as SettingsSection) : initialSection;
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState<CategoryIconName>("package");
  const [categoryColor, setCategoryColor] = useState<string>(PICKER_DEFAULT_COLOR);
  const [categoryError, setCategoryError] = useState("");

  /**
   * Salary fields are drafted locally rather than written straight to the store.
   * They used to call `updateProfile` on every keystroke, so typing "85000"
   * briefly set the salary to 8, then 85 — recomputing safe-to-spend against
   * nonsense on each character, and persisting whatever was half-typed.
   */
  const [draft, setDraft] = useState(() => draftFromProfile(profile));
  const [preferenceErrors, setPreferenceErrors] = useState<Partial<Record<string, string>>>({});

  /**
   * Re-seed when the profile changes elsewhere — a server sync — but not while
   * typing, which no longer touches the store. Adjusting state during render is
   * React's supported pattern for this; an effect would cascade a second render.
   */
  const profileStamp = `${profile.amount}|${profile.salaryDay}|${profile.savingsGoal}|${profile.emergencyFundGoal}`;
  const [seededFrom, setSeededFrom] = useState(profileStamp);
  if (seededFrom !== profileStamp) {
    setSeededFrom(profileStamp);
    setDraft(draftFromProfile(profile));
  }

  const currentFinancialYear = currentFinancialYearStart();
  const selectedFinancialYear = profile.financialYearStart ?? currentFinancialYear;
  const financialYears = availableFinancialYears([
    ...expenses.map((item) => item.date),
    ...incomes.map((item) => item.date),
    ...bills.map((item) => item.dueDate),
    ...salaryHistory.map((item) => item.date),
  ]);

  const selectSection = (nextSection: SettingsSection) => {
    router.replace(`/settings?section=${nextSection}`, { scroll: false });
  };

  const saveProfile = async () => {
    updateUser({ name, email });
    await syncWithServer();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const savePreferences = async () => {
    const parsed = salaryProfileSchema.safeParse({
      amount: draft.amount,
      salaryDay: draft.salaryDay,
      savingsGoal: draft.savingsGoal,
      emergencyFundGoal: draft.emergencyFundGoal,
      cycle: profile.cycle,
      currency: profile.currency,
      country: profile.country,
    });

    if (!parsed.success) {
      setPreferenceErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }

    setPreferenceErrors({});
    updateProfile({
      amount: parsed.data.amount,
      salaryDay: parsed.data.salaryDay,
      emergencyFundGoal: parsed.data.emergencyFundGoal,
      // A live budget rule owns the savings target; the field is read-only then.
      ...(activeBudgetRule ? {} : { savingsGoal: parsed.data.savingsGoal }),
    });

    await syncWithServer();
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 1600);
  };

  const addCategory = async () => {
    const name = categoryName.trim();
    const allNames = [
      ...CATEGORIES,
      ...(profile.customCategories ?? []).map((category) => category.name),
    ];
    if (!name) return;
    if (allNames.some((category) => category.toLowerCase() === name.toLowerCase())) {
      setCategoryError("A category with this name already exists.");
      return;
    }

    updateProfile({
      customCategories: [
        ...(profile.customCategories ?? []),
        { id: uid("category"), name, icon: categoryIcon, color: categoryColor },
      ],
    });
    setCategoryName("");
    setCategoryError("");
    await syncWithServer();
  };

  const deleteCategory = async (id: string) => {
    updateProfile({
      customCategories: (profile.customCategories ?? []).filter((category) => category.id !== id),
    });
    await syncWithServer();
  };

  const exportJson = () => {
    const state = store.getState();
    const data = {
      user: state.user,
      profile: state.profile,
      expenses: state.expenses,
      incomes: state.incomes,
      bills: state.bills,
      goals: state.goals,
      investments: state.investments,
    };
    download("aartha-backup.json", JSON.stringify(data, null, 2), "application/json");
  };

  const exportCsv = () => {
    download("aartha-expenses.csv", exportExpensesCsv(expenses), "text/csv");
  };

  const hiddenAccounts = accounts.filter((account) => account.hiddenFromAccounts);
  const visibleAccounts = accounts.filter((account) => !account.hiddenFromAccounts);
  const includedBalanceAccounts = visibleAccounts.filter((account) => !account.maskBalance);
  const visibleBalance = includedBalanceAccounts.reduce(
    (total, account) => total + account.balance,
    0,
  );
  const ruleSavingsTarget = activeBudgetRule ? summary.savingsTarget : undefined;
  const savingsPercentage = activeBudgetRule?.allocations.find(
    (allocation) => allocation.kind === "savings",
  )?.percentage;

  const restoreAccount = async (id: string) => {
    updateAccount(id, { hiddenFromAccounts: false });
    await syncWithServer();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className={cn("lg:sticky lg:top-24", hasRequestedSection && "hidden lg:block")}>
        <div className="mb-4 px-1 lg:mb-3">
          <h2 className="text-lg font-semibold lg:text-sm">Settings and activity</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Personalize how Aartha works for you.
          </p>
        </div>
        <nav
          aria-label="Mobile settings sections"
          className="divide-y divide-border border-y border-border lg:hidden"
        >
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className="flex min-h-16 w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
            );
          })}
        </nav>
        <nav aria-label="Settings sections" className="hidden flex-col gap-1 lg:flex">
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = item.icon;
            const selected = section === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => selectSection(item.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "h-auto shrink-0 justify-start gap-3 px-3 py-2.5 text-left lg:w-full",
                  selected ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="hidden text-[11px] text-muted lg:block">{item.description}</span>
                </span>
              </Button>
            );
          })}
        </nav>
      </aside>

      <div className={cn("min-w-0", !hasRequestedSection && "hidden lg:block")}>
        <Card className="min-w-0 rounded-none bg-transparent shadow-none lg:rounded-2xl lg:bg-surface">
          {section === "profile" && (
            <SettingsPane
              title="User profile"
              description="Keep the name and email associated with your Aartha account up to date."
            >
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={!name.trim() || !email.trim()}>
                  {saved ? "Saved" : "Save changes"}
                </Button>
              </form>

              <div className="border-t border-border pt-5">
                <AboutYouForm />
              </div>
            </SettingsPane>
          )}

          {section === "money" && (
            <SettingsPane
              title="Money setup"
              description="Set the salary cycle and regional formats used throughout the app."
            >
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void savePreferences();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor="salary-amount">Salary amount</Label>
                    <AmountInput
                      id="salary-amount"
                      prefix={currencySymbol(profile.currency)}
                      value={draft.amount}
                      invalid={Boolean(preferenceErrors.amount)}
                      onChange={(amount) => setDraft({ ...draft, amount })}
                    />
                    {preferenceErrors.amount && (
                      <p className="mt-1 text-xs text-danger">{preferenceErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="salary-day">Salary day</Label>
                    <AmountInput
                      id="salary-day"
                      decimals={0}
                      value={draft.salaryDay}
                      invalid={Boolean(preferenceErrors.salaryDay)}
                      onChange={(salaryDay) => setDraft({ ...draft, salaryDay })}
                    />
                    {preferenceErrors.salaryDay && (
                      <p className="mt-1 text-xs text-danger">{preferenceErrors.salaryDay}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="profile-country">Country</Label>
                    <Select
                      id="profile-country"
                      value={profile.country}
                      onChange={(event) => {
                        const country = event.target.value;
                        updateProfile({
                          country,
                          currency: COUNTRY_CURRENCIES[country] ?? profile.currency,
                        });
                      }}
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="profile-currency">Currency</Label>
                    <Select
                      id="profile-currency"
                      value={profile.currency}
                      onChange={(e) => updateProfile({ currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="max-w-sm">
                  <Label htmlFor="financial-year">Financial year</Label>
                  <Select
                    id="financial-year"
                    value={selectedFinancialYear}
                    onChange={(event) =>
                      updateProfile({ financialYearStart: Number(event.target.value) })
                    }
                  >
                    {financialYears.map((year) => (
                      <option key={year} value={year}>
                        {financialYearLabel(year)}
                        {year === currentFinancialYear ? " · Current" : ""}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-xs text-muted">
                    India financial years run from April 1 to March 31. Historical screens use this
                    selection.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="savings-goal">
                      {activeBudgetRule
                        ? "Monthly savings target (current cycle)"
                        : "Monthly savings goal"}
                    </Label>
                    <AmountInput
                      id="savings-goal"
                      prefix={currencySymbol(profile.currency)}
                      value={
                        ruleSavingsTarget === undefined
                          ? draft.savingsGoal
                          : String(Math.round(ruleSavingsTarget))
                      }
                      readOnly={Boolean(activeBudgetRule)}
                      invalid={Boolean(preferenceErrors.savingsGoal)}
                      onChange={(savingsGoal) => setDraft({ ...draft, savingsGoal })}
                    />
                    {preferenceErrors.savingsGoal && (
                      <p className="mt-1 text-xs text-danger">{preferenceErrors.savingsGoal}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {activeBudgetRule
                        ? `${activeBudgetRule.name} sets ${savingsPercentage ?? 0}% of this cycle's confirmed ${formatMoney(summary.salaryIncome, profile.currency)} salary. Other income does not increase this target.`
                        : "Used when no budget rule is active."}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="emergency-target">Emergency fund target</Label>
                    <AmountInput
                      id="emergency-target"
                      prefix={currencySymbol(profile.currency)}
                      value={draft.emergencyFundGoal}
                      invalid={Boolean(preferenceErrors.emergencyFundGoal)}
                      onChange={(emergencyFundGoal) => setDraft({ ...draft, emergencyFundGoal })}
                    />
                    {preferenceErrors.emergencyFundGoal && (
                      <p className="mt-1 text-xs text-danger">
                        {preferenceErrors.emergencyFundGoal}
                      </p>
                    )}
                  </div>
                </div>
                <Button type="submit" size="sm">
                  {preferencesSaved ? "Saved" : "Save preferences"}
                </Button>
              </form>
            </SettingsPane>
          )}

          {section === "accounts" && (
            <SettingsPane
              title="Financial accounts"
              description="Accounts stay in the main navigation because balances and transfers are everyday tasks. Visibility controls live here."
            >
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                <AccountStat
                  label="Included balance"
                  value={formatMoney(visibleBalance, profile.currency)}
                />
                <AccountStat
                  label="Balances included"
                  value={String(includedBalanceAccounts.length)}
                />
                <AccountStat label="Credit cards" value={String(creditCards.length)} />
              </div>

              <SettingsLink
                href="/accounts"
                icon={Landmark}
                title="Manage financial accounts"
                description="Update balances, cards, transfers and account roles."
              />

              {hiddenAccounts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Hidden bank accounts</h3>
                  <div className="mt-2 divide-y divide-border border-y border-border">
                    {hiddenAccounts.map((account) => (
                      <div key={account.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{account.bankName}</p>
                          <p className="text-xs text-muted">Excluded from account totals</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void restoreAccount(account.id)}
                        >
                          <Eye className="h-4 w-4" /> Unhide
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SettingsPane>
          )}

          {section === "categories" && (
            <SettingsPane
              title="Expense categories"
              description="Create categories that match how you spend. Default categories remain available everywhere."
            >
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addCategory();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="category-name">Category name</Label>
                    <Input
                      id="category-name"
                      value={categoryName}
                      onChange={(event) => {
                        setCategoryName(event.target.value);
                        setCategoryError("");
                      }}
                      placeholder="e.g. Domains"
                    />
                    {categoryError && <p className="mt-1 text-xs text-danger">{categoryError}</p>}
                  </div>
                  <div>
                    <Label htmlFor="category-color">Color</Label>
                    <Input
                      id="category-color"
                      type="color"
                      value={categoryColor}
                      onChange={(event) => setCategoryColor(event.target.value)}
                      className="p-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Icon</Label>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {CATEGORY_ICON_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={categoryIcon === option.value ? "primary" : "secondary"}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => setCategoryIcon(option.value)}
                        className="h-11 px-0"
                      >
                        <CategoryGlyph icon={option.value} />
                      </Button>
                    ))}
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={!categoryName.trim()}>
                  Add category
                </Button>
              </form>

              <div>
                <h3 className="text-sm font-semibold">Your categories</h3>
                {(profile.customCategories ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No custom categories yet.</p>
                ) : (
                  <div className="mt-2 divide-y divide-border border-y border-border">
                    {(profile.customCategories ?? []).map((category) => (
                      <div key={category.id} className="flex items-center gap-3 py-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{
                            color: category.color,
                            backgroundColor: `color-mix(in srgb, ${category.color} 15%, transparent)`,
                          }}
                        >
                          <CategoryGlyph icon={category.icon} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {category.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => void deleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">Default categories</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <span
                      key={category}
                      className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs"
                    >
                      <CategoryIcon category={category} />
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </SettingsPane>
          )}

          {section === "planning" && (
            <SettingsPane
              title="Goals & budget rules"
              description="Manage what you are saving toward and how each salary cycle should be allocated."
            >
              <div className="divide-y divide-border border-y border-border">
                <SettingsLink
                  href="/goals"
                  icon={PiggyBank}
                  title="Savings goals"
                  description={`${goals.length} active ${goals.length === 1 ? "goal" : "goals"}. Track targets and contributions.`}
                />
                <SettingsLink
                  href="/rules"
                  icon={ListChecks}
                  title="Budget rules"
                  description={
                    activeBudgetRule
                      ? `${activeBudgetRule.name} is active across Salary Plan and safe-to-spend.`
                      : "Choose how salary is split between needs, wants, savings and investments."
                  }
                />
              </div>
            </SettingsPane>
          )}

          {section === "system" && (
            <SettingsPane
              title="System"
              description="Control appearance, exports, deleted records and account access."
            >
              <div>
                <h3 className="text-sm font-semibold">Appearance</h3>
                <p className="mt-1 text-xs text-muted">Choose a theme or follow this device.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant={theme === "light" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    System
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-5 lg:hidden">
                <h3 className="text-sm font-semibold">Mobile navigation</h3>
                <p className="mt-1 text-xs text-muted">Choose how you navigate on your phone.</p>
                <div className="mt-3">
                  <NavModeToggle />
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Data & export</h3>
                <p className="mt-1 text-xs text-muted">
                  Download a portable copy of your financial records.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={exportCsv}>
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportJson}>
                    <FileJson className="h-4 w-4" /> Backup JSON
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-border border-y border-border">
                <SettingsLink
                  href="/recycle-bin"
                  icon={Trash2}
                  title="Recycle bin"
                  description="Restore deleted records or remove them permanently."
                />
              </div>

              <div className="space-y-5 border-t border-border pt-5">
                <ChangePasswordForm />

                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Account access</h3>
                    <p className="mt-1 text-xs text-muted">Sign out of Aartha on this device.</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void logout()}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            </SettingsPane>
          )}
        </Card>
      </div>
    </div>
  );
}

function SettingsPane({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <header className="border-b border-border py-4 lg:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </header>
      <div className="space-y-5 py-5 lg:p-6">{children}</div>
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors group-hover:text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
