const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ ASSETS={upload:async f=>({id:'abc',url:'/_blob/abc',sizeBytes:f.size,contentType:f.type})}; openDocForm('expense'); });
  await p.waitForTimeout(200);
  await p.setInputFiles('#attInput', {name:'slip.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1')}); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>[byId('attList').innerText, byId('attMsg').innerText, JSON.stringify(form.attachments)]), errs);
  await b.close();
})();
