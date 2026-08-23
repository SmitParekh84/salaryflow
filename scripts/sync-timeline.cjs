/**
 * Read-only: when was each row last written, and by what.
 *
 * The sync merge is item-level last-writer-wins with no version check, so a
 * device holding a stale copy silently overwrites a server-side fix. This
 * prints the write timeline so a reverted fix is visible rather than inferred.
 *
 *   node scripts/sync-timeline.cjs <email>
 */
const fs = require('fs');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = process.argv[2] || 'smitparekh02@gmail.com';
const t = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) : '—');

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const live = { userId: U, removedAt: null };

  console.log('=== CREDIT CARDS: full docs with timestamps ===');
  for (const c of await db.collection('creditcards').find({ userId: U }).toArray()) {
    console.log(`  ${c.name}  statementDay=${c.statementDay}  status=${c.status}`);
    console.log(`     created ${t(c.createdAt)}   updated ${t(c.updatedAt)}   removedAt ${t(c.removedAt)}`);
  }

  console.log('\n=== LAST WRITE PER COLLECTION ===');
  for (const name of ['expenses', 'incomes', 'bills', 'bankaccounts', 'creditcards', 'goals', 'investments', 'budgetrules', 'recyclebins', 'salaryhistories']) {
    const newest = await db.collection(name).find({ userId: U }).sort({ updatedAt: -1 }).limit(1).toArray();
    const count = await db.collection(name).countDocuments(live);
    console.log(`  ${name.padEnd(18)} live=${String(count).padStart(4)}  newest updatedAt ${t(newest[0]?.updatedAt)}`);
  }

  console.log('\n=== WRITE HISTOGRAM (expenses+incomes, by minute of last write) ===');
  const rows = [
    ...(await db.collection('expenses').find({ userId: U }).toArray()),
    ...(await db.collection('incomes').find({ userId: U }).toArray()),
  ];
  const buckets = new Map();
  for (const r of rows) {
    const key = t(r.updatedAt).slice(0, 16);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  for (const [k, v] of [...buckets.entries()].sort()) console.log(`  ${k}  ${v} rows`);

  console.log('\n=== TOMBSTONED (removedAt set) rows on the cards ===');
  const cards = await db.collection('creditcards').find({ userId: U }).toArray();
  const ids = new Set(cards.map(c => String(c.clientId ?? c._id)));
  for (const name of ['expenses', 'incomes']) {
    const gone = await db.collection(name).find({ userId: U, removedAt: { $ne: null } }).toArray();
    for (const g of gone.filter(g => ids.has(String(g.accountId)))) {
      console.log(`  ${name}  ${t(g.date).slice(0,10)}  Rs ${g.amount}  ${g.merchant ?? g.source ?? g.category ?? ''}  removedAt ${t(g.removedAt)}`);
    }
  }

  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
