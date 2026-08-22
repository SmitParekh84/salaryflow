/**
 * Dry run of an import against live data. Reads only; writes nothing.
 *
 * Matches on day and amount, deliberately ignoring the payee name. The same
 * payment is spelled differently by hand and by a bank ("BookMyShow" vs
 * "Bookmyshow", "Narnarayan Fuel" vs "Narnarayan Fuel Point"), and a name-aware
 * rule lets every one of those back in as a second copy.
 *
 *   node scripts/import-preflight.cjs <importFile> [email]
 */
const fs = require('fs');
const mongoose = require('mongoose');

const file = process.argv[2];
const U = process.argv[3] || 'smitparekh02@gmail.com';
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const near = (a, b) => Math.abs(a - b) <= 1.0; // a hand-typed amount is often rounded

(async () => {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const existing = await db.collection('expenses').find({ userId: U, removedAt: null }).toArray();

  const byDay = new Map();
  for (const e of existing) {
    const k = dayKey(e.date);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(e);
  }

  const exact = [], rounded = [], fresh = [];
  const claimed = new Set();
  for (const row of doc.expenses) {
    const sameDay = byDay.get(dayKey(row.date)) || [];
    const hit = sameDay.find((e) => !claimed.has(e._id) && near(e.amount, row.amount));
    if (!hit) { fresh.push(row); continue; }
    claimed.add(hit._id);
    (Math.abs(hit.amount - row.amount) < 0.005 ? exact : rounded).push({ row, hit });
  }

  console.log(`APP        ${existing.length} expenses   ${rs(existing.reduce((s, e) => s + e.amount, 0))}`);
  console.log(`FILE       ${doc.expenses.length} expenses   ${rs(doc.expenses.reduce((s, e) => s + e.amount, 0))}`);
  console.log(`\nMATCHED (already in the app, must NOT be imported again)`);
  console.log(`  same amount    ${exact.length}   ${rs(exact.reduce((s, d) => s + d.row.amount, 0))}`);
  console.log(`  rounded amount ${rounded.length}   ${rs(rounded.reduce((s, d) => s + d.row.amount, 0))}`);
  console.log(`GENUINELY NEW    ${fresh.length}   ${rs(fresh.reduce((s, r) => s + r.amount, 0))}`);

  if (rounded.length) {
    console.log('\nSAME PAYMENT, DIFFERENT SPELLING OR ROUNDING:');
    for (const d of rounded.slice(0, 25)) {
      console.log(`  ${dayKey(d.row.date)}  app ${rs(d.hit.amount).padStart(11)} "${String(d.hit.merchant || d.hit.category).slice(0,24)}"`);
      console.log(`  ${' '.repeat(10)}  bank ${rs(d.row.amount).padStart(10)} "${String(d.row.merchant).slice(0,24)}"`);
    }
  }

  const unmatched = existing.filter((e) => !claimed.has(e._id));
  console.log(`\nIN THE APP, NOT IN ANY STATEMENT: ${unmatched.length}   ${rs(unmatched.reduce((s, e) => s + e.amount, 0))}`);
  for (const e of unmatched.sort((a, b) => new Date(a.date) - new Date(b.date))) {
    console.log(`  ${dayKey(e.date)}  ${rs(e.amount).padStart(11)}  ${String(e.merchant || e.category).slice(0,30)}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
