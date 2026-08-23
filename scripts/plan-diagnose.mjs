/**
 * Read-only: run the app's real buildFundingPlan() against live Atlas data.
 *
 * The point is to see the exact items the salary plan renders, computed by the
 * same code the browser runs, so "it is not showing" can be traced to either
 * the data, the calculation, or the device's local copy.
 *
 *   node --import ./scripts/ts-alias-hook.mjs scripts/plan-diagnose.mjs <email>
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { buildFundingPlan } from "@/lib/funding-plan";
import { creditCardUsage } from "@/lib/credit-cards";

const uri = fs
  .readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("MONGODB_URI="))
  .slice("MONGODB_URI=".length)
  .trim();
const U = process.argv[2] || "smitparekh02@gmail.com";
const rs = (n) => "Rs " + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Mirrors the store's normalizeServerItems: clientId is the id the app uses. */
const SERVER_ONLY = ["_id", "clientId", "userId", "removedAt", "createdAt", "updatedAt"];
const norm = (rows) =>
  rows.map((r) => {
    const out = { ...r, id: String(r.clientId ?? r._id) };
    for (const key of SERVER_ONLY) delete out[key];
    for (const key of ["date", "dueDate", "balanceVerifiedAt"]) {
      if (out[key] instanceof Date) out[key] = out[key].toISOString();
    }
    return out;
  });

await mongoose.connect(uri);
const db = mongoose.connection.db;
const live = { userId: U, removedAt: null };
const [expenses, incomes, bills, investments, accounts, creditCards, budgetRules, profile] =
  await Promise.all([
    db.collection("expenses").find(live).toArray(),
    db.collection("incomes").find(live).toArray(),
    db.collection("bills").find(live).toArray(),
    db.collection("investments").find(live).toArray(),
    db.collection("bankaccounts").find(live).toArray(),
    db.collection("creditcards").find(live).toArray(),
    db.collection("budgetrules").find(live).toArray(),
    db.collection("salaryprofiles").findOne({ userId: U }),
  ]);

const cards = norm(creditCards);
const exp = norm(expenses);
const inc = norm(incomes);
const rules = norm(budgetRules);
const now = new Date();

console.log("NOW:", now.toString());
console.log("\n=== creditCardUsage() per card, from the real module ===");
for (const card of cards) {
  const u = creditCardUsage(card, exp, inc, now);
  console.log(
    `  ${card.name.padEnd(26)} status=${card.status}  due-now=${rs(u.billedOutstanding).padStart(13)}  accruing=${rs(u.currentOutstanding).padStart(13)}  total=${rs(u.outstanding)}`,
  );
  console.log(
    `      period ${u.start.toDateString()} .. ${u.end.toDateString()}   prev close ${u.previousStatementEnd.toDateString()}`,
  );
}

const salary = profile?.amount ?? 0;
const plan = buildFundingPlan({
  accounts: norm(accounts),
  bills: norm(bills),
  creditCards: cards,
  expenses: exp,
  incomes: inc,
  investments: norm(investments),
  budgetRule: rules.find((r) => r.active),
  monthlyIncome: salary,
  savedThisCycle: 0,
  now,
});

console.log(`\n=== buildFundingPlan() items (salary = ${rs(salary)}) ===`);
for (const item of plan.items) {
  console.log(
    `  [${item.kind.padEnd(12)}] ${item.label.padEnd(42)} ${rs(item.amount).padStart(13)}  remaining ${rs(item.remainingAmount).padStart(13)}  | ${item.timing}`,
  );
}
console.log(`\n  plannedTotal ${rs(plan.plannedTotal)}   still-to-set-aside ${rs(plan.total)}`);
console.log(`  everyday ${rs(plan.everyday.amount)} (${plan.everyday.source})`);

console.log("\n=== credit-card items specifically ===");
const cardItems = plan.items.filter((i) => i.kind === "credit-card");
console.log(cardItems.length ? cardItems.map((i) => `  ${i.id}  ${i.label}  ${rs(i.amount)}`).join("\n") : "  NONE — no card appears in the plan");

await mongoose.disconnect();
