const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ window.print=()=>{}; await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-09-05',docNo:'I1',items:[{name:'x',qty:1,price:100}],vatMode:'none',subtotal:100,vat:0,total:100,net:100,extra:{},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  await p.click('#modalFoot >> text=🖨 พิมพ์'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(()=>[byId('modalTitle').innerText, document.body.classList.contains('printing-doc')]), errs); await b.close(); })();
