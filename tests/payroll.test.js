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
    const detail = await L.newPage(browser, L.localPages().local);
    check('all requested income and deduction categories are available', await detail.evaluate(() => [PR_INCOME.length,PR_DEDUCT.length,PR_INCOME.map(f=>f.label),PR_DEDUCT.map(f=>f.label)]), [14,12,['เงินเดือน','เงินประจำตำแหน่ง','ค่าประสบการณ์','ค่าวิชาชีพ','ค่าครองชีพ','ค่าล่วงเวลา/โอที','ค่าล่วงเวลา/วันหยุดนักขัตฤกษ์','ค่าล่วงเวลา/วันอาทิตย์','เบี้ยเลี้ยง','ค่าอาหาร','ค่าเดินทาง/ค่าเที่ยว','อินเซนทีฟ','คอมมิชชั่น','รายได้อื่นๆ'],['สาย','ลากิจ','ขาดงาน','หักพักงาน','ภาษีหัก ณ ที่จ่าย','ประกันสังคม','กองทุนสำรองเลี้ยงชีพ','เบิกเงินล่วงหน้า','เงินกู้','หักเงินสงเคราะห์ลูกจ้าง','กยศ.','หักอื่นๆ']]);
    check('actual reimbursements and OT are excluded from default SSO wages; reimbursements are excluded from taxable income', await detail.evaluate(() => {
      const x=prCalc({detailVersion:2,base:10000,allowance:1000,meal:2000,travel:3000,ot:5000},{},prCfg());
      return [x.incomeTotal,x.gross,x.taxGross,x.ssoBase,x.sso,x.net];
    }), [21000,21000,15000,10000,500,20500]);
    check('loan, advance and PVD deductions reduce take-home pay without silently reducing taxable income', await detail.evaluate(() => {
      const c=prCfg(), x=prCalc({detailVersion:2,base:40000},{},c), y=prCalc({detailVersion:2,base:40000,loan:1500,advance:2000,pvd:500,otherDeduct:700},{},c);
      return [x.wht,y.wht,y.taxGross,y.ssoBase,y.net];
    }), [704.17,704.17,40000,40000,33720.83]);
    check('unpaid absence reduces wages and preserves the screenshot calculation', await detail.evaluate(() => {
      const x=prCalc({detailVersion:2,base:40000,absence:500},{},prCfg()); return [x.incomeTotal,x.gross,x.wht,x.sso,x.net];
    }), [40000,39500,654.17,875,37970.83]);
    await detail.evaluate(async () => { await loadStandardCoa(); openPrSettings(); });
    check('reimbursement defaults and overtime treatment are visible in settings', await detail.evaluate(() => ['allowance','meal','travel'].every(k=>!byId('psTax_'+k).checked&&!byId('psSso_'+k).checked) && !byId('psSso_ot').checked && byId('psSso_base').checked), true);
    await detail.check('#psTax_meal'); await detail.check('#psSso_meal');
    await detail.click('#modalFoot >> text=บันทึก');
    await detail.waitForFunction(()=>!byId('overlay').classList.contains('open'));
    check('explicit company rule overrides affect taxable and SSO bases', await detail.evaluate(() => {
      const x=prCalc({detailVersion:2,base:10000,meal:2000},{},prCfg()); return [x.taxGross,x.ssoBase,x.sso];
    }), [12000,12000,600]);
    await detail.evaluate(()=>openPrSettings()); await detail.uncheck('#psTax_meal'); await detail.uncheck('#psSso_meal'); await detail.click('#modalFoot >> text=บันทึก');
    await detail.waitForFunction(()=>!byId('overlay').classList.contains('open'));
    await detail.evaluate(async () => {
      await addRec('employees',{name:'พนักงานแยกรายการ',salary:40000,positionPay:2000,experiencePay:1000,professionalPay:500,livingAllowance:500,active:'yes',taxId:'1234567890123'});
      pageState.prYm='2026-11'; go('team','payroll'); openPrRun('2026-11');
    });
    check('fixed employee allowances seed the next payroll', await detail.evaluate(()=>[prForm.lines[0].positionPay,prForm.lines[0].experiencePay,prForm.lines[0].professionalPay,prForm.lines[0].livingAllowance]), [2000,1000,500,500]);
    await detail.locator('#prRows summary').click();
    await detail.setViewportSize({width:390,height:844});
    check('mobile component inputs fit within the visible page',await detail.evaluate(()=>{const r=document.querySelector('[data-k=positionPay]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth===innerWidth;}),true);
    await detail.setViewportSize({width:1300,height:900});
    const components={ot:1000,holidayOt:500,sundayOt:500,allowance:300,meal:200,travel:1000,incentive:700,commission:800,extra:100,late:100,personalLeave:200,absence:500,suspension:300,pvd:1000,advance:2000,loan:1500,welfare:100,studentLoan:500,otherDeduct:200};
    for(const [k,v] of Object.entries(components)) { await detail.fill(`[data-k="${k}"]`,String(v)); await detail.locator(`[data-k="${k}"]`).press('Tab'); }
    await detail.fill('[data-k="wht"]','1000'); await detail.locator('[data-k="wht"]').press('Tab');
    check('component editor retains expanded state and computes complete totals', await detail.evaluate(()=>{const x=prForm.lines[0];return [!!document.querySelector('#prRows details[open]'),x.incomeTotal,x.deduct,x.gross,x.taxGross,x.ssoBase,x.sso,x.wht,x.deductionsTotal,x.net];}), [true,49100,1100,48000,46500,44400,875,1000,8275,40825]);
    await detail.fill('[data-k="loan"]','-1'); await detail.locator('[data-k="loan"]').press('Tab'); await detail.click('#modalFoot >> text=บันทึกและลงบัญชี');
    check('negative named deductions cannot be saved', await detail.evaluate(()=>!!byId('formError').textContent&&!prRun('2026-11')),true);
    await detail.fill('[data-k="loan"]','1500'); await detail.locator('[data-k="loan"]').press('Tab');
    await detail.fill('[data-k="ot"]','1000.001'); await detail.locator('[data-k="ot"]').press('Tab'); await detail.click('#modalFoot >> text=บันทึกและลงบัญชี');
    check('fractional satang cannot create inconsistent totals and exports',await detail.evaluate(()=>byId('formError').textContent.includes('2 ตำแหน่ง')&&!prRun('2026-11')),true);
    await detail.fill('[data-k="ot"]','1000'); await detail.locator('[data-k="ot"]').press('Tab');
    await detail.click('#modalFoot >> text=บันทึกและลงบัญชี'); await detail.waitForFunction(()=>!!prRun('2026-11'));
    check('payroll and employer SSO postings balance with separate loan assets and remittance liabilities', await detail.evaluate(()=>{
      const d=prRun('2026-11'),ls=postingsOf(d),acc=d.extra.deductionAccs;
      return [round2(ls.reduce((n,l)=>n+l.dr,0)),round2(ls.reduce((n,l)=>n+l.cr,0)),PR_OTHER_DEDUCT.map(f=>[f.key,accBaseOf(acc[f.key]),ls.find(l=>l.code===acc[f.key]).cr])];
    }), [48875,48875,[['pvd','liability',1000],['advance','asset',2000],['loan','asset',1500],['welfare','liability',100],['studentLoan','liability',500],['otherDeduct','liability',200]]]);
    check('PND1 uses earned taxable income, excluding reimbursements and retaining loan deductions in the tax base',await detail.evaluate(()=>prPnd1Rows('2026-11').map(x=>[x.gross,x.wht])),[[46500,1000]]);
    await detail.reload(); await detail.waitForTimeout(800); await detail.evaluate(()=>{pageState.prYm='2026-11';go('team','payroll');openPrRun('2026-11');});
    check('saved named components, totals and tax treatment survive reload',await detail.evaluate(()=>{const x=prForm.lines[0];return [x.detailVersion,x.positionPay,x.travel,x.studentLoan,x.legacyWageDeduct||0,x.taxGross,x.ssoBase,x.net,x.incomeRules.travel.tax];}),[2,2000,1000,500,0,46500,44400,40825,false]);
    await detail.evaluate(()=>{closeModal();const d=prRun('2026-11');openPayslip(d._id,0);});
    check('payslip lists all income and deduction categories and correct gross/net totals',await detail.evaluate(()=>{const text=document.querySelector('.ps-paper').textContent;return PR_INCOME.concat(PR_DEDUCT).every(f=>text.includes(f.label))&&text.includes('49,100.00')&&text.includes('8,275.00')&&text.includes('40,825.00');}),true);
    await detail.evaluate(()=>document.querySelectorAll('.att-viewer').forEach(x=>x.remove()));
    const namedDownload=detail.waitForEvent('download'); await detail.evaluate(()=>prExport(prRun('2026-11')._id));
    const namedFile=await namedDownload, namedCsv=fs.readFileSync(await namedFile.path(),'utf8');
    check('payroll CSV exports every named category and both totals',await detail.evaluate(csv=>PR_INCOME.concat(PR_DEDUCT).every(f=>csv.split('\r\n')[0].includes(f.label))&&csv.includes('49100')&&csv.includes('8275')&&csv.includes('40825'),namedCsv),true);
    await detail.evaluate(async()=>{
      const d=prRun('2026-11');
      await addRec('documents',Object.assign({},strip(d),{docNo:'PR-LEGACY',date:'2025-12-31',items:[{empId:STORE.employees[0]._id,name:STORE.employees[0].name,base:40000,extra:0,deduct:500,gross:39500,sso:750,ssoEr:750,wht:123,net:38627}],extra:Object.assign({},d.extra,{period:'2025-12'})}));
      await saveSettings('payroll',{ssoRate:3});openPrRun('2025-12');
    });
    check('legacy snapshots retain amounts and are not silently allocated to named absences',await detail.evaluate(()=>{const x=prForm.lines[0];return [x.detailVersion||null,x.deduct,x.absence||0,x.sso,x.wht,x.net,document.querySelector('[data-k="legacyWageDeduct"]').value];}),[null,500,0,750,123,38627,'500']);
    await detail.click('#modalFoot >> text=บันทึกและลงบัญชี'); await detail.waitForFunction(()=>!byId('overlay').classList.contains('open'));
    check('saving a legacy run without editing preserves its historical net',await detail.evaluate(()=>{const x=prRun('2025-12').items[0];return [x.detailVersion||null,x.gross,x.sso,x.wht,x.net];}),[null,39500,750,123,38627]);
    await detail.evaluate(()=>openPrRun('2025-12')); await detail.locator('#prRows summary').click(); await detail.fill('[data-k="ot"]','100'); await detail.locator('[data-k="ot"]').press('Tab');
    check('editing a legacy run carries the old wage deduction once into detailed calculation',await detail.evaluate(()=>{const x=prForm.lines[0];return [x.detailVersion,x.legacyWageDeduct,x.deduct,x.gross,x.wht];}),[2,500,500,39600,123]);
    check('no browser errors for named payroll workflow',detail.errs,[]);

    console.log(`${passed} payroll checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
