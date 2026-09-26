const { chromium } = require('playwright'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.route('https://cdnjs.cloudflare.com/**', r=>r.fulfill({path:'/tmp/package/build/'+r.request().url().split('/').pop(), contentType:'text/javascript'}));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  const b64=fs.readFileSync('/tmp/st.pdf').toString('base64');
  console.log(await p.evaluate(async b64=>{ const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'s.pdf'); const l=await pdfLines(f); const t=pdfStatementTable(l); return JSON.stringify([l,t, autoMap(t[0],STMT_FIELDS)]); },b64)); await b.close(); })();
