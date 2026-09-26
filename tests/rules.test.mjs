// ทดสอบ firestore.rules โดยยิงคำขอตรงไปที่ Firestore Emulator ในนามผู้ใช้หลายคน
// ครอบคลุม: แยกข้อมูลหลายบริษัท, คำเชิญ, สิทธิ์ เจ้าของหลัก/เจ้าของ/ผู้แก้ไข/ผู้ดู, Audit Log, โอนสิทธิ์, นำออก, ผู้ไม่ได้ Login
// รัน: npm run test:rules (เปิด emulator ให้อัตโนมัติ)
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, writeBatch, arrayUnion, arrayRemove, serverTimestamp, setLogLevel } from 'firebase/firestore';
setLogLevel('silent');
const P = process.env.GCLOUD_PROJECT || 'demo-psmacc';
const FS = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080', AU = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const [FS_HOST, FS_PORT] = [FS.split(':')[0], Number(FS.split(':')[1])];
await fetch(`http://${AU}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
await fetch(`http://${FS}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
let n = 0; const res = []; let section = '';
function report() {
  let last = '';
  for (const r of res) { if (r[1] !== last) { console.log('\n## ' + r[1]); last = r[1]; } console.log(r[0] + '  ' + r[2] + '  (' + r[3] + ', ' + r[4] + ')'); }
  const failed = res.filter(r => r[0] !== 'PASS').length;
  console.log('\n' + failed + ' failed / ' + res.length);
  return failed;
}
// a setup step that is rejected (e.g. because an earlier check already went wrong) still reports what ran
const onCrash = e => { res.push(['FAIL', section, 'setup step crashed: ' + (e.code || '') + ' ' + String(e.message).split('\n')[0], '', '']); report(); process.exit(1); };
process.on('unhandledRejection', onCrash); process.on('uncaughtException', onCrash);
async function user(email, verified = true) {
  const app = initializeApp({ apiKey: 'k', projectId: P, authDomain: 'x' }, 'u' + (++n));
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${AU}`, { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, FS_HOST, FS_PORT);
  const c = await createUserWithEmailAndPassword(auth, email, 'secret123');
  if (verified) { await sendEmailVerification(c.user); const r = await (await fetch(`http://${AU}/emulator/v1/projects/${P}/oobCodes`)).json(); await fetch(r.oobCodes.filter(o => o.email === email && o.requestType === 'VERIFY_EMAIL').pop().oobLink); await c.user.reload(); await c.user.getIdToken(true); }
  return { db, uid: c.user.uid, email };
}
const S = t => { section = t; };
async function expect(name, want, fn) {
  let got; try { await fn(); got = 'allow'; } catch (e) { got = e.code === 'permission-denied' ? 'deny' : 'ERR:' + e.code + ':' + String(e.message).slice(0, 90); }
  res.push([got === want ? 'PASS' : 'FAIL', section, name, 'want=' + want, 'got=' + got]);
}
const m = (u, co, uid) => doc(u.db, `companies/${co}/members/${uid}`);
function audit(u, b, co, action, t, from, to, extra = {}) { const r = doc(collection(u.db, `companies/${co}/audit`)); b.set(r, { action, actorUid: u.uid, actorEmail: u.email, targetUid: t.uid, targetEmail: t.email, fromRole: from, toRole: to, at: serverTimestamp(), ...extra }); return r.id; }
async function mkCompany(u, co, name) { const b = writeBatch(u.db); b.set(doc(u.db, 'companies', co), { name, taxId: '', createdAt: Date.now(), ownerId: u.uid, memberIds: [u.uid] }); const id = audit(u, b, co, 'create', u, 'none', 'owner'); b.set(m(u, co, u.uid), { role: 'owner', email: u.email, addedAt: 1, auditId: id }); await b.commit(); }
async function invite(o, co, email, role) { await setDoc(doc(o.db, 'invites', `${co}__${email}`), { coId: co, coName: co, email, role, invitedByUid: o.uid, invitedBy: o.email }); }
async function accept(u, co, role, from = 'none', grantedBy, delInvite = true) { const b = writeBatch(u.db); const id = audit(u, b, co, 'join', u, from, role, { grantedBy }); b.set(m(u, co, u.uid), { role, email: u.email, addedAt: 1, auditId: id }); b.update(doc(u.db, 'companies', co), { memberIds: arrayUnion(u.uid) }); if (delInvite) b.delete(doc(u.db, 'invites', `${co}__${u.email}`)); await b.commit(); }
async function setRole(a, co, t, from, to) { const b = writeBatch(a.db); const id = audit(a, b, co, 'role', t, from, to); b.update(m(a, co, t.uid), { role: to, auditId: id }); await b.commit(); }
async function remove(a, co, t, from) { const b = writeBatch(a.db); const id = audit(a, b, co, 'remove', t, from, 'removed'); b.update(m(a, co, t.uid), { role: 'removed', auditId: id }); b.update(doc(a.db, 'companies', co), { memberIds: arrayRemove(t.uid) }); await b.commit(); }
async function transfer(a, co, t, from) { const b = writeBatch(a.db); const id = audit(a, b, co, 'transfer', t, from, 'owner'); b.update(m(a, co, t.uid), { role: 'owner', auditId: id }); b.update(doc(a.db, 'companies', co), { ownerId: t.uid }); await b.commit(); }

const A = await user('a@t.com'), B = await user('b@t.com'), C = await user('c@t.com'), E = await user('e@t.com'), V = await user('v@t.com'), X = await user('x@t.com'), Y = await user('y@t.com'), U = await user('u@t.com', false);

S('1 สร้างบริษัท');
await expect('A creates co1 (with audit)', 'allow', () => mkCompany(A, 'co1', 'One'));
await expect('B creates co2 (with audit)', 'allow', () => mkCompany(B, 'co2', 'Two'));
await expect('create company without audit/member doc audit', 'deny', async () => { const b = writeBatch(X.db); b.set(doc(X.db, 'companies', 'cx'), { name: 'x', ownerId: X.uid, memberIds: [X.uid] }); b.set(m(X, 'cx', X.uid), { role: 'owner', email: X.email, addedAt: 1, auditId: 'nope' }); await b.commit(); });
await expect('create company adding someone else as member', 'deny', () => setDoc(doc(X.db, 'companies', 'cy'), { name: 'x', ownerId: X.uid, memberIds: [X.uid, A.uid] }));
await expect('create company owned by someone else', 'deny', () => setDoc(doc(X.db, 'companies', 'cz'), { name: 'x', ownerId: A.uid, memberIds: [A.uid] }));
await expect('hijack existing company co2 via create', 'deny', () => mkCompany(X, 'co2', 'hijack'));
await setDoc(doc(A.db, 'companies/co1/documents/d1'), { t: 1 }); await setDoc(doc(B.db, 'companies/co2/documents/d1'), { t: 2 });

S('2 Multi-company isolation');
await expect('B reads co1 data doc', 'deny', () => getDoc(doc(B.db, 'companies/co1/documents/d1')));
await expect('B lists co1 data', 'deny', () => getDocs(collection(B.db, 'companies/co1/documents')));
await expect('B reads co1 company doc', 'deny', () => getDoc(doc(B.db, 'companies/co1')));
await expect('B reads co1 members', 'deny', () => getDocs(collection(B.db, 'companies/co1/members')));
await expect('B reads co1 audit', 'deny', () => getDocs(collection(B.db, 'companies/co1/audit')));
await expect('B reads co1 settings', 'deny', () => getDocs(collection(B.db, 'companies/co1/settings')));
await expect('A writes co2 data', 'deny', () => setDoc(doc(A.db, 'companies/co2/documents/z'), { x: 1 }));
await expect('A deletes co2 data', 'deny', () => deleteDoc(doc(A.db, 'companies/co2/documents/d1')));
await expect('A lists only own companies', 'allow', async () => { const q = await getDocs(query(collection(A.db, 'companies'), where('memberIds', 'array-contains', A.uid))); if (q.docs.map(d => d.id).join() !== 'co1') throw new Error('leak'); });
await expect('A lists companies of B', 'deny', () => getDocs(query(collection(A.db, 'companies'), where('memberIds', 'array-contains', B.uid))));
await expect('list all companies (no filter)', 'deny', () => getDocs(collection(A.db, 'companies')));
await expect('A reads own co1 data', 'allow', () => getDocs(collection(A.db, 'companies/co1/documents')));
await expect('write unknown top-level collection', 'deny', () => setDoc(doc(A.db, 'foo/bar'), { x: 1 }));

S('3 คำเชิญ');
await expect('owner invites editor', 'allow', () => invite(A, 'co1', 'e@t.com', 'editor'));
await expect('owner invites viewer', 'allow', () => invite(A, 'co1', 'v@t.com', 'viewer'));
await expect('owner invites as owner role', 'deny', () => invite(A, 'co1', 'y@t.com', 'owner'));
await expect('invite with forged invitedByUid', 'deny', () => setDoc(doc(A.db, 'invites', 'co1__y@t.com'), { coId: 'co1', email: 'y@t.com', role: 'editor', invitedByUid: B.uid }));
await expect('B invites into co1', 'deny', () => invite(B, 'co1', 'y@t.com', 'editor'));
await expect('invite id mismatch', 'deny', () => setDoc(doc(A.db, 'invites', 'co1__zz@t.com'), { coId: 'co1', email: 'y@t.com', role: 'editor', invitedByUid: A.uid }));
await expect('Y uses invite addressed to E', 'deny', () => accept(Y, 'co1', 'editor', 'none', A.uid, false));
await expect('V claims editor with viewer invite', 'deny', () => accept(V, 'co1', 'editor', 'none', A.uid));
await expect('V claims owner with viewer invite', 'deny', () => accept(V, 'co1', 'owner', 'none', A.uid));
await expect('V join with forged grantedBy', 'deny', () => accept(V, 'co1', 'viewer', 'none', B.uid));
await expect('V join without audit entry', 'deny', async () => { const b = writeBatch(V.db); b.set(m(V, 'co1', V.uid), { role: 'viewer', email: V.email, addedAt: 1, auditId: 'fake' }); b.update(doc(V.db, 'companies', 'co1'), { memberIds: arrayUnion(V.uid) }); await b.commit(); });
await expect('V accepts as viewer', 'allow', () => accept(V, 'co1', 'viewer', 'none', A.uid));
await expect('E accepts as editor', 'allow', () => accept(E, 'co1', 'editor', 'none', A.uid));
await invite(A, 'co1', 'u@t.com', 'editor');
await expect('unverified U accepts', 'deny', () => accept(U, 'co1', 'editor', 'none', A.uid));
await expect('Y reads invites for u@t.com', 'deny', () => getDocs(query(collection(Y.db, 'invites'), where('email', '==', 'u@t.com'))));
await expect('editor E lists co1 invites', 'deny', () => getDocs(query(collection(E.db, 'invites'), where('coId', '==', 'co1'))));
await expect('owner A lists co1 invites', 'allow', () => getDocs(query(collection(A.db, 'invites'), where('coId', '==', 'co1'))));

S('4 สิทธิ์ผู้แก้ไข (User)');
await expect('E writes data', 'allow', () => setDoc(doc(E.db, 'companies/co1/documents/e1'), { x: 1 }));
await expect('E reads data', 'allow', () => getDocs(collection(E.db, 'companies/co1/documents')));
await expect('E renames company', 'allow', () => updateDoc(doc(E.db, 'companies', 'co1'), { name: 'One!' }));
await expect('E adds uid to memberIds', 'deny', () => updateDoc(doc(E.db, 'companies', 'co1'), { memberIds: arrayUnion(X.uid) }));
await expect('E changes ownerId', 'deny', () => updateDoc(doc(E.db, 'companies', 'co1'), { ownerId: E.uid }));
await expect('E deletes company', 'deny', () => deleteDoc(doc(E.db, 'companies', 'co1')));
await expect('E promotes self (with audit)', 'deny', () => setRole(E, 'co1', E, 'editor', 'owner'));
await expect('E changes V role (with audit)', 'deny', () => setRole(E, 'co1', V, 'viewer', 'editor'));
await expect('E removes A', 'deny', () => remove(E, 'co1', A, 'owner'));
await expect('E reads audit log', 'deny', () => getDocs(collection(E.db, 'companies/co1/audit')));
await expect('E writes into audit via data path', 'deny', () => setDoc(doc(E.db, 'companies/co1/audit/zz'), { action: 'role' }));
await expect('E writes deep subcollection', 'deny', () => setDoc(doc(E.db, 'companies/co1/documents/e1/sub/s'), { x: 1 }));

S('5 สิทธิ์ผู้ดู');
await expect('V reads data', 'allow', () => getDocs(collection(V.db, 'companies/co1/documents')));
await expect('V writes data', 'deny', () => setDoc(doc(V.db, 'companies/co1/documents/v1'), { x: 1 }));
await expect('V deletes data', 'deny', () => deleteDoc(doc(V.db, 'companies/co1/documents/d1')));
await expect('V writes settings', 'deny', () => setDoc(doc(V.db, 'companies/co1/settings/company'), { name: 'v' }));
await expect('V renames company', 'deny', () => updateDoc(doc(V.db, 'companies', 'co1'), { name: 'v' }));

S('6 Audit log ป้องกันการปลอม');
await expect('owner reads audit log', 'allow', async () => { const q = await getDocs(query(collection(A.db, 'companies/co1/audit'), orderBy('at', 'desc'), limit(50))); if (q.size < 3) throw new Error('size ' + q.size); });
await expect('change role without audit', 'deny', () => updateDoc(m(A, 'co1', V.uid), { role: 'editor' }));
await expect('change role reusing old auditId', 'deny', async () => { const cur = (await getDoc(m(A, 'co1', V.uid))).data(); await updateDoc(m(A, 'co1', V.uid), { role: 'editor', auditId: cur.auditId }); });
await expect('audit entry without matching change', 'deny', () => setDoc(doc(A.db, 'companies/co1/audit/f1'), { action: 'role', actorUid: A.uid, actorEmail: A.email, targetUid: V.uid, targetEmail: V.email, fromRole: 'viewer', toRole: 'editor', at: serverTimestamp() }));
await expect('audit with wrong fromRole', 'deny', () => setRole(A, 'co1', V, 'editor', 'editor'));
await expect('audit with forged actor', 'deny', async () => { const b = writeBatch(A.db); const r = doc(collection(A.db, 'companies/co1/audit')); b.set(r, { action: 'role', actorUid: B.uid, actorEmail: B.email, targetUid: V.uid, targetEmail: V.email, fromRole: 'viewer', toRole: 'editor', at: serverTimestamp() }); b.update(m(A, 'co1', V.uid), { role: 'editor', auditId: r.id }); await b.commit(); });
await expect('audit with client-chosen time', 'deny', async () => { const b = writeBatch(A.db); const r = doc(collection(A.db, 'companies/co1/audit')); b.set(r, { action: 'role', actorUid: A.uid, actorEmail: A.email, targetUid: V.uid, targetEmail: V.email, fromRole: 'viewer', toRole: 'editor', at: new Date(2000, 1, 1) }); b.update(m(A, 'co1', V.uid), { role: 'editor', auditId: r.id }); await b.commit(); });
await expect('member change forging target email', 'deny', async () => { const b = writeBatch(A.db); const id = audit(A, b, 'co1', 'role', { uid: V.uid, email: 'z@t.com' }, 'viewer', 'editor'); b.update(m(A, 'co1', V.uid), { role: 'editor', auditId: id, email: 'z@t.com' }); await b.commit(); });
const anyAudit = (await getDocs(collection(A.db, 'companies/co1/audit'))).docs[0].id;
await expect('owner edits audit entry', 'deny', () => updateDoc(doc(A.db, `companies/co1/audit/${anyAudit}`), { toRole: 'viewer' }));
await expect('owner deletes audit entry', 'deny', () => deleteDoc(doc(A.db, `companies/co1/audit/${anyAudit}`)));
await expect('owner deletes member doc directly', 'deny', () => deleteDoc(m(A, 'co1', V.uid)));
await expect('owner changes V viewer→editor (with audit)', 'allow', () => setRole(A, 'co1', V, 'viewer', 'editor'));
await expect('owner changes V editor→viewer (with audit)', 'allow', () => setRole(A, 'co1', V, 'editor', 'viewer'));
await expect('owner sets invalid role', 'deny', () => setRole(A, 'co1', V, 'viewer', 'admin'));

S('7 เจ้าของหลัก (Primary Owner)');
await invite(A, 'co1', 'c@t.com', 'editor'); await accept(C, 'co1', 'editor', 'none', A.uid);
await expect('A promotes C to co-owner', 'allow', () => setRole(A, 'co1', C, 'editor', 'owner'));
await expect('co-owner C demotes primary A', 'deny', () => setRole(C, 'co1', A, 'owner', 'viewer'));
await expect('co-owner C removes primary A', 'deny', () => remove(C, 'co1', A, 'owner'));
await expect('co-owner C removes A from memberIds only', 'deny', () => updateDoc(doc(C.db, 'companies', 'co1'), { memberIds: arrayRemove(A.uid) }));
await expect('co-owner C changes ownerId to self', 'deny', () => updateDoc(doc(C.db, 'companies', 'co1'), { ownerId: C.uid }));
await expect('co-owner C transfers ownership to self', 'deny', () => transfer(C, 'co1', C, 'owner'));
await expect('co-owner C deletes company', 'deny', () => deleteDoc(doc(C.db, 'companies', 'co1')));
await expect('co-owner C changes E role', 'allow', () => setRole(C, 'co1', E, 'editor', 'viewer'));
await expect('co-owner C invites', 'allow', () => invite(C, 'co1', 'y@t.com', 'viewer'));
await expect('primary A demotes self', 'deny', () => setRole(A, 'co1', A, 'owner', 'viewer'));
await expect('primary A removes self', 'deny', () => remove(A, 'co1', A, 'owner'));
await expect('ownerId change without transfer audit', 'deny', () => updateDoc(doc(A.db, 'companies', 'co1'), { ownerId: C.uid }));
await expect('transfer to non-member X', 'deny', () => transfer(A, 'co1', X, 'none'));
await expect('transfer with audit but without ownerId change', 'deny', async () => { const b = writeBatch(A.db); const id = audit(A, b, 'co1', 'transfer', C, 'owner', 'owner'); b.update(m(A, 'co1', C.uid), { role: 'owner', auditId: id }); await b.commit(); });
await expect('primary A transfers to C', 'allow', () => transfer(A, 'co1', C, 'owner'));
await expect('ownerId is now C', 'allow', async () => { if ((await getDoc(doc(C.db, 'companies', 'co1'))).data().ownerId !== C.uid) throw new Error('not C'); });
await expect('old primary A demotes new primary C', 'deny', () => setRole(A, 'co1', C, 'owner', 'editor'));
await expect('old primary A transfers again', 'deny', () => transfer(A, 'co1', E, 'viewer'));
await expect('new primary C demotes A (explicit transfer happened)', 'allow', () => setRole(C, 'co1', A, 'owner', 'editor'));
await expect('A (now editor) deletes company', 'deny', () => deleteDoc(doc(A.db, 'companies', 'co1')));
await expect('audit shows transfer entry', 'allow', async () => { const q = await getDocs(collection(C.db, 'companies/co1/audit')); if (!q.docs.some(d => d.data().action === 'transfer' && d.data().actorUid === A.uid && d.data().targetUid === C.uid && d.data().at)) throw new Error('missing'); });

S('8 นำผู้ใช้ออก');
await expect('C removes V', 'allow', () => remove(C, 'co1', V, 'viewer'));
await expect('removed V reads data', 'deny', () => getDocs(collection(V.db, 'companies/co1/documents')));
await expect('removed V writes data', 'deny', () => setDoc(doc(V.db, 'companies/co1/documents/q'), { x: 1 }));
await expect('removed V lists co1', 'allow', async () => { const q = await getDocs(query(collection(V.db, 'companies'), where('memberIds', 'array-contains', V.uid))); if (q.size) throw new Error('still listed'); });
await expect('removed V reads own member doc', 'allow', async () => { if ((await getDoc(m(V, 'co1', V.uid))).data().role !== 'removed') throw new Error('x'); });
await expect('removed V rejoins without invite', 'deny', () => accept(V, 'co1', 'viewer', 'removed', A.uid, false));
await invite(C, 'co1', 'v@t.com', 'editor');
await expect('removed V rejoins with new invite', 'allow', () => accept(V, 'co1', 'editor', 'removed', C.uid));

S('9 คำเชิญใช้ได้ครั้งเดียว');
await invite(C, 'co1', 'x@t.com', 'viewer');
await expect('X accepts but keeps invite', 'deny', () => accept(X, 'co1', 'viewer', 'none', C.uid, false));
await expect('X accepts and deletes invite', 'allow', () => accept(X, 'co1', 'viewer', 'none', C.uid, true));
await expect('invite is gone after join', 'allow', async () => { const q = await getDocs(query(collection(C.db, 'invites'), where('coId', '==', 'co1'))); if (q.docs.some(d => d.data().email === 'x@t.com')) throw new Error('still there'); });
await remove(C, 'co1', X, 'viewer');
await expect('removed X rejoins (no invite left)', 'deny', () => accept(X, 'co1', 'viewer', 'removed', C.uid, false));
await expect('removed X rejoins claiming delete of missing invite', 'deny', () => accept(X, 'co1', 'viewer', 'removed', C.uid, true));
await invite(C, 'co1', 'x@t.com', 'viewer');
await expect('removed X rejoins with a NEW invite', 'allow', () => accept(X, 'co1', 'viewer', 'removed', C.uid, true));

S('10 ไม่ได้ Login');
const anonApp = initializeApp({ apiKey: 'k', projectId: P }, 'anon'); const anon = getFirestore(anonApp); connectFirestoreEmulator(anon, FS_HOST, FS_PORT);
await expect('anonymous reads company', 'deny', () => getDoc(doc(anon, 'companies/co1')));
await expect('anonymous reads data', 'deny', () => getDocs(collection(anon, 'companies/co1/documents')));
await expect('anonymous reads invites', 'deny', () => getDocs(query(collection(anon, 'invites'), where('email', '==', 'e@t.com'))));
await expect('anonymous creates company', 'deny', () => setDoc(doc(anon, 'companies/anon'), { ownerId: 'x', memberIds: ['x'] }));

process.exit(report() ? 1 : 0);
