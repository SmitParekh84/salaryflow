"use client";

import { StatCard } from "@/components/stat-card";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CHART_COLORS } from "@/lib/theme";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useSummary } from "@/hooks/use-summary";
import { INVESTMENT_TYPES } from "@/lib/constants";
import { investmentSchema } from "@/lib/schemas";
import { useFinanceStore } from "@/lib/store";
import type { InvestmentType } from "@/lib/types";
import { cn, currencySymbol, formatMoney } from "@/lib/utils";
import { Coins, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";

export function InvestmentsView() {
  const investments = useFinanceStore((s) => s.investments);
  const currency = useFinanceStore((s) => s.profile.currency);
  const addInvestment = useFinanceStore((s) => s.addInvestment);
  const deleteInvestment = useFinanceStore((s) => s.deleteInvestment);
  const accounts = useFinanceStore((s) => s.accounts);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const summary = useSummary();

  const [open, setOpen] = useState(false);
  // Money is held as strings so a cleared field stays blank instead of becoming 0.
  const [form, setForm] = useState({
    name: "",
    type: "SIP" as InvestmentType,
    invested: "",
    currentValue: "",
    monthly: "",
    accountId: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const totalInvested = investments.reduce((s, i) => s + i.invested, 0);
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const gain = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
  const monthly = investments.reduce((s, i) => s + (i.monthly ?? 0), 0);

  const openAdd = () => {
    const defaultAccount = accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("investments"),
    );
    setForm((current) => ({ ...current, accountId: defaultAccount?.id ?? "" }));
    setOpen(true);
  };

  const save = async () => {
    const parsed = investmentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }

    setErrors({});
    addInvestment({
      name: parsed.data.name,
      type: form.type,
      invested: parsed.data.invested,
      // An unstated current value means it has not moved from the amount put in.
      currentValue: parsed.data.currentValue ?? parsed.data.invested,
      monthly: parsed.data.monthly,
      accountId: parsed.data.accountId,
    });
    setForm({ name: "", type: "SIP", invested: "", currentValue: "", monthly: "", accountId: "" });
    setOpen(false);
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{investments.length} holdings</p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add investment
        </Button>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl bg-border card-shadow sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio value"
          value={formatMoney(totalValue, currency, true)}
          icon={Wallet}
          accent="var(--primary)"
        />
        <StatCard
          label="Total invested"
          value={formatMoney(totalInvested, currency, true)}
          icon={Coins}
          accent={CHART_COLORS.invest}
          hint={`${formatMoney(monthly, currency, true)}/mo SIP`}
        />
        <StatCard
          label="Total returns"
          value={formatMoney(gain, currency, true)}
          icon={TrendingUp}
          accent={gain >= 0 ? CHART_COLORS.gain : CHART_COLORS.loss}
          trend={Math.round(gainPct)}
        />
        <StatCard
          label="Monthly investment target"
          value={formatMoney(summary.investmentTarget, currency, true)}
          icon={TrendingUp}
          accent="var(--primary)"
          hint={
            monthly >= summary.investmentTarget
              ? "Target covered by monthly SIPs"
              : `${formatMoney(summary.investmentTarget - monthly, currency, true)} left to allocate`
          }
        />
      </div>

      {investments.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No investments tracked"
          description="Add your SIPs, stocks, gold and more to see portfolio returns."
          action={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add investment
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border p-5">
          {investments.map((inv) => {
            const g = inv.currentValue - inv.invested;
            const gp = inv.invested > 0 ? (g / inv.invested) * 100 : 0;
            const account = accounts.find((item) => item.id === inv.accountId);
            return (
              <div key={inv.id} className="group flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{inv.name}</p>
                  {/*
                    Truncated like the name above it. This line stacks type, SIP
                    amount and account name, so it is the longest thing in the
                    row and the row does not wrap — without this it ran straight
                    out of its own box on a narrow phone.
                  */}
                  <p className="truncate text-xs text-muted">
                    {inv.type}
                    {inv.monthly ? ` · ${formatMoney(inv.monthly, currency)}/mo` : ""}
                    {account ? ` · ${account.bankName}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{formatMoney(inv.currentValue, currency)}</p>
                  <p className={cn("text-xs font-medium", g >= 0 ? "text-success" : "text-danger")}>
                    {g >= 0 ? "+" : ""}
                    {formatMoney(g, currency)} ({Math.round(gp)}%)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteInvestment(inv.id)}
                  className="h-8 w-8 text-danger opacity-0 hover:bg-danger/10 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add investment">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="investment-name">Name</Label>
              <Input
                id="investment-name"
                autoFocus
                placeholder="e.g. Nifty 50 Index"
                value={form.name}
                aria-invalid={Boolean(errors.name) || undefined}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="investment-type">Type</Label>
              <Select
                id="investment-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as InvestmentType })}
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="investment-invested">Invested</Label>
              <AmountInput
                id="investment-invested"
                prefix={currencySymbol(currency)}
                value={form.invested}
                invalid={Boolean(errors.invested)}
                onChange={(invested) => setForm({ ...form, invested })}
              />
              {errors.invested && <p className="mt-1 text-xs text-danger">{errors.invested}</p>}
            </div>
            <div>
              <Label htmlFor="investment-current">Current value</Label>
              <AmountInput
                id="investment-current"
                prefix={currencySymbol(currency)}
                value={form.currentValue}
                invalid={Boolean(errors.currentValue)}
                onChange={(currentValue) => setForm({ ...form, currentValue })}
              />
              {errors.currentValue && (
                <p className="mt-1 text-xs text-danger">{errors.currentValue}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="investment-monthly">Monthly SIP (optional)</Label>
            <AmountInput
              id="investment-monthly"
              prefix={currencySymbol(currency)}
              value={form.monthly}
              invalid={Boolean(errors.monthly)}
              onChange={(monthly) => setForm({ ...form, monthly })}
            />
            {errors.monthly && <p className="mt-1 text-xs text-danger">{errors.monthly}</p>}
          </div>
          {accounts.length > 0 && (
            <div>
              <Label htmlFor="investment-account">Paid from</Label>
              <Select
                id="investment-account"
                value={form.accountId}
                onChange={(event) => setForm({ ...form, accountId: event.target.value })}
              >
                <option value="">No account selected</option>
                {accounts
                  .filter((account) => account.status === "active")
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName}
                    </option>
                  ))}
              </Select>
            </div>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Add</Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
