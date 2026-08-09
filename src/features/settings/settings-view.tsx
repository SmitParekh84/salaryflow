"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { CURRENCIES } from "@/lib/constants";
import { download, exportExpensesCsv } from "@/lib/export";
import { useFinanceStore } from "@/lib/store";
import { Download, Eye, FileJson, LogOut, Moon, Sun, Trash2, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsView() {
  const router = useRouter();
  const user = useFinanceStore((s) => s.user);
  const profile = useFinanceStore((s) => s.profile);
  const activeBudgetRule = useFinanceStore((s) => s.budgetRules.find((rule) => rule.active));
  const expenses = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const updateUser = useFinanceStore((s) => s.updateUser);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const store = useFinanceStore;
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const saveProfile = () => {
    updateUser({ name, email });
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

  const logout = () => {
    resetAll();
    router.replace("/");
  };

  const hiddenAccounts = accounts.filter((account) => account.hiddenFromAccounts);

  const restoreAccount = async (id: string) => {
    updateAccount(id, { hiddenFromAccounts: false });
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={saveProfile}>
            {saved ? "Saved ✓" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {hiddenAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hidden bank accounts</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {hiddenAccounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{account.bankName}</p>
                  <p className="text-xs text-muted">Excluded from the Accounts page and total</p>
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Salary & preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Salary amount</Label>
              <Input
                type="number"
                value={profile.amount || ""}
                onChange={(e) => updateProfile({ amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Salary day</Label>
              <Input
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
              <Label>Currency</Label>
              <Select
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
              <Label>Monthly savings goal</Label>
              <Input
                type="number"
                value={profile.savingsGoal || ""}
                disabled={Boolean(activeBudgetRule)}
                onChange={(e) => updateProfile({ savingsGoal: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">
                {activeBudgetRule
                  ? `${activeBudgetRule.name} currently sets this amount.`
                  : "Used when no budget rule is active."}
              </p>
            </div>
            <div>
              <Label>Emergency fund target</Label>
              <Input
                type="number"
                value={profile.emergencyFundGoal || ""}
                onChange={(e) => updateProfile({ emergencyFundGoal: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button size="sm" onClick={() => void savePreferences()}>
            {preferencesSaved ? "Saved" : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportJson}>
            <FileJson className="h-4 w-4" /> Backup JSON
          </Button>
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
          <Button variant="danger" size="sm" onClick={logout}>
            <Trash2 className="h-4 w-4" /> Reset all data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
