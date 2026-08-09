"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useSummary } from "@/hooks/use-summary";
import { COUNTRIES, COUNTRY_CURRENCIES, CURRENCIES } from "@/lib/constants";
import { download, exportExpensesCsv } from "@/lib/export";
import { useFinanceStore } from "@/lib/store";
import { useAuth } from "@/lib/useAuth";
import { cn, formatMoney } from "@/lib/utils";
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
import { useState } from "react";

type SettingsSection = "profile" | "money" | "accounts" | "planning" | "system";

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
    id: "planning",
    label: "Goals & rules",
    description: "Targets and budget strategy",
    icon: Target,
  },
  { id: "system", label: "System", description: "Appearance, data and access", icon: MonitorCog },
];

export function SettingsView() {
  const user = useFinanceStore((s) => s.user);
  const profile = useFinanceStore((s) => s.profile);
  const activeBudgetRule = useFinanceStore((s) => s.budgetRules.find((rule) => rule.active));
  const goals = useFinanceStore((s) => s.goals);
  const expenses = useFinanceStore((s) => s.expenses);
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

  const [section, setSection] = useState<SettingsSection>("profile");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const saveProfile = async () => {
    updateUser({ name, email });
    await syncWithServer();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const savePreferences = async () => {
    await syncWithServer();
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 1600);
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
    download("salaryflow-backup.json", JSON.stringify(data, null, 2), "application/json");
  };

  const exportCsv = () => {
    download("salaryflow-expenses.csv", exportExpensesCsv(expenses), "text/csv");
  };

  const hiddenAccounts = accounts.filter((account) => account.hiddenFromAccounts);
  const visibleAccounts = accounts.filter((account) => !account.hiddenFromAccounts);
  const visibleBalance = visibleAccounts.reduce((total, account) => total + account.balance, 0);
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
      <aside className="lg:sticky lg:top-24">
        <div className="mb-3 px-1">
          <h2 className="text-sm font-semibold">Settings</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">Personalize how SalaryFlow works for you.</p>
        </div>
        <div className="lg:hidden">
          <Label htmlFor="settings-section">Settings section</Label>
          <Select
            id="settings-section"
            value={section}
            onChange={(event) => setSection(event.target.value as SettingsSection)}
          >
            {SETTINGS_SECTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <nav aria-label="Settings sections" className="hidden flex-col gap-1 lg:flex">
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = item.icon;
            const selected = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) lg:w-full",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="hidden text-[11px] text-muted lg:block">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 rounded-xl border border-border bg-surface">
        {section === "profile" && (
          <SettingsPane
            title="User profile"
            description="Keep the name and email associated with your SalaryFlow account up to date."
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
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
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
              <Input
                id="salary-amount"
                type="number"
                min={0}
                value={profile.amount || ""}
                onChange={(e) => updateProfile({ amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="salary-day">Salary day</Label>
              <Input
                id="salary-day"
                type="number"
                min={1}
                max={31}
                value={profile.salaryDay}
                onChange={(e) =>
                  updateProfile({
                    salaryDay: Math.max(1, Math.min(31, Number(e.target.value))),
                  })
                }
              />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="savings-goal">
                {activeBudgetRule ? "Monthly savings target (current cycle)" : "Monthly savings goal"}
              </Label>
              <Input
                id="savings-goal"
                type="number"
                min={0}
                value={
                  ruleSavingsTarget === undefined
                    ? profile.savingsGoal || ""
                    : Math.round(ruleSavingsTarget)
                }
                readOnly={Boolean(activeBudgetRule)}
                onChange={(e) => updateProfile({ savingsGoal: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">
                {activeBudgetRule
                  ? `${activeBudgetRule.name} sets ${savingsPercentage ?? 0}% of this cycle's confirmed ${formatMoney(summary.salaryIncome, profile.currency)} salary. Other income does not increase this target.`
                  : "Used when no budget rule is active."}
              </p>
            </div>
            <div>
              <Label htmlFor="emergency-target">Emergency fund target</Label>
              <Input
                id="emergency-target"
                type="number"
                min={0}
                value={profile.emergencyFundGoal || ""}
                onChange={(e) => updateProfile({ emergencyFundGoal: Number(e.target.value) })}
              />
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
              <AccountStat label="Visible balance" value={formatMoney(visibleBalance, profile.currency)} />
              <AccountStat label="Bank accounts" value={String(visibleAccounts.length)} />
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

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Data & export</h3>
              <p className="mt-1 text-xs text-muted">Download a portable copy of your financial records.</p>
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

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Account access</h3>
                <p className="mt-1 text-xs text-muted">Sign out of SalaryFlow on this device.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </SettingsPane>
        )}
      </section>
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
      <header className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </header>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
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
