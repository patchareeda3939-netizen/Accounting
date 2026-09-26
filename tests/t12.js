const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:800}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.click('#gearBtn'); await p.screenshot({path:'gear.png'});
  await p.click('text=บัญชีและการตั้งค่า'); await p.fill('#s_name','PSM'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(100);
  console.log(await p.textContent('#companyPill'), errs); await b.close();
})();
