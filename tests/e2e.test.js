// End-to-end ผ่านเบราว์เซอร์กับ Firebase Emulator: สมัคร/Login/Logout, ลืมรหัสผ่าน, สร้างบริษัท, เชิญผู้ใช้,
// สิทธิ์ เจ้าของหลัก/เจ้าของ/ผู้แก้ไข/ผู้ดู, นำออก, โอนสิทธิ์, Audit Log, แยกข้อมูลหลายบริษัท
// รัน: npm run test:e2e (เปิด emulator ให้อัตโนมัติ; ต้องรัน npm run build ก่อนถ้าแก้ src/)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');
const FBDIR = path.join(path.dirname(require.resolve('firebase/package.json')), '/');
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-psmacc';
const AUTH = 'http://' + (process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099');
const FSTORE = 'http://' + (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080');
let APP;
// serve dist/index.html with a config that points to the emulator
function startServer() {
  fs.mkdirSync(TMP, { recursive: true });
  let html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  const cfg = "var FIREBASE_CONFIG = {apiKey:'demo-key',authDomain:'" + PROJECT + ".firebaseapp.com',projectId:'" + PROJECT + "',appId:'demo'};";
  if (!html.includes('var FIREBASE_CONFIG = null;') || !html.includes('var FIREBASE_EMULATOR_HOST = null;')) throw new Error('dist/index.html: unexpected config (run npm run build)');
  html = html.replace('var FIREBASE_CONFIG = null;', cfg).replace('var FIREBASE_EMULATOR_HOST = null;', "var FIREBASE_EMULATOR_HOST = '127.0.0.1';");
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => { APP = 'http://127.0.0.1:' + srv.address().port + '/'; r(srv); }));
}
const results = []; const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)]); };
async function page(b) {
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.type() === 'prompt' ? d.accept(p.promptAnswer || '') : d.accept());
  // Firebase SDK from node_modules (same version as the CDN); no other internet access
  await p.route(/^https:/, r => { const u = new URL(r.request().url()); if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) return r.fulfill({ path: FBDIR + path.basename(u.pathname), contentType: 'text/javascript' }); return r.abort(); });
  await p.goto(APP); await p.waitForSelector('#auEmail', { timeout: 15000 }); return p;
}
async function signup(p, email) {
  await p.click('[data-auth="signup"]'); await p.fill('#auEmail', email); await p.fill('#auPw', 'secret123'); await p.fill('#auPw2', 'secret123'); await p.click('#authSubmit');
}
async function verify(email) {
  const r = await (await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/oobCodes')).json();
  const c = r.oobCodes.filter(o => o.email === email && o.requestType === 'VERIFY_EMAIL').pop();
  await fetch(c.oobLink);
}
(async () => {
  const srv = await startServer();
  await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/accounts', { method: 'DELETE' });
  await fetch(FSTORE + '/emulator/v1/projects/' + PROJECT + '/databases/(default)/documents', { method: 'DELETE' });
  const b = await chromium.launch();

  // ---- owner
  const o = await page(b);
  // wrong password message
  await o.fill('#auEmail', 'nobody@x.com'); await o.fill('#auPw', 'wrongpass'); await o.click('#authSubmit'); await o.waitForSelector('#authErr:not([hidden])');
  ok('wrong login shows Thai error', /ไม่ถูกต้อง/.test(await o.textContent('#authErr')), await o.textContent('#authErr'));
  await signup(o, 'owner@x.com'); await o.waitForSelector('#auCo', { timeout: 10000 });
  ok('no-company screen after signup', true);
  await o.fill('#auCo', 'บริษัท เจ้าของ จำกัด'); await o.fill('#auTax', '0105555000001'); await o.click('#authSubmit');
  await o.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await o.waitForTimeout(4000);
  const os = await o.evaluate(() => ({ mode: FB_MODE, role: CUR_ROLE, name: companyName(), accts: STORE.accounts.length, cos: coList().map(c => c.name), pill: byId('companyPill').textContent, av: document.querySelector('.topbar .avatar').textContent }));
  ok('owner logged in, company created, COA seeded', os.mode && os.role === 'owner' && os.name === 'บริษัท เจ้าของ จำกัด' && os.accts >= 27, os);
  // write a document with nested arrays (Firestore can't store these natively)
  await o.evaluate(async () => { await addRec('documents', { type: 'invoice', docNo: 'INV-T1', party: 'A', date: '2026-09-10', items: [{ name: 'x', qty: 1, price: 100 }], total: 100, net: 100, grid: [[1, 2], [3, [4]]], blank: { '': 'e' }, u: undefined, createdAt: Date.now() }); });
  await o.waitForTimeout(800);
  const d = await o.evaluate(() => { const x = STORE.documents.find(d => d.docNo === 'INV-T1'); return x && { grid: x.grid, blank: x.blank, hasU: 'u' in x }; });
  ok('nested arrays / empty keys round-trip', d && JSON.stringify(d.grid) === '[[1,2],[3,[4]]]' && d.blank[''] === 'e' && !d.hasU, d);
  // invite editor + viewer via UI
  await o.evaluate(() => openUsersInfo()); await o.waitForSelector('#mbInvite');
  await o.fill('#mbEmail', 'Editor@X.com'); await o.selectOption('#mbRole', 'editor'); await o.click('#mbInvite'); await o.waitForTimeout(800);
  await o.waitForSelector('#mbInvite'); await o.fill('#mbEmail', 'viewer@x.com'); await o.selectOption('#mbRole', 'viewer'); await o.click('#mbInvite'); await o.waitForTimeout(800);
  ok('pending invites listed', (await o.$$('[data-mbrevoke]')).length === 2);
  await o.waitForSelector('#mbInvite'); await o.fill('#mbEmail', 'viewer@x.com'); await o.selectOption('#mbRole', 'editor'); await o.click('#mbInvite'); await o.waitForTimeout(500);
  ok('duplicate pending invite shows clear message', /มีคำเชิญค้างอยู่แล้ว/.test(await o.textContent('#formError')) && !(await o.$eval('#formError', e => e.hidden)), await o.textContent('#formError'));
  ok('duplicate invite did not change pending list', (await o.$$('[data-mbrevoke]')).length === 2);
  const coId = await o.evaluate(() => CUR_CO);

  // ---- editor: unverified cannot join; after verify joins
  const e = await page(b);
  await signup(e, 'editor@x.com'); await e.waitForSelector('#auCo', { timeout: 10000 });
  const unver = await e.evaluate(async (co) => { try { const fs = FB.fs, uid = FB.user.uid, bt = fs.batch(); bt.set(fs.doc('companies/' + co + '/members/' + uid), { role: 'editor', email: 'editor@x.com' }); bt.update(fs.doc('companies/' + co), { memberIds: firebase.firestore.FieldValue.arrayUnion(uid) }); await bt.commit(); return 'allowed'; } catch (x) { return x.code; } }, coId);
  ok('unverified invitee cannot accept invite', unver === 'permission-denied', unver);
  await verify('editor@x.com'); await e.click('#auRecheck');
  await e.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await e.waitForTimeout(2500);
  const es = await e.evaluate(() => ({ role: CUR_ROLE, co: CUR_CO, docs: STORE.documents.length, accts: STORE.accounts.length }));
  ok('editor joined after verifying, sees data', es.role === 'editor' && es.co === coId && es.docs === 1 && es.accts >= 27, es);
  const ew = await e.evaluate(async () => { try { await addRec('contacts', { name: 'Editor contact' }); return 'ok'; } catch (x) { return x.code; } });
  ok('editor can write', ew === 'ok', ew);
  const einv = await e.evaluate(async (co) => { try { await FB.fs.doc('invites/' + co + '__z@x.com').set({ coId: co, email: 'z@x.com', role: 'editor' }); return 'allowed'; } catch (x) { return x.code; } }, coId);
  ok('editor cannot invite', einv === 'permission-denied', einv);
  const erole = await e.evaluate(async (co) => { try { await FB.fs.doc('companies/' + co + '/members/' + FB.user.uid).update({ role: 'owner' }); return 'allowed'; } catch (x) { return x.code; } }, coId);
  ok('editor cannot promote self', erole === 'permission-denied', erole);

  // ---- viewer
  const v = await page(b);
  await signup(v, 'viewer@x.com'); await v.waitForSelector('#auCo', { timeout: 10000 }); await verify('viewer@x.com'); await v.click('#auRecheck');
  await v.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await v.waitForTimeout(2500);
  const vs = await v.evaluate(() => ({ role: CUR_ROLE, docs: STORE.documents.length, badge: !byId('roleBadge').hidden }));
  ok('viewer joined, sees data, badge shown', vs.role === 'viewer' && vs.docs === 1 && vs.badge, vs);
  const vw = await v.evaluate(async () => { try { await addRec('contacts', { name: 'V' }); return 'ok'; } catch (x) { return writeError(x); } });
  ok('viewer write blocked with Thai message', /ดูอย่างเดียว/.test(vw), vw);

  // ---- stranger
  const s = await page(b);
  await signup(s, 'stranger@x.com'); await s.waitForSelector('#auCo', { timeout: 10000 }); await verify('stranger@x.com');
  const atk = await s.evaluate(async (co) => {
    await FB.user.reload(); await FB.auth.currentUser.getIdToken(true);
    const fs = FB.fs, uid = FB.auth.currentUser.uid, r = {};
    const t = async (k, f) => { try { await f(); r[k] = 'allowed'; } catch (x) { r[k] = x.code; } };
    await t('readDocs', () => fs.collection('companies/' + co + '/documents').get());
    await t('readCompany', () => fs.doc('companies/' + co).get());
    await t('readMembers', () => fs.collection('companies/' + co + '/members').get());
    await t('listAllCompanies', () => fs.collection('companies').get());
    await t('writeDoc', () => fs.doc('companies/' + co + '/documents/x').set({ a: 1 }));
    await t('claimOwner', () => fs.doc('companies/' + co + '/members/' + uid).set({ role: 'owner' }));
    await t('selfInviteAsOwner', () => fs.doc('invites/' + co + '__stranger@x.com').set({ coId: co, email: 'stranger@x.com', role: 'editor' }));
    await t('joinWithoutInvite', async () => { const bt = fs.batch(); bt.set(fs.doc('companies/' + co + '/members/' + uid), { role: 'viewer' }); bt.update(fs.doc('companies/' + co), { memberIds: firebase.firestore.FieldValue.arrayUnion(uid) }); await bt.commit(); });
    await t('readOthersInvites', () => fs.collection('invites').where('email', '==', 'editor@x.com').get());
    return r;
  }, coId);
  ok('stranger blocked everywhere', Object.values(atk).every(x => x === 'permission-denied'), atk);

  // ---- owner: change viewer → editor, then remove viewer
  await o.evaluate(() => openUsersInfo()); await o.waitForSelector('[data-mbdel]');
  const vuid = await v.evaluate(() => FB.user.uid);
  await o.selectOption('[data-mbrole="' + vuid + '"]', 'editor'); await o.waitForTimeout(1500);
  ok('role change reaches viewer live', await v.evaluate(() => CUR_ROLE) === 'editor');
  await o.waitForSelector('[data-mbdel="' + vuid + '"]'); await o.click('[data-mbdel="' + vuid + '"]'); await o.waitForTimeout(1000);
  await v.waitForSelector('#auCo', { timeout: 15000 }).catch(() => {});
  ok('removed user loses access (back to no-company screen)', !!(await v.$('#auCo')));
  ok('owner cannot change own role', await o.evaluate(async () => { try { await FB.fs.doc('companies/' + CUR_CO + '/members/' + FB.user.uid).update({ role: 'viewer' }); return false; } catch (x) { return x.code === 'permission-denied'; } }));

  // ---- editor renames company in settings → registry synced (editor may change name/taxId only)
  await e.evaluate(() => saveSettings('company', { name: 'ชื่อใหม่' })); await e.waitForTimeout(2500);
  ok('editor rename synced to company list', (await o.evaluate(() => coList().map(c => c.name))).includes('ชื่อใหม่'), await o.evaluate(() => coList().map(c => c.name)));

  // ---- Primary owner protection, audit log and transfer (UI)
  await o.evaluate(() => openUsersInfo()); await o.waitForSelector('#mbAudit', { timeout: 8000 });
  const au = await o.$$eval('#mbAudit tbody tr', rs => rs.map(r => r.textContent));
  ok('audit log lists create/join/role/remove', ['สร้างบริษัท','เข้าร่วมตามคำเชิญ','เปลี่ยนสิทธิ์','นำออก'].every(k => au.some(t => t.includes(k))), au.length);
  const euid = await e.evaluate(() => FB.user.uid);
  o.promptAnswer = 'wrong@x.com'; await o.click('[data-mbxfer="' + euid + '"]'); await o.waitForTimeout(800);
  ok('transfer cancelled when confirmation email is wrong', await o.evaluate(() => fbPrimaryOwner() === FB.user.uid));
  o.promptAnswer = 'editor@x.com'; await o.click('[data-mbxfer="' + euid + '"]'); await o.waitForTimeout(2000);
  ok('owner transferred primary ownership to editor via UI', await o.evaluate(() => fbPrimaryOwner()) === euid, await o.evaluate(() => fbPrimaryOwner()));
  ok('old primary no longer sees transfer / cannot edit new primary', (await o.$$('[data-mbxfer]')).length === 0 && !(await o.$('[data-mbrole="' + euid + '"]')));
  await e.evaluate(() => openUsersInfo()); await e.waitForSelector('#mbAudit', { timeout: 8000 });
  ok('new primary sees transfer in audit log', (await e.$$eval('#mbAudit tbody tr', rs => rs.map(r => r.textContent))).some(t => t.includes('โอนสิทธิ์เจ้าของหลัก') && t.includes('owner@x.com')));
  ok('new primary sees transfer buttons', (await e.$$('[data-mbxfer]')).length >= 1);
  await e.evaluate(() => closeModal());

  // ---- owner creates second company from menu, switches, data isolated
  await o.keyboard.press('Escape'); await o.evaluate(() => { closeModal(); openNewCompany(); }); await o.fill('#ncName', 'บริษัทที่สอง'); await o.click('#modalFoot >> text=สร้างและสลับไปบริษัทนี้'); await o.waitForTimeout(4000);
  const o2 = await o.evaluate(() => ({ co: CUR_CO, docs: STORE.documents.length, cos: coList().map(c => c.name), role: CUR_ROLE }));
  ok('second company created and isolated', o2.co !== coId && o2.docs === 0 && o2.cos.length === 2 && o2.role === 'owner', o2);
  ok('editor does not see owner\'s second company', (await e.evaluate(() => coList().length)) === 1);

  // ---- reload keeps session; logout
  await o.reload(); await o.waitForSelector('#authScreen', { state: 'hidden', timeout: 15000 }); await o.waitForTimeout(1500);
  // password reset for an existing account (fresh browser, signed out)
  const r = await page(b);
  await r.click('[data-auth="reset"]'); await r.fill('#auEmail', 'owner@x.com'); await r.click('#authSubmit'); await r.waitForSelector('#authOk:not([hidden])', { timeout: 8000 }).catch(() => {});
  ok('password reset sends link for existing account', /ส่งลิงก์แล้ว/.test(await r.textContent('#authOk')) && await r.$eval('#authErr', e => e.hidden), await r.textContent('#authOk'));
  const oob = await (await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/oobCodes')).json();
  ok('reset email issued by Firebase', oob.oobCodes.some(c => c.email === 'owner@x.com' && c.requestType === 'PASSWORD_RESET'));

  ok('session persists after reload', await o.evaluate(() => FB_MODE && !!FB.user));
  await o.evaluate(() => toggleCoMenu()); await o.click('[data-coout]'); await o.waitForSelector('#auEmail', { timeout: 10000 });
  ok('logout returns to login screen', true);

  for (const [n, pg] of [['owner', o], ['editor', e], ['viewer', v], ['stranger', s]]) ok('no page errors: ' + n, pg.errs.length === 0, pg.errs);
  console.log(results.map(r => r.join('  ')).join('\n'));
  const failed = results.filter(r => r[0] === 'FAIL').length;
  console.log('\n' + failed + ' failed / ' + results.length);
  await b.close(); srv.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log(results.map(r => r.join('  ')).join('\n')); console.error('CRASH', e); process.exit(1); });
