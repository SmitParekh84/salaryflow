"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { AllocationSheet } from "@/features/goals/allocation-sheet";
import { accountAllocated, accountFree, isOverAllocated } from "@/lib/allocations";
import { creditCardUsage } from "@/lib/credit-cards";
import { useFinanceStore } from "@/lib/store";
import type {
  AccountPurpose,
  AccountTransferMode,
  BankAccount,
  BankAccountType,
  CreditCard as CreditCardType,
} from "@/lib/types";
import { formatDate, formatMoney, localDateInputValue } from "@/lib/utils";
import {
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CalendarClock,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  WalletCards,
} from "lucide-react";
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
  { value: "obligations", label: "Salary-day reserves" },
  { value: "savings", label: "Cash savings" },
];

const EMPTY_CARD_FORM = {
  name: "",
  bankName: "",
  creditLimit: 0,
  statementDay: 1,
};

const EMPTY_TRANSFER_FORM = {
  sourceAccountId: "",
  destinationAccountId: "",
  amount: 0,
  date: localDateInputValue(),
  note: "",
};

export function AccountsView() {
  const accounts = useFinanceStore((state) => state.accounts);
  const goals = useFinanceStore((state) => state.goals);
  const [allocateAccountId, setAllocateAccountId] = useState<string | null>(null);
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
  const accountTransfers = useFinanceStore((state) => state.accountTransfers);
  const addAccountTransfer = useFinanceStore((state) => state.addAccountTransfer);
  const completeAccountTransfer = useFinanceStore((state) => state.completeAccountTransfer);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
  const [transferError, setTransferError] = useState("");

  const visibleAccounts = accounts.filter((account) => !account.hiddenFromAccounts);
  const includedBalanceAccounts = visibleAccounts.filter((account) => !account.maskBalance);
  const totalBalance = includedBalanceAccounts.reduce((sum, account) => sum + account.balance, 0);
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

  function openTransfer() {
    const active = accounts.filter((account) => account.status === "active");
    setTransferForm({
      ...EMPTY_TRANSFER_FORM,
      sourceAccountId: active[0]?.id ?? "",
      destinationAccountId: active[1]?.id ?? "",
    });
    setTransferError("");
    setTransferOpen(true);
  }

  function saveTransfer(mode: AccountTransferMode) {
    const success = addAccountTransfer(
      {
        ...transferForm,
        amount: Number(transferForm.amount),
        date: new Date(`${transferForm.date}T12:00:00`).toISOString(),
        note: transferForm.note.trim() || undefined,
      },
      mode,
    );
    if (!success) {
      setTransferError("Choose two different accounts and check the source balance.");
      return;
    }
    setTransferOpen(false);
  }

  async function toggleBalanceMask(account: BankAccount) {
    updateAccount(account.id, { maskBalance: !account.maskBalance });
    await syncWithServer();
  }

  async function hideAccount(account: BankAccount) {
    updateAccount(account.id, { hiddenFromAccounts: true });
    setOpen(false);
    await syncWithServer();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {visibleAccounts.length} linked accounts · {includedBalanceAccounts.length} in total
          </p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(totalBalance, currency)}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {accounts.length >= 2 && (
            <Button
              className="flex-1 sm:flex-none"
              size="sm"
              variant="secondary"
              onClick={openTransfer}
            >
              <ArrowRightLeft className="h-4 w-4" /> Transfer
            </Button>
          )}
          <Button className="flex-1 sm:flex-none" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add account
          </Button>
        </div>
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
                {accountAllocated(goals, account.id) > 0 && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {formatMoney(accountAllocated(goals, account.id), currency)} of goal money is
                    still here. Complete the transfer to{" "}
                    {account.plannedTransferTo || "another account"} to move it.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {visibleAccounts.length === 0 ? (
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
          {visibleAccounts.map((account) => (
            <div
              key={account.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-4 sm:flex sm:gap-3"
            >
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
                {isOverAllocated(goals, account) && (
                  <p
                    role="alert"
                    className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning"
                  >
                    Goals claim more than this account holds. Lower a goal amount or raise the
                    balance.
                  </p>
                )}
                {accountAllocated(goals, account.id) > 0 && (
                  <div className="mt-2 max-w-xs">
                    <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="bg-primary"
                        style={{
                          width: `${Math.min(100, (accountAllocated(goals, account.id) / Math.max(account.balance, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">
                        {formatMoney(accountAllocated(goals, account.id), currency)} locked to goals
                      </span>
                      <span
                        className={
                          accountFree(goals, account) < 0 ? "font-medium text-danger" : "text-muted"
                        }
                      >
                        {formatMoney(accountFree(goals, account), currency)} free
                      </span>
                    </div>
                  </div>
                )}
                {goals.length > 0 && accountFree(goals, account) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAllocateAccountId(account.id)}
                    className="mt-2 h-auto min-h-0 px-0 text-xs text-primary hover:bg-transparent hover:underline"
                  >
                    Assign {formatMoney(accountFree(goals, account), currency)} to goals
                  </Button>
                )}
                {account.defaultFor && account.defaultFor.length > 0 && (
                  <p className="mt-1 text-xs text-primary">
                    Default:{" "}
                    {account.defaultFor
                      .map(
                        (purpose) => ACCOUNT_PURPOSES.find((item) => item.value === purpose)?.label,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 sm:contents">
                <div className="flex items-center gap-1">
                  <p className="min-w-20 text-left text-sm font-bold tabular-nums sm:text-right">
                    {account.maskBalance ? "••••••" : formatMoney(account.balance, currency)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void toggleBalanceMask(account)}
                    className="h-8 w-8 text-muted"
                    aria-label={
                      account.maskBalance
                        ? `Show ${account.bankName} balance`
                        : `Hide ${account.bankName} balance`
                    }
                  >
                    {account.maskBalance ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(account)}
                    className="h-8 w-8 text-muted"
                    aria-label={`Edit ${account.bankName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(account.id)}
                    className="h-8 w-8 text-danger hover:bg-danger/10"
                    aria-label={`Delete ${account.bankName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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

      {accountTransfers.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Bank transfers</h2>
            <p className="text-xs text-muted">
              Moving money between your accounts does not change income or expenses.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {accountTransfers.map((transfer) => {
              const source = accounts.find((account) => account.id === transfer.sourceAccountId);
              const destination = accounts.find(
                (account) => account.id === transfer.destinationAccountId,
              );
              const countsAsSavings = destination?.defaultFor?.includes("savings");
              return (
                <div key={transfer.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {transfer.status === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {source?.bankName ?? "Unknown account"} to{" "}
                      {destination?.bankName ?? "Unknown account"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(transfer.date)} ·{" "}
                      {transfer.status === "completed" ? "Transferred" : "Scheduled"}
                      {transfer.status === "completed" && countsAsSavings
                        ? " · Counts as cash savings"
                        : ""}
                      {transfer.status === "completed" && transfer.balancesApplied === false
                        ? " · Balances already reflected"
                        : ""}
                      {transfer.note ? ` · ${transfer.note}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatMoney(transfer.amount, currency)}</p>
                  {transfer.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void completeAccountTransfer(transfer.id)}
                    >
                      Mark transferred
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
                      <p className="text-xs text-muted">
                        {card.bankName} · Statement on {card.statementDay}th
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditCard(card)}
                      className="h-8 w-8 text-muted"
                      aria-label={`Edit ${card.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeCard(card.id)}
                      className="h-8 w-8 text-danger hover:bg-danger/10"
                      aria-label={`Delete ${card.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">Current outstanding</p>
                      <p className="text-xl font-bold">
                        {formatMoney(usage.outstanding, currency)}
                      </p>
                    </div>
                    <p className="text-right text-xs text-muted">
                      {formatMoney(usage.available, currency)} available
                      <br />
                      of {formatMoney(card.creditLimit, currency)}
                    </p>
                  </div>
                  <Progress
                    value={usage.utilization}
                    className="mt-3"
                    color={usage.utilization > 80 ? "var(--danger)" : "var(--primary)"}
                    label={`${card.name} credit limit used`}
                    valueText={`${formatMoney(usage.outstanding, currency)} outstanding of ${formatMoney(card.creditLimit, currency)}`}
                  />
                  <div className="mt-2 flex justify-between text-[11px] text-muted">
                    <span>{Math.round(usage.utilization)}% used</span>
                    <span>Closes {formatDate(usage.end.toISOString())}</span>
                  </div>
                  {usage.credits > 0 && (
                    <p className="mt-2 text-xs text-success">
                      Includes {formatMoney(usage.credits, currency)} cashback/credits
                    </p>
                  )}
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
                  <Checkbox
                    checked={form.defaultFor.includes(purpose.value)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        defaultFor: event.target.checked
                          ? [...form.defaultFor, purpose.value]
                          : form.defaultFor.filter((item) => item !== purpose.value),
                      })
                    }
                  />
                  {purpose.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Choosing a default moves that purpose from any other account.
            </p>
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
          {editingId && (
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-sm font-medium">Account privacy</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Hiding the account removes it and its balance from Accounts totals. Existing
                expenses and self-transfers keep working. Restore it later from Settings.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const account = accounts.find((item) => item.id === editingId);
                  if (account) void hideAccount(account);
                }}
              >
                <EyeOff className="h-4 w-4" /> Hide account from Accounts
              </Button>
            </div>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save account</Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer between banks"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>From</Label>
              <Select
                value={transferForm.sourceAccountId}
                onChange={(event) =>
                  setTransferForm({ ...transferForm, sourceAccountId: event.target.value })
                }
              >
                {accounts
                  .filter((account) => account.status === "active")
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName}
                      {account.hiddenFromAccounts ? " (hidden)" : ""}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select
                value={transferForm.destinationAccountId}
                onChange={(event) =>
                  setTransferForm({ ...transferForm, destinationAccountId: event.target.value })
                }
              >
                {accounts
                  .filter((account) => account.status === "active")
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName}
                      {account.hiddenFromAccounts ? " (hidden)" : ""}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                value={transferForm.amount || ""}
                onChange={(event) =>
                  setTransferForm({ ...transferForm, amount: Number(event.target.value) })
                }
              />
            </div>
            <div>
              <Label>Transfer date</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(event) => setTransferForm({ ...transferForm, date: event.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              value={transferForm.note}
              onChange={(event) => setTransferForm({ ...transferForm, note: event.target.value })}
              placeholder="e.g. October salary savings"
            />
          </div>
          {transferError && <p className="text-sm text-danger">{transferError}</p>}
          <ModalFooter className="flex-wrap">
            <Button variant="secondary" onClick={() => saveTransfer("scheduled")}>
              Schedule
            </Button>
            <Button variant="secondary" onClick={() => saveTransfer("already-transferred")}>
              Already transferred
            </Button>
            <Button onClick={() => saveTransfer("transfer-now")}>Transfer now</Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        title={editingCardId ? "Edit credit card" : "Add credit card"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Card name</Label>
              <Input
                autoFocus
                placeholder="e.g. Flipkart Axis"
                value={cardForm.name}
                onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })}
              />
            </div>
            <div>
              <Label>Bank</Label>
              <Input
                placeholder="e.g. Axis Bank"
                value={cardForm.bankName}
                onChange={(event) => setCardForm({ ...cardForm, bankName: event.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Credit limit</Label>
              <Input
                type="number"
                min={1}
                value={cardForm.creditLimit || ""}
                onChange={(event) =>
                  setCardForm({ ...cardForm, creditLimit: Number(event.target.value) })
                }
              />
            </div>
            <div>
              <Label>Statement day</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={cardForm.statementDay}
                onChange={(event) =>
                  setCardForm({ ...cardForm, statementDay: Number(event.target.value) })
                }
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCard()}>Save card</Button>
          </ModalFooter>
        </div>
      </Modal>

      {allocateAccountId && (
        <AllocationSheet
          open={Boolean(allocateAccountId)}
          onClose={() => setAllocateAccountId(null)}
          accountId={allocateAccountId}
          title="Assign this money to goals"
        />
      )}
    </div>
  );
}
