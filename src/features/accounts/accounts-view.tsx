"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { creditCardUsage } from "@/lib/credit-cards";
import { useFinanceStore } from "@/lib/store";
import type { AccountPurpose, BankAccount, BankAccountType, CreditCard as CreditCardType } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { ArrowRight, Building2, CreditCard, Landmark, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { useState } from "react";

const EMPTY_FORM = {
  bankName: "",
  accountType: "Savings" as BankAccountType,
  balance: 0,
  defaultFor: [] as AccountPurpose[],
};

const ACCOUNT_PURPOSES: { value: AccountPurpose; label: string }[] = [
  { value: "everyday", label: "Everyday spending" },
  { value: "subscriptions", label: "Bills & subscriptions" },
  { value: "investments", label: "SIPs & investments" },
];

const EMPTY_CARD_FORM = {
  name: "",
  bankName: "",
  creditLimit: 0,
  statementDay: 1,
};

export function AccountsView() {
  const accounts = useFinanceStore((state) => state.accounts);
  const addAccount = useFinanceStore((state) => state.addAccount);
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const currency = useFinanceStore((state) => state.profile.currency);
  const creditCards = useFinanceStore((state) => state.creditCards);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const addCreditCard = useFinanceStore((state) => state.addCreditCard);
  const updateCreditCard = useFinanceStore((state) => state.updateCreditCard);
  const deleteCreditCard = useFinanceStore((state) => state.deleteCreditCard);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const closingAccounts = accounts.filter((account) => account.status === "closing");

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(account: BankAccount) {
    setEditingId(account.id);
    setForm({
      bankName: account.bankName,
      accountType: account.accountType,
      balance: account.balance,
      defaultFor: account.defaultFor ?? [],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.bankName.trim() || form.balance < 0) return;

    if (editingId) {
      for (const account of accounts) {
        if (account.id !== editingId) {
          const retainedDefaults = account.defaultFor?.filter(
            (purpose) => !form.defaultFor.includes(purpose),
          );
          if (retainedDefaults?.length !== account.defaultFor?.length) {
            updateAccount(account.id, { defaultFor: retainedDefaults });
          }
        }
      }
      updateAccount(editingId, { ...form, bankName: form.bankName.trim() });
    } else {
      for (const account of accounts) {
        const retainedDefaults = account.defaultFor?.filter(
          (purpose) => !form.defaultFor.includes(purpose),
        );
        if (retainedDefaults?.length !== account.defaultFor?.length) {
          updateAccount(account.id, { defaultFor: retainedDefaults });
        }
      }
      addAccount({ ...form, bankName: form.bankName.trim(), status: "active" });
    }
    setOpen(false);
    await syncWithServer();
  }

  async function remove(id: string) {
    deleteAccount(id);
    await syncWithServer();
  }

  function openAddCard() {
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
    setCardOpen(true);
  }

  function openEditCard(card: CreditCardType) {
    setEditingCardId(card.id);
    setCardForm({
      name: card.name,
      bankName: card.bankName,
      creditLimit: card.creditLimit,
      statementDay: card.statementDay,
    });
    setCardOpen(true);
  }

  async function saveCard() {
    if (!cardForm.name.trim() || !cardForm.bankName.trim() || cardForm.creditLimit <= 0) return;
    const card = {
      ...cardForm,
      name: cardForm.name.trim(),
      bankName: cardForm.bankName.trim(),
      statementDay: Math.max(1, Math.min(31, cardForm.statementDay)),
      status: "active" as const,
    };
    if (editingCardId) updateCreditCard(editingCardId, card);
    else addCreditCard(card);
    setCardOpen(false);
    await syncWithServer();
  }

  async function removeCard(id: string) {
    deleteCreditCard(id);
    await syncWithServer();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{accounts.length} linked accounts</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(totalBalance, currency)}</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      {closingAccounts.map((account) => {
        const target = accounts.find((item) => item.bankName === account.plannedTransferTo);
        return (
          <div key={account.id} className="rounded-xl border border-warning/35 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold">Planned account closure</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {formatMoney(account.balance, currency)} remains in {account.bankName} and is
                  planned for transfer to {account.plannedTransferTo || "another account"}.
                  {target
                    ? ` Projected ${target.bankName} balance: ${formatMoney(target.balance + account.balance, currency)}.`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {accounts.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="No bank accounts"
          description="Add your current balances to understand your available cash across banks."
          action={
            <Button size="sm" onClick={openAdd}>
              Add account
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{account.bankName}</p>
                  {account.status === "closing" && (
                    <Badge color="var(--warning)">Closing soon</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{account.accountType} account</p>
                {account.defaultFor && account.defaultFor.length > 0 && (
                  <p className="mt-1 text-xs text-primary">
                    Default: {account.defaultFor.map((purpose) => ACCOUNT_PURPOSES.find((item) => item.value === purpose)?.label).join(", ")}
                  </p>
                )}
              </div>
              <p className="text-sm font-bold tabular-nums">
                {formatMoney(account.balance, currency)}
              </p>
              <button
                onClick={() => openEdit(account)}
                className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
                aria-label={`Edit ${account.bankName}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => void remove(account.id)}
                className="rounded-lg p-2 text-danger hover:bg-danger/10"
                aria-label={`Delete ${account.bankName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Card className="flex items-start gap-3 p-4 shadow-none">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted">
          Account balances are tracked separately from salary and spending, so transfers between
          your own banks do not change income.
        </p>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Credit cards</h2>
            <p className="text-xs text-muted">Statement usage is separate from cash balances.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={openAddCard}>
            <Plus className="h-4 w-4" /> Add card
          </Button>
        </div>
        {creditCards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No credit cards"
            description="Add a card to track its limit, statement cycle and linked purchases."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {creditCards.map((card) => {
              const usage = creditCardUsage(card, expenses, incomes);
              return (
                <Card key={card.id} className="p-4 shadow-none">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{card.name}</p>
                      <p className="text-xs text-muted">{card.bankName} · Statement on {card.statementDay}th</p>
                    </div>
                    <button onClick={() => openEditCard(card)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label={`Edit ${card.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => void removeCard(card.id)} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label={`Delete ${card.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">Current outstanding</p>
                      <p className="text-xl font-bold">{formatMoney(usage.outstanding, currency)}</p>
                    </div>
                    <p className="text-right text-xs text-muted">
                      {formatMoney(usage.available, currency)} available<br />of {formatMoney(card.creditLimit, currency)}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, usage.utilization)}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted">
                    <span>{Math.round(usage.utilization)}% used</span>
                    <span>Closes {formatDate(usage.end.toISOString())}</span>
                  </div>
                  {usage.credits > 0 && <p className="mt-2 text-xs text-success">Includes {formatMoney(usage.credits, currency)} cashback/credits</p>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit account" : "Add account"}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="bank-name">Bank name</Label>
            <Input
              id="bank-name"
              autoFocus
              value={form.bankName}
              onChange={(event) => setForm({ ...form, bankName: event.target.value })}
              placeholder="e.g. Central Bank of India"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted">Use as default for</legend>
            <div className="space-y-2">
              {ACCOUNT_PURPOSES.map((purpose) => (
                <label key={purpose.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={form.defaultFor.includes(purpose.value)}
                    onChange={(event) => setForm({
                      ...form,
                      defaultFor: event.target.checked
                        ? [...form.defaultFor, purpose.value]
                        : form.defaultFor.filter((item) => item !== purpose.value),
                    })}
                  />
                  {purpose.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Choosing a default moves that purpose from any other account.</p>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="account-type">Account type</Label>
              <Select
                id="account-type"
                value={form.accountType}
                onChange={(event) =>
                  setForm({ ...form, accountType: event.target.value as BankAccountType })
                }
              >
                <option>Savings</option>
                <option>Salary</option>
                <option>Current</option>
                <option>Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="account-balance">Current balance</Label>
              <Input
                id="account-balance"
                type="number"
                min={0}
                value={form.balance || ""}
                onChange={(event) => setForm({ ...form, balance: Number(event.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void save()}>
              Save account
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title={editingCardId ? "Edit credit card" : "Add credit card"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Card name</Label>
              <Input autoFocus placeholder="e.g. Flipkart Axis" value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} />
            </div>
            <div>
              <Label>Bank</Label>
              <Input placeholder="e.g. Axis Bank" value={cardForm.bankName} onChange={(event) => setCardForm({ ...cardForm, bankName: event.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Credit limit</Label>
              <Input type="number" min={1} value={cardForm.creditLimit || ""} onChange={(event) => setCardForm({ ...cardForm, creditLimit: Number(event.target.value) })} />
            </div>
            <div>
              <Label>Statement day</Label>
              <Input type="number" min={1} max={31} value={cardForm.statementDay} onChange={(event) => setCardForm({ ...cardForm, statementDay: Number(event.target.value) })} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setCardOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => void saveCard()}>Save card</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
