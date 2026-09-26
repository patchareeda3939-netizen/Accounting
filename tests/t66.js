const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const ctx=await b.newContext(); const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(400);
  await p.evaluate(async()=>{ loadStandardCoa(); await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-09-10',docNo:'INV-X',items:[],subtotal:100,vat:0,total:100,net:100,extra:{},status:'unpaid',createdAt:1}); });
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(600);
  console.log(await p.evaluate(()=>[STORE.documents.length, STORE.accounts.length]), errs); await b.close(); })();
