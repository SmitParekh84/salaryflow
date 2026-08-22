"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ImportFormatError,
  type ImportPlan,
  type ImportResult,
  buildImportPlan,
  parseImportDoc,
} from "@/lib/statement-import";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { CheckCircle2, FileJson, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

export function ImportView() {
  const accounts = useFinanceStore((state) => state.accounts);
  const creditCards = useFinanceStore((state) => state.creditCards);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const applyImport = useFinanceStore((state) => state.applyImport);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const currency = useFinanceStore((state) => state.profile.currency);

  const fileRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  /** null = no push attempted yet; the local write alone is never "done". */
  const [pushed, setPushed] = useState<boolean | null>(null);
  const [pushing, setPushing] = useState(false);

  const choose = async (file: File) => {
    setError("");
    setResult(null);
    setPlan(null);
    try {
      const doc = parseImportDoc(JSON.parse(await file.text()));
      // Built against the store as it is right now, so the counts shown are
      // what will actually be written rather than what the file contains.
      setPlan(buildImportPlan(doc, { accounts, creditCards, expenses, incomes }));
      setFileName(file.name);
    } catch (caught) {
      setError(
        caught instanceof ImportFormatError
          ? caught.message
          : "That file could not be read as JSON.",
      );
    }
  };

  const confirm = async () => {
    if (!plan) return;
    const applied = applyImport(plan);
    setPlan(null);
    if (fileRef.current) fileRef.current.value = "";
    // The local write is not the finish line. This screen once said "imported"
    // while the upload failed silently; a reload then pulled the server copy
    // over the local one and the whole import evaporated. Success is claimed
    // only after the server confirms.
    setPushing(true);
    setPushed(await syncWithServer());
    setPushing(false);
    setResult(applied);
  };

  const retryUpload = async () => {
    setPushing(true);
    setPushed(await syncWithServer());
    setPushing(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Load a reconciled statement file. Nothing is written until you confirm, and anything
        already recorded is skipped, so re-importing an overlapping period is safe.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void choose(file);
        }}
      />
      <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
        <FileJson className="h-4 w-4" /> Choose file
      </Button>

      {error && (
        <p className="flex items-start gap-2 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {plan && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">{fileName}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Figure label="Expenses" value={String(plan.expenses.length)} />
              <Figure label="Spending" value={formatMoney(plan.totals.spend, currency)} />
              <Figure label="Income entries" value={String(plan.incomes.length)} />
              <Figure label="Income" value={formatMoney(plan.totals.income, currency)} />
            </div>

            <ul className="space-y-1 border-t border-border pt-3 text-xs text-muted">
              {plan.accountsToCreate.map((entry) => (
                <li key={entry.key}>
                  New account · {entry.account.bankName} ·{" "}
                  {formatMoney(entry.account.balance, currency)}
                </li>
              ))}
              {plan.accountsToUpdate.map((entry) => (
                <li key={entry.id}>
                  Balance set · {entry.bankName} · {formatMoney(entry.balance, currency)}
                </li>
              ))}
              {plan.cardsToCreate.map((entry) => (
                <li key={entry.key}>New card · {entry.card.name}</li>
              ))}
              {(plan.duplicateExpenses > 0 || plan.duplicateIncomes > 0) && (
                <li className="text-warning">
                  Skipping {plan.duplicateExpenses + plan.duplicateIncomes} already recorded
                </li>
              )}
            </ul>

            <div className="flex gap-3">
              <Button type="button" loading={pushing} onClick={() => void confirm()}>
                Import
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPlan(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && pushed === true && (
        <p className="flex items-start gap-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Imported and uploaded to your account: {result.expensesAdded} expenses,{" "}
          {result.incomesAdded} income entries.
          {result.accountsCreated > 0 && ` Created ${result.accountsCreated} accounts.`}
          {result.accountsUpdated > 0 && ` Updated ${result.accountsUpdated} balances.`}
          {result.cardsCreated > 0 && ` Added ${result.cardsCreated} cards.`}
        </p>
      )}

      {result && pushed === false && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="flex items-start gap-2 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Imported on this device, but the upload to your account FAILED. Do not close or
              reload this page — reloading pulls the server copy back over this device and the
              import is lost. Check you are signed in, then retry.
            </p>
            <Button type="button" loading={pushing} onClick={() => void retryUpload()}>
              Retry upload
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-bold tabular-nums">{value}</p>
    </div>
  );
}
