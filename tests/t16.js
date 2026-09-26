const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1000,height:1400}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>saveSettings('company',{name:'PSM',taxId:'0105561234567',address:'กรุงเทพฯ',phone:'02-000-0000'}));
  for (const t of ['estimate','salesOrder','invoice','receipt','creditNote','refundReceipt','billingNote']) {
    await p.evaluate(t=>{ document.body.innerHTML += '<div id="x_'+t+'" style="width:900px">'+renderForm(sampleDoc(t), styleFor(t))+'</div>'; }, t);
  }
  await p.locator('#x_billingNote').screenshot({path:'bn.png'});
  await p.locator('#x_receipt').screenshot({path:'rc.png'});
  console.log(await p.evaluate(()=>bahtText(2222.25)+' | '+bahtText(1021)+' | '+bahtText(11)), errs); await b.close();
})();
