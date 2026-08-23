/**
 * Read-only diagnosis of the credit-card module for one user.
 * Reproduces creditCardUsage() exactly as the app computes it, then prints the
 * raw rows it was computed from, so a wrong figure can be traced to its source.
 *
 *   node cc-diagnose.cjs <email>
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const repo = 'C:/projects/Expencs';
const uri = fs.readFileSync(path.join(repo, '.env.local'), 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = process.argv[2] || 'smitparekh02@gmail.com';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const d10 = (v) => (v == null ? '—' : String(v instanceof Date ? v.toISOString() : v).slice(0, 10));

function parseFinancialDate(value) {
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date(s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}
function dayInMonth(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 12);
}
function statementPeriod(card, now) {
  const currentStatement = dayInMonth(now.getFullYear(), now.getMonth(), card.statementDay);
  const statementEnd = now <= currentStatement
    ? currentStatement
    : dayInMonth(now.getFullYear(), now.getMonth() + 1, card.statementDay);
  const previousStatement = dayInMonth(statementEnd.getFullYear(), statementEnd.getMonth() - 1, card.statementDay);
  const start = new Date(previousStatement); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
  const end = new Date(statementEnd); end.setHours(23, 59, 59, 999);
  const previousStatementEnd = new Date(previousStatement); previousStatementEnd.setHours(23, 59, 59, 999);
  return { start, end, previousStatementEnd };
}

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const q = { userId: U, removedAt: null };
  const [cards, expenses, incomes, bills, accounts] = await Promise.all([
    db.collection('creditcards').find({ userId: U }).toArray(),
    db.collection('expenses').find(q).toArray(),
    db.collection('incomes').find(q).toArray(),
    db.collection('bills').find(q).toArray(),
    db.collection('bankaccounts').find(q).toArray(),
  ]);
  const now = new Date();
  console.log('NOW:', now.toString(), '\n');

  console.log('=== CREDIT CARDS (all, including removed/closed) ===');
  for (const c of cards) {
    console.log(`  id=${String(c.clientId ?? c._id)}  ${c.name} / ${c.bankName}  limit=${rs(c.creditLimit)}  statementDay=${c.statementDay}  status=${c.status}  removedAt=${c.removedAt ?? 'null'}`);
  }

  console.log('\n=== BANK ACCOUNTS (defaultFor matters for the plan) ===');
  for (const a of accounts) {
    console.log(`  id=${String(a.clientId ?? a._id)}  ${a.bankName}  ${rs(a.balance)}  status=${a.status}  defaultFor=${JSON.stringify(a.defaultFor ?? [])}`);
  }

  for (const card of cards) {
    const id = String(card.clientId ?? card._id);
    const { start, end, previousStatementEnd } = statementPeriod(card, now);
    const isRecorded = (date) => parseFinancialDate(date) <= now;
    const cardCharges = expenses.filter(e => String(e.accountId) === id);
    const recorded = cardCharges.filter(e => isRecorded(e.date));
    const future = cardCharges.filter(e => !isRecorded(e.date));
    const charges = recorded.reduce((s, e) => s + e.amount, 0);
    const billedList = recorded.filter(e => parseFinancialDate(e.date) < start);
    const billedCharges = billedList.reduce((s, e) => s + e.amount, 0);
    const currentList = recorded.filter(e => parseFinancialDate(e.date) >= start);
    const currentCharges = charges - billedCharges;
    const cardCredits = incomes.filter(i => String(i.accountId) === id);
    const recCredits = cardCredits.filter(i => isRecorded(i.date));
    const credits = recCredits.reduce((s, i) => s + i.amount, 0);
    const billedOutstanding = Math.max(0, billedCharges - credits);
    const unusedCredits = Math.max(0, credits - billedCharges);
    const currentOutstanding = Math.max(0, currentCharges - unusedCredits);

    console.log(`\n\n######## ${card.name} (${card.bankName})  status=${card.status} ########`);
    console.log(`  statement period : ${d10(start)} .. ${d10(end)}   (prev close ${d10(previousStatementEnd)})`);
    console.log(`  charges(all recorded)  ${rs(charges)}   over ${recorded.length} rows`);
    console.log(`  billedCharges (< start) ${rs(billedCharges)}  over ${billedList.length} rows`);
    console.log(`  currentCharges (>=start)${rs(currentCharges)}  over ${currentList.length} rows`);
    console.log(`  credits (ALL TIME)      ${rs(credits)}  over ${recCredits.length} rows`);
    console.log(`  -> billedOutstanding    ${rs(billedOutstanding)}   [shows as "statement due"]`);
    console.log(`  -> currentOutstanding   ${rs(currentOutstanding)}  [shows as "accruing"]`);
    console.log(`  -> outstanding total    ${rs(billedOutstanding + currentOutstanding)}`);
    if (future.length) {
      console.log(`  !! ${future.length} future-dated charges NOT counted: ` +
        future.map(e => `${d10(e.date)} ${rs(e.amount)} ${e.description ?? ''}`).join(' | '));
    }

    console.log('  --- charges on this card, newest first ---');
    for (const e of [...recorded].sort((a, b) => parseFinancialDate(b.date) - parseFinancialDate(a.date)).slice(0, 40)) {
      const bucket = parseFinancialDate(e.date) < start ? 'BILLED ' : 'current';
      console.log(`    ${bucket} ${d10(e.date)} ${rs(e.amount).padStart(13)}  ${e.description ?? e.category ?? ''}`);
    }
    if (recorded.length > 40) console.log(`    ... ${recorded.length - 40} older rows not shown`);

    console.log('  --- payments/credits recorded against this card (incomes) ---');
    if (!recCredits.length) console.log('    (none)');
    for (const i of [...recCredits].sort((a, b) => parseFinancialDate(b.date) - parseFinancialDate(a.date))) {
      console.log(`    ${d10(i.date)} ${rs(i.amount).padStart(13)}  ${i.source ?? i.description ?? ''}`);
    }
  }

  console.log('\n\n=== BILLS ===');
  for (const b of bills) {
    console.log(`  ${String(b.clientId ?? b._id)}  ${b.name.padEnd(28)} ${rs(b.amount).padStart(12)}  freq=${b.frequency} cat=${b.category} dueDay=${b.dueDay} dueDate=${d10(b.dueDate)} paid=${b.paid} accountId=${b.accountId ?? '—'}`);
  }

  console.log('\n=== EXPENSES NOT ON ANY KNOWN ACCOUNT (orphans) ===');
  const known = new Set([...cards, ...accounts].map(x => String(x.clientId ?? x._id)));
  const orphans = expenses.filter(e => e.accountId && !known.has(String(e.accountId)));
  console.log(orphans.length ? orphans.map(e => `  ${d10(e.date)} ${rs(e.amount)} acct=${e.accountId} ${e.description ?? ''}`).join('\n') : '  (none)');

  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
