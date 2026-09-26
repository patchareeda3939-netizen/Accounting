const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:1300}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ saveSettings('company',{name:'PSM'}); go('settings','forms'); });
  await p.click('[data-editstyle]'); await p.click('[data-setab="content"]'); await p.fill('#seNote','กรุณาชำระภายในกำหนด'); await p.waitForTimeout(100);
  await p.locator('#sePreview').screenshot({path:'form2.png'});
  console.log(errs); await b.close();
})();
