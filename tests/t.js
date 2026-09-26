const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(500);
  await p.click('#sidebarAccountingBtn');
  const st = () => p.evaluate(() => byId('children-accounting').classList.contains('open'));
  const a = await st();
  await p.click('.subnav-item[data-key="accounting"]'); const b1 = await st();
  await p.click('.subnav-item[data-key="accounting"]'); const c = await st();
  await p.click('.subnav-child[data-child-key="coa"]'); await p.click('.subnav-item[data-key="accounting"]'); const d = await st();
  console.log(a, b1, c, d, errs); await b.close();
})();
