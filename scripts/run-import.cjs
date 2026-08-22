/**
 * Server-side execution of aartha-import.json for one user, replicating the
 * app's applyImport + sync merge exactly: rows upserted with fresh clientIds,
 * balanceApplied false, balances set through the correction semantics (stamp +
 * signed adjustment). Duplicates are skipped on day + amount within one rupee,
 * consuming, the same rule the in-app importer uses — safe to re-run.
 *
 *   node scripts/run-import.cjs
 */
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = 'smitparekh02@gmail.com';
const FILE = 'C:/Users/LENOVO/Downloads/aartha-import.json';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const uid = (p) => p + '_' + crypto.randomBytes(6).toString('hex');
const dayKey = (d) => new Date(d).toDateString();

(async () => {
  const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();

  const accounts = await db.collection('bankaccounts').find({ userId: U, removedAt: null }).toArray();
  const cards = await db.collection('creditcards').find({ userId: U, removedAt: null }).toArray();
  const existingExp = await db.collection('expenses').find({ userId: U, removedAt: null }).toArray();
  const existingInc = await db.collection('incomes').find({ userId: U, removedAt: null }).toArray();

  // --- resolve import keys to the ids the app itself uses for linking ---
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
  const unresolved = new Set(doc.expenses.map((e) => e.account).filter((k) => !keyToRef.has(k)));
  if (unresolved.size) {
    console.log('UNRESOLVED ACCOUNT KEYS, aborting with no writes:', [...unresolved]);
    process.exit(1);
  }

  // --- dedupe: day + amount within Rs 1, consuming, same as the app ---
  const buckets = new Map();
  const put = (d, amt) => {
    const k = dayKey(d);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ amt, taken: false });
  };
  const claim = (d, amt) => {
    const hit = (buckets.get(dayKey(d)) || []).find((x) => !x.taken && Math.abs(x.amt - amt) <= 1);
    if (hit) { hit.taken = true; return true; }
    return false;
  };

  for (const e of existingExp) put(e.date, e.amount);
  const expDocs = [];
  let skipped = 0;
  for (const row of doc.expenses) {
    // Only records already held may absorb a row — a statement never prints
    // the same transaction twice, so file rows never dedupe each other.
    if (claim(row.date, row.amount)) { skipped += 1; continue; }
    expDocs.push({
      userId: U, clientId: uid('exp'), removedAt: null,
      amount: row.amount, category: row.category, merchant: row.merchant,
      paymentMethod: row.paymentMethod, date: new Date(row.date + 'T12:00:00'),
      note: row.source, recurring: false, favorite: false,
      // Historical import: the balances in the file are closing figures that
      // already account for every row, so none of these may move a balance.
      balanceApplied: false,
      accountId: keyToRef.get(row.account),
      ...(row.fuel ? { fuel: {
        odometerKm: row.fuel.odometerKm, litres: row.amount / row.fuel.ratePerLitre,
        ratePerLitre: row.fuel.ratePerLitre, rateSource: 'manual',
      } } : {}),
      ...(row.shared ? { shared: {
        totalAmount: row.shared.groupTotal, friendName: row.shared.friendName,
        userPaid: row.amount, friendPaid: 0, inviteRequested: false,
      } } : {}),
      createdAt: now, updatedAt: now,
    });
  }

  buckets.clear();
  for (const i of existingInc) put(i.date, i.amount);
  const incDocs = [];
  let incSkipped = 0;
  for (const row of doc.incomes) {
    if (claim(row.date, row.amount)) { incSkipped += 1; continue; }
    incDocs.push({
      userId: U, clientId: uid('inc'), removedAt: null,
      amount: row.amount, type: row.type, source: row.source,
      date: new Date(row.date + 'T12:00:00'),
      accountId: keyToRef.get(row.account),
      createdAt: now, updatedAt: now,
    });
  }

  console.log(`expenses: inserting ${expDocs.length}, skipping ${skipped} duplicates`);
  console.log(`incomes : inserting ${incDocs.length}, skipping ${incSkipped} duplicates`);

  if (expDocs.length) await db.collection('expenses').insertMany(expDocs, { ordered: false });
  if (incDocs.length) await db.collection('incomes').insertMany(incDocs, { ordered: false });

  // --- balances through the correction semantics: stamp + signed adjustment ---
  for (const a of doc.accounts) {
    const hit = accounts.find((x) => x.bankName.toLowerCase() === a.bankName.toLowerCase());
    if (!hit) continue;
    const delta = Math.round((a.balance - hit.balance) * 100) / 100;
    const update = { $set: { balance: a.balance, balanceVerifiedAt: now, updatedAt: now } };
    if (Math.abs(delta) >= 0.005) {
      update.$push = { adjustments: {
        $each: [{ id: uid('adj'), date: now, amount: delta, note: 'Set from statement import' }],
        $position: 0, $slice: 24,
      } };
    }
    await db.collection('bankaccounts').updateOne({ _id: hit._id }, update);
    console.log(`balance: ${hit.bankName} ${rs(hit.balance)} -> ${rs(a.balance)}${Math.abs(delta) >= 0.005 ? '  (adjustment ' + rs(delta) + ')' : '  (stamp only)'}`);
  }

  // --- verify ---
  const nExp = await db.collection('expenses').countDocuments({ userId: U, removedAt: null });
  const nInc = await db.collection('incomes').countDocuments({ userId: U, removedAt: null });
  const sum = await db.collection('expenses').aggregate([
    { $match: { userId: U, removedAt: null } },
    { $group: { _id: null, t: { $sum: '$amount' } } },
  ]).toArray();
  console.log(`\nAFTER: ${nExp} expenses (${rs(sum[0].t)}), ${nInc} incomes`);
  console.log('Done. Close any open app tabs, then open the app fresh so it pulls this state.');
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
