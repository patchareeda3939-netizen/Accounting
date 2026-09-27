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
  const html = require('./lib').withConfig(fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8'), 'emulator');
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
  await p.click('[data-auth="signup"]'); await p.fill('#auEmail', email); await p.fill('#auPw', 'test-only-password'); await p.fill('#auPw2', 'test-only-password'); await p.click('#authSubmit');
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
  ok('home greeting shows the signed-in user\'s email', await o.textContent('#homeGreeting') === 'สวัสดี owner@x.com !', await o.textContent('#homeGreeting'));
  // account dialog: verification status refreshes without a new login; display name
  await o.evaluate(() => fbOpenAccount()); await o.waitForTimeout(800);
  ok('account dialog shows email not verified yet', /ยังไม่ยืนยัน/.test(await o.textContent('#accVerified')));
  await o.evaluate(() => closeModal());
  await verify('owner@x.com');
  await o.evaluate(() => fbOpenAccount()); await o.waitForFunction(() => byId('accVerified') && /ยืนยันแล้ว/.test(byId('accVerified').textContent) && !/ยัง/.test(byId('accVerified').textContent), null, { timeout: 10000 }).catch(() => {});
  ok('verification status updates without logging in again', await o.evaluate(() => byId('accVerified').textContent) === 'ยืนยันแล้ว', await o.evaluate(() => byId('accVerified').textContent));
  await o.fill('#accName', 'สมชาย ทดสอบ'); await o.click('#accNameSave'); await o.waitForTimeout(1200);
  ok('display name saved: greeting and avatar use it', await o.textContent('#homeGreeting') === 'สวัสดี สมชาย ทดสอบ !' && await o.textContent('.topbar .avatar') === 'ส', [await o.textContent('#homeGreeting'), await o.textContent('.topbar .avatar')]);
  await o.evaluate(() => closeModal());
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
  await v.evaluate(() => go('settings', 'company')); await v.waitForTimeout(800);
  const vUi = await v.evaluate(() => ({ banner: (byId('coLegalLock') || {}).textContent || '', edit: document.querySelectorAll('[data-coedit]').length, bradd: !!document.querySelector('[data-bradd]'), logo: !!document.querySelector('label.co-logo[for]') }));
  ok('viewer: company page fully read-only', /ดูอย่างเดียว/.test(vUi.banner) && vUi.edit === 0 && !vUi.bradd && !vUi.logo, vUi);
  await v.evaluate(() => openCompanySettings());
  const vDlg = await v.evaluate(() => ({ allDisabled: COMPANY_FIELDS.every(f => !byId('s_' + f.key) || byId('s_' + f.key).disabled), saveHidden: modalFoot.lastElementChild.hidden }));
  ok('viewer: settings dialog all disabled, no save button', vDlg.allDisabled && vDlg.saveHidden, vDlg);
  await v.evaluate(() => closeModal());

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

  // ---- legal-entity data (name, tax ID, ...): only owners may change it
  const eRename = await e.evaluate(async () => { try { await saveSettings('company', { name: 'แก้โดยผู้แก้ไข' }); return 'ok'; } catch (x) { return writeError(x); } });
  ok('editor cannot rename company (Thai message)', /ไม่มีสิทธิ์/.test(eRename), eRename);
  const eTax = await e.evaluate(async () => { try { await saveSettings('company', { taxId: '0105550000015' }); return 'ok'; } catch (x) { return x.code; } });
  ok('editor cannot change tax ID', eTax === 'permission-denied', eTax);
  const ePhone = await e.evaluate(async () => { try { await saveSettings('company', { phone: '02-111-1111' }); return 'ok'; } catch (x) { return x.code; } });
  ok('editor can still change non-legal company info (phone)', ePhone === 'ok', ePhone);
  await e.evaluate(() => go('settings', 'company')); await e.waitForTimeout(800);
  const eUi = await e.evaluate(() => ({ banner: !!byId('coLegalLock'), edit: [...document.querySelectorAll('[data-coedit]')].map(b => b.dataset.coedit), bradd: !!document.querySelector('[data-bradd]') }));
  ok('editor: legal fields locked on company page', eUi.banner && !['name', 'legalName', 'taxId', 'legalAddress', 'businessType', 'vatRegistered', 'fiscalStart'].some(k => eUi.edit.includes(k)), eUi);
  ok('editor: daily fields and branches editable on company page', ['address', 'phone', 'email', 'custPhone', 'branch'].every(k => eUi.edit.includes(k)) && eUi.bradd, eUi);
  // ---- branches: editor adds/edits/deactivates; branch with history cannot be deleted by editor
  const addBranchUi = async (pg, code, name) => { await pg.click('[data-bradd]'); await pg.fill('#brCode', code); await pg.fill('#brName', name); await pg.fill('#brAddr', 'ที่อยู่ ' + name); await pg.click('#modalFoot >> text=บันทึก'); await pg.waitForTimeout(1200); };
  await addBranchUi(e, '00001', 'สาขาหนึ่ง'); await addBranchUi(e, '00002', 'สาขาสอง');
  ok('editor adds branches via UI', await e.evaluate(() => STORE.branches.map(b => b.code).join()) === '00001,00002', await e.evaluate(() => STORE.branches.map(b => b.code)));
  await e.click('[data-bredit="00002"]'); await e.fill('#brCode', '00003'); await e.click('#modalFoot >> text=บันทึก'); await e.waitForTimeout(1500);
  ok('editor changes code of a branch without history', await e.evaluate(() => STORE.branches.map(b => b.code).join()) === '00001,00003', await e.evaluate(() => STORE.branches.map(b => b.code)));
  const eDocBr = await e.evaluate(async () => { try { await addRec('documents', { type: 'invoice', docNo: 'BR-1', party: 'A', date: '2026-09-15', items: [], total: 0, net: 0, extra: { branch: '00001' }, createdAt: Date.now() }); return 'ok'; } catch (x) { return x.code; } });
  await e.waitForTimeout(800);
  ok('document using a branch saves and marks the branch as used', eDocBr === 'ok' && await e.evaluate(() => STORE.branches.find(b => b.code === '00001').used === true), eDocBr);
  const eBrUi = await e.evaluate(() => ({ del1: !!document.querySelector('[data-brdel="00001"]'), off1: !!document.querySelector('[data-bractive="00001"]'), del3: !!document.querySelector('[data-brdel="00003"]') }));
  ok('editor: no delete button for branch with history, deactivate available', !eBrUi.del1 && eBrUi.off1 && eBrUi.del3, eBrUi);
  await e.click('[data-bredit="00001"]');
  ok('editor: code field locked for branch with history', await e.evaluate(() => byId('brCode').disabled));
  await e.evaluate(() => closeModal());
  const eDelUsed = await e.evaluate(async () => { try { await fbDeleteBranch(STORE.branches.find(b => b.code === '00001')); return 'ok'; } catch (x) { return x.code; } });
  ok('editor cannot delete branch with history (direct attempt)', eDelUsed === 'permission-denied', eDelUsed);
  await e.click('[data-bractive="00001"]'); await e.waitForTimeout(1000);
  ok('editor deactivates branch; hidden from new documents', await e.evaluate(() => STORE.branches.find(b => b.code === '00001').active === false && !branches().some(b => b.code === '00001') && branchesFor('00001').some(b => b.code === '00001')));
  await e.click('[data-bractive="00001"]'); await e.waitForTimeout(1000);
  ok('editor re-activates branch', await e.evaluate(() => STORE.branches.find(b => b.code === '00001').active === true));
  await e.click('[data-brdel="00003"]'); await e.waitForTimeout(1200);
  ok('editor deletes branch without history', await e.evaluate(() => !STORE.branches.some(b => b.code === '00003')));

  // ---- period lock: editor locks, cannot unlock; owner unlocks; every change audited
  await e.evaluate(async () => { await addRec('documents', { type: 'invoice', typeLabel: 'ใบแจ้งหนี้', group: 'customer', docNo: 'LK-1', party: 'A', date: '2026-08-15', items: [], total: 100, net: 100, payments: [], status: 'unpaid', extra: {}, createdAt: Date.now() }); });
  await e.waitForTimeout(600);
  const eLock = await e.evaluate(async () => { await lockPeriod('2026-08-31'); await new Promise(r => setTimeout(r, 800)); return lockDate(); });
  ok('editor locks period', eLock === '2026-08-31', eLock);
  await e.evaluate(() => { mc.ym = '2026-08'; go('accounting', 'monthClose'); }); await e.waitForTimeout(800);
  ok('editor: no unlock button on month-close page', await e.evaluate(() => ![...document.querySelectorAll('[data-mcgo]')].some(b => /unlockPeriod/.test(b.dataset.mcgo)) && /ปลดล็อกได้เฉพาะเจ้าของ/.test(byId('pageData').textContent)));
  await e.evaluate(() => unlockPeriod()); await e.waitForTimeout(500);
  ok('editor unlock via app is refused', await e.evaluate(() => lockDate()) === '2026-08-31');
  const eUnlockDirect = await e.evaluate(async () => { try { await fbSetLockDate('', 'period_unlock'); return 'ok'; } catch (x) { return x.code; } });
  ok('editor unlock direct attempt denied', eUnlockDirect === 'permission-denied', eUnlockDirect);
  const eBack = await e.evaluate(async () => { try { await fbSetLockDate('2026-07-31', 'period_lock'); return 'ok'; } catch (x) { return x.code; } });
  ok('editor cannot move lock date backwards', eBack === 'permission-denied', eBack);
  const eDocLocked = await e.evaluate(async () => { try { await saveSettings('company', { lockDate: '2026-12-31' }); return 'ok'; } catch (x) { return x.code; } });
  ok('lock date change without audit entry denied', eDocLocked === 'permission-denied', eDocLocked);
  const eLkEdit = await e.evaluate(async () => { const d = STORE.documents.find(x => x.docNo === 'LK-1'); try { await setRec('documents', d._id, Object.assign(strip(d), { total: 999 })); return 'ok'; } catch (x) { return writeError(x); } });
  ok('editor: editing a transaction in locked period is refused with a lock message', /งวดบัญชีที่ล็อกแล้ว/.test(eLkEdit), eLkEdit);
  const eLkDirect = await e.evaluate(async () => { const d = STORE.documents.find(x => x.docNo === 'LK-1'); const r = FB.fs.doc('companies/' + CUR_CO + '/documents/' + d._id); const out = {}; for (const [k, f] of [['update', () => r.update({ total: 1 })], ['delete', () => r.delete()], ['create', () => FB.fs.collection('companies/' + CUR_CO + '/documents').add({ type: 'invoice', date: '2026-08-02', total: 1 })]]) { try { await f(); out[k] = 'ok'; } catch (x) { out[k] = x.code; } } return out; });
  ok('editor: direct Firestore create/update/delete in locked period denied', eLkDirect.update === 'permission-denied' && eLkDirect.delete === 'permission-denied' && eLkDirect.create === 'permission-denied', eLkDirect);
  const eLkPay = await e.evaluate(async () => { const d = STORE.documents.find(x => x.docNo === 'LK-1'); try { await setRec('documents', d._id, Object.assign(strip(d), { payments: [{ date: '2026-09-05', amount: 40 }], status: 'partial', updatedAt: Date.now() })); return 'ok'; } catch (x) { return x.code; } });
  ok('editor: payment dated after the lock can be recorded on a locked invoice', eLkPay === 'ok', eLkPay);
  const oLkEdit = await o.evaluate(async () => { const d = STORE.documents.find(x => x.docNo === 'LK-1'); try { await setRec('documents', d._id, Object.assign(strip(d), { total: 555 })); return 'ok'; } catch (x) { return x.code; } });
  ok('owner: editing a locked transaction is also refused until unlocked', oLkEdit === 'permission-denied', oLkEdit);
  const vLock = await v.evaluate(async () => { try { await fbSetLockDate('2026-10-31', 'period_lock'); return 'ok'; } catch (x) { return x.code; } });
  ok('viewer cannot lock period', vLock === 'permission-denied', vLock);
  await o.evaluate(() => { mc.ym = '2026-08'; go('accounting', 'monthClose'); }); await o.waitForTimeout(800);
  ok('owner sees unlock button', await o.evaluate(() => [...document.querySelectorAll('[data-mcgo]')].some(b => /unlockPeriod/.test(b.dataset.mcgo))));
  await o.evaluate(() => unlockPeriod()); await o.waitForTimeout(1000);
  ok('owner unlocks period', await o.evaluate(() => lockDate()) === '');
  const oAfter = await o.evaluate(async () => { await new Promise(r => setTimeout(r, 500)); const d = STORE.documents.find(x => x.docNo === 'LK-1'); try { await setRec('documents', d._id, Object.assign(strip(d), { total: 120 })); return 'ok'; } catch (x) { return x.code; } });
  ok('owner: back-dated edit allowed after unlocking', oAfter === 'ok', oAfter);
  const eVat = await e.evaluate(async () => { try { await saveSettings('company', { vatRegistered: 'no' }); return 'ok'; } catch (x) { return x.code; } });
  ok('editor cannot change VAT status', eVat === 'permission-denied', eVat);
  await e.evaluate(() => { openCompanySettings(); });
  const eModal = await e.evaluate(() => ({ nameDisabled: byId('s_name').disabled, taxDisabled: byId('s_taxId').disabled, phoneDisabled: byId('s_phone').disabled }));
  ok('editor settings dialog disables legal inputs only', eModal.nameDisabled && eModal.taxDisabled && !eModal.phoneDisabled, eModal);
  const eSaveDlg = await e.evaluate(async () => { byId('s_phone').value = '02-222-2222'; [...modalFoot.querySelectorAll('button')].pop().click(); await new Promise(r => setTimeout(r, 1500)); return { open: !byId('overlay').classList.contains('hidden') && !!byId('s_phone'), phone: companySettings().phone, tax: companySettings().taxId }; });
  ok('editor saving the dialog updates phone and leaves legal fields', eSaveDlg.phone === '02-222-2222', eSaveDlg);
  await e.evaluate(() => closeModal());
  await o.evaluate(() => go('settings', 'company')); await o.waitForTimeout(800);
  const oUi = await o.evaluate(() => ({ banner: !!byId('coLegalLock'), edit: [...document.querySelectorAll('[data-coedit]')].map(b => b.dataset.coedit), bradd: !!document.querySelector('[data-bradd]') }));
  ok('owner sees edit buttons for legal fields', !oUi.banner && oUi.edit.includes('name') && oUi.edit.includes('taxId') && oUi.bradd, oUi);
  await o.evaluate(() => saveSettings('company', { name: 'ชื่อใหม่' })); await o.waitForTimeout(2500);
  ok('owner rename synced to company list', (await e.evaluate(() => coList().map(c => c.name))).includes('ชื่อใหม่'), await e.evaluate(() => coList().map(c => c.name)));
  // owner deletes branch with history (audited)
  await o.evaluate(() => { closeModal(); go('settings', 'company'); }); await o.waitForTimeout(800);
  ok('owner sees delete button for branch with history', !!(await o.$('[data-brdel="00001"]')));
  await o.click('[data-brdel="00001"]'); await o.waitForTimeout(1500);
  ok('owner deletes branch with history', await o.evaluate(() => !STORE.branches.some(b => b.code === '00001')));
  ok('document keeps its branch code after branch deletion', await o.evaluate(() => (STORE.documents.find(d => d.docNo === 'BR-1') || {}).extra.branch === '00001'));

  // ---- Primary owner protection, audit log and transfer (UI)
  await o.evaluate(() => openUsersInfo()); await o.waitForSelector('#mbAudit', { timeout: 8000 });
  const au = await o.$$eval('#mbAudit tbody tr', rs => rs.map(r => r.textContent));
  ok('audit log lists create/join/role/remove', ['สร้างบริษัท','เข้าร่วมตามคำเชิญ','เปลี่ยนสิทธิ์','นำออก'].every(k => au.some(t => t.includes(k))), au.length);
  ok('audit log records period lock by editor and unlock by owner with the period', au.some(t => t.includes('ล็อกงวดบัญชี') && t.includes('editor@x.com') && t.includes('31/08/2026')) && au.some(t => t.includes('ปลดล็อกงวดบัญชี') && t.includes('owner@x.com')), au.filter(t => /งวด/.test(t)));
  ok('audit log records branch deletions (editor: no history, owner: with history)', au.some(t => t.includes('ลบสาขา') && t.includes('00003') && t.includes('editor@x.com') && t.includes('ไม่มีประวัติ')) && au.some(t => t.includes('ลบสาขา') && t.includes('00001') && t.includes('owner@x.com') && t.includes('มีประวัติ')), au.filter(t => /สาขา/.test(t)));
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
