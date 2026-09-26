const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); await ctx.addInitScript(()=>{ window.print=()=>{ window.__printed=1; }; }); const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-09-05',docNo:'I1',items:[{name:'ค่าบริการ',qty:1,price:100}],vatMode:'none',subtotal:100,vat:0,total:100,net:100,extra:{},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#modalFoot >> text=🖨 พิมพ์')]);
  await pop.waitForLoadState(); await pop.waitForTimeout(800); console.log('printed', await pop.evaluate(()=>window.__printed));
  console.log(pop.url().slice(0,20), (await pop.evaluate(()=>document.body.innerText)).slice(0,80), errs);
  await pop.screenshot({path:'pop.png'}); await b.close(); })();
