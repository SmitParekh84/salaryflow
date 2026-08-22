/**
 * Applies the 23 Aug corrections to one account, with full provenance:
 *
 *   1. BOB balance 6,116.95 -> 5,977.00 (spent since statement), correction logged
 *   2. Central Bank 6,470 -> 16,495.65 (earlier figure was wrong), correction logged
 *   3. ICICI credit card statement day 26 -> 20 (due 7 Sep implies statement ~20)
 *   4. HDFC Ergo bill: Rs 830, monthly, due day 26, Insurance
 *   5. Deletes the 7 Aug Rs 0 expense ONLY if it is not a shared record —
 *      a zero-amount shared expense (friend paid the whole bill) is legitimate.
 *
 * Every step checks before writing; running twice changes nothing.
 *
 *   node scripts/apply-fixes.cjs
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

  // --- 1 + 2: balance corrections with stamp and signed adjustment ---
  const corrections = [
    { bank: /baroda/i, actual: 5977.0, note: 'Corrected against bank, 23 Aug' },
    { bank: /central/i, actual: 16495.65, note: 'Corrected against bank, 23 Aug (earlier figure was wrong)' },
  ];
  for (const c of corrections) {
    const a = await db.collection('bankaccounts').findOne({ userId: U, removedAt: null, bankName: c.bank });
    if (!a) { console.log(`SKIP: no account matching ${c.bank}`); continue; }
    const delta = Math.round((c.actual - a.balance) * 100) / 100;
    if (Math.abs(delta) < 0.005) {
      await db.collection('bankaccounts').updateOne({ _id: a._id }, { $set: { balanceVerifiedAt: now, updatedAt: now } });
      console.log(`${a.bankName}: already ${rs(a.balance)}, re-stamped only`);
      continue;
    }
    await db.collection('bankaccounts').updateOne({ _id: a._id }, {
      $set: { balance: c.actual, balanceVerifiedAt: now, updatedAt: now },
      $push: { adjustments: {
        $each: [{ id: uid('adj'), date: now, amount: delta, note: c.note }],
        $position: 0, $slice: 24,
      } },
    });
    console.log(`${a.bankName}: ${rs(a.balance)} -> ${rs(c.actual)}  (adjustment ${rs(delta)})`);
  }

  // --- 3: ICICI card statement day ---
  const card = await db.collection('creditcards').findOne({ userId: U, removedAt: null, name: /icici/i });
  if (card && card.statementDay !== 20) {
    await db.collection('creditcards').updateOne({ _id: card._id }, { $set: { statementDay: 20, updatedAt: now } });
    console.log(`${card.name}: statement day ${card.statementDay} -> 20`);
  } else if (card) {
    console.log(`${card.name}: statement day already 20`);
  }

  // --- 4: HDFC Ergo bill ---
  const existingBill = await db.collection('bills').findOne({ userId: U, removedAt: null, name: /hdfc ergo/i });
  if (existingBill) {
    console.log('HDFC Ergo bill already exists, skipping');
  } else {
    await db.collection('bills').insertOne({
      userId: U, clientId: uid('bill'), removedAt: null,
      name: 'HDFC Ergo Health Insurance', amount: 830, dueDay: 26,
      dueDate: new Date(2026, 7, 26, 12), frequency: 'monthly',
      category: 'Insurance', paid: false,
      createdAt: now, updatedAt: now,
    });
    console.log('HDFC Ergo bill added: Rs 830 monthly, due day 26, Insurance');
  }

  // --- 5: the Rs 0 row, only when it is not a shared record ---
  const zeros = await db.collection('expenses').find({ userId: U, removedAt: null, amount: 0 }).toArray();
  for (const z of zeros) {
    const day = String(z.date).slice(0, 15);
    if (z.shared) {
      console.log(`KEEP Rs 0 on ${day}: shared record (${z.shared.friendName} paid ${rs(z.shared.friendPaid)}) — legitimate`);
      continue;
    }
    await db.collection('expenses').updateOne({ _id: z._id }, { $set: { removedAt: now, updatedAt: now } });
    console.log(`DELETED Rs 0 "${z.merchant || z.category}" on ${day}`);
  }
  if (!zeros.length) console.log('no Rs 0 expenses found');

  // --- verify ---
  console.log('\nFINAL STATE');
  const accounts = await db.collection('bankaccounts').find({ userId: U, removedAt: null }).toArray();
  for (const a of accounts) {
    const ver = a.balanceVerifiedAt ? String(a.balanceVerifiedAt).slice(0, 10) : 'never';
    console.log(`  ${a.bankName.padEnd(24)} ${rs(a.balance).padStart(13)} | verified ${ver} | ${(a.adjustments || []).length} adjustments`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
