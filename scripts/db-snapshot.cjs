/**
 * Read-only snapshot of one user's finances straight from Atlas.
 *
 * Exists because the app's stored account balances drift from the bank's, and
 * the only way to see the drift is to read both. Reads nothing but the given
 * user's rows and writes nothing at all.
 *
 *   node scripts/db-snapshot.cjs <email>
 */
const fs = require('fs');
const mongoose = require('mongoose');
const uri = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const U = process.argv[2] || 'smitparekh02@gmail.com';
const rs = (n) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const accounts = await db.collection('bankaccounts').find({ userId: U, removedAt: null }).toArray();
  const byId = new Map(accounts.map(a => [String(a.clientId ?? a._id), a]));
  const goals = await db.collection('goals').find({ userId: U, removedAt: null }).toArray();

  console.log('GOAL -> ACCOUNT LINKAGE');
  for (const g of goals) {
    const linked = g.balanceAccountId ? byId.get(String(g.balanceAccountId)) : null;
    const contribs = (g.contributions || []);
    const saved = contribs.reduce((s, x) => s + (x.amount || 0), 0);
    const tracked = linked ? linked.balance : saved;
    console.log(`\n  ${g.name}  (target ${rs(g.target)})`);
    console.log(`    linked account : ${linked ? linked.bankName + ' = ' + rs(linked.balance) : 'none'}`);
    console.log(`    contributions  : ${rs(saved)} across ${contribs.length}`);
    console.log(`    goalSaved()    : ${rs(tracked)}   -> ${(tracked / g.target * 100).toFixed(1)}% of target`);
    for (const c of contribs) {
      const acc = c.accountId ? byId.get(String(c.accountId)) : null;
      console.log(`      ${String(c.date).slice(0,10)}  ${rs(c.amount).padStart(12)}  ${acc ? acc.bankName : 'unassigned'}${c.opening ? '  [migration opening]' : ''}`);
    }
  }
  console.log('\n\nACCOUNT IDS');
  for (const a of accounts) {
    const verified = a.balanceVerifiedAt
      ? Math.floor((Date.now() - new Date(a.balanceVerifiedAt)) / 86_400_000) + 'd ago'
      : 'NEVER';
    console.log('  ', String(a.clientId ?? a._id), a.bankName.padEnd(22), rs(a.balance).padStart(13),
      '| verified:', verified, '| adjustments:', (a.adjustments || []).length);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
