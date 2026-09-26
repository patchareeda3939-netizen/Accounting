const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>go('accounting','coa')); await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(300);
  await p.screenshot({path:'coa.png'}); console.log(errs); await b.close();
})();
