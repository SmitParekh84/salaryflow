/**
 * Repairs the first import run, which wrongly collapsed same-day equal-amount
 * rows WITHIN the statement file (a statement never prints a transaction
 * twice). Replays the buggy dedupe and the corrected one deterministically and
 * inserts exactly the rows the bug dropped. Safe to run once; a second run
 * finds the rows present and inserts nothing.
 *
 *   node scripts/fix-dropped-rows.cjs
 */
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = 'smitparekh02@gmail.com';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const uid = (p) => p + '_' + crypto.randomBytes(6).toString('hex');
const dayKey = (d) => new Date(d).toDateString();

(async () => {
  const doc = JSON.parse(fs.readFileSync('C:/Users/LENOVO/Downloads/aartha-import.json', 'utf8'));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();

  const all = await db.collection('expenses').find({ userId: U, removedAt: null }).toArray();
  const accounts = await db.collection('bankaccounts').find({ userId: U, removedAt: null }).toArray();
  const cards = await db.collection('creditcards').find({ userId: U, removedAt: null }).toArray();

  // The imported batch shares one createdAt; everything else predates it.
  const counts = new Map();
  for (const e of all) counts.set(String(e.createdAt), (counts.get(String(e.createdAt)) || 0) + 1);
  const batchKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const preImport = all.filter((e) => String(e.createdAt) !== batchKey);
  const batchSize = counts.get(batchKey);
  if (batchSize < 300) {
    console.log(`Refusing: expected the ~387-row import batch, found ${batchSize}. Nothing written.`);
    process.exit(1);
  }

  // Replay the buggy dedupe (file rows pooled) to find what it dropped.
  const buckets = new Map();
  const put = (d, amt, origin) => {
    const k = dayKey(d);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ amt, taken: false, origin });
  };
  const claim = (d, amt) => {
    const hit = (buckets.get(dayKey(d)) || []).find((x) => !x.taken && Math.abs(x.amt - amt) <= 1);
    if (hit) { hit.taken = true; return hit.origin; }
    return null;
  };
  for (const e of preImport) put(e.date, e.amount, 'app');

  const dropped = [];
  for (const row of doc.expenses) {
    const origin = claim(row.date, row.amount);
    if (origin === 'file') dropped.push(row);
    else if (origin === null) put(row.date, row.amount, 'file');
  }

  // Idempotence: skip any that a previous repair already inserted.
  const repaired = new Set(
    all.filter((e) => e.note && String(e.note).endsWith('(repaired)'))
      .map((e) => dayKey(e.date) + '|' + e.amount.toFixed(2) + '|' + e.merchant),
  );
  const toInsert = dropped.filter(
    (r) => !repaired.has(dayKey(r.date) + '|' + r.amount.toFixed(2) + '|' + r.merchant),
  );

  const refOf = (r) => String(r.clientId ?? r._id);
  const keyToRef = new Map();
  for (const a of doc.accounts) {
    const hit = accounts.find((x) => x.bankName.toLowerCase() === a.bankName.toLowerCase());
    if (hit) keyToRef.set(a.key, refOf(hit));
  }
  for (const c of doc.creditCards) {
    const hit = cards.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (hit) keyToRef.set(c.key, refOf(hit));
  }

  console.log(`rows the buggy run dropped: ${dropped.length} (${rs(dropped.reduce((s, r) => s + r.amount, 0))})`);
  console.log(`inserting now: ${toInsert.length}`);
  for (const r of toInsert) console.log(`  ${r.date}  ${rs(r.amount).padStart(10)}  ${r.merchant}`);

  if (toInsert.length) {
    await db.collection('expenses').insertMany(
      toInsert.map((row) => ({
        userId: U, clientId: uid('exp'), removedAt: null,
        amount: row.amount, category: row.category, merchant: row.merchant,
        paymentMethod: row.paymentMethod, date: new Date(row.date + 'T12:00:00'),
        note: row.source + ' (repaired)', recurring: false, favorite: false,
        balanceApplied: false, accountId: keyToRef.get(row.account),
        createdAt: now, updatedAt: now,
      })),
      { ordered: false },
    );
  }

  const nExp = await db.collection('expenses').countDocuments({ userId: U, removedAt: null });
  const sum = await db.collection('expenses').aggregate([
    { $match: { userId: U, removedAt: null } },
    { $group: { _id: null, t: { $sum: '$amount' } } },
  ]).toArray();
  console.log(`\nAFTER: ${nExp} expenses, ${rs(sum[0].t)}`);
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
