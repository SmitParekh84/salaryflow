/**
 * Read-only: which card rows were created by the 23 Aug fix run, and what the
 * cards look like WITHOUT them — i.e. what a device that never pulled still shows.
 *
 *   node scripts/fix-provenance.cjs <email>
 */
const fs = require('fs');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = process.argv[2] || 'smitparekh02@gmail.com';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const t = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) : '—');
const CUTOFF = new Date('2026-08-22T23:00:00Z'); // the fix run

function parseFinancialDate(v) {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(s);
}
function dayInMonth(y, mo, d) {
  return new Date(y, mo, Math.min(d, new Date(y, mo + 1, 0).getDate()), 12);
}
function usage(card, statementDay, expenses, incomes, now) {
  const cur = dayInMonth(now.getFullYear(), now.getMonth(), statementDay);
  const end = now <= cur ? cur : dayInMonth(now.getFullYear(), now.getMonth() + 1, statementDay);
  const prev = dayInMonth(end.getFullYear(), end.getMonth() - 1, statementDay);
  const start = new Date(prev); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
  const rec = expenses.filter(e => parseFinancialDate(e.date) <= now);
  const charges = rec.reduce((s, e) => s + e.amount, 0);
  const billedCharges = rec.filter(e => parseFinancialDate(e.date) < start).reduce((s, e) => s + e.amount, 0);
  const currentCharges = charges - billedCharges;
  const credits = incomes.filter(i => parseFinancialDate(i.date) <= now).reduce((s, i) => s + i.amount, 0);
  const billedOutstanding = Math.max(0, billedCharges - credits);
  const unused = Math.max(0, credits - billedCharges);
  const currentOutstanding = Math.max(0, currentCharges - unused);
  return { start, end, prev, billedCharges, currentCharges, credits, billedOutstanding, currentOutstanding };
}

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const cards = await db.collection('creditcards').find({ userId: U }).toArray();
  const expenses = await db.collection('expenses').find({ userId: U }).toArray();
  const incomes = await db.collection('incomes').find({ userId: U }).toArray();
  const now = new Date();

  for (const card of cards) {
    const id = String(card.clientId ?? card._id);
    const cardExp = expenses.filter(e => String(e.accountId) === id);
    const cardInc = incomes.filter(i => String(i.accountId) === id);
    const isNew = (r) => new Date(r.createdAt) >= CUTOFF;

    console.log(`\n######## ${card.name}  (statementDay now ${card.statementDay}) ########`);
    console.log('  rows CREATED by the 23 Aug fix run:');
    const created = [...cardExp, ...cardInc].filter(isNew);
    if (!created.length) console.log('    (none)');
    for (const r of created) {
      console.log(`    ${t(r.date).slice(0,10)} ${rs(r.amount).padStart(13)}  ${r.merchant ?? r.source ?? r.category ?? ''}  created ${t(r.createdAt)}`);
    }
    console.log('  rows TOMBSTONED by the fix run:');
    const gone = [...cardExp, ...cardInc].filter(r => r.removedAt);
    if (!gone.length) console.log('    (none)');
    for (const r of gone) {
      console.log(`    ${t(r.date).slice(0,10)} ${rs(r.amount).padStart(13)}  ${r.merchant ?? r.source ?? r.category ?? ''}  removed ${t(r.removedAt)}`);
    }

    const liveExp = cardExp.filter(e => !e.removedAt);
    const liveInc = cardInc.filter(i => !i.removedAt);
    const staleExp = cardExp.filter(e => !isNew(e));           // device never saw the new rows...
    const staleInc = cardInc.filter(i => !isNew(i));           // ...and still has the deleted one
    const staleDay = card.name.startsWith('ICICI') ? 26 : card.statementDay;

    const after = usage(card, card.statementDay, liveExp, liveInc, now);
    const before = usage(card, staleDay, staleExp, staleInc, now);

    console.log(`\n  SERVER now (statementDay ${card.statementDay}):`);
    console.log(`     due-now ${rs(after.billedOutstanding)}   accruing ${rs(after.currentOutstanding)}   period from ${after.start.toDateString()}`);
    console.log(`  HIS DEVICE, never pulled (statementDay ${staleDay}, no fix rows):`);
    console.log(`     due-now ${rs(before.billedOutstanding)}   accruing ${rs(before.currentOutstanding)}   period from ${before.start.toDateString()}`);
  }

  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
