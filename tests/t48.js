const { chromium } = require('playwright'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const ctx=await b.newContext(); await ctx.addInitScript({content: fs.readFileSync(__dirname+'/mockdb.js','utf8')}); const p = await ctx.newPage({viewport:{width:1300,height:1000}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(500);
  await p.evaluate(async()=>{ await saveSettings('company',{name:'PSM',legalName:'บริษัท ตัวอย่าง จำกัด',taxId:'0105550000007',legalAddress:'กรุงเทพฯ'}); await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-09-01',docNo:'INV-A',items:[],subtotal:100,vat:0,total:100,net:100,extra:{},status:'unpaid',createdAt:1}); });
  await p.waitForTimeout(300);
  await p.click('#companyPill'); await p.click('[data-conew]'); await p.fill('#ncName','บริษัท สอง จำกัด'); await p.fill('#ncTax','0105500000002');
  await p.click('#modalFoot >> text=สร้างและสลับไปบริษัทนี้'); await p.waitForTimeout(1200);
  console.log('co2', await p.evaluate(()=>[CUR_CO!=='main', companyName(), STORE.documents.length, STORE.accounts.length]));
  // branches in co2
  await p.evaluate(()=>go('settings','company')); await p.waitForTimeout(300);
  await p.click('[data-bradd]'); await p.fill('#brName','สาขาเชียงใหม่'); await p.fill('#brAddr','99 ถ.นิมมาน เชียงใหม่'); await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(400);
  await p.evaluate(()=>openDocForm('invoice')); await p.waitForTimeout(200);
  console.log('branchSel', await p.evaluate(()=>byId('f_branch') && byId('f_branch').innerText));
  await p.selectOption('#f_branch','00001'); await p.fill('#f_party','ลูกค้า X');
  await p.evaluate(()=>{ form.items=[{name:'x',qty:1,price:500}]; });
  await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(500);
  const d = await p.evaluate(()=>STORE.documents[0] && [STORE.documents[0].extra.branch, strip2(renderForm(STORE.documents[0], styleFor('invoice'))).slice(0,160)]); console.log(d);
  await p.click('#companyPill'); await p.click('[data-cosw="main"]'); await p.waitForTimeout(500);
  console.log('main', await p.evaluate(()=>[companyName(), STORE.documents.map(x=>x.docNo), Object.keys(window.__cols)]), errs); await b.close(); })();
