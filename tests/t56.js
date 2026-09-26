const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:850}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'บริษัท A',date:'2026-09-05',docNo:'INV-1',items:[{name:'ค่าบริการ',qty:1,price:1000}],vatMode:'exclusive',subtotal:1000,vat:70,total:1070,net:1070,extra:{},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  await p.click('#modalFoot >> text=🖨 พิมพ์'); await p.waitForTimeout(400); await p.screenshot({path:'pv.png'}); console.log(await p.evaluate(()=>Array.from(document.querySelectorAll('.pv-body .pf-doctag small')).map(e=>e.innerText))); console.log(errs); await b.close(); })();
