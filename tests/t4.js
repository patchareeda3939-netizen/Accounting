const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{go('accounting','coa'); return loadStandardCoa();});
  await p.click('#coaCaret'); await p.click('text=ส่งออก'); await p.waitForTimeout(300);
  console.log((await p.inputValue('#expText')).split('\n').slice(0,3), errs); await b.close();
})();
