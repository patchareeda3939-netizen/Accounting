const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-03-05',docNo:'I-MAR',subtotal:1000,vat:0,total:1000,net:1000,status:'unpaid',createdAt:1});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-06-05',docNo:'I-JUN',subtotal:500,vat:0,total:500,net:500,status:'unpaid',createdAt:2}); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>go('sales','salesTx')); await p.waitForTimeout(300);
  await p.selectOption('select[data-tx="period"]', 'custom'); await p.waitForTimeout(200);
  await p.fill('.pr-custom:not([hidden]) .pr-from', '2026-03-01'); await p.dispatchEvent('.pr-custom:not([hidden]) .pr-from','change');
  await p.fill('.pr-custom:not([hidden]) .pr-to', '2026-03-31'); await p.dispatchEvent('.pr-custom:not([hidden]) .pr-to','change'); await p.waitForTimeout(300);
  const t = await p.evaluate(()=>document.body.innerText);
  console.log('MAR', t.includes('I-MAR'), 'JUN', t.includes('I-JUN'));
  await p.evaluate(()=>openReport('pl')); await p.waitForTimeout(300); console.log(await p.evaluate(()=>!!document.querySelector('#repPeriod option[value=custom]')));
  await p.selectOption('#repPeriod','custom'); await p.waitForTimeout(300); console.log('view', (await p.evaluate(()=>document.body.innerText)).match(/1,000\.00|1,500\.00/g), await p.evaluate(()=>repRange()));
  const rp = await p.$('#rp'); if (rp) { await p.selectOption('#rp','custom'); await p.waitForTimeout(300); console.log('rep', (await p.evaluate(()=>document.body.innerText)).match(/1,000|500/g)); }
  console.log(errs); await b.close();
})();
