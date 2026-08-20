# Fuel and Mileage Tracking — Design

Date: 2026-08-20
Status: Approved

## Purpose

Let a user record a fuel fill-up with the odometer reading from their vehicle's
meter, and get back a trustworthy running mileage (kmpl) and running cost
(₹/km) for that vehicle — on the dashboard as a glance, and on Analytics as a
report with a filter.

The motivating case: an Activa 125 (2021), filled in small partial top-ups
(₹150, ₹200) paid from a bank account, with the odometer photographed at the
pump and typed in afterwards.

## Non-goals

- **Not a new record type.** A fill-up is an existing `Expense` with category
  `Fuel` plus a `fuel` sub-object. Sync, tombstones, recycle bin, account
  balance deduction, and shared-expense handling are inherited unchanged.
- **Not multi-vehicle in v1.** One vehicle on the profile. The record carries
  no `vehicleId`; adding one later is additive and needs no data migration
  because every existing fill belongs to the only vehicle there is.
- **No litre-level tank modelling.** No tank capacity, no fuel-level tracking,
  no reserve warnings.
- **No trip or route tracking.** Distance comes only from odometer differences
  between recorded fills.
- **No OCR of the meter photo.** The user reads the number and types it. The
  photo stays on their phone.

## Core principle: freeze the price into the record

Litres are not stored as a formula. At save time the app resolves a rate
(₹/litre), computes `litres = amount / rate`, and writes **both** `litres` and
`ratePerLitre` into the expense.

Re-deriving litres from a live price at read time would mean a user's August
mileage silently changed every time the pump price moved. That would violate
`PRODUCT.md`'s rule against hidden financial assumptions, and it would make the
mileage history unauditable — the number on screen would never match the number
the user saw when they saved it.

The same rule is why `rateSource` is stored: a user looking at an odd figure
must be able to see whether the rate behind it was fetched, reused, or typed.

## The mathematics

This section is the calculation contract. `FINANCE-CALCULATIONS.md` gets a
condensed copy; the tests in `src/lib/fuel.test.ts` enforce it.

### Definitions

Fills for the vehicle, sorted ascending by odometer (ties broken by date):

| Symbol | Meaning | Unit |
|---|---|---|
| `odo_i` | odometer at fill *i* | km |
| `A_i` | amount paid at fill *i* | ₹ |
| `R_i` | rate at fill *i*, frozen at save | ₹/L |
| `L_i` | litres at fill *i*, `= A_i / R_i` | L |

Only fills with an odometer participate. A fuel expense without one is spending
only — it appears in fuel spend totals and in the "Without km" filter, and is
invisible to every distance and mileage figure.

### Segments

A **segment** is the stretch between two consecutive fills. The litres added at
a fill replace the fuel burned reaching it, so a segment's fuel is the litres
of the **later** fill:

```text
segment i:  fill i → fill i+1

  distance_i = odo_(i+1) − odo_i          km
  mileage_i  = distance_i / L_(i+1)       km/L
  cost_i     = A_(i+1) / distance_i       ₹/km
```

**Why the later fill.** This is the standard fill-to-fill convention and is
exact when every fill is to full. Under partial top-ups it is approximate for
any single segment — the error is the difference in tank level between the two
stops — but those errors are of alternating sign and cancel as fills
accumulate. Attributing the *earlier* fill's litres instead would be wrong in
the same magnitude and would additionally lag by one segment.

The first fill has no predecessor. It yields no segment and is displayed as a
starting point, not as a mileage of zero.

### Lifetime averages

The lifetime figures are **not** the arithmetic mean of the segment figures.
Doing that would weight a 20 km hop equally with a 300 km run. They are
totals over totals:

```text
                  Σ distance_i            odo_last − odo_first
overall kmpl  =  ──────────────────  =  ──────────────────────────
                  Σ L_(i+1)              Σ litres of fills 2…last

                  Σ A_(i+1)
overall ₹/km  =  ──────────────────
                  Σ distance_i
```

Both sums run over **included** segments only. Excluding a segment removes its
distance from the numerator and its litres from the denominator together, so
dropping a bad row never distorts the remaining ones.

The right-hand simplification for kmpl holds only when every segment is
included; when any is excluded, the summed form is authoritative. The
implementation always computes the summed form.

### Plausibility flagging

Each vehicle carries a plausible range. For the Activa 125: **35–65 kmpl**.

A segment is auto-flagged when `mileage_i` falls outside that range. Flagged
segments are excluded from both lifetime sums and are shown with a "looks off —
missed a fill?" note and a control to include them anyway.

`includeInAverage` on the later fill records a user override:

| Value | Meaning |
|---|---|
| `undefined` | auto — included if in range, excluded if not |
| `true` | force include, even if out of range |
| `false` | force exclude, even if in range |

This exists because the dominant failure is a **forgotten fill**: an unlogged
stop makes the next segment's distance cover fuel that was never recorded,
producing an inflated and entirely believable mileage that silently drags the
lifetime average upward. Range checking catches it without asking the user to
remember anything at the pump.

### Confidence

Partial-fill averaging needs several segments to settle. The UI labels the
lifetime figure:

| Included segments | Label |
|---|---|
| 0 | no mileage yet |
| 1–3 | `provisional · N fill(s)` |
| 4+ | no qualifier |

### Guards

| Condition | Behaviour |
|---|---|
| `odo_(i+1) <= odo_i` | rejected at input: an odometer cannot go backwards |
| `L_(i+1) <= 0` | segment produces no mileage; not an error, excluded |
| `distance_i == 0` | segment produces no mileage or cost; excluded |
| `R <= 0` | rejected at input |
| fewer than 2 fills with odometer | no averages; card shows the empty state |

Input validation and the pure functions guard the same conditions on purpose.
Validation stops a user creating bad data; the guards in `fuel.ts` still hold
because records also arrive from sync, from another device running an older
build, and from recycle-bin restores — none of which pass through this form.

### Worked example — the user's real data

```text
17 Aug 22:00   ₹200   42166 km   R = 105.00 → L = 1.905
20 Aug 00:25   ₹150   42242 km   R = 105.00 → L = 1.429

segment 1:  distance = 42242 − 42166 = 76 km
            mileage  = 76 / 1.429     = 53.2 kmpl   (in range, included)
            cost     = 150 / 76       = ₹1.97/km

overall kmpl = 76 / 1.429 = 53.2      labelled "provisional · 1 fill"
overall ₹/km = 150 / 76   = ₹1.97
```

The 17 Aug fill is the chain start and shows no mileage — correct, because the
user confirmed they did not record the fill before it. Its litres never enter
any denominator.

## Architecture

```text
ExpenseForm (category === "Fuel")
  ├─ odometer, rate, amount
  ├─ rate prefill:  useFuelRate()
  │     1. GET /api/fuel-price?city=…      live, when configured
  │     2. last fill's ratePerLitre        always available offline
  │     3. blank, user types               fallback of last resort
  └─ addExpense({ …, fuel: { odometerKm, litres, ratePerLitre, rateSource } })

src/lib/fuel.ts   (pure, no React, no fetch)
  buildSegments(fills, vehicle)  → Segment[]
  fuelSummary(expenses, vehicle, filter) → FuelSummary

  ├─ FuelCard      dashboard
  └─ FuelReport    analytics
```

### Modules

| Module | Path | Responsibility |
|---|---|---|
| Fuel math | `src/lib/fuel.ts` | Segments, lifetime averages, flagging, confidence. Pure functions over already-loaded expenses, unit-testable without React or Mongo. |
| Fuel math tests | `src/lib/fuel.test.ts` | Enforces this document. |
| Rate prefill hook | `src/features/fuel/use-fuel-rate.ts` | The three-step fallback chain. Owns all network concern so `fuel.ts` stays pure. |
| Rate route | `src/app/api/fuel-price/route.ts` | Server-side rate lookup. Returns `{ configured: false }` when no key is set. |
| Dashboard card | `src/features/fuel/fuel-card.tsx` | Glance view. |
| Report | `src/features/fuel/fuel-report.tsx` | Stats, trend, fill list, filter. |
| Form fields | `src/features/expenses/expense-form.tsx` | Fuel fields, shown only for the `Fuel` category. |

### Why the rate lookup is a server route

The provider key must not reach the browser, and a client-side call to a
third-party host would be blocked by the app's own origin rules. The route also
gives one place to swap providers later without touching any component.

## The rate lookup

There is no official free government API for daily city-wise Indian retail
prices. PPAC publishes the data and `data.gov.in` carries metro-city datasets,
but neither is a per-city daily API. Working options are all third-party and
all need a signed-up key.

So the route is built now and the provider is a plug-in behind it:

```text
GET /api/fuel-price?city=Surat

  no FUEL_PRICE_API_KEY   → 200 { configured: false }
  key set, provider ok    → 200 { configured: true, rate: 104.9, city, date }
  key set, provider fails → 200 { configured: false }   never a 5xx
```

The route never fails the request. A rate lookup is a convenience on top of a
field the user can always type, and a fuel entry must remain recordable while
standing at a pump with no signal. The hook falls through to the last used rate
on anything other than a `configured: true` response.

Rate limiting reuses `consumeRateLimit` with a `fuel-price` scope.

## Data model

### `Expense.fuel`

```ts
export interface FuelFill {
  /**
   * Odometer reading in km at this fill. Optional: a user who did not read the
   * meter still gets their litres and rate recorded, and the entry counts
   * toward fuel spend. It simply takes no part in any distance figure.
   */
  odometerKm?: number;
  /** Frozen at save. Never re-derived from a later price. */
  litres: number;
  /** Frozen at save. Kept so an odd figure can be traced to its rate. */
  ratePerLitre: number;
  rateSource: "live" | "last-used" | "manual";
  /** User override of the plausibility flag. Undefined = automatic. */
  includeInAverage?: boolean;
}
```

`Expense` gains `fuel?: FuelFill`. The field is optional throughout, so every
existing expense stays valid and no migration runs.

### `SalaryProfile`

```ts
  city?: string;
  vehicle?: Vehicle;

export interface Vehicle {
  name: string;        // "Activa 125"
  year?: number;       // 2021
  minKmpl: number;     // 35
  maxKmpl: number;     // 65
}
```

`SalaryProfile` already carries `customCategories`, so it is the established
home for app-level user settings and it already syncs as `profile`.

### Mongoose

`ExpenseSchema` gains a `fuel` sub-schema with `{ _id: false }`, matching how
`shared` is already modelled. `SalaryProfileSchema` gains `city` and a
`vehicle` sub-schema. Both are optional; existing documents need no backfill.

## Filtering

The report's filter is three-way and drives both the list and the stats:

| Filter | List shows | Mileage stats |
|---|---|---|
| All | every `Fuel` expense | computed from the km-bearing subset |
| With km | fills that have `fuel.odometerKm` | computed |
| Without km | fuel expenses with no odometer | `—` with the reason shown |

Spend totals are always available under every filter. Mileage and ₹/km are
shown as `—` with an explanation rather than a fabricated number whenever the
active filter leaves fewer than two km-bearing fills. Printing a plausible
figure derived from an empty set is the failure mode this rule exists to
prevent.

## UI

### Dashboard card

```text
⛽  Activa 125 · 2021
    53.2 kmpl              ₹1.97 / km
    provisional · 1 fill
    ──────────────────────────────────
    Last fill  20 Aug · ₹150 · 42242 km
    This cycle ₹350 · 76 km tracked
```

Rendered only when at least one `Fuel` expense exists, so users who never buy
fuel see no dead card. With fuel expenses but no odometer anywhere, it shows
spend and a prompt to add a reading next time.

### Analytics report

A stat row (lifetime kmpl, ₹/km, fuel spend this financial year, km tracked),
a mileage-per-fill trend line reusing the existing chart components and
`CHART_COLORS`, and the fill list with the filter above. Flagged rows carry the
warning inline with the include control next to it.

### Expense form

Fuel fields appear only when the category is `Fuel`, in one bordered group
consistent with the existing "Split details" block. Odometer is optional and
labelled as such — the point is that a lazy entry still records the spend.

## Error handling

| Case | Behaviour |
|---|---|
| Odometer ≤ previous fill's | Field error naming the previous reading; save blocked |
| Rate ≤ 0 or blank with no fallback | Field error; save blocked |
| Rate route unreachable or unconfigured | Silent fall-through to last used rate; no error surfaced |
| Amount fails `expenseAmountIsValid` | Existing expense validation, unchanged |
| Account balance too low | Existing `addExpense` rejection, unchanged |
| Fuel expense edited to a non-fuel category | `fuel` is dropped from the record |

## Testing

`src/lib/fuel.test.ts`, written before the implementation:

- Single fill yields no segment and no average, not a zero.
- Two fills reproduce the worked example above to within rounding.
- Lifetime average over uneven segments differs from the mean of segment
  mileages, and matches the totals-over-totals form. This is the test that
  pins the weighting.
- An out-of-range segment is flagged and excluded; the lifetime figure equals
  what it would be with that fill absent.
- `includeInAverage: true` readmits a flagged segment; `false` drops an
  in-range one.
- Fills with no odometer are ignored by every distance calculation and still
  counted in spend.
- Odometer equal to the previous reading produces no divide-by-zero.
- Zero or negative litres produce no segment rather than `Infinity`.
- Fills supplied out of date order are sorted before segmenting.
- Confidence label crosses from provisional to plain at four included
  segments.

Filter behaviour is covered in the same file through `fuelSummary`, since it is
a pure argument to it.

## Deferred

- Multiple vehicles.
- OCR of the meter photo to read the odometer.
- Live rate provider selection — the route ships with the fallback chain and
  no provider wired until a key exists.
- Per-city rate history.
- A "fill to full" marker, which would let single segments be exact rather
  than converging.
