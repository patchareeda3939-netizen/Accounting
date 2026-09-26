const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.click('#gearBtn'); await p.click('text=บัญชีและการตั้งค่า'); await p.waitForTimeout(100);
  await p.click('[data-coedit="name"]'); await p.fill('#coInput','PSM'); await p.click('#coSave'); await p.waitForTimeout(100);
  await p.click('[data-coedit="phone"]'); await p.fill('#coInput','+66000000000'); await p.press('#coInput','Enter'); await p.waitForTimeout(100);
  await p.click('[data-coedit="industry"]'); await p.waitForTimeout(100);
  await p.screenshot({path:'co.png'});
  console.log(await p.textContent('#companyPill'), errs); await b.close();
})();
