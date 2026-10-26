// Local payroll checks use isolated browser storage and never contact production Firebase.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const L = require('./lib');
(async () => {
  const browser = await chromium.launch();
  let passed = 0;
  const check = (name, actual, expected) => { assert.deepEqual(actual, expected, name); console.log('PASS ' + name); passed++; };
  try {
    const p = await L.newPage(browser, L.localPages().local);
    const tax = await p.evaluate(() => [0,150000,300000,500000,750000,1000000,2000000,5000000,6000000].map(prPit));
    check('annual PIT brackets including exemption and 35% band', tax, [0,0,7500,27500,65000,115000,365000,1265000,1615000]);
    check('salary, deductions, allowance, opt-out and manual tax', await p.evaluate(() => {
      const c = prCfg(), calc = (l,e,m) => { const x = prCalc(l,e,c,m); return [x.gross,x.sso,x.wht,x.net]; };
      return [calc({base:30000},{}), calc({base:15000},{}), calc({base:30000},{taxAllow:60000}), calc({base:30000},{sso:'no'}), calc({base:30000,extra:6000,deduct:1000},{},250)];
    }), [[30000,875,164.58,28960.42],[15000,750,0,14250],[30000,875,0,29125],[30000,0,208.33,29791.67],[35000,875,250,33875]]);
    await p.evaluate(async () => {
      await loadStandardCoa();
      await addRec('employees', {name:'พนักงานทดสอบ',salary:30000,active:'yes',taxId:'1234567890123'});
      pageState.prYm = '2026-09'; go('team','payroll'); openPrRun('2026-09');
    });
    await p.waitForSelector('#prRows');
    await p.fill('[data-k="base"]','-100'); await p.locator('[data-k="base"]').press('Tab');
    await p.click('#modalFoot >> text=บันทึกและลงบัญชี');
    check('negative salary is rejected without saving', await p.evaluate(() => !!byId('formError').textContent && !prRun('2026-09')), true);
    await p.fill('[data-k="base"]','30000'); await p.locator('[data-k="base"]').press('Tab');
    await p.fill('#prDate','2026-10-05'); await p.click('#modalFoot >> text=บันทึกและลงบัญชี');
    await p.waitForFunction(() => !!prRun('2026-09'));
    check('deadline follows October payment, not September work period', await p.evaluate(() => byId('pageData').textContent.includes(fmtDate(nextMonthDay('2026-10',7)))), true);
    const saved = await p.evaluate(() => prRun('2026-09').items[0]);
    await p.evaluate(async () => { await saveSettings('payroll',{ssoRate:3}); openPrRun('2026-09'); });
    check('reopening a saved run preserves historical amounts after rate changes', await p.evaluate(() => { const x=prForm.lines[0]; return [x.sso,x.ssoEr,x.wht,x.net]; }), [saved.sso,saved.ssoEr,saved.wht,saved.net]);
    await p.evaluate(() => closeModal());
    check('PND1 report selects actual payment month', await p.evaluate(() => [prPnd1Rows('2026-09').length,prPnd1Rows('2026-10').map(x=>[x.gross,x.wht,x.taxId])]), [0,[[30000,164.58,'1234567890123']]]);
    await p.evaluate(async () => {
      const d=prRun('2026-09');
      await addRec('documents',Object.assign({},strip(d),{docNo:'PR-VOID',voided:true}));
      await addRec('documents',Object.assign({},strip(d),{docNo:'PR-ZERO',items:[{name:'<b>ZERO</b>',taxId:'',gross:10000,wht:0}]}));
      openPrPnd1('2026-10');
    });
    check('report includes zero tax, excludes voids, escapes employee names and warns on missing TIN', await p.evaluate(() => [prPnd1Rows('2026-10').length,prSum(prPnd1Rows('2026-10'),'gross'),byId('prPndTable').textContent.includes('<b>ZERO</b>'),!!byId('prPndTable').querySelector('tbody b'),byId('modalBody').textContent.includes('มีเลขผู้เสียภาษีไม่ครบ')]), [2,40000,true,false,true]);
    const download = p.waitForEvent('download');
    await p.click('#modalFoot >> text=ส่งออก CSV');
    const file = await download;
    const fs = require('node:fs');
    const csv = fs.readFileSync(await file.path(),'utf8');
    check('CSV exports saved payment data and PND1 income category', csv.includes('40(1),30000,164.58,หัก ณ ที่จ่าย') && csv.includes('2026-10-05') && csv.includes('1234567890123') && !csv.includes('PR-VOID'), true);
    await p.evaluate(() => { closeModal(); openPrRemit(prRun('2026-09')); });
    await p.fill('#prrWht','-1'); await p.fill('#prrSso','100'); await p.fill('#prrDate','2026-11-07');
    await p.click('#modalFoot >> text=บันทึก');
    check('negative remittance component is rejected', await p.evaluate(() => !!byId('formError').textContent && !prRemitOf(prRun('2026-09'))), true);
    check('no browser errors', p.errs, []);
    console.log(`${passed} payroll checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
