/**
 * Makes the credit-card module tell the truth, and puts salary where the app
 * reads it. Every step checks before writing — safe to run twice.
 *
 *   1. Axis: opening-balance charge Rs 7,834.66 (10 Jul) — the purchases the
 *      recorded BBPS payment paid off. Without them the credit cancels the
 *      current bill and the app shows Rs 0 due while Rs 3,440.91 is owed.
 *   2. Removes the duplicate Rs 29 Google Play (hand-entered 17 Aug; the card
 *      statement has it on 16 Aug — cross-day, so dedupe could not see it).
 *   3. BookMyShow 855 -> 855.64 and Vercel 1,124.70 -> 1,123.70 (bank figures).
 *   4. Repairs the two 22 Aug shared totals (user+friend must equal total).
 *   5. Moves the 4 salary credits from incomes into salaryhistories
 *      (confirmed) — the cycle math and reports read only salaryhistories.
 *
 * Verifies at the end: both cards must reconcile to the paisa.
 *
 *   node scripts/reconcile-fixes.cjs
 */
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = 'smitparekh02@gmail.com';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const uid = (p) => p + '_' + crypto.randomBytes(6).toString('hex');

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();
  const cards = await db.collection('creditcards').find({ userId: U, removedAt: null }).toArray();
  const axis = cards.find((c) => /axis/i.test(c.name));
  const axisRef = String(axis.clientId ?? axis._id);

  // 1. Axis opening balance
  const opening = await db.collection('expenses').findOne({
    userId: U, removedAt: null, merchant: /opening balance/i, accountId: axisRef,
  });
  if (opening) console.log('1. Axis opening balance already present');
  else {
    await db.collection('expenses').insertOne({
      userId: U, clientId: uid('exp'), removedAt: null,
      amount: 7834.66, category: 'Other', merchant: 'Opening balance (before 14 Jul statement)',
      paymentMethod: 'Card', date: new Date(2026, 6, 10, 12),
      note: 'Carried so the recorded bill payment has the purchases it paid off',
      recurring: false, favorite: false, balanceApplied: false, accountId: axisRef,
      createdAt: now, updatedAt: now,
    });
    console.log('1. Axis opening balance Rs 7,834.66 added (10 Jul)');
  }

  // 2. Duplicate Google Play
  const dup = await db.collection('expenses').findOne({
    userId: U, removedAt: null, amount: 29, merchant: /google play/i,
    date: { $gte: new Date(2026, 7, 17), $lt: new Date(2026, 7, 18) },
    note: { $not: /screenshot/i },
  });
  if (dup) {
    await db.collection('expenses').updateOne({ _id: dup._id }, { $set: { removedAt: now, updatedAt: now } });
    console.log('2. duplicate Rs 29 Google Play (17 Aug) removed');
  } else console.log('2. no duplicate Google Play found (already removed)');

  // 3. Amount corrections to the bank figures
  for (const [pat, from, to] of [[/bookmyshow/i, 855, 855.64], [/aartha\.app|vercel/i, 1124.7, 1123.7]]) {
    const row = await db.collection('expenses').findOne({ userId: U, removedAt: null, merchant: pat, amount: from });
    if (!row) { console.log(`3. ${pat} already at the bank figure`); continue; }
    await db.collection('expenses').updateOne({ _id: row._id }, {
      $set: { amount: to, note: (row.note ? row.note + ' · ' : '') + 'amount corrected to bank figure', updatedAt: now },
    });
    console.log(`3. ${row.merchant}: ${rs(from)} -> ${rs(to)}`);
  }

  // 4. Shared totals: user + friend must equal the total
  for (const [pat, amount, total] of [[/umesh/i, 1000, 1000], [/palladium/i, 500, 500]]) {
    const row = await db.collection('expenses').findOne({
      userId: U, removedAt: null, merchant: pat, amount, 'shared.totalAmount': 1500,
    });
    if (!row) { console.log(`4. ${pat} shared total already consistent`); continue; }
    await db.collection('expenses').updateOne({ _id: row._id }, {
      $set: { 'shared.totalAmount': total, updatedAt: now },
    });
    console.log(`4. ${row.merchant}: shared total 1,500 -> ${rs(total)}`);
  }

  // 5. Salary -> salaryhistories
  const salaryIncomes = await db.collection('incomes').find({ userId: U, removedAt: null, type: 'Salary' }).toArray();
  for (const inc of salaryIncomes) {
    const d = new Date(inc.date);
    const exists = await db.collection('salaryhistories').findOne({
      userId: U, amount: inc.amount,
      date: { $gte: new Date(d.getTime() - 86400000), $lte: new Date(d.getTime() + 86400000) },
    });
    if (!exists) {
      await db.collection('salaryhistories').insertOne({
        userId: U, amount: inc.amount, date: inc.date, source: 'Salary credit (ICICI statement)',
        confirmed: true, varianceKind: 'none', createdAt: now, updatedAt: now,
      });
    }
    await db.collection('incomes').updateOne({ _id: inc._id }, { $set: { removedAt: now, updatedAt: now } });
    console.log(`5. salary ${String(inc.date).slice(4, 15)} ${rs(inc.amount)} -> salaryhistories (confirmed)`);
  }
  if (!salaryIncomes.length) console.log('5. no Salary-type incomes left to migrate');

  // --- verify: both cards must reconcile to the paisa ---
  console.log('\nVERIFY');
  const expenses = await db.collection('expenses').find({ userId: U, removedAt: null }).toArray();
  const incomes = await db.collection('incomes').find({ userId: U, removedAt: null }).toArray();
  for (const [pat, day, expBilled, expCurrent] of [[/icici/i, 20, 3275.11, 416.0], [/axis/i, 13, 3440.91, 2753.5]]) {
    const card = cards.find((c) => pat.test(c.name));
    const ref = String(card.clientId ?? card._id);
    const periodStart = new Date(2026, 7, day + 1);
    const rows = expenses.filter((e) => String(e.accountId) === ref);
    const billed = rows.filter((e) => new Date(e.date) < periodStart).reduce((s, e) => s + e.amount, 0);
    const current = rows.filter((e) => new Date(e.date) >= periodStart).reduce((s, e) => s + e.amount, 0);
    const credits = incomes.filter((i) => String(i.accountId) === ref).reduce((s, i) => s + i.amount, 0);
    const billedOut = Math.max(0, Math.round((billed - credits) * 100) / 100);
    const currentOut = Math.max(0, Math.round((current - Math.max(0, credits - billed)) * 100) / 100);
    const ok = Math.abs(billedOut - expBilled) < 0.01 && Math.abs(currentOut - expCurrent) < 0.01;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${card.name}: due ${rs(billedOut)} (bill ${rs(expBilled)}) · accruing ${rs(currentOut)} (expected ${rs(expCurrent)})`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
