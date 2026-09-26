const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>openDocForm('receipt'));
  console.log(await p.evaluate(()=>!!byId('f_acc')), errs); await b.close();
})();
