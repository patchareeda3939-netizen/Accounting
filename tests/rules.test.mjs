// ทดสอบ firestore.rules โดยยิงคำขอตรงไปที่ Firestore Emulator ในนามผู้ใช้หลายคน (ไม่ผ่านหน้าเว็บ จึงทดสอบกฎได้ตรง ๆ)
// รัน: npm run test:rules (เปิด emulator ให้อัตโนมัติ)
//
// บทบาทที่ใช้ในการทดสอบ (ชื่อในแอป → ชื่อที่ใช้ในเอกสาร)
//   เจ้าของหลัก (ownerId)      → Primary Owner
//   เจ้าของ (role 'owner')      → Admin / Co-owner
//   ผู้แก้ไข (role 'editor')    → User
//   ผู้ดู (role 'viewer')       → Viewer
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, writeBatch, arrayUnion, arrayRemove, serverTimestamp, setLogLevel } from 'firebase/firestore';
setLogLevel('silent');

const P = process.env.GCLOUD_PROJECT || 'demo-psmacc';
const FS = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080', AU = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const [FS_HOST, FS_PORT] = [FS.split(':')[0], Number(FS.split(':')[1])];

/* ---------------- test harness ---------------- */
const res = []; let section = '', sectionId = '', seq = 0;
const S = (id, title) => { sectionId = id; section = id + ' ' + title; seq = 0; };
async function expect(name, want, fn) {
  const id = sectionId + '.' + String(++seq).padStart(2, '0');
  let got; try { await fn(); got = 'allow'; } catch (e) { got = e.code === 'permission-denied' ? 'deny' : 'ERR:' + e.code + ':' + String(e.message).slice(0, 90); }
  res.push({ ok: got === want, section, id, name, want, got });
}
function report() {
  let last = '';
  for (const r of res) { if (r.section !== last) { console.log('\n## ' + r.section); last = r.section; } console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.id + '  ' + r.name + '  (want=' + r.want + ', got=' + r.got + ')'); }
  const failed = res.filter(r => !r.ok).length;
  console.log('\n' + failed + ' failed / ' + res.length);
  return failed;
}
// a setup step that is rejected (e.g. because an earlier check already went wrong) still reports what ran
const onCrash = e => { res.push({ ok: false, section, id: sectionId + '.xx', name: 'setup step crashed: ' + (e.code || '') + ' ' + String(e.message).split('\n')[0], want: '-', got: '-' }); report(); process.exit(1); };
process.on('unhandledRejection', onCrash); process.on('uncaughtException', onCrash);

/* ---------------- helpers ---------------- */
await fetch(`http://${AU}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
await fetch(`http://${FS}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
let n = 0;
function client(name) {
  const app = initializeApp({ apiKey: 'k', projectId: P, authDomain: 'x' }, name);
  const db = getFirestore(app); connectFirestoreEmulator(db, FS_HOST, FS_PORT);
  return { app, db };
}
async function user(email, verified = true) {
  const { app, db } = client('u' + (++n));
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${AU}`, { disableWarnings: true });
  const c = await createUserWithEmailAndPassword(auth, email, 'test-only-password');
  if (verified) {
    await sendEmailVerification(c.user);
    const r = await (await fetch(`http://${AU}/emulator/v1/projects/${P}/oobCodes`)).json();
    await fetch(r.oobCodes.filter(o => o.email === email && o.requestType === 'VERIFY_EMAIL').pop().oobLink);
    await c.user.reload(); await c.user.getIdToken(true);
  }
  return { db, uid: c.user.uid, email };
}
const m = (u, co, uid) => doc(u.db, `companies/${co}/members/${uid}`);
const coDoc = (u, co) => doc(u.db, 'companies', co);
function audit(u, b, co, action, t, from, to, extra = {}) {
  const r = doc(collection(u.db, `companies/${co}/audit`));
  b.set(r, { action, actorUid: u.uid, actorEmail: u.email, targetUid: t.uid, targetEmail: t.email, fromRole: from, toRole: to, at: serverTimestamp(), ...extra });
  return r.id;
}
async function mkCompany(u, co, name) {
  const b = writeBatch(u.db);
  b.set(coDoc(u, co), { name, taxId: '', createdAt: Date.now(), ownerId: u.uid, memberIds: [u.uid] });
  const id = audit(u, b, co, 'create', u, 'none', 'owner');
  b.set(m(u, co, u.uid), { role: 'owner', email: u.email, addedAt: 1, auditId: id });
  await b.commit();
}
async function invite(o, co, email, role) { await setDoc(doc(o.db, 'invites', `${co}__${email}`), { coId: co, coName: co, email, role, invitedByUid: o.uid, invitedBy: o.email }); }
async function accept(u, co, role, from = 'none', grantedBy, delInvite = true) {
  const b = writeBatch(u.db);
  const id = audit(u, b, co, 'join', u, from, role, { grantedBy });
  b.set(m(u, co, u.uid), { role, email: u.email, addedAt: 1, auditId: id });
  b.update(coDoc(u, co), { memberIds: arrayUnion(u.uid) });
  if (delInvite) b.delete(doc(u.db, 'invites', `${co}__${u.email}`));
  await b.commit();
}
async function join(owner, co, u, role) { await invite(owner, co, u.email, role); await accept(u, co, role, 'none', owner.uid); }
async function setRole(a, co, t, from, to) { const b = writeBatch(a.db); const id = audit(a, b, co, 'role', t, from, to); b.update(m(a, co, t.uid), { role: to, auditId: id }); await b.commit(); }
async function remove(a, co, t, from) { const b = writeBatch(a.db); const id = audit(a, b, co, 'remove', t, from, 'removed'); b.update(m(a, co, t.uid), { role: 'removed', auditId: id }); b.update(coDoc(a, co), { memberIds: arrayRemove(t.uid) }); await b.commit(); }
async function transfer(a, co, t, from) { const b = writeBatch(a.db); const id = audit(a, b, co, 'transfer', t, from, 'owner'); b.update(m(a, co, t.uid), { role: 'owner', auditId: id }); b.update(coDoc(a, co), { ownerId: t.uid }); await b.commit(); }
const listMine = u => getDocs(query(collection(u.db, 'companies'), where('memberIds', 'array-contains', u.uid)));

/* ---------------- setup ----------------
   co1 (บริษัท A): A = Primary Owner, C = Admin, E = User, V = Viewer, T = Viewer (เป้าหมายของการเปลี่ยนสิทธิ์)
   co2 (บริษัท B): B = Primary Owner, Y = User */
const A = await user('a@t.com'), B = await user('b@t.com'), C = await user('c@t.com'), E = await user('e@t.com'), V = await user('v@t.com'),
  T = await user('t@t.com'), X = await user('x@t.com'), Y = await user('y@t.com'), Z = await user('z@t.com'), U = await user('u@t.com', false);
await mkCompany(A, 'co1', 'Company A'); await mkCompany(B, 'co2', 'Company B');
await join(A, 'co1', C, 'editor'); await setRole(A, 'co1', C, 'editor', 'owner');
await join(A, 'co1', E, 'editor'); await join(A, 'co1', V, 'viewer'); await join(A, 'co1', T, 'viewer');
await join(B, 'co2', Y, 'editor');
await setDoc(doc(A.db, 'companies/co1/documents/d1'), { t: 1 }); await setDoc(doc(A.db, 'companies/co1/settings/company'), { name: 'Company A' });
await setDoc(doc(B.db, 'companies/co2/documents/d1'), { t: 2 }); await setDoc(doc(B.db, 'companies/co2/settings/company'), { name: 'Company B' });
const anon = client('anon').db;

S('R1', 'ผู้ใช้ที่ไม่ได้ Login ต้องอ่าน/เขียนไม่ได้');
await expect('anonymous: read company doc', 'deny', () => getDoc(doc(anon, 'companies/co1')));
await expect('anonymous: list companies', 'deny', () => getDocs(collection(anon, 'companies')));
await expect('anonymous: read data document', 'deny', () => getDoc(doc(anon, 'companies/co1/documents/d1')));
await expect('anonymous: list data', 'deny', () => getDocs(collection(anon, 'companies/co1/documents')));
await expect('anonymous: read settings', 'deny', () => getDoc(doc(anon, 'companies/co1/settings/company')));
await expect('anonymous: read members', 'deny', () => getDocs(collection(anon, 'companies/co1/members')));
await expect('anonymous: read audit log', 'deny', () => getDocs(collection(anon, 'companies/co1/audit')));
await expect('anonymous: read invites', 'deny', () => getDocs(query(collection(anon, 'invites'), where('email', '==', 'e@t.com'))));
await expect('anonymous: create company', 'deny', () => setDoc(doc(anon, 'companies/anon1'), { name: 'x', ownerId: 'x', memberIds: ['x'] }));
await expect('anonymous: create data document', 'deny', () => setDoc(doc(anon, 'companies/co1/documents/anon'), { x: 1 }));
await expect('anonymous: update data document', 'deny', () => updateDoc(doc(anon, 'companies/co1/documents/d1'), { t: 9 }));
await expect('anonymous: delete data document', 'deny', () => deleteDoc(doc(anon, 'companies/co1/documents/d1')));
await expect('anonymous: create invite', 'deny', () => setDoc(doc(anon, 'invites/co1__q@t.com'), { coId: 'co1', email: 'q@t.com', role: 'editor', invitedByUid: 'x' }));
await expect('anonymous: create member doc', 'deny', () => setDoc(doc(anon, 'companies/co1/members/anon'), { role: 'owner', email: 'q@t.com', auditId: 'x' }));

S('R2', 'ผู้ใช้บริษัท A ต้องอ่านข้อมูลบริษัท B ไม่ได้');
for (const [who, u, other, co] of [['B (Primary Owner of co2)', B, 'co1', 'co1'], ['Y (User of co2)', Y, 'co1', 'co1'], ['A (Primary Owner of co1)', A, 'co2', 'co2'], ['E (User of co1)', E, 'co2', 'co2']]) {
  await expect(`${who}: read ${co} company doc`, 'deny', () => getDoc(doc(u.db, `companies/${co}`)));
  await expect(`${who}: read ${co} data document`, 'deny', () => getDoc(doc(u.db, `companies/${co}/documents/d1`)));
  await expect(`${who}: list ${co} data`, 'deny', () => getDocs(collection(u.db, `companies/${co}/documents`)));
  await expect(`${who}: read ${co} settings`, 'deny', () => getDoc(doc(u.db, `companies/${co}/settings/company`)));
  await expect(`${who}: read ${co} members`, 'deny', () => getDocs(collection(u.db, `companies/${co}/members`)));
  await expect(`${who}: read ${co} audit log`, 'deny', () => getDocs(collection(u.db, `companies/${co}/audit`)));
  await expect(`${who}: list ${co} invites`, 'deny', () => getDocs(query(collection(u.db, 'invites'), where('coId', '==', co))));
}
await expect('B: list companies where A is a member', 'deny', () => getDocs(query(collection(B.db, 'companies'), where('memberIds', 'array-contains', A.uid))));
await expect('B: list all companies without filter', 'deny', () => getDocs(collection(B.db, 'companies')));
await expect('A: company list contains only co1', 'allow', async () => { const q = await listMine(A); if (q.docs.map(d => d.id).join() !== 'co1') throw new Error('leak: ' + q.docs.map(d => d.id)); });
await expect('B: company list contains only co2', 'allow', async () => { const q = await listMine(B); if (q.docs.map(d => d.id).join() !== 'co2') throw new Error('leak: ' + q.docs.map(d => d.id)); });

S('R3', 'ผู้ใช้บริษัท A ต้องเขียน/แก้ไข/ลบข้อมูลบริษัท B ไม่ได้');
for (const [who, u, co] of [['B (Primary Owner of co2)', B, 'co1'], ['Y (User of co2)', Y, 'co1'], ['A (Primary Owner of co1)', A, 'co2'], ['C (Admin of co1)', C, 'co2']]) {
  await expect(`${who}: create data in ${co}`, 'deny', () => setDoc(doc(u.db, `companies/${co}/documents/x-${u.uid}`), { x: 1 }));
  await expect(`${who}: update data in ${co}`, 'deny', () => updateDoc(doc(u.db, `companies/${co}/documents/d1`), { t: 99 }));
  await expect(`${who}: overwrite data in ${co}`, 'deny', () => setDoc(doc(u.db, `companies/${co}/documents/d1`), { t: 99 }));
  await expect(`${who}: delete data in ${co}`, 'deny', () => deleteDoc(doc(u.db, `companies/${co}/documents/d1`)));
  await expect(`${who}: write settings of ${co}`, 'deny', () => setDoc(doc(u.db, `companies/${co}/settings/company`), { name: 'hacked' }));
  await expect(`${who}: rename ${co}`, 'deny', () => updateDoc(doc(u.db, 'companies', co), { name: 'hacked' }));
  await expect(`${who}: add self to ${co} memberIds`, 'deny', () => updateDoc(doc(u.db, 'companies', co), { memberIds: arrayUnion(u.uid) }));
  await expect(`${who}: create own member doc in ${co}`, 'deny', async () => { const b = writeBatch(u.db); const id = audit(u, b, co, 'join', u, 'none', 'owner'); b.set(m(u, co, u.uid), { role: 'owner', email: u.email, addedAt: 1, auditId: id }); await b.commit(); });
  await expect(`${who}: invite into ${co}`, 'deny', () => invite(u, co, 'q@t.com', 'editor'));
  await expect(`${who}: delete ${co}`, 'deny', () => deleteDoc(doc(u.db, 'companies', co)));
}
await expect('co2 data unchanged after attacks', 'allow', async () => { if ((await getDoc(doc(B.db, 'companies/co2/documents/d1'))).data().t !== 2) throw new Error('changed'); });
await expect('co1 data unchanged after attacks', 'allow', async () => { if ((await getDoc(doc(A.db, 'companies/co1/documents/d1'))).data().t !== 1) throw new Error('changed'); });

S('R4', 'สิทธิ์ตามบทบาท Primary Owner / Admin / User / Viewer (บริษัทเดียวกัน)');
const roles = [['Primary Owner A', A], ['Admin C', C], ['User E', E], ['Viewer V', V]];
const allow = (...who) => r => (who.includes(r) ? 'allow' : 'deny');
const W = allow('Primary Owner A', 'Admin C', 'User E'), O = allow('Primary Owner A', 'Admin C'), ALL = () => 'allow';
let k = 0;
for (const [r, u] of roles) await expect(`${r}: read data`, ALL(r), () => getDocs(collection(u.db, 'companies/co1/documents')));
for (const [r, u] of roles) await expect(`${r}: read company settings`, ALL(r), () => getDoc(doc(u.db, 'companies/co1/settings/company')));
for (const [r, u] of roles) await expect(`${r}: read member list`, ALL(r), () => getDocs(collection(u.db, 'companies/co1/members')));
for (const [r, u] of roles) await expect(`${r}: create data`, W(r), () => setDoc(doc(u.db, `companies/co1/documents/r4-${u.uid}`), { x: 1 }));
await setDoc(doc(A.db, 'companies/co1/documents/r4v'), { x: 1 });
for (const [r, u] of roles) await expect(`${r}: update data`, W(r), () => updateDoc(doc(u.db, 'companies/co1/documents/r4v'), { x: ++k }));
for (const [r, u] of roles) { await setDoc(doc(A.db, `companies/co1/documents/del-${u.uid}`), { x: 1 }); await expect(`${r}: delete data`, W(r), () => deleteDoc(doc(u.db, `companies/co1/documents/del-${u.uid}`))); }
for (const [r, u] of roles) await expect(`${r}: write settings`, W(r), () => setDoc(doc(u.db, 'companies/co1/settings/r4'), { by: u.uid }));
for (const [r, u] of roles) await expect(`${r}: rename company (name/taxId)`, W(r), () => updateDoc(doc(u.db, 'companies', 'co1'), { name: 'Company A (' + r + ')' }));
for (const [r, u] of roles) await expect(`${r}: change other company fields`, O(r), () => updateDoc(doc(u.db, 'companies', 'co1'), { plan: r }));
for (const [r, u] of roles) await expect(`${r}: invite a user`, O(r), () => invite(u, 'co1', `inv-${u.uid.slice(0, 6).toLowerCase()}@t.com`, 'viewer'));
for (const [r, u] of roles) await expect(`${r}: list pending invites`, O(r), () => getDocs(query(collection(u.db, 'invites'), where('coId', '==', 'co1'))));
for (const [r, u] of roles) await expect(`${r}: read audit log`, O(r), () => getDocs(query(collection(u.db, 'companies/co1/audit'), orderBy('at', 'desc'), limit(50))));
for (const [r, u] of roles) {
  await expect(`${r}: change another member's role (T viewer→editor)`, O(r), () => setRole(u, 'co1', T, 'viewer', 'editor'));
  if (O(r) === 'allow') await setRole(A, 'co1', T, 'editor', 'viewer'); // revert
}
for (const [r, u] of roles.slice(1)) await expect(`${r}: transfer primary ownership`, 'deny', () => transfer(u, 'co1', u, (r.startsWith('Admin') ? 'owner' : r.startsWith('User') ? 'editor' : 'viewer')));
for (const [r, u] of roles.slice(1)) await expect(`${r}: delete company`, 'deny', () => deleteDoc(doc(u.db, 'companies', 'co1')));
for (const [r, u] of [['User E', E], ['Viewer V', V]]) await expect(`${r}: remove a member (T)`, 'deny', () => remove(u, 'co1', T, 'viewer'));
await expect('Admin C: remove a member (T)', 'allow', () => remove(C, 'co1', T, 'viewer'));
await mkCompany(A, 'co9', 'Throwaway');
await expect('Primary Owner A: delete own company (co9)', 'allow', () => deleteDoc(doc(A.db, 'companies', 'co9')));

S('R5', 'Co-owner (Admin) ห้ามลดสิทธิ์หรือนำ Primary Owner ออก');
await expect('Admin C: demote Primary Owner A to editor', 'deny', () => setRole(C, 'co1', A, 'owner', 'editor'));
await expect('Admin C: demote Primary Owner A to viewer', 'deny', () => setRole(C, 'co1', A, 'owner', 'viewer'));
await expect('Admin C: remove Primary Owner A', 'deny', () => remove(C, 'co1', A, 'owner'));
await expect('Admin C: drop A from memberIds only', 'deny', () => updateDoc(doc(C.db, 'companies', 'co1'), { memberIds: arrayRemove(A.uid) }));
await expect("Admin C: edit A's member doc without audit", 'deny', () => updateDoc(m(C, 'co1', A.uid), { role: 'viewer' }));
await expect("Admin C: delete A's member doc", 'deny', () => deleteDoc(m(C, 'co1', A.uid)));
await expect('Admin C: set ownerId to self', 'deny', () => updateDoc(doc(C.db, 'companies', 'co1'), { ownerId: C.uid }));
await expect('Admin C: delete company', 'deny', () => deleteDoc(doc(C.db, 'companies', 'co1')));
await expect('Primary Owner A: demote self', 'deny', () => setRole(A, 'co1', A, 'owner', 'viewer'));
await expect('Primary Owner A: remove self', 'deny', () => remove(A, 'co1', A, 'owner'));
await expect('Primary Owner A: still owner of co1', 'allow', async () => { const d = await getDoc(doc(A.db, 'companies', 'co1')); if (d.data().ownerId !== A.uid || (await getDoc(m(A, 'co1', A.uid))).data().role !== 'owner') throw new Error('changed'); });

S('R6', 'Transfer ownership ต้องทำตามขั้นตอนเฉพาะ');
await mkCompany(A, 'co5', 'Transfer Co'); await join(A, 'co5', E, 'editor'); await join(A, 'co5', C, 'editor'); await setRole(A, 'co5', C, 'editor', 'owner');
await join(A, 'co5', Z, 'viewer'); await remove(A, 'co5', Z, 'viewer');
await expect('change ownerId without transfer audit', 'deny', () => updateDoc(doc(A.db, 'companies', 'co5'), { ownerId: E.uid }));
await expect('transfer audit without ownerId change', 'deny', async () => { const b = writeBatch(A.db); const id = audit(A, b, 'co5', 'transfer', E, 'editor', 'owner'); b.update(m(A, 'co5', E.uid), { role: 'owner', auditId: id }); await b.commit(); });
await expect('transfer without making recipient owner', 'deny', async () => { const b = writeBatch(A.db); const id = audit(A, b, 'co5', 'transfer', E, 'editor', 'editor'); b.update(m(A, 'co5', E.uid), { role: 'editor', auditId: id }); b.update(coDoc(A, 'co5'), { ownerId: E.uid }); await b.commit(); });
await expect('transfer to a non-member (X)', 'deny', () => transfer(A, 'co5', X, 'none'));
await expect('transfer to a removed member (Z)', 'deny', () => transfer(A, 'co5', Z, 'removed'));
await expect('transfer by Admin C (not primary)', 'deny', () => transfer(C, 'co5', E, 'editor'));
await expect('transfer by User E to self', 'deny', () => transfer(E, 'co5', E, 'editor'));
await expect('transfer with forged actor in audit', 'deny', async () => { const b = writeBatch(C.db); const r = doc(collection(C.db, 'companies/co5/audit')); b.set(r, { action: 'transfer', actorUid: A.uid, actorEmail: A.email, targetUid: C.uid, targetEmail: C.email, fromRole: 'owner', toRole: 'owner', at: serverTimestamp() }); b.update(m(C, 'co5', C.uid), { role: 'owner', auditId: r.id }); b.update(coDoc(C, 'co5'), { ownerId: C.uid }); await b.commit(); });
await expect('Primary Owner A transfers to User E (correct procedure)', 'allow', () => transfer(A, 'co5', E, 'editor'));
await expect('after transfer: ownerId is E and E is owner', 'allow', async () => { if ((await getDoc(doc(E.db, 'companies', 'co5'))).data().ownerId !== E.uid || (await getDoc(m(E, 'co5', E.uid))).data().role !== 'owner') throw new Error('not transferred'); });
await expect('after transfer: audit log has transfer entry A → E', 'allow', async () => { const q = await getDocs(collection(E.db, 'companies/co5/audit')); if (!q.docs.some(d => { const a = d.data(); return a.action === 'transfer' && a.actorUid === A.uid && a.targetUid === E.uid && a.at; })) throw new Error('missing'); });
await expect('after transfer: old primary A cannot demote new primary E', 'deny', () => setRole(A, 'co5', E, 'owner', 'editor'));
await expect('after transfer: old primary A cannot transfer again', 'deny', () => transfer(A, 'co5', C, 'owner'));
await expect('after transfer: old primary A cannot delete company', 'deny', () => deleteDoc(doc(A.db, 'companies', 'co5')));
await expect('after transfer: new primary E can change A (now Admin)', 'allow', () => setRole(E, 'co5', A, 'owner', 'editor'));

S('R7', 'ห้ามผู้ใช้เพิ่มสิทธิ์ตัวเองเป็น Owner/Admin');
for (const [r, u, cur] of [['Viewer V', V, 'viewer'], ['User E', E, 'editor']]) {
  await expect(`${r}: set own role to owner (with audit)`, 'deny', () => setRole(u, 'co1', u, cur, 'owner'));
  await expect(`${r}: set own role to editor/owner (without audit)`, 'deny', () => updateDoc(m(u, 'co1', u.uid), { role: 'owner' }));
  await expect(`${r}: overwrite own member doc as owner`, 'deny', () => setDoc(m(u, 'co1', u.uid), { role: 'owner', email: u.email, addedAt: 1, auditId: 'fake' }));
  await expect(`${r}: re-join own company as owner`, 'deny', () => accept(u, 'co1', 'owner', cur, A.uid, false));
  await expect(`${r}: create invite for self as editor`, 'deny', () => invite(u, 'co1', u.email, 'editor'));
  await expect(`${r}: set company ownerId to self`, 'deny', () => updateDoc(doc(u.db, 'companies', 'co1'), { ownerId: u.uid }));
  await expect(`${r}: forge 'create' audit to claim ownership`, 'deny', async () => { const b = writeBatch(u.db); const id = audit(u, b, 'co1', 'create', u, cur, 'owner'); b.update(m(u, 'co1', u.uid), { role: 'owner', auditId: id }); await b.commit(); });
}
await expect('Viewer V: set own role to editor (with audit)', 'deny', () => setRole(V, 'co1', V, 'viewer', 'editor'));
await expect('Admin C: make self primary owner (ownerId)', 'deny', () => updateDoc(doc(C.db, 'companies', 'co1'), { ownerId: C.uid }));
await expect('Admin C: transfer primary ownership to self', 'deny', () => transfer(C, 'co1', C, 'owner'));
await expect('non-member X: create owner member doc in co1', 'deny', async () => { const b = writeBatch(X.db); const id = audit(X, b, 'co1', 'create', X, 'none', 'owner'); b.set(m(X, 'co1', X.uid), { role: 'owner', email: X.email, addedAt: 1, auditId: id }); await b.commit(); });
await expect('non-member X: take over co1 via company create', 'deny', () => mkCompany(X, 'co1', 'hijack'));
await expect('non-member X: create company listing someone else as member', 'deny', () => setDoc(doc(X.db, 'companies', 'cx'), { name: 'x', ownerId: X.uid, memberIds: [X.uid, A.uid] }));
await expect('non-member X: create company owned by someone else', 'deny', () => setDoc(doc(X.db, 'companies', 'cy'), { name: 'x', ownerId: A.uid, memberIds: [A.uid] }));
await expect('roles unchanged after escalation attempts', 'allow', async () => { const r = async u => (await getDoc(m(A, 'co1', u.uid))).data().role; const got = [await r(V), await r(E), await r(C)].join(); if (got !== 'viewer,editor,owner') throw new Error(got); });

S('R8', 'คำเชิญ');
await expect('owner invites as owner role', 'deny', () => invite(A, 'co1', 'q1@t.com', 'owner'));
await expect('invite with forged invitedByUid', 'deny', () => setDoc(doc(A.db, 'invites', 'co1__q2@t.com'), { coId: 'co1', email: 'q2@t.com', role: 'editor', invitedByUid: B.uid }));
await expect('invite id does not match company/email', 'deny', () => setDoc(doc(A.db, 'invites', 'co1__zz@t.com'), { coId: 'co1', email: 'q3@t.com', role: 'editor', invitedByUid: A.uid }));
await expect('invite with uppercase email', 'deny', () => setDoc(doc(A.db, 'invites', 'co1__Q4@t.com'), { coId: 'co1', email: 'Q4@t.com', role: 'editor', invitedByUid: A.uid }));
await invite(A, 'co1', 'x@t.com', 'viewer');
await expect('re-invite same email while pending (overwrite)', 'deny', () => invite(A, 'co1', 'x@t.com', 'editor'));
await expect('Y uses invite addressed to X', 'deny', () => accept(Y, 'co1', 'viewer', 'none', A.uid, false));
await expect('X claims editor with viewer invite', 'deny', () => accept(X, 'co1', 'editor', 'none', A.uid));
await expect('X claims owner with viewer invite', 'deny', () => accept(X, 'co1', 'owner', 'none', A.uid));
await expect('X joins with forged grantedBy', 'deny', () => accept(X, 'co1', 'viewer', 'none', B.uid));
await expect('X joins without audit entry', 'deny', async () => { const b = writeBatch(X.db); b.set(m(X, 'co1', X.uid), { role: 'viewer', email: X.email, addedAt: 1, auditId: 'fake' }); b.update(coDoc(X, 'co1'), { memberIds: arrayUnion(X.uid) }); await b.commit(); });
await invite(A, 'co1', 'u@t.com', 'editor');
await expect('unverified email cannot accept invite', 'deny', () => accept(U, 'co1', 'editor', 'none', A.uid));
await expect('Y reads invites addressed to others', 'deny', () => getDocs(query(collection(Y.db, 'invites'), where('email', '==', 'x@t.com'))));
await expect('X reads own invites', 'allow', () => getDocs(query(collection(X.db, 'invites'), where('email', '==', 'x@t.com'))));
await expect('X accepts as viewer (correct)', 'allow', () => accept(X, 'co1', 'viewer', 'none', A.uid));
await expect('X can read co1 data after joining', 'allow', () => getDocs(collection(X.db, 'companies/co1/documents')));

S('R9', 'Audit log ปลอมหรือแก้ไขไม่ได้');
await expect('change role without audit entry', 'deny', () => updateDoc(m(A, 'co1', X.uid), { role: 'editor' }));
await expect('change role reusing an old auditId', 'deny', async () => { const cur = (await getDoc(m(A, 'co1', X.uid))).data(); await updateDoc(m(A, 'co1', X.uid), { role: 'editor', auditId: cur.auditId }); });
await expect('audit entry without a matching change', 'deny', () => setDoc(doc(A.db, 'companies/co1/audit/f1'), { action: 'role', actorUid: A.uid, actorEmail: A.email, targetUid: X.uid, targetEmail: X.email, fromRole: 'viewer', toRole: 'editor', at: serverTimestamp() }));
await expect('audit with wrong fromRole', 'deny', () => setRole(A, 'co1', X, 'editor', 'editor'));
await expect('audit with forged actor', 'deny', async () => { const b = writeBatch(A.db); const r = doc(collection(A.db, 'companies/co1/audit')); b.set(r, { action: 'role', actorUid: B.uid, actorEmail: B.email, targetUid: X.uid, targetEmail: X.email, fromRole: 'viewer', toRole: 'editor', at: serverTimestamp() }); b.update(m(A, 'co1', X.uid), { role: 'editor', auditId: r.id }); await b.commit(); });
await expect('audit with client-chosen time', 'deny', async () => { const b = writeBatch(A.db); const r = doc(collection(A.db, 'companies/co1/audit')); b.set(r, { action: 'role', actorUid: A.uid, actorEmail: A.email, targetUid: X.uid, targetEmail: X.email, fromRole: 'viewer', toRole: 'editor', at: new Date(2000, 1, 1) }); b.update(m(A, 'co1', X.uid), { role: 'editor', auditId: r.id }); await b.commit(); });
await expect('member change forging target email', 'deny', async () => { const b = writeBatch(A.db); const id = audit(A, b, 'co1', 'role', { uid: X.uid, email: 'z@t.com' }, 'viewer', 'editor'); b.update(m(A, 'co1', X.uid), { role: 'editor', auditId: id, email: 'z@t.com' }); await b.commit(); });
await expect('invalid role value', 'deny', () => setRole(A, 'co1', X, 'viewer', 'admin'));
const anyAudit = (await getDocs(collection(A.db, 'companies/co1/audit'))).docs[0].id;
await expect('owner edits an audit entry', 'deny', () => updateDoc(doc(A.db, `companies/co1/audit/${anyAudit}`), { toRole: 'viewer' }));
await expect('owner deletes an audit entry', 'deny', () => deleteDoc(doc(A.db, `companies/co1/audit/${anyAudit}`)));
await expect('User E writes into audit through data path', 'deny', () => setDoc(doc(E.db, 'companies/co1/audit/zz'), { action: 'role' }));
await expect('owner deletes a member doc directly', 'deny', () => deleteDoc(m(A, 'co1', X.uid)));
await expect('correct role change with audit is allowed', 'allow', () => setRole(A, 'co1', X, 'viewer', 'editor'));
await expect('audit entry records actor, target, roles and server time', 'allow', async () => { const q = await getDocs(query(collection(A.db, 'companies/co1/audit'), orderBy('at', 'desc'), limit(1))); const a = q.docs[0].data(); if (!(a.action === 'role' && a.actorUid === A.uid && a.targetUid === X.uid && a.fromRole === 'viewer' && a.toRole === 'editor' && a.at && a.at.toMillis() > Date.now() - 600000)) throw new Error(JSON.stringify(a)); });

S('R10', 'นำผู้ใช้ออก');
await expect('owner removes X', 'allow', () => remove(A, 'co1', X, 'editor'));
await expect('removed X cannot read data', 'deny', () => getDocs(collection(X.db, 'companies/co1/documents')));
await expect('removed X cannot write data', 'deny', () => setDoc(doc(X.db, 'companies/co1/documents/q'), { x: 1 }));
await expect('removed X cannot read members', 'deny', () => getDocs(collection(X.db, 'companies/co1/members')));
await expect('removed X no longer lists co1', 'allow', async () => { if ((await listMine(X)).size) throw new Error('still listed'); });
await expect('removed X can read own member doc (role removed)', 'allow', async () => { if ((await getDoc(m(X, 'co1', X.uid))).data().role !== 'removed') throw new Error('x'); });
await expect('removed X rejoins without invite', 'deny', () => accept(X, 'co1', 'viewer', 'removed', A.uid, false));

S('R11', 'คำเชิญใช้ได้ครั้งเดียว');
await invite(A, 'co1', 'x@t.com', 'viewer');
await expect('accept while keeping the invite', 'deny', () => accept(X, 'co1', 'viewer', 'removed', A.uid, false));
await expect('accept and delete the invite', 'allow', () => accept(X, 'co1', 'viewer', 'removed', A.uid, true));
await expect('invite is gone after joining', 'allow', async () => { const q = await getDocs(query(collection(A.db, 'invites'), where('coId', '==', 'co1'))); if (q.docs.some(d => d.data().email === 'x@t.com')) throw new Error('still there'); });
await remove(A, 'co1', X, 'viewer');
await expect('removed member rejoins with no invite left', 'deny', () => accept(X, 'co1', 'viewer', 'removed', A.uid, false));
await expect('removed member rejoins claiming to delete a missing invite', 'deny', () => accept(X, 'co1', 'viewer', 'removed', A.uid, true));
await invite(A, 'co1', 'x@t.com', 'viewer');
await expect('removed member rejoins with a NEW invite', 'allow', () => accept(X, 'co1', 'viewer', 'removed', A.uid, true));

process.exit(report() ? 1 : 0);
