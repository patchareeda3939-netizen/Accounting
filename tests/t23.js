const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(200);
  await p.evaluate(()=>openDocForm('invoice'));
  await p.fill('#f_party','มิน'); await p.fill('[data-f=name]','บริการ'); await p.fill('[data-f=price]','1000');
  await p.selectOption('#f_acc','4120'); await p.selectOption('#f_vat','exclusive');
  const tp = await p.inputValue('#f_taxpoint');
  await p.evaluate(()=>{ byId('f_date').value='2026-08-15'; });
  await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(200);
  const before = await p.evaluate(()=>[vatSummary('2026-08').out, vatSummary('2026-09').out]);
  await p.evaluate(()=>openDocDetail(STORE.documents[0]._id)); await p.click('#modalFoot >> text=รับชำระเงิน'); await p.fill('#p_amount','535'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  const after = await p.evaluate(()=>{ const bal=accountBalances(); return [vatSummary('2026-08').out, vatSummary('2026-09').out, bal['2120'], bal['2125']]; });
  console.log(tp, before, JSON.stringify(after), errs); await b.close();
})();
