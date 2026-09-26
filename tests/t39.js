const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r=>r.fulfill({path:'/tmp/package/build/'+r.request().url().split('/').pop(), contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}}));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300)); });
  await p.evaluate(()=>go('accounting','reconcile')); await p.waitForTimeout(300);
  await p.selectOption('#recAcc','1120');
  for (const [f,pw] of [['/tmp/st.pdf',null],['/tmp/st_pw.pdf','1234']]) {
    await p.click('[data-stmtimp]'); await p.waitForTimeout(100);
    await p.setInputFiles('#stFile', f); await p.waitForTimeout(3000);
    console.log(f, await p.evaluate(()=>[byId('formError').hidden?'':byId('formError').innerText, byId('stPrev').innerText]));
    if (pw) { await p.fill('#stPw', pw); await p.press('#stPw','Enter'); await p.waitForTimeout(3000); console.log(await p.evaluate(()=>[byId('formError').hidden?'':byId('formError').innerText, byId('stPrev').innerText])); }
    await p.click('#modalFoot >> text=นำเข้าและจับคู่'); await p.waitForTimeout(300);
  }
  console.log(await p.evaluate(()=>JSON.stringify(rec.stmt.map(s=>[s.date,s.desc,s.amt,s.bal]))), errs); await b.close();
})();
