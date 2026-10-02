// Regression tests: bug ที่เคยพบจริงในโปรเจกต์นี้ แต่ละข้อทดสอบว่า bug เดิมไม่กลับมา
// รัน: npm run test:regression (เปิด Firebase Emulator ให้อัตโนมัติ; ต้องรัน npm run build ก่อนถ้าแก้ src/)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const R = L.reporter('');
let cur = '';
const check = (name, cond, extra) => R.check(cur, name, cond, extra);
const REG = (id, title) => { cur = id; console.error('... ' + id + ' ' + title); };

(async () => {
  const pages = L.localPages();
  const browser = await chromium.launch();

  /* ---------- โหมดเก็บข้อมูลในเบราว์เซอร์ (localStorage) ---------- */
  const p = await L.newPage(browser, pages.local);
  await p.evaluate(() => openNewCompany()); await p.fill('#ncName', 'บริษัท สอง จำกัด');
  await p.click('#modalFoot >> text=สร้างและสลับไปบริษัทนี้'); await p.waitForTimeout(1200);
  const co2 = await p.evaluate(() => CUR_CO);

  REG('REG-01', 'สร้างบริษัทใหม่แล้วบริษัทหายจากรายการ');
  check('new company is listed right after creation', (await p.evaluate(() => coList().map(c => c.name))).includes('บริษัท สอง จำกัด'));
  await p.evaluate(() => switchCompany('main')); await p.waitForTimeout(300);
  check('new company still listed after switching away', (await p.evaluate(() => coList().map(c => c.name))).includes('บริษัท สอง จำกัด'));
  await p.reload(); await p.waitForTimeout(800);
  check('new company still listed after reload', (await p.evaluate(() => coList().map(c => c.name))).includes('บริษัท สอง จำกัด'));

  REG('REG-02', 'แก้ข้อมูลแล้วสลับบริษัททันที ข้อมูลหาย');
  await p.evaluate(async id => { switchCompany(id); await addRec('contacts', { name: 'FAST' }); switchCompany('main'); }, co2);
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(id => switchCompany(id), co2); await p.waitForTimeout(200);
  check('edit made just before switching is saved', (await p.evaluate(() => STORE.contacts.map(c => c.name))).includes('FAST'));

  REG('REG-03', 'รหัสรายการซ้ำเมื่อสลับกลับไปบริษัทที่เปิดไว้แล้ว');
  // main has many records (high sequence), the other company fewer; after a reload, visiting the other
  // company used to lower the sequence, so new records in main reused existing ids
  await p.evaluate(async id => { switchCompany('main'); for (let i = 0; i < 6; i++) await addRec('contacts', { name: 'M' + i }); }, co2);
  await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(async id => { switchCompany(id); switchCompany('main'); for (let i = 0; i < 6; i++) await addRec('contacts', { name: 'N' + i }); }, co2);
  const ids = await p.evaluate(() => STORE.contacts.map(c => c._id));
  check('record ids in the company are unique', ids.length === new Set(ids).size, ids);
  REG('REG-04', 'พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม แต่ไม่แจ้งผู้ใช้');
  await p.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k.startsWith('psmacc_data')) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; });
  await p.evaluate(async () => { await addRec('contacts', { name: 'Q' }); }); await p.waitForTimeout(600);
  check('user sees a warning when saving fails', /ไม่สำเร็จ/.test(await p.textContent('#toast')), await p.textContent('#toast'));
  check('no page errors (localStorage scenarios)', p.errs.length === 0, p.errs);

  REG('REG-05', 'หน้ากระทบยอดธนาคาร error เมื่อยังไม่มีบัญชีธนาคาร');
  for (const [mode, url] of [['browser storage', pages.local], ['Claude DB', pages.claudedb]]) {
    const q = await L.newPage(browser, url);
    await q.evaluate(() => document.querySelector('.subnav-child[data-child-key="reconcile"]').click()); await q.waitForTimeout(400);
    check(mode + ': shows "no bank account" message without errors', /ยังไม่มีบัญชีธนาคาร/.test(await q.textContent('#pageData')) && q.errs.length === 0, q.errs);
  }

  REG('REG-06', 'ชื่อบริษัทตัวอย่าง "NPD-BKK" ฝังในโค้ด');
  const q6 = await L.newPage(browser, pages.local);
  check('default company name is generic', /บริษัทของฉัน/.test(await q6.textContent('#companyPill')), await q6.textContent('#companyPill'));
  const srcHits = fs.readdirSync(path.join(L.ROOT, 'src')).filter(f => fs.readFileSync(path.join(L.ROOT, 'src', f), 'utf8').includes('NPD-BKK'));
  check('no "NPD-BKK" left in src/', srcHits.length === 0, srcHits);

  REG('REG-07', 'build.sh ไม่อัปเดต index.html ที่ root และรันด้วย ./build.sh ไม่ได้');
  check('build.sh is executable', (fs.statSync(path.join(L.ROOT, 'build.sh')).mode & 0o111) !== 0);
  // build a copy with a marker in src/ and check that root index.html picks it up
  const bdir = path.join(__dirname, '.tmp', 'buildcheck');
  fs.rmSync(bdir, { recursive: true, force: true }); fs.mkdirSync(bdir, { recursive: true });
  fs.cpSync(path.join(L.ROOT, 'src'), path.join(bdir, 'src'), { recursive: true }); fs.copyFileSync(path.join(L.ROOT, 'build.sh'), path.join(bdir, 'build.sh'));
  fs.copyFileSync(path.join(L.ROOT, 'index.html'), path.join(bdir, 'index.html'));
  fs.appendFileSync(path.join(bdir, 'src', 'part18.js'), '\n// REG07_MARKER\n');
  require('child_process').execFileSync('bash', ['build.sh'], { cwd: bdir, stdio: 'ignore' });
  check('build.sh refreshes root index.html from src/', fs.readFileSync(path.join(bdir, 'index.html'), 'utf8').includes('REG07_MARKER'));

  REG('MIG-01', 'ย้ายสาขาจากรูปแบบเดิม (settings.branches) เป็นรายการสาขาแยก โดยข้อมูลไม่หาย');
  for (const [mode, url] of [['browser storage', pages.local], ['Claude DB', pages.claudedb]]) {
    const q = await L.newPage(browser, url);
    await q.evaluate(async () => { await addRec('documents', { type: 'invoice', docNo: 'MIG-1', party: 'A', date: '2026-09-01', items: [], total: 0, net: 0, extra: { branch: '00001' }, createdAt: Date.now() });
      await saveSettings('company', { branches: [{ code: '00001', name: 'สาขาเดิม 1', address: 'เชียงใหม่', phone: '053' }, { code: '00002', name: 'สาขาเดิม 2', address: 'ขอนแก่น', phone: '' }] }); });
    await q.waitForTimeout(1500);
    const r = await q.evaluate(() => ({ br: STORE.branches.map(b => [b.code, b.name, b.address, b.used, b.active].join('|')).sort(), legacy: companySettings().branches, label: branchLabel(branchOf('00001')) }));
    check(mode + ': old branches moved with name/address and history flag', JSON.stringify(r.br) === JSON.stringify(['00001|สาขาเดิม 1|เชียงใหม่|true|true', '00002|สาขาเดิม 2|ขอนแก่น|false|true']), r);
    check(mode + ': old list cleared so migration runs once', r.legacy == null, r.legacy);
    check(mode + ': documents still show their branch', r.label === 'สาขาที่ 00001 สาขาเดิม 1', r.label);
    check(mode + ': no page errors', q.errs.length === 0, q.errs);
  }

  /* ---------- Firebase (Emulator) ---------- */
  await L.resetEmulators();
  const app = await L.startFirebaseApp();
  const open = () => L.newPage(browser, app.url, '#auEmail');
  const joinByUi = async (pg, email) => { await L.signup(pg, email); await pg.waitForSelector('#auCo'); await L.verifyEmail(email); await pg.click('#auRecheck'); await pg.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await pg.waitForTimeout(1500); };
  const inviteByUi = async (pg, email, role) => { await pg.evaluate(() => openUsersInfo()); await pg.waitForSelector('#mbInvite'); await pg.fill('#mbEmail', email); await pg.selectOption('#mbRole', role); await pg.click('#mbInvite'); await pg.waitForTimeout(800); };

  const o = await open();
  await L.signup(o, 'owner@reg.test'); await o.waitForSelector('#auCo');
  await o.fill('#auCo', 'บริษัท ทดสอบ'); await o.click('#authSubmit');
  await o.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await o.waitForTimeout(2500);
  const coId = await o.evaluate(() => CUR_CO);

  REG('REG-08', 'ผู้ใช้ที่ถูกนำออกไม่รู้ตัว หน้าจอยังแสดงข้อมูลบริษัทเดิม');
  await inviteByUi(o, 'member@reg.test', 'editor');
  const mbr = await open(); await joinByUi(mbr, 'member@reg.test');
  check('member joined', await mbr.evaluate(() => CUR_ROLE) === 'editor');
  const mUid = await mbr.evaluate(() => FB.user.uid);
  await o.evaluate(() => { closeModal(); openUsersInfo(); }); await o.waitForSelector('[data-mbdel="' + mUid + '"]'); await o.click('[data-mbdel="' + mUid + '"]');
  await mbr.waitForSelector('#auCo', { timeout: 15000 }).catch(() => {});
  check("removed member's open page returns to the no-company screen", !!(await mbr.$('#auCo')));
  check('removed member has no company data in memory', await mbr.evaluate(() => STORE.documents.length === 0 && COMPANIES.length === 0));

  REG('REG-09', 'คนที่ถูกนำออกใช้คำเชิญเดิมกลับเข้ามาเองได้');
  await o.evaluate(() => closeModal()); await inviteByUi(o, 'keeper@reg.test', 'viewer');
  const kp = await open(); await L.signup(kp, 'keeper@reg.test'); await kp.waitForSelector('#auCo'); await L.verifyEmail('keeper@reg.test');
  const keepInvite = co => kp.evaluate(async co => { await FB.user.reload(); await FB.auth.currentUser.getIdToken(true); const fs = FB.fs, u = FB.auth.currentUser, b = fs.batch(); const me = { uid: u.uid, email: 'keeper@reg.test' };
    const cur = await fs.doc('companies/' + co + '/members/' + u.uid).get(); const before = cur.exists ? cur.data().role : 'none';
    FB.user = u; const aid = fbAudit(b, co, 'join', me, before, 'viewer', (await fs.collection('invites').where('email', '==', 'keeper@reg.test').get()).docs[0]?.data().invitedByUid);
    b.set(fs.doc('companies/' + co + '/members/' + u.uid), { role: 'viewer', email: me.email, addedAt: 1, auditId: aid });
    b.update(fs.doc('companies/' + co), { memberIds: firebase.firestore.FieldValue.arrayUnion(u.uid) });
    try { await b.commit(); return 'allowed'; } catch (e) { return e.code; } }, co);
  check('accepting an invite while keeping it is rejected', await keepInvite(coId) === 'permission-denied');
  await kp.click('#auRecheck'); await kp.waitForSelector('#authScreen', { state: 'hidden', timeout: 10000 }); await kp.waitForTimeout(1200);
  check('normal accept through the app works', await kp.evaluate(() => CUR_ROLE) === 'viewer');
  const kUid = await kp.evaluate(() => FB.user.uid);
  await o.evaluate(() => { closeModal(); openUsersInfo(); }); await o.waitForSelector('[data-mbdel="' + kUid + '"]'); await o.click('[data-mbdel="' + kUid + '"]'); await o.waitForTimeout(1500);
  const kp2 = await open(); await kp2.fill('#auEmail', 'keeper@reg.test'); await kp2.fill('#auPw', 'test-only-password'); await kp2.click('#authSubmit'); await kp2.waitForSelector('#auCo', { timeout: 10000 });
  check('removed member cannot rejoin by replaying the accepted invite', await kp2.evaluate(async co => { const fs = FB.fs, u = FB.auth.currentUser, b = fs.batch(); const aid = fbAudit(b, co, 'join', { uid: u.uid, email: 'keeper@reg.test' }, 'removed', 'viewer', 'x'); b.set(fs.doc('companies/' + co + '/members/' + u.uid), { role: 'viewer', email: 'keeper@reg.test', addedAt: 1, auditId: aid }); b.update(fs.doc('companies/' + co), { memberIds: firebase.firestore.FieldValue.arrayUnion(u.uid) }); try { await b.commit(); return 'allowed'; } catch (e) { return e.code; } }, coId) === 'permission-denied');

  REG('REG-10', 'เจ้าของร่วมลดสิทธิ์หรือนำเจ้าของหลักออกได้');
  await o.evaluate(() => closeModal()); await inviteByUi(o, 'coowner@reg.test', 'editor');
  const co = await open(); await joinByUi(co, 'coowner@reg.test');
  const cUid = await co.evaluate(() => FB.user.uid), oUid = await o.evaluate(() => FB.user.uid);
  await o.evaluate(() => { closeModal(); openUsersInfo(); }); await o.waitForSelector('[data-mbrole="' + cUid + '"]'); await o.selectOption('[data-mbrole="' + cUid + '"]', 'owner'); await o.waitForTimeout(1500);
  check('co-owner has owner role', await co.evaluate(() => CUR_ROLE) === 'owner');
  await co.evaluate(() => openUsersInfo()); await co.waitForSelector('#mbBody table');
  check('co-owner sees no role/remove controls for the primary owner', !(await co.$('[data-mbrole="' + oUid + '"]')) && !(await co.$('[data-mbdel="' + oUid + '"]')));
  check('co-owner sees no transfer button', (await co.$$('[data-mbxfer]')).length === 0);
  const tryAs = (pg, fn, arg) => pg.evaluate(fn, arg);
  check('co-owner demoting the primary owner is rejected', await tryAs(co, async a => { const fs = FB.fs, b = fs.batch(); const aid = fbAudit(b, a.co, 'role', { uid: a.o, email: 'owner@reg.test' }, 'owner', 'viewer'); b.update(fs.doc('companies/' + a.co + '/members/' + a.o), { role: 'viewer', auditId: aid }); try { await b.commit(); return 'allowed'; } catch (e) { return e.code; } }, { co: coId, o: oUid }) === 'permission-denied');
  check('co-owner removing the primary owner is rejected', await tryAs(co, async a => { const fs = FB.fs, b = fs.batch(); const aid = fbAudit(b, a.co, 'remove', { uid: a.o, email: 'owner@reg.test' }, 'owner', 'removed'); b.update(fs.doc('companies/' + a.co + '/members/' + a.o), { role: 'removed', auditId: aid }); b.update(fs.doc('companies/' + a.co), { memberIds: firebase.firestore.FieldValue.arrayRemove(a.o) }); try { await b.commit(); return 'allowed'; } catch (e) { return e.code; } }, { co: coId, o: oUid }) === 'permission-denied');
  check('primary owner unchanged', await o.evaluate(() => fbPrimaryOwner() === FB.user.uid && CUR_ROLE === 'owner'));

  REG('REG-11', 'เชิญอีเมลที่มีคำเชิญค้างอยู่ ขึ้นข้อความ "ไม่มีสิทธิ์" ทำให้เข้าใจผิด');
  await co.evaluate(() => closeModal()); await o.evaluate(() => closeModal());
  await inviteByUi(o, 'pending@reg.test', 'viewer');
  await o.fill('#mbEmail', 'pending@reg.test'); await o.selectOption('#mbRole', 'editor'); await o.click('#mbInvite'); await o.waitForTimeout(500);
  const msg = await o.textContent('#formError');
  check('duplicate invite shows "pending invite" message', /มีคำเชิญค้างอยู่แล้ว/.test(msg) && !/ไม่มีสิทธิ์/.test(msg), msg);

  REG('REG-14', 'บันทึกการตั้งค่าส่งค่าที่ถูกปฏิเสธไปแล้วซ้ำ ทำให้บันทึกครั้งถัดไปล้มเหลว');
  await o.evaluate(() => closeModal()); await inviteByUi(o, 'acct@reg.test', 'editor');
  const ac = await open(); await joinByUi(ac, 'acct@reg.test');
  const r14 = await ac.evaluate(async () => {
    const out = {};
    try { await saveSettings('company', { taxId: '0105550000015' }); out.tax = 'ok'; } catch (e) { out.tax = e.code; }
    try { await saveSettings('company', { phone: '02-555-0000' }); out.phone = 'ok'; } catch (e) { out.phone = e.code; }
    await new Promise(r => setTimeout(r, 800)); out.saved = companySettings().phone; return out; });
  check('rejected legal change does not block the next save of other fields', r14.tax === 'permission-denied' && r14.phone === 'ok' && r14.saved === '02-555-0000', r14);
  check('no page errors: accounting user', ac.errs.length === 0, ac.errs);

  REG('REG-12', 'Firestore บันทึกข้อมูลที่มี array ซ้อน / ค่า undefined / key ว่าง ไม่ได้');
  await o.evaluate(() => closeModal());
  const w12 = await o.evaluate(async () => { try { await addRec('documents', { type: 'journalEntry', docNo: 'REG-12', grid: [[1, 2], [3, [4]]], blank: { '': 'e' }, u: undefined, arr: [1, undefined], createdAt: Date.now() }); return 'ok'; } catch (e) { return e.message; } });
  check('record with nested arrays / undefined / empty key saves', w12 === 'ok', w12);
  await o.reload(); await o.waitForSelector('#authScreen', { state: 'hidden', timeout: 15000 }); await o.waitForTimeout(2000);
  const d12 = await o.evaluate(() => { const d = STORE.documents.find(x => x.docNo === 'REG-12'); return d && { grid: d.grid, blank: d.blank, hasU: 'u' in d, arr: d.arr }; });
  check('record reads back identically from the server', d12 && JSON.stringify(d12.grid) === '[[1,2],[3,[4]]]' && d12.blank[''] === 'e' && !d12.hasU && JSON.stringify(d12.arr) === '[1,null]', d12);

  REG('REG-13', 'รายการที่ไม่มีฟิลด์เรียงลำดับหายไป และโหลดได้ไม่เกิน 1,000 รายการ');
  await o.evaluate(async co => { const fs = FB.fs; await fs.doc('companies/' + co + '/documents/nosort').set({ type: 'journalEntry', docNo: 'NO-CREATEDAT' });
    for (let b = 0; b < 3; b++) { const bt = fs.batch(); for (let i = 0; i < 350; i++) bt.set(fs.collection('companies/' + co + '/contacts').doc(), { name: 'C' + (b * 350 + i) }); await bt.commit(); } }, coId);
  await o.reload(); await o.waitForSelector('#authScreen', { state: 'hidden', timeout: 15000 }); await o.waitForTimeout(3000);
  const c13 = await o.evaluate(() => ({ nosort: STORE.documents.some(d => d.docNo === 'NO-CREATEDAT'), contacts: STORE.contacts.length }));
  check('record without createdAt is loaded', c13.nosort, c13);
  check('more than 1,000 records are loaded', c13.contacts >= 1050, c13);

  REG('REG-15', 'ยังไม่ได้เปิด Firebase Storage แต่มีปุ่มแนบไฟล์ กดแล้วเจอข้อผิดพลาด');
  const app2 = await L.startFirebaseApp({ storage: false });
  const ns = await L.newPage(browser, app2.url, '#auEmail');
  await ns.fill('#auEmail', 'owner@reg.test'); await ns.fill('#auPw', 'test-only-password'); await ns.click('#authSubmit');
  await ns.waitForSelector('#authScreen', { state: 'hidden', timeout: 15000 }); await ns.waitForTimeout(1500);
  await ns.evaluate(() => openDocForm('expense')); await ns.waitForSelector('#attList');
  const a15 = await ns.evaluate(async () => ({ button: !!document.querySelector('.att-add, #attInput'), msg: (byId('attMsg') || {}).textContent, assets: await getAssets() }));
  check('attach button hidden while Storage is off', !a15.button && /ยังไม่ได้เปิดใช้การแนบไฟล์/.test(a15.msg) && a15.assets === null, a15);
  const o15 = await o.evaluate(() => { closeModal(); openDocForm('expense'); return !!document.querySelector('.att-add #attInput'); });
  check('attach button shown when Storage is on', o15);
  await o.evaluate(() => closeModal());
  R.check('REG-15', 'no page errors: storage off', ns.errs.length === 0, ns.errs);
  app2.srv.close();

  for (const [n, pg] of [['owner', o], ['member', mbr], ['keeper', kp2], ['co-owner', co]]) R.check('REG-xx', 'no page errors: ' + n, pg.errs.length === 0, pg.errs);
  await browser.close(); app.srv.close();
  process.exit(R.finish() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); R.check(cur, 'crashed: ' + e.message.split('\n')[0], false); R.finish(); process.exit(1); });
