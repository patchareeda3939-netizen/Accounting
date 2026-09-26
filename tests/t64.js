const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  for (const k of [['billing','prepaid'],['inventory','fixedAssets'],['accounting','bankTx']]) { await p.evaluate(k=>go(...k),k); await p.waitForTimeout(150); console.log(k.join(':'), (await p.evaluate(()=>byId('sectionContent').innerText)).slice(0,40).replace(/\n/g,' ')); }
  await p.screenshot({path:'nav.png'}); console.log(errs); await b.close(); })();
