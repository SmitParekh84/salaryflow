"use client";

import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { toInputValue } from "@/lib/number-input";
import { useFinanceStore } from "@/lib/store";
import { currencySymbol } from "@/lib/utils";
import { useEffect, useState } from "react";

/* ---------------------------------------------------------------------------
   Facts the assistant needs that nothing else in Aartha records.

   Kept as its own component rather than folded into settings-view.tsx, which
   is already long. It owns its own fetch and save so the settings screen needs
   to know nothing about it beyond where to place it.
   --------------------------------------------------------------------------- */

const FIELDS = [
  { key: "age", label: "Your age", money: false, hint: "Used to judge how long cover is needed" },
  {
    key: "dependents",
    label: "People who depend on your income",
    money: false,
    hint: "Partner, children, parents you support",
  },
  { key: "existingLifeCover", label: "Existing life cover", money: true, hint: "Term or life policy sum assured" },
  { key: "existingHealthCover", label: "Existing health cover", money: true, hint: "Health policy sum insured" },
  { key: "outstandingLoans", label: "Outstanding loans", money: true, hint: "Total still to repay" },
  { key: "spouseIncome", label: "Partner's monthly income", money: true, hint: "Leave blank if none" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Draft = Record<FieldKey, string>;

const EMPTY: Draft = {
  age: "",
  dependents: "",
  existingLifeCover: "",
  existingHealthCover: "",
  outstandingLoans: "",
  spouseIncome: "",
};

export function AboutYouForm() {
  const currency = useFinanceStore((s) => s.profile.currency);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/financial")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body?.data) return;
        setDraft(
          Object.fromEntries(
            FIELDS.map((field) => [
              field.key,
              toInputValue(body.data[field.key], field.money ? 2 : 0),
            ]),
          ) as Draft,
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setStatus("saving");
    // An emptied field means "forget this", which the API models as null.
    const payload = Object.fromEntries(
      FIELDS.map((field) => {
        const raw = draft[field.key].trim();
        return [field.key, raw === "" ? null : Number(raw)];
      }),
    );

    try {
      const res = await fetch("/api/profile/financial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div>
        <h3 className="text-sm font-medium text-foreground">About you</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Only used by the assistant, to answer questions like whether you need term cover. Every
          field is optional — the assistant will ask if it needs something.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`about-${field.key}`}>{field.label}</Label>
            <AmountInput
              id={`about-${field.key}`}
              decimals={field.money ? 2 : 0}
              prefix={field.money ? currencySymbol(currency) : undefined}
              value={draft[field.key]}
              onChange={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
            />
            <p className="mt-1 text-xs text-muted">{field.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={status === "saving"} disabled={status === "loading"}>
          {status === "saved" ? "Saved" : "Save"}
        </Button>
        {status === "error" ? (
          <p role="alert" className="text-xs text-danger">
            Could not save. Please try again.
          </p>
        ) : null}
      </div>
    </form>
  );
}
