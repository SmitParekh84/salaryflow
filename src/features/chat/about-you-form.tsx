"use client";

import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { MAX_AGE, MIN_AGE, ageOn, isValidDateOfBirth } from "@/lib/date-of-birth";
import { toInputValue } from "@/lib/number-input";
import { useFinanceStore } from "@/lib/store";
import { currencySymbol } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

/* ---------------------------------------------------------------------------
   Facts the assistant needs that nothing else in Aartha records.

   Kept as its own component rather than folded into settings-view.tsx, which
   is already long. It owns its own fetch and save so the settings screen needs
   to know nothing about it beyond where to place it.

   Every field is optional, and the form has to make that believable. Its first
   version was six identical money boxes, so the only way to answer "I don't
   have life cover" appeared to be typing 0 into a rupee field — which reads to
   the assistant as a real, deliberate zero rather than an unanswered question.
   Each field now offers that answer as a named button instead, and leaving one
   blank is a visible, labelled state rather than an empty box.
   --------------------------------------------------------------------------- */

type NumberField = {
  key: "dependents" | "existingLifeCover" | "existingHealthCover" | "outstandingLoans" | "spouseIncome";
  label: string;
  money: boolean;
  hint: string;
  /** What a deliberate zero means here, said in the user's own terms. */
  none: string;
};

const YOU: NumberField[] = [
  {
    key: "dependents",
    label: "People who depend on your income",
    money: false,
    hint: "A partner, children, or parents you support",
    none: "Nobody depends on my income",
  },
];

const COVER: NumberField[] = [
  {
    key: "existingLifeCover",
    label: "Existing life cover",
    money: true,
    hint: "The sum assured on a term or life policy",
    none: "I have no life cover",
  },
  {
    key: "existingHealthCover",
    label: "Existing health cover",
    money: true,
    hint: "The sum insured on a health policy",
    none: "I have no health cover",
  },
  {
    key: "outstandingLoans",
    label: "Outstanding loans",
    money: true,
    hint: "Everything still left to repay",
    none: "I have no loans",
  },
  {
    key: "spouseIncome",
    label: "Partner's monthly income",
    money: true,
    hint: "What your partner brings in each month",
    none: "No partner income",
  },
];

const NUMBER_FIELDS = [...YOU, ...COVER];

type Draft = { dateOfBirth: string } & Record<NumberField["key"], string>;

const EMPTY: Draft = {
  dateOfBirth: "",
  dependents: "",
  existingLifeCover: "",
  existingHealthCover: "",
  outstandingLoans: "",
  spouseIncome: "",
};

export function AboutYouForm() {
  const currency = useFinanceStore((s) => s.profile.currency);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [legacyAge, setLegacyAge] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/financial")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body?.data) return;
        setDraft({
          dateOfBirth: typeof body.data.dateOfBirth === "string" ? body.data.dateOfBirth : "",
          ...(Object.fromEntries(
            NUMBER_FIELDS.map((field) => [
              field.key,
              toInputValue(body.data[field.key], field.money ? 2 : 0),
            ]),
          ) as Record<NumberField["key"], string>),
        });
        // Shown only until a birthday replaces it; see the note by the field.
        setLegacyAge(typeof body.data.age === "number" ? body.data.age : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  };

  const birthdayEntered = draft.dateOfBirth !== "";
  const birthdayValid = useMemo(
    () => !birthdayEntered || isValidDateOfBirth(draft.dateOfBirth, new Date()),
    [birthdayEntered, draft.dateOfBirth],
  );
  const age = useMemo(
    () => (birthdayValid ? ageOn(draft.dateOfBirth, new Date()) : null),
    [birthdayValid, draft.dateOfBirth],
  );

  const answered = Object.values(draft).filter((value) => value !== "").length;
  const total = NUMBER_FIELDS.length + 1;

  async function save() {
    if (!birthdayValid) return;
    setStatus("saving");

    // An emptied field means "forget this", which the API models as null. An
    // explicit 0 is a different answer and is sent as the number it is.
    const payload = {
      dateOfBirth: draft.dateOfBirth === "" ? null : draft.dateOfBirth,
      ...Object.fromEntries(
        NUMBER_FIELDS.map((field) => {
          const raw = draft[field.key].trim();
          return [field.key, raw === "" ? null : Number(raw)];
        }),
      ),
    };

    try {
      const res = await fetch("/api/profile/financial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok && draft.dateOfBirth !== "") setLegacyAge(null);
    } catch {
      setStatus("error");
    }
  }

  const numberField = (field: NumberField) => {
    const value = draft[field.key];
    const isNone = value !== "" && Number(value) === 0;

    return (
      <div key={field.key}>
        <Label htmlFor={`about-${field.key}`}>{field.label}</Label>
        <AmountInput
          id={`about-${field.key}`}
          decimals={field.money ? 2 : 0}
          prefix={field.money ? currencySymbol(currency) : undefined}
          placeholder="Not set"
          value={value}
          onChange={(next) => set(field.key, next)}
        />
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted">{isNone ? `You said: ${field.none}` : field.hint}</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="shrink-0 px-0 text-xs"
            onClick={() => set(field.key, value === "" ? "0" : "")}
          >
            {value === "" ? field.none : "Clear"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-medium text-foreground">About you</h3>
          <p className="text-xs text-muted">
            {status === "loading" ? "Loading…" : `${answered} of ${total} answered`}
          </p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Everything here is optional and only the assistant reads it. Fill in what you like — it
          asks for anything else when it actually needs it. If something does not apply to you,
          say so with the link under the field rather than typing a zero.
        </p>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-wide text-muted uppercase">You</legend>

        <div>
          <Label htmlFor="about-dateOfBirth">Date of birth</Label>
          <Input
            id="about-dateOfBirth"
            type="date"
            value={draft.dateOfBirth}
            aria-invalid={!birthdayValid || undefined}
            aria-describedby="about-dateOfBirth-hint"
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p
              id="about-dateOfBirth-hint"
              className={!birthdayValid ? "text-xs text-danger" : "text-xs text-muted"}
            >
              {!birthdayValid
                ? `Enter a real date for someone aged between ${MIN_AGE} and ${MAX_AGE}.`
                : age !== null
                  ? `You are ${age}. Your age stays right on its own, so nothing to update later.`
                  : legacyAge !== null
                    ? `Recorded earlier as age ${legacyAge}. Add your birthday and it keeps itself current.`
                    : "Lets the assistant judge how long cover and savings need to last."}
            </p>
            {birthdayEntered && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="shrink-0 px-0 text-xs"
                onClick={() => set("dateOfBirth", "")}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {YOU.map(numberField)}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-wide text-muted uppercase">
          Cover and obligations
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">{COVER.map(numberField)}</div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          loading={status === "saving"}
          disabled={status === "loading" || !birthdayValid}
        >
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
