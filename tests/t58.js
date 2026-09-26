const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>openDocForm('expense')); await p.waitForTimeout(200);
  const lbls = await p.evaluate(()=>Array.from(document.querySelectorAll('#modalBody label')).map(l=>l.innerText).join(' | ')); console.log(lbls);
  await p.fill('#f_party','ร้าน A'); await p.evaluate(()=>{ const i=DOC_TYPES.expense.extra.findIndex(f=>f.key==='supInvNo'); byId('fx_'+i).value='IV-6809-0042'; }); await p.fill('#f_amount','1000').catch(()=>{});
  await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>JSON.stringify(STORE.documents[0] && STORE.documents[0].extra)));
  await p.evaluate(()=>openDocDetail(STORE.documents[0]._id)); await p.waitForTimeout(200); await p.screenshot({path:'sup.png'}); console.log(errs); await b.close(); })();
