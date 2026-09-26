const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'statement',typeLabel:'ใบแจ้งยอด',group:'customer',party:'A',date:'2026-09-01',total:0,createdAt:1}); });
  for (const k of [['sales','salesTx'],['alldocs'],['reports','standard']]) { await p.evaluate(k=>go(...k),k); await p.waitForTimeout(150); }
  await p.click('text=สร้าง').catch(()=>{}); await p.waitForTimeout(200);
  console.log((await p.evaluate(()=>document.body.innerText)).includes('ใบแจ้งยอด'), errs); await b.close();
})();
