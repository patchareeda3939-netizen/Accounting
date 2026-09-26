// Smoke test โหมดที่ไม่ใช้ Firebase: เก็บข้อมูลในเบราว์เซอร์ (localStorage) และฐานข้อมูล Claude (จำลองด้วย mockdb.js)
// เปิดทุกเมนูทุกหน้า สร้าง/สลับบริษัท และตรวจว่าไม่มี error บนหน้าเว็บ
// รัน: npm run test:smoke (ต้องรัน npm run build ก่อนถ้าแก้ src/)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');
const results = [];
const check = (name, cond, extra) => { results.push({ ok: !!cond, name, extra }); if (process.env.VERBOSE) console.error((cond ? 'ok   ' : 'FAIL ') + name); };

function buildPages() {
  fs.mkdirSync(TMP, { recursive: true });
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  fs.writeFileSync(path.join(TMP, 'local.html'), html);
  fs.copyFileSync(path.join(__dirname, 'mockdb.js'), path.join(TMP, 'mockdb.js'));
  fs.writeFileSync(path.join(TMP, 'claudedb.html'), html.replace('<body>', '<body><script src="mockdb.js"></script>'));
}

async function open(browser, file) {
  const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.route(/^https?:/, r => r.abort()); // ไม่พึ่งอินเทอร์เน็ต (ฟอนต์/CDN)
  await p.goto('file://' + path.join(TMP, file));
  await p.waitForTimeout(800);
  return p;
}

async function visitAllPages(p, label) {
  const side = await p.$$eval('.side-item', els => els.map(e => e.id).filter(Boolean));
  for (const id of side) { await p.click('#' + id, { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(100); }
  const kids = await p.$$eval('.subnav-child', els => els.map(e => e.dataset.childKey));
  const before = p.errs.length, bad = [];
  for (const k of kids) {
    await p.evaluate(k => { const el = document.querySelector('.subnav-child[data-child-key="' + k + '"]'); el && el.click(); }, k);
    await p.waitForTimeout(60);
    if (p.errs.length > before + bad.length) bad.push(k + ': ' + p.errs[p.errs.length - 1]);
  }
  check(label + ': opens all ' + kids.length + ' pages without errors', kids.length > 30 && bad.length === 0, bad);
}

async function createAndSwitch(p, label) {
  await p.evaluate(() => openNewCompany());
  await p.fill('#ncName', 'บริษัท ทดสอบ จำกัด');
  await p.click('#modalFoot >> text=สร้างและสลับไปบริษัทนี้');
  await p.waitForTimeout(1200);
  const a = await p.evaluate(() => ({ cur: CUR_CO, names: coList().map(c => c.name), accts: STORE.accounts.length }));
  check(label + ': new company created, listed, chart of accounts loaded', a.cur !== 'main' && a.names.includes('บริษัท ทดสอบ จำกัด') && a.accts >= 27, a);
  await p.evaluate(() => switchCompany('main'));
  await p.waitForTimeout(400);
  const b = await p.evaluate(() => ({ cur: CUR_CO, accts: STORE.accounts.length, names: coList().map(c => c.name) }));
  check(label + ': switching back shows main company data only', b.cur === 'main' && b.accts === 0 && b.names.length === 2, b);
  return a.cur;
}

(async () => {
  buildPages();
  const browser = await chromium.launch();

  // ---- localStorage mode
  const p = await open(browser, 'local.html');
  check('local: runs without a database', await p.evaluate(() => !db && !byId('modeBadge').hidden));
  check('local: default company name', /บริษัทของฉัน/.test(await p.textContent('#companyPill')));
  await visitAllPages(p, 'local');
  const coId = await createAndSwitch(p, 'local');
  // ids stay unique after switching back to a company already in memory
  await p.evaluate(async id => { switchCompany(id); await addRec('contacts', { name: 'X1' }); switchCompany('main'); await addRec('contacts', { name: 'M1' }); switchCompany(id); await addRec('contacts', { name: 'X2' }); }, coId);
  check('local: record ids unique per company', await p.evaluate(() => { const ids = Object.values(STORE).flat().map(r => r._id); return ids.length === new Set(ids).size; }));
  // an edit immediately followed by a switch must still be saved
  await p.evaluate(async () => { await addRec('contacts', { name: 'FAST' }); switchCompany('main'); });
  await p.reload(); await p.waitForTimeout(800);
  check('local: company list survives reload', (await p.evaluate(() => coList().map(c => c.name))).includes('บริษัท ทดสอบ จำกัด'));
  await p.evaluate(id => switchCompany(id), coId); await p.waitForTimeout(200);
  const names = await p.evaluate(() => STORE.contacts.map(c => c.name).sort());
  check('local: quick edit before switch is persisted', JSON.stringify(names) === '["FAST","X1","X2"]', names);
  // storage full → user is told
  await p.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k.startsWith('psmacc_data')) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; });
  await p.evaluate(async () => { await addRec('contacts', { name: 'Q' }); }); await p.waitForTimeout(500);
  check('local: warns when browser storage is full', /ไม่สำเร็จ/.test(await p.textContent('#toast')));
  // reconcile page with no bank accounts (fresh company)
  const p2 = await open(browser, 'local.html');
  await p2.evaluate(() => { localStorage.clear(); }); await p2.reload(); await p2.waitForTimeout(600);
  await p2.evaluate(() => document.querySelector('.subnav-child[data-child-key="reconcile"]').click()); await p2.waitForTimeout(300);
  check('local: reconcile page with no bank accounts shows empty state', /ยังไม่มีบัญชีธนาคาร/.test(await p2.textContent('#pageData')) && p2.errs.length === 0, p2.errs);
  check('local: no page errors', p.errs.length === 0, p.errs);

  // ---- Claude database mode (mock)
  const c = await open(browser, 'claudedb.html');
  check('claude-db: uses the database', await c.evaluate(() => !!db && byId('modeBadge').hidden));
  await visitAllPages(c, 'claude-db');
  await createAndSwitch(c, 'claude-db');
  check('claude-db: no page errors', c.errs.length === 0, c.errs);

  await browser.close();
  for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok || r.extra === undefined ? '' : '  ' + JSON.stringify(r.extra)));
  const failed = results.filter(r => !r.ok).length;
  console.log('\n' + failed + ' failed / ' + results.length);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
