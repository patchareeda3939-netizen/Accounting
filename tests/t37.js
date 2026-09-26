const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300); await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(300);
  await p.evaluate(()=>go('accounting','reconcile')); await p.waitForTimeout(200); await p.click('#recSum'); await p.waitForTimeout(200);
  console.log((await p.evaluate(()=>byId('pageData').innerText)).slice(0,200), errs); await b.close(); })();
