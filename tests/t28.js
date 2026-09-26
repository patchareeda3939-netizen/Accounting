const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ window.fetch=async()=>new Response(new Blob(['hello'],{type:'text/plain'})); openAttachment({id:'x',name:'a.txt',type:'text/plain'}); });
  await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>document.querySelector('.att-vbody').innerText), errs); await b.close();
})();
