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
  const browser = await chromium.launch({ env: Object.assign({}, process.env, { LANG: 'C.UTF-8' }) }); // UTF-8 locale so Thai download file names survive

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

  REG('FEAT-01', 'ปุ่มเลือกบริษัทอยู่มุมขวาบน');
  const fq = await L.newPage(browser, pages.local);
  const pill = await fq.evaluate(() => { const r = byId('companyPill').getBoundingClientRect(); return { inRight: !!byId('companyPill').closest('.topbar-icons'), x: r.left, w: innerWidth }; });
  check('company switcher sits in the right-hand group of the top bar', pill.inRight && pill.x > pill.w / 2, pill);
  await fq.evaluate(() => toggleCoMenu()); await fq.waitForTimeout(200);
  const menu = await fq.evaluate(() => { const r = byId('coMenu').getBoundingClientRect(); return { right: r.right, w: innerWidth, top: r.top }; });
  check('company menu opens on screen under the switcher', menu.right <= menu.w && menu.right > menu.w / 2 && menu.top > 40, menu);
  await fq.evaluate(() => toggleCoMenu());

  REG('FEAT-04', 'ลบกล่อง "ข้อมูลติดต่อลูกค้า" ออกจากหน้าบัญชีและการตั้งค่า');
  await fq.evaluate(() => go('settings', 'company')); await fq.waitForTimeout(400);
  const coPage = await fq.textContent('#pageData');
  check('customer contact box removed, company and legal sections still shown', !/ข้อมูลติดต่อลูกค้า/.test(coPage) && /ข้อมูลบริษัท/.test(coPage) && /ข้อมูลทางกฎหมาย/.test(coPage));

  REG('FEAT-02', 'กรองรายงานตามสาขา');
  await fq.evaluate(async () => {
    await putBranch({ code: '00001', name: 'สาขาหนึ่ง', active: true, createdAt: 1 });
    const je = (no, br, amt) => addRec('documents', { type: 'journalEntry', typeLabel: 'สมุดรายวันทั่วไป', group: 'other', docNo: no, party: 'ขาย', date: todayStr(), items: [{ account: '1110', debit: amt, credit: 0 }, { account: '4110', debit: 0, credit: amt }], total: amt, net: amt, status: 'done', extra: br ? { branch: br } : {}, createdAt: Date.now() });
    await je('BR-HQ', '', 700); await je('BR-01', '00001', 300);
    pageState.repPeriod = 'all'; pageState.repBranch = ''; openReport('pl');
  });
  await fq.waitForTimeout(400);
  const income = () => fq.evaluate(() => { const row = lastReport.rows.find(x => !x.g && /4110/.test((x.t || x.c || x)[0])); return row ? strip2((row.t || row.c || row)[1]) : null; });
  const allBr = await income();
  check('branch filter is shown on reports', await fq.evaluate(() => !!byId('repBranch') && [...byId('repBranch').options].map(o => o.value).join() === ',00000,00001'));
  await fq.selectOption('#repBranch', '00001'); await fq.waitForTimeout(400);
  const br1 = await income(), title1 = await fq.textContent('.rep-co');
  await fq.selectOption('#repBranch', '00000'); await fq.waitForTimeout(400);
  const hq = await income();
  check('report filtered to one branch', /1,000/.test(allBr) && /300/.test(br1) && /700/.test(hq) && /สาขาที่ 00001/.test(title1), [allBr, br1, hq, title1]);
  check('all documents are back after filtering', await fq.evaluate(() => STORE.documents.length) >= 2);

  REG('FEAT-03', 'งบรวมหลายบริษัท ตัดรายการระหว่างกัน');
  await fq.evaluate(() => openNewCompany()); await fq.fill('#ncName', 'บริษัท ลูก จำกัด');
  await fq.click('#modalFoot >> text=สร้างและสลับไปบริษัทนี้'); await fq.waitForTimeout(1200);
  await fq.evaluate(async () => {
    // child company buys a 1,000 service from the parent; the parent books it as revenue
    await addRec('documents', { type: 'journalEntry', typeLabel: 'สมุดรายวันทั่วไป', group: 'other', docNo: 'IC-C', party: 'บริษัทของฉัน', date: todayStr(), items: [{ account: '5290', debit: 1000, credit: 0 }, { account: '2110', debit: 0, credit: 1000 }], total: 1000, net: 1000, status: 'done', extra: {}, createdAt: Date.now() });
    switchCompany('main');
    await addRec('documents', { type: 'journalEntry', typeLabel: 'สมุดรายวันทั่วไป', group: 'other', docNo: 'IC-P', party: 'บริษัท ลูก จำกัด', date: todayStr(), items: [{ account: '1130', debit: 1000, credit: 0 }, { account: '4110', debit: 0, credit: 1000 }], total: 1000, net: 1000, status: 'done', extra: {}, createdAt: Date.now() });
    pageState.repBranch = ''; pageState.repPeriod = 'all'; openReport('grpPL');
  });
  await fq.waitForTimeout(1200);
  const gpl = await fq.evaluate(() => ({ cols: lastReport.cols.map(c => c[0]), net: (lastReport.rows.find(x => x.t && /กำไร \(ขาดทุน\) สุทธิ/.test(x.t[0])) || {}).t, rev: (lastReport.rows.find(x => !x.g && !x.t && /4110/.test(x[0])) || []).map(strip2), title: document.querySelector('.rep-co').textContent }));
  check('group P&L has a column per company plus elimination and total', JSON.stringify(gpl.cols.slice(1)) === JSON.stringify(['บริษัทของฉัน', 'บริษัท ลูก จำกัด', 'ตัดรายการระหว่างกัน', 'งบรวม']), gpl.cols);
  check('intercompany revenue is eliminated (parent 1,000 own sales + 1,000 to the child -> 1,000 group sales)', /^฿2,000\.00$/.test(gpl.rev[1]) && /^[−-]฿1,000\.00$/.test(gpl.rev[3]) && /^฿1,000\.00$/.test(gpl.rev[4]), gpl.rev);
  check('group report title names the group', /กลุ่มบริษัท \(2 บริษัท\)/.test(gpl.title), gpl.title);
  await fq.evaluate(() => openReport('grpIC')); await fq.waitForTimeout(800);
  const ic = await fq.evaluate(() => lastReport.rows.filter(x => !x.g).map(x => strip2(x[3])));
  check('intercompany reconciliation matches both sides', ic.length === 3 && ic.every(t => t === 'ตรงกัน'), ic);

  REG('FEAT-08', 'งบรวม: เลือกบริษัท สัดส่วนถือหุ้น ตัดเงินลงทุน ส่วนได้เสียที่ไม่มีอำนาจควบคุม');
  await fq.evaluate(async () => {
    const je = (no, date, a, b, v, extra) => addRec('documents', { type: 'journalEntry', typeLabel: 'สมุดรายวันทั่วไป', group: 'other', docNo: no, party: 'ทุน', date, items: [{ account: a, debit: v, credit: 0 }, { account: b, debit: 0, credit: v }], total: v, net: v, status: 'done', extra: extra || {}, createdAt: Date.now() });
    const child = coList().find(c => c.name === 'บริษัท ลูก จำกัด')._id;
    switchCompany(child);
    await je('CAP-1', '2025-01-05', '1120', '3110', 1000000);
    await je('SAL-1', '2025-06-30', '1120', '4110', 200000);
    await je('YC-1', '2025-12-31', '4110', '3120', 50000, { yearClose: true }); // ปิดบัญชีบางส่วนเข้ากำไรสะสม
    switchCompany('main');
    await addRec('accounts', { code: '1310', name: 'เงินลงทุนในบริษัทย่อย', accType: 'fixedAsset' });
    await je('INV-1', '2025-01-05', '1310', '1120', 900000);
    pageState.repPeriod = 'all'; openReport('grpTB');
  });
  await fq.waitForTimeout(800);
  const tb8 = await fq.evaluate(() => (lastReport.rows.find(x => x.t) || {}).t.map(strip2));
  check('group trial balance still balances when a company closed its year', /^฿0\.00$/.test(tb8[tb8.length - 1]), tb8);
  await fq.evaluate(() => openReport('grpBS')); await fq.waitForTimeout(800);
  await fq.click('text=ตั้งค่างบรวม'); await fq.waitForSelector('[data-gco]');
  await fq.fill('[data-gco] [data-k="pct"]', '80'); await fq.selectOption('[data-gco] [data-k="inv"]', '1310'); await fq.fill('[data-gco] [data-k="eqAcq"]', '1000000');
  await fq.click('#modalFoot >> text=บันทึก'); await fq.waitForTimeout(800);
  const bs8 = await fq.evaluate(() => { const r = lastReport.rows.filter(x => !x.g).map(x => (x.t || x).map(strip2)); const f = re => (r.find(x => re.test(x[0])) || []); return { inv: f(/1310/), cap: f(/3110/), gw: f(/ค่าความนิยม/), post: f(/เพิ่มขึ้นหลังวันลงทุน/), nci: f(/ไม่มีอำนาจควบคุม/), ta: f(/^รวมสินทรัพย์/), tle: f(/รวมหนี้สินและส่วนของเจ้าของ/), note: lastReport.note }; });
  const last = a => a[a.length - 1];
  check('investment in the subsidiary is eliminated', last(bs8.inv) === '฿0.00', bs8.inv);
  check('subsidiary share capital is eliminated, parent capital stays', last(bs8.cap) === '฿0.00' && /80%/.test(bs8.note), [bs8.cap, bs8.note]);
  check('goodwill = 900,000 − 80% × 1,000,000', last(bs8.gw) === '฿100,000.00', bs8.gw);
  check('parent share of post-acquisition retained earnings = 80% × 50,000', last(bs8.post) === '฿40,000.00', bs8.post);
  check('non-controlling interest = 20% × subsidiary equity (1,050,000 + 149,000)', last(bs8.nci) === '฿239,800.00', bs8.nci);
  check('group balance sheet balances', last(bs8.ta) === last(bs8.tle), [bs8.ta, bs8.tle]);
  await fq.evaluate(() => openReport('grpPL')); await fq.waitForTimeout(800);
  const pl8 = await fq.evaluate(() => lastReport.rows.filter(x => !x.g && !x.t && /บริษัทใหญ่|ไม่มีอำนาจควบคุม/.test(x[0])).map(x => x.map(strip2)));
  check('group profit split: non-controlling interest = 20% × 199,000', pl8.length === 2 && last(pl8[1]) === '฿39,800.00', pl8);
  await fq.evaluate(() => openGroupSettings()); await fq.waitForSelector('[data-gco]');
  await fq.uncheck('[data-gco] [data-k="on"]'); await fq.click('#modalFoot >> text=บันทึก'); await fq.waitForTimeout(800);
  const ex8 = await fq.evaluate(() => ({ cols: lastReport.cols.map(c => c[0]), note: lastReport.note, title: document.querySelector('.rep-co').textContent }));
  check('a company can be left out of the group statements', !ex8.cols.includes('บริษัท ลูก จำกัด') && /ไม่รวม 1 บริษัท/.test(ex8.note) && /กลุ่มบริษัท \(1 บริษัท\)/.test(ex8.title), ex8);
  await fq.evaluate(() => openGroupSettings()); await fq.waitForSelector('[data-gco]');
  await fq.check('[data-gco] [data-k="on"]'); await fq.fill('[data-gco] [data-k="pct"]', '150'); await fq.click('#modalFoot >> text=บันทึก');
  check('ownership above 100% is rejected', /0–100/.test(await fq.textContent('#formError')));
  await fq.evaluate(() => closeModal());
  check('no page errors (branch filter, group reports)', fq.errs.length === 0, fq.errs);

  REG('FEAT-09', 'จัดการเอกสารภาษีซื้อ: รอใช้สิทธิ์ / เลือกเดือนที่ใช้สิทธิ์ / ไม่ใช้สิทธิ์');
  const iv = await L.newPage(browser, pages.local);
  const ivEmpty = await iv.evaluate(() => { go('tax', 'inputVat'); return byId('pageData').textContent; });
  check('menu page shows the empty message', /ไม่พบข้อมูลในช่วงเวลานี้/.test(ivEmpty) && /กรุณาสร้างค่าใช้จ่ายเพื่อจัดการเอกสารภาษีซื้อ/.test(ivEmpty) && /ยอดรวมภาษีซื้อทั้งหมด/.test(ivEmpty), ivEmpty.slice(0, 200));
  await iv.evaluate(async () => {
    await loadStandardCoa();
    const ex = (no, date, vat) => addRec('documents', { type: 'expense', typeLabel: 'ค่าใช้จ่าย', group: 'supplier', docNo: no, party: 'ร้าน ก', date, items: [], subtotal: vat * 100 / 7, vat, total: vat * 107 / 7, net: vat * 107 / 7, wht: 0, status: 'paid', extra: { method: 'เงินสด' }, createdAt: Date.now() });
    await ex('EX-A', '2026-08-10', 70); await ex('EX-B', '2026-08-12', 140); await ex('EX-C', '2026-08-15', 7); await ex('EX-L', '2026-03-05', 14);
    await saveSettings('company', { lockDate: '2026-03-31' });
    pageState.ivPeriod = 'all'; go('tax', 'inputVat');
  }); await iv.waitForTimeout(300);
  const ivState = () => iv.evaluate(() => { const g = c => round2(allLines().filter(l => l.code === c).reduce((s, l) => s + l.dr - l.cr, 0)); return { aug: vatSummary('2026-08').inp, sep: vatSummary('2026-09').inp, oct: vatSummary('2026-10').inp, v1150: g('1150'), v1155: g('1155'), txt: byId('pageData').textContent }; });
  let s9 = await ivState();
  check('purchase VAT defaults to claimed in the document month (as before)', s9.aug === 217 && s9.v1150 === 231 && s9.v1155 === 0 && /ใช้สิทธิ์แล้ว 4/.test(s9.txt), s9);
  check('document in a locked period cannot be changed', await iv.evaluate(() => { const tr = [...document.querySelectorAll('.iv-table tbody tr')].find(t => /EX-L/.test(t.textContent)); return !!tr && !tr.querySelector('button') && /🔒/.test(tr.textContent); }));
  const manage = async (no, st, ym) => { await iv.evaluate(n => openIvClaim(STORE.documents.find(d => d.docNo === n)._id), no); await iv.waitForSelector('#ivSt'); await iv.selectOption('#ivSt', st); if (ym) await iv.fill('#ivYm', ym); await iv.click('#modalFoot >> text=บันทึก'); await iv.waitForTimeout(300); };
  await manage('EX-A', 'pending'); s9 = await ivState();
  check('pending: left out of VAT return, held in 1155', s9.aug === 147 && s9.v1155 === 70 && s9.v1150 === 161 && /รอใช้สิทธิ์ 1/.test(s9.txt), s9);
  await manage('EX-A', 'claimed', '2026-10'); s9 = await ivState();
  check('claimed in a later month: counted in that month, ledger moved from 1155 to 1150', s9.aug === 147 && s9.oct === 70 && s9.v1155 === 0 && s9.v1150 === 231, s9);
  const oct1150 = await iv.evaluate(() => allLines().filter(l => l.code === '1150' && l.d.docNo === 'EX-A').map(l => l.date + ':' + l.dr));
  check('input VAT posts on the first day of the claim month', JSON.stringify(oct1150) === '["2026-10-01:70"]', oct1150);
  await manage('EX-B', 'claimed', '2027-03');
  check('claim later than 6 months after the tax invoice month is rejected', /เกินกำหนดใช้สิทธิ์/.test(await iv.textContent('#formError')));
  await iv.fill('#ivYm', '2026-07'); await iv.click('#modalFoot >> text=บันทึก'); await iv.waitForTimeout(200);
  check('claim before the document month is rejected', /ต้องไม่ก่อนเดือนของเอกสาร/.test(await iv.textContent('#formError')));
  await iv.evaluate(() => closeModal());
  await manage('EX-C', 'none'); s9 = await ivState();
  const exp5290 = await iv.evaluate(() => round2(allLines().filter(l => l.code === '5290' && l.d.docNo === 'EX-C').reduce((s, l) => s + l.dr, 0)));
  check('not claimed: VAT becomes expense and leaves the VAT return', s9.aug === 140 && exp5290 === 107 && s9.v1150 === 224, { s9, exp5290 });
  await iv.evaluate(() => { pageState.ivTab = 'all'; refreshPageData(); });
  await iv.evaluate(() => { const k = STORE.documents.find(d => d.docNo === 'EX-B')._id; ivToggle(k, true); ivBulk('pending'); }); await iv.waitForSelector('#modalFoot >> text=ย้ายไปรอใช้สิทธิ์');
  await iv.click('#modalFoot >> text=ย้ายไปรอใช้สิทธิ์'); await iv.waitForTimeout(300);
  await iv.evaluate(() => { const k = STORE.documents.find(d => d.docNo === 'EX-B')._id; ivToggle(k, true); ivBulk('claimed'); }); await iv.waitForSelector('#ivBYm');
  await iv.fill('#ivBYm', '2026-09'); await iv.click('#modalFoot >> text=ใช้สิทธิ์'); await iv.waitForTimeout(300); s9 = await ivState();
  check('bulk: move to pending, then claim in a chosen month', s9.sep === 140 && s9.aug === 0 && s9.v1155 === 0, s9);
  const rec9 = await iv.evaluate(() => ['2026-08', '2026-09', '2026-10'].map(ym => round2(sumLines(linesIn(SYS.vatIn, ym), 'dr') - sumLines(linesIn(SYS.vatIn, ym), 'cr')) + '=' + vatSummary(ym).inp));
  check('month-end close: input VAT in the ledger matches the VAT return each month', rec9.every(x => x.split('=')[0] === x.split('=')[1]), rec9);
  REG('REG-17', 'ที่คั่นหน้าในแถบซ้ายใช้ไอคอนเดียวกันหมด ไม่ตามหน้าที่เลือก');
  const pin17 = await iv.evaluate(() => { pinSet(['accounting:bankTx', 'accounting:receiptCapture', 'inventory:stock', 'tax:overview', 'tax:inputVat']); renderPins(); return { rail: [...document.querySelectorAll('#sidePins svg')].map(x => x.innerHTML), noIcon: pinPages().filter(x => pinIcon(x.id).indexOf(PIN_BOOKMARK) >= 0).map(x => x.id) }; });
  check('each pinned page shows its own icon', pin17.rail.length === 5 && new Set(pin17.rail).size === 5, pin17.rail.length);
  check('every page has an icon (no generic bookmark)', pin17.noIcon.length === 0, pin17.noIcon);
  await iv.evaluate(() => pinSet([]));
  check('no page errors (input VAT)', iv.errs.length === 0, iv.errs);

  REG('FEAT-10', 'เงินสดย่อย: ตั้งวงเงิน จ่ายเงินสดย่อย เบิกชดเชย');
  const pc = await L.newPage(browser, pages.local);
  const pcTxt = await pc.evaluate(async () => { await loadStandardCoa(); go('billing', 'pettyCash'); return byId('pageData').textContent; });
  check('empty page offers to set up a fund', /ยังไม่มีเงินสดย่อย/.test(pcTxt) && /ตั้งวงเงินสดย่อย/.test(pcTxt), pcTxt.slice(0, 120));
  await pc.evaluate(() => openPcFund()); await pc.waitForSelector('#pcLimit');
  await pc.fill('#pcCust', 'สมชาย'); await pc.fill('#pcLimit', '5000'); await pc.fill('#pcAmt', '5000'); await pc.fill('#pcDate', '2026-09-01'); await pc.selectOption('#pcFrom', '1120');
  await pc.click('#modalFoot >> text=บันทึก'); await pc.waitForTimeout(500);
  const bal = c => pc.evaluate(code => pcAccBal(code), c);
  const f10 = await pc.evaluate(() => { const acc = STORE.accounts.find(a => a.code === '1111'); return { funds: pcFunds(), acc, sub: acc && accSubtype(acc) }; });
  check('fund set up: new 1111 petty cash account (cash/bank type), 5,000 moved from the bank', f10.funds.length === 1 && f10.sub === 'bank' && f10.funds[0].custodian === 'สมชาย' && await bal('1111') === 5000 && await bal('1120') === -5000, f10);
  await pc.evaluate(() => pcNewExpense()); await pc.waitForSelector('#f_party');
  await pc.fill('#f_party', 'ร้านเครื่องเขียน'); await pc.fill('#f_date', '2026-09-05'); await pc.selectOption('#f_vat', 'exclusive');
  await pc.evaluate(() => { form.items = [{ name: 'กระดาษ', qty: 1, price: 1000 }]; });
  await pc.evaluate(() => [...byId('modalFoot').querySelectorAll('button')].pop().click()); await pc.waitForTimeout(600); await pc.evaluate(() => document.querySelectorAll('.att-viewer').forEach(x => x.remove()));
  const ex10 = await pc.evaluate(() => { const d = STORE.documents.find(x => x.party === 'ร้านเครื่องเขียน'); return d && { bankAcc: d.extra.bankAcc, fund: d.extra.pettyFund, total: d.total, vat: d.vat }; });
  check('petty cash voucher is an expense paid from the petty cash account (VAT kept)', ex10 && ex10.bankAcc === '1111' && ex10.total === 1070 && ex10.vat === 70 && await bal('1111') === 3930, ex10);
  const need = await pc.evaluate(() => { go('billing', 'pettyCash'); return byId('pageData').textContent; });
  check('page shows balance and amount to replenish', /3,930\.00/.test(need) && /ต้องเบิกชดเชย฿1,070\.00/.test(need.replace(/\s/g, '')), need.slice(0, 300));
  await pc.evaluate(() => openPcMove(pcFund(pageState.pcFund), 'replenish')); await pc.waitForSelector('#pmAmt');
  check('replenish amount defaults to what was spent', await pc.inputValue('#pmAmt') === '1070');
  await pc.fill('#pmDate', '2026-09-30'); await pc.click('#modalFoot >> text=บันทึก'); await pc.waitForTimeout(500);
  check('after replenishing the fund is back to its limit', await bal('1111') === 5000 && await bal('1120') === -6070);
  await pc.evaluate(() => { const d = STORE.documents.find(x => x.party === 'ร้านเครื่องเขียน'); openDocForm('expense', d); }); await pc.waitForSelector('#f_party');
  await pc.evaluate(() => [...byId('modalFoot').querySelectorAll('button')].pop().click()); await pc.waitForTimeout(500); await pc.evaluate(() => document.querySelectorAll('.att-viewer').forEach(x => x.remove()));
  check('editing the voucher keeps it paid from petty cash', await pc.evaluate(() => STORE.documents.find(x => x.party === 'ร้านเครื่องเขียน').extra.bankAcc) === '1111' && await bal('1111') === 5000);
  check('no page errors (petty cash)', pc.errs.length === 0, pc.errs);

  REG('FEAT-11', 'เงินทดรองจ่าย: จ่ายทดรอง เคลียร์ด้วยค่าใช้จ่าย รับเงินคืน');
  const av = await L.newPage(browser, pages.local);
  await av.evaluate(async () => { await loadStandardCoa(); await addRec('employees', { name: 'สมหญิง ใจดี' }); go('billing', 'advances'); });
  await av.evaluate(() => openAdvForm()); await av.waitForSelector('#avEmp');
  await av.fill('#avEmp', 'สมหญิง ใจดี'); await av.fill('#avAmt', '3000'); await av.fill('#avDate', '2026-09-02'); await av.fill('#avDue', '2026-09-10'); await av.fill('#avPurpose', 'ค่าเดินทาง');
  check('advance account is created when none exists', await av.evaluate(() => byId('avAcc').value) === '@new');
  await av.click('#modalFoot >> text=บันทึก'); await av.waitForTimeout(500);
  const ab = c => av.evaluate(code => pcAccBal(code), c);
  const a11 = await av.evaluate(() => STORE.documents.find(d => d.type === 'advance'));
  check('advance paid: Dr 1135 advance / Cr bank', a11 && a11.extra.advAcc === '1135' && await ab('1135') === 3000 && await ab('1120') === -3000 && await av.evaluate(() => accName('1135')) === 'เงินทดรองจ่าย', a11 && a11.extra);
  let t11 = await av.evaluate(() => { refreshPageData(); return byId('pageData').textContent; });
  check('listed as overdue for clearing', /เกินกำหนดเคลียร์/.test(t11) && /3,000\.00/.test(t11), t11.slice(0, 200));
  await av.evaluate(id => openAdvClear(id), a11._id); await av.click('#modalFoot >> text=+ ค่าใช้จ่ายจากเงินทดรอง'); await av.waitForSelector('#f_party');
  await av.fill('#f_party', 'ปั๊มน้ำมัน'); await av.fill('#f_date', '2026-09-05');
  await av.evaluate(() => { form.items = [{ name: 'ค่าน้ำมัน', qty: 1, price: 2000 }]; });
  await av.evaluate(() => [...byId('modalFoot').querySelectorAll('button')].pop().click()); await av.waitForTimeout(600); await av.evaluate(() => document.querySelectorAll('.att-viewer').forEach(x => x.remove()));
  let i11 = await av.evaluate(id => advInfo(findDoc(id)), a11._id);
  check('expense clears the advance (Cr 1135)', i11.spent === 2000 && i11.out === 1000 && await ab('1135') === 1000, i11);
  await av.evaluate(id => openAdvClear(id), a11._id); await av.click('#modalFoot >> text=รับเงินคืน'); await av.waitForSelector('#asAmt');
  check('return amount defaults to the outstanding balance', await av.inputValue('#asAmt') === '1000');
  await av.fill('#asDate', '2026-09-08'); await av.click('#modalFoot >> text=บันทึก'); await av.waitForTimeout(500);
  i11 = await av.evaluate(id => advInfo(findDoc(id)), a11._id);
  check('cash returned: advance fully cleared, 1135 back to zero', i11.st === 'done' && i11.out === 0 && await ab('1135') === 0 && await ab('1110') === 1000, i11);
  t11 = await av.evaluate(() => { pageState.advTab = 'done'; refreshPageData(); return byId('pageData').textContent; });
  check('shown under cleared', /เคลียร์แล้ว/.test(t11) && /สมหญิง/.test(t11));
  await av.evaluate(async () => { await addRec('documents', { type: 'advance', typeLabel: 'เงินทดรองจ่าย', group: 'other', party: 'สมหญิง ใจดี', date: '2026-09-12', docNo: 'AV-X', total: 500, subtotal: 500, net: 500, status: 'done', extra: { advAcc: '1135', fromAcc: '1110' }, createdAt: Date.now() }); });
  const ax = await av.evaluate(() => STORE.documents.find(d => d.docNo === 'AV-X')._id);
  await av.evaluate(async id => { await addRec('documents', { type: 'expense', typeLabel: 'ค่าใช้จ่าย', group: 'supplier', docNo: 'EX-X', party: 'ร้าน ข', date: '2026-09-13', items: [{ name: 'ค่าอาหาร', qty: 1, price: 650 }], subtotal: 650, vat: 0, total: 650, net: 650, wht: 0, status: 'paid', extra: { method: 'เงินสด', bankAcc: '1135', advanceId: id }, createdAt: Date.now() }); }, ax);
  const ix = await av.evaluate(id => advInfo(findDoc(id)), ax);
  check('overspent advance: company owes the employee', ix.st === 'owe' && ix.out === -150, ix);
  await av.evaluate(id => openAdvClear(id), ax);
  check('offers to pay the difference', await av.evaluate(() => /จ่ายเพิ่มให้พนักงาน/.test(byId('modalFoot').textContent)));
  await av.evaluate(() => closeModal());
  check('no page errors (advances)', av.errs.length === 0, av.errs);

  REG('REG-18', 'แก้ไขค่าใช้จ่ายแล้วสถานะภาษีซื้อ (รอใช้สิทธิ์) หายไป');
  await av.evaluate(async () => { const d = STORE.documents.find(x => x.docNo === 'EX-X'); await setRec('documents', d._id, Object.assign({}, strip(d), { vat: 42, extra: Object.assign({}, d.extra, { vatClaim: { st: 'pending', ym: '', invNo: 'T-1', invDate: '' } }) })); });
  await av.evaluate(() => openDocForm('expense', STORE.documents.find(x => x.docNo === 'EX-X'))); await av.waitForSelector('#f_party');
  await av.evaluate(() => [...byId('modalFoot').querySelectorAll('button')].pop().click()); await av.waitForTimeout(500);
  const r18 = await av.evaluate(() => { const d = STORE.documents.find(x => x.docNo === 'EX-X'); return Object.assign({ saved: !!d.updatedAt && byId('overlay').className.indexOf('open') < 0 }, d.extra); });
  check('input VAT status and paying account survive editing', r18.saved && r18.vatClaim && r18.vatClaim.st === 'pending' && r18.vatClaim.invNo === 'T-1' && r18.advanceId && r18.bankAcc === '1135', r18);

  REG('FEAT-12', 'เงินเดือน: ประกันสังคม ภาษี ภ.ง.ด.1 ลงบัญชี สลิป นำส่ง');
  const pr = await L.newPage(browser, pages.local);
  await pr.evaluate(async () => {
    await loadStandardCoa();
    await addRec('employees', { name: 'สมชาย ใจดี', position: 'พนักงานบัญชี', empType: 'full', salary: 30000, active: 'yes' });
    await addRec('employees', { name: 'สมหญิง รักงาน', empType: 'full', salary: 15000, active: 'yes' });
    await addRec('employees', { name: 'คนเก่า', empType: 'full', salary: 20000, active: 'no' });
    await addRec('employees', { name: 'ไม่เข้าประกัน', empType: 'full', salary: 10000, sso: 'no', active: 'yes' });
    pageState.prYm = '2026-09'; go('team', 'payroll');
  });
  check('empty month offers to create the payroll run', /ยังไม่มีรอบเงินเดือน กันยายน 2569/.test(await pr.textContent('#pageData')));
  await pr.evaluate(() => openPrRun('2026-09')); await pr.waitForSelector('#prRows');
  const l12 = await pr.evaluate(() => prForm.lines.map(l => [l.name, !!l.on, l.gross, l.sso, l.wht, l.net]));
  const ln = n => l12.find(x => x[0] === n) || [];
  check('salary 30,000: social security 5% of 17,500 ceiling = 875, tax 164.58, net 28,960.42', JSON.stringify(ln('สมชาย ใจดี')) === JSON.stringify(['สมชาย ใจดี', true, 30000, 875, 164.58, 28960.42]), ln('สมชาย ใจดี'));
  check('salary 15,000: social security 750, no tax', JSON.stringify(ln('สมหญิง รักงาน').slice(2)) === '[15000,750,0,14250]', ln('สมหญิง รักงาน'));
  check('resigned employee left out; opted-out employee has no social security', ln('คนเก่า')[1] === false && ln('ไม่เข้าประกัน')[3] === 0, l12);
  await pr.evaluate(() => { const i = prForm.lines.findIndex(l => l.name === 'สมชาย ใจดี'); const el = document.querySelector('.pr-in[data-i="' + i + '"][data-k="extra"]'); el.value = '6000'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  const ot = await pr.evaluate(() => { const l = prForm.lines.find(l => l.name === 'สมชาย ใจดี'); return [l.gross, l.sso, l.wht]; });
  check('extra income raises gross and tax, social security stays at the ceiling', ot[0] === 36000 && ot[1] === 875 && ot[2] === 464.58, ot);
  await pr.fill('#prDate', '2026-09-30');
  await pr.click('#modalFoot >> text=บันทึกและลงบัญชี'); await pr.waitForTimeout(600);
  const p12 = await pr.evaluate(() => { const d = prRun('2026-09'); const ls = postingsOf(d); const g = c => round2(ls.filter(l => l.code === c).reduce((s, l) => s + l.dr - l.cr, 0)); return { n: d.items.length, sal: g('5210'), er: g(d.extra.ssoExpAcc), bank: g('1120'), wht: g('2130'), sso: g(d.extra.ssoPayAcc), dr: round2(ls.reduce((s, l) => s + l.dr, 0)), cr: round2(ls.reduce((s, l) => s + l.cr, 0)), names: [accName(d.extra.ssoExpAcc), accName(d.extra.ssoPayAcc)] }; });
  check('payroll posts: Dr salary + employer SSO / Cr bank, WHT (PND1), SSO payable — balanced', p12.n === 3 && p12.sal === 61000 && p12.er === 1625 && p12.wht === -464.58 && p12.sso === -3250 && p12.bank === -(61000 - 1625 - 464.58) && p12.dr === p12.cr, p12);
  check('missing accounts are created (employer SSO expense, SSO payable)', /ประกันสังคม/.test(p12.names[0]) && /ประกันสังคม/.test(p12.names[1]), p12.names);
  const t12 = await pr.textContent('#pageData');
  check('page shows totals, PND1 / SSO deadlines and that remittance is pending', /฿61,000\.00/.test(t12) && /7 ต\.ค\. 69/.test(t12) && /ยังไม่ได้บันทึกการนำส่ง/.test(t12), t12.slice(0, 400));
  await pr.evaluate(() => openPayslip(prRun('2026-09')._id, prRun('2026-09').items.findIndex(x => x.name === 'สมชาย ใจดี'))); await pr.waitForSelector('.ps-paper');
  const slip = await pr.textContent('.ps-paper');
  check('payslip shows earnings, deductions and net pay', /สมชาย ใจดี/.test(slip) && /36,000\.00/.test(slip) && /875\.00/.test(slip) && /464\.58/.test(slip) && /34,660\.42/.test(slip), slip.slice(0, 300));
  await pr.evaluate(() => document.querySelectorAll('.att-viewer').forEach(x => x.remove()));
  await pr.evaluate(() => openPrRemit(prRun('2026-09'))); await pr.waitForSelector('#prrWht');
  check('remittance defaults to the month\'s WHT and SSO', await pr.inputValue('#prrWht') === '464.58' && await pr.inputValue('#prrSso') === '3250');
  await pr.fill('#prrDate', '2026-10-07'); await pr.click('#modalFoot >> text=บันทึก'); await pr.waitForTimeout(500);
  const r12 = await pr.evaluate(() => { const g = c => round2(allLines().filter(l => l.code === c).reduce((s, l) => s + l.dr - l.cr, 0)); return { wht: g('2130'), sso: g(prRun('2026-09').extra.ssoPayAcc), txt: byId('pageData').textContent }; });
  check('after remitting, WHT and SSO payables are cleared', r12.wht === 0 && r12.sso === 0 && /นำส่งภาษีและประกันสังคมแล้ว/.test(r12.txt), r12.wht + ' ' + r12.sso);
  await pr.evaluate(() => openPrRun('2026-09')); await pr.waitForSelector('#prRows');
  const e12 = await pr.evaluate(() => prForm.lines.find(l => l.name === 'สมชาย ใจดี'));
  check('editing the run keeps the saved figures', e12.on && e12.extra === 6000 && e12.wht === 464.58, e12);
  await pr.evaluate(() => closeModal());
  check('employee form has payroll fields', await pr.evaluate(() => ['taxId', 'sso', 'taxAllow', 'bankAcct'].every(k => EMPLOYEE_FIELDS.some(f => f.key === k))));
  check('no page errors (payroll)', pr.errs.length === 0, pr.errs);

  REG('FEAT-06', 'ส่งออกผังบัญชีบนเว็บปกติ (GitHub Pages) ได้แค่คัดลอกข้อความ ไม่ได้ไฟล์');
  const cx = await L.newPage(browser, pages.local);
  await cx.evaluate(async () => { await loadStandardCoa(); }); await cx.waitForTimeout(500);
  const nAcc = await cx.evaluate(() => STORE.accounts.length);
  const coaFiles = {};
  for (const fmt of ['xlsx', 'csv']) {
    await cx.evaluate(() => openCoaExport()); await cx.waitForSelector('#expFmt');
    await cx.selectOption('#expFmt', fmt);
    const [d] = await Promise.all([cx.waitForEvent('download', { timeout: 10000 }), cx.click('#modalFoot >> text=ส่งออก')]);
    coaFiles[fmt] = await d.path();
    check(fmt + ': chart of accounts downloads as a file', d.suggestedFilename().endsWith('.' + fmt) && fs.statSync(coaFiles[fmt]).size > 500, d.suggestedFilename());
    await cx.waitForTimeout(300);
  }
  const ci = await L.newPage(browser, pages.local);
  for (const fmt of ['xlsx', 'csv']) {
    await ci.evaluate(async () => { for (const a of STORE.accounts.slice()) await delRec('accounts', a._id); }); await ci.waitForTimeout(300);
    await ci.evaluate(() => openCoaImport()); await ci.waitForSelector('#impFile');
    await ci.setInputFiles('#impFile', { name: 'coa.' + fmt, mimeType: fmt === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(coaFiles[fmt]) }); await ci.waitForTimeout(1200);
    const pv = await ci.evaluate(() => ({ n: coaImportRows.length, bad: coaImportRows.filter(r => r.err).map(r => r.code + ':' + r.err) }));
    await ci.click('#modalFoot >> text=นำเข้า'); await ci.waitForTimeout(1500);
    const got = await ci.evaluate(() => ({ n: STORE.accounts.length, cash: (STORE.accounts.find(a => a.code === '1110') || {}).name }));
    check(fmt + ': exported file imports back with every account', pv.n === nAcc && !pv.bad.length && got.n === nAcc && !!got.cash, { nAcc, pv, got });
  }
  check('no page errors (chart of accounts export/import)', cx.errs.length === 0 && ci.errs.length === 0, cx.errs.concat(ci.errs));

  REG('FEAT-05', 'นำเข้าสมุดรายวัน / GL จากไฟล์ CSV');
  const jq = await L.newPage(browser, pages.local);
  await jq.evaluate(async () => { await loadStandardCoa(); await saveSettings('company', { lockDate: '2026-01-31' }); }); await jq.waitForTimeout(500);
  const gl = '﻿Journal No,Date,Description,Account,Debit,Credit,Branch\n' +
    'JV-A,30/09/2569,ค่าใช้จ่ายค้างจ่าย,5290,500,,\n' +
    'JV-A,30/09/2569,ค่าใช้จ่ายค้างจ่าย,2110 เจ้าหนี้การค้า,,500,\n' +
    'JV-B,2026-09-30,ไม่สมดุล,1120,1000,,\n' +
    'JV-B,2026-09-30,ไม่สมดุล,1110,,900,\n' +
    'JV-C,2026-09-30,บัญชีไม่มี,9999,100,,\n' +
    'JV-C,2026-09-30,บัญชีไม่มี,1110,,100,\n' +
    'JV-D,2026-01-15,งวดล็อก,1120,50,,\n' +
    'JV-D,2026-01-15,งวดล็อก,1110,,50,\n' +
    ',2026-10-01,โอนเงินสดเข้าธนาคาร,1120,"1,200.00",,\n' +
    ',2026-10-01,โอนเงินสดเข้าธนาคาร,1110,,"1,200.00",\n';
  await jq.evaluate(() => { go('settings', 'import'); openImportWizard('journal'); });
  await jq.setInputFiles('#impWFile', { name: 'gl.csv', mimeType: 'text/csv', buffer: Buffer.from(gl) }); await jq.waitForSelector('#impPrev .banner');
  const jp = await jq.evaluate(() => ({ map: impState.map, built: impState.built.map(x => [x.ok, x.rec.docNo || '', x.err, x.date]) }));
  check('columns are matched automatically', ['docNo', 'date', 'desc', 'account', 'debit', 'credit', 'branch'].every(k => jp.map[k] != null), jp.map);
  const by = no => jp.built.find(b => b[1] === no) || [];
  check('balanced entry ready, Buddhist-era date converted', by('JV-A')[0] === true && by('JV-A')[3] === '2026-09-30', by('JV-A'));
  check('unbalanced entry rejected with the difference', by('JV-B')[0] === false && /ไม่สมดุล/.test(by('JV-B')[2]), by('JV-B'));
  check('unknown account rejected', by('JV-C')[0] === false && /ไม่พบบัญชี "9999"/.test(by('JV-C')[2]), by('JV-C'));
  check('entry in a locked period rejected', by('JV-D')[0] === false && /งวดที่ล็อก/.test(by('JV-D')[2]), by('JV-D'));
  check('rows without a number grouped by date + description', by('')[0] === true && jp.built.length === 5, jp.built);
  const [jdl] = await Promise.all([jq.waitForEvent('download', { timeout: 10000 }), jq.click('#impJnCsv')]);
  const conv = fs.readFileSync(await jdl.path(), 'utf8');
  check('converted entries can be downloaded as CSV before importing', /^journal-converted-.*\.csv$/.test(jdl.suggestedFilename()) && /JV-A,2026-09-30,ค่าใช้จ่ายค้างจ่าย,2110,เจ้าหนี้การค้า,,500,พร้อมนำเข้า/.test(conv) && /ข้าม: ไม่สมดุล/.test(conv), conv.slice(0, 300));
  await jq.click('#modalFoot >> text=นำเข้า'); await jq.waitForTimeout(800);
  const jr = await jq.evaluate(() => { const js = STORE.documents.filter(d => d.type === 'journalEntry' && d.extra && d.extra.importedJournal); const p = {}; js.forEach(d => postingsOf(d).forEach(l => { p[l.code] = Math.round(((p[l.code] || 0) + l.dr - l.cr) * 100) / 100; })); return { n: js.length, nos: js.map(d => d.docNo).sort(), p, toast: byId('toast').textContent }; });
  check('two journal entries imported, the unnumbered one gets the next JV number', jr.n === 2 && jr.nos.includes('JV-A') && jr.nos.some(n => /^JV-\d{6}-\d{3}$/.test(n)) && /นำเข้าแล้ว 2 รายการ/.test(jr.toast), jr);
  check('imported entries post to the ledger', jr.p['5290'] === 500 && jr.p['2110'] === -500 && jr.p['1120'] === 1200 && jr.p['1110'] === -1200, jr.p);
  REG('REG-16', 'นำเข้า GL แล้วไม่เห็นในหน้าสมุดรายวัน (กรองแค่เดือนนี้ / ปี 2 หลักกลายเป็น 2069)');
  const jv = await jq.evaluate(() => ({ child: route.child, period: pageState.jnPeriod, tab: pageState.jnTab, txt: byId('pageData').textContent }));
  check('after import the journals page opens on all dates with the imported entry', jv.child === 'journals' && jv.period === 'all' && jv.tab === 'general' && /JV-\d{6}-\d{3}/.test(jv.txt) && !/ไม่มีรายการ/.test(jv.txt), { child: jv.child, period: jv.period, tab: jv.tab });
  const hint = await jq.evaluate(() => { jnSet('jnQ', 'ไม่มีคำนี้แน่นอน'); return byId('pageData').textContent; });
  check('empty journal tab says entries exist in other dates', /มี 2 รายการในช่วงวันที่อื่น/.test(hint) && /ดูทั้งหมด/.test(hint), hint.slice(0, 200));
  await jq.evaluate(() => jnSet('jnQ', ''));
  const dts = await jq.evaluate(() => ['30/09/69', '30/09/2569', '30/09/26', '2026-09-30', '2569-09-30', '45930', '31/02/2569', '13/13/2569', '1/10/2026'].map(impDate));
  check('import dates: 2-digit Buddhist year, Excel serial, invalid dates rejected', JSON.stringify(dts) === JSON.stringify(['2026-09-30', '2026-09-30', '2026-09-30', '2026-09-30', '2026-09-30', '2025-09-30', '', '', '2026-10-01']), dts);
  REG('FEAT-07', 'บัญชีแยกประเภททั่วไป: แสดงรหัส ชื่อบัญชี ยอดคงเหลือ กดที่บัญชีจึงแสดงรายการ');
  await jq.evaluate(() => { pageState.repPeriod = 'all'; pageState.repBranch = ''; openReport('gl'); }); await jq.waitForSelector('tr.gl-acc');
  const glView = () => jq.evaluate(() => [...document.querySelectorAll('tr.gl-acc')].map(tr => ({ acc: tr.dataset.gl, txt: tr.textContent, open: tr.getAttribute('aria-expanded'), shown: [...document.querySelectorAll('tr[data-grp="' + tr.dataset.gl + '"]')].filter(x => !x.hidden).length, rows: document.querySelectorAll('tr[data-grp="' + tr.dataset.gl + '"]').length })));
  let g7 = await glView(); const a2110 = g7.find(x => x.acc === '2110') || {};
  check('accounts start collapsed: code, name and balance only', g7.length >= 4 && g7.every(x => x.shown === 0 && x.rows >= 2 && x.open === 'false') && /2110/.test(a2110.txt) && /500\.00/.test(a2110.txt), g7);
  await jq.click('tr.gl-acc[data-gl="2110"]'); g7 = await glView();
  check('clicking an account shows its entries; others stay collapsed', g7.find(x => x.acc === '2110').shown === g7.find(x => x.acc === '2110').rows && g7.filter(x => x.acc !== '2110').every(x => x.shown === 0), g7);
  await jq.click('tr.gl-acc[data-gl="2110"]');
  check('clicking again hides them', (await glView()).every(x => x.shown === 0));
  await jq.click('[data-glall="1"]');
  check('show all expands every account', (await glView()).every(x => x.shown === x.rows));
  await jq.evaluate(() => { pageState.repPeriod = 'custom'; pageState.pFrom = '2026-10-01'; pageState.pTo = '2026-10-31'; refreshPageData(); }); await jq.waitForSelector('tr.gl-acc');
  g7 = await glView();
  const o2110 = g7.find(x => x.acc === '2110') || {};
  check('balance-sheet account without entries in the period shows its brought-forward balance', /ยอดยกมา|500\.00/.test(o2110.txt || '') && !g7.some(x => x.acc === '5290'), g7);
  const [gdl] = await Promise.all([jq.waitForEvent('download', { timeout: 10000 }), jq.click('#repExport')]);
  check('export still contains the entries', gdl.suggestedFilename().endsWith('.xlsx'));
  await jq.evaluate(() => { pageState.repPeriod = 'year'; });

  await jq.evaluate(() => { go('settings', 'import'); openImportWizard('journal'); });
  await jq.setInputFiles('#impWFile', { name: 'gl.csv', mimeType: 'text/csv', buffer: Buffer.from(gl) }); await jq.waitForSelector('#impPrev .banner');
  check('importing the same file again skips numbers that already exist', /เลขที่ซ้ำ/.test(await jq.evaluate(() => impState.built.find(x => x.rec.docNo === 'JV-A').err)));
  await jq.evaluate(() => closeModal());
  check('no page errors (journal import)', jq.errs.length === 0, jq.errs);

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
