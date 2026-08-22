# Importing a bank statement

The app takes one import file. Producing that file from a bank PDF happens
outside the app, because banks disagree about almost everything and none of that
belongs in code the app reasons about.

## Why the parsing lives outside

| Bank | What the PDF gives you |
|---|---|
| ICICI | Withdrawal and deposit are separate columns that collapse into the same position in a text extract. **Direction has to be inferred from the running balance.** |
| Bank of Baroda | Explicit debit and credit columns, but the balance column is offset by one row, and the page header splits a row every 18 lines. Payees are usually a bare UPI handle with no merchant name. |
| Axis (card) | Clean date / description / amount / direction. |

Every one of those needed a different reader. Baking them into the app would
mean a new bank is a code change; keeping them out means a new bank is a new
parser and the app never learns about it.

## The file format

```jsonc
{
  "version": 1,              // rejected if unrecognised, never guessed
  "generatedAt": "2026-08-23",
  "accounts":    [{ "key", "bankName", "accountType", "balance" }],
  "creditCards": [{ "key", "name", "bankName", "creditLimit", "statementDay" }],
  "expenses":    [{ "date", "amount", "account", "merchant", "category",
                    "paymentMethod", "source",
                    "shared": { "friendName", "groupTotal" },   // optional
                    "fuel":   { "odometerKm", "ratePerLitre" }  // optional
                 }],
  "incomes":     [{ "date", "amount", "account", "source", "type", "origin" }]
}
```

`account` on a row is an import **key**, not an id. It resolves to an account
created by this import, an existing account with the same bank name, or a card
with the same name.

## Rules the importer holds to

**Balances are set, never replayed.** Rows go in with `balanceApplied: false`
and each account is set to the balance stated in the file. The figures a bank
prints are closing balances that already account for every transaction; routing
the rows through `addExpense` would deduct them a second time and drive every
account thousands below where it really sits.

**Re-importing an overlapping period is safe.** A row is skipped when a record
already exists with the same day, amount and payee. Overlap is the normal case —
statements are pulled in ranges that touch — so the duplicate has to be the
cheap outcome. Two genuinely separate identical payments on one day will be
collapsed; that is the deliberate trade.

**Nothing is written until confirmed.** The summary counts what will actually
land, not what the file contains, so a file that is 90% duplicates says so.

## Things that must not become expenses

| Pattern | Why |
|---|---|
| CRED, CRED Club, BBPS | Credit-card **bill payments**. The purchases are already recorded against the card; importing the payment too counts the same money twice. |
| Self-transfers | Money moved between your own accounts. Not spending. Balances are set explicitly, so excluding them costs nothing. |
| Failed payments | The bank shows them; no money moved. |

In the 2026 import these were worth ₹56,527 and ₹204,973 respectively — large
enough to make every category report meaningless if mishandled.

## Known weakness

BOB and ICICI usually print a UPI handle such as `paytmqr6q9fzs@ptys` rather
than a merchant name. 372 of 480 rows in the first import had nothing to
categorise from and landed in **Other**. The named ones came through correctly.
Categorising by payee rather than by row is the obvious improvement, since 221
unique payees cover all 376 uncategorised rows and the top 40 cover half.
