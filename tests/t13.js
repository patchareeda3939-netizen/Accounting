const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>saveSettings('company',{name:'PSM',phone:'+66000000000',email:'test@example.com'}));
  await p.click('#gearBtn'); await p.click('text=รูปแบบฟอร์มกำหนดเอง'); await p.waitForTimeout(100);
  await p.screenshot({path:'forms.png'});
  await p.click('[data-editstyle]'); await p.click('[data-color="#1F6B3A"]'); await p.fill('#seBank','กสิกรไทย'); await p.waitForTimeout(100);
  await p.screenshot({path:'editor.png'});
  await p.click('[data-setab="content"]'); await p.click('[data-setab="email"]');
  await p.click('#seDone'); await p.waitForTimeout(200);
  console.log(await p.evaluate(()=>JSON.stringify(STORE.formStyles.map(s=>[s.name,s.color,s.isDefault]))), errs); await b.close();
})();
