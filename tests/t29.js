const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.route('https://cdnjs.cloudflare.com/**', r=>r.fulfill({path:'/tmp/package/build/'+r.request().url().split('/').pop(), contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}}));
  const b64 = fs.readFileSync('/tmp/t.pdf').toString('base64');
  await p.evaluate(b64=>{ const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); const of=window.fetch; window.fetch=async(u,o)=> /_blob/.test(u)? new Response(new Blob([bin],{type:'application/pdf'})) : of(u,o); openAttachment({id:'x',url:'/_blob/x',name:'a.pdf',type:'application/pdf'}); }, b64);
  await p.waitForTimeout(6000);
  console.log(await p.evaluate(()=>[document.querySelectorAll('.att-vbody canvas').length, document.querySelector('.att-vbody').innerText.slice(0,200)]), errs); await b.close();
})();
