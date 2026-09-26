const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  const docs = fs.readdirSync('/tmp/dbdump/documents').map(f=>{ const j=JSON.parse(fs.readFileSync('/tmp/dbdump/documents/'+f)); return j.data||j; });
  await p.evaluate(async(docs)=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300)); await addRec('accounts',{code:'1121',name:'สาขาศิริราช',accType:'bank',type:'asset'}); await addRec('accounts',{code:'3900',name:'ยอดยกมา',accType:'equity',type:'equity'}); for (const d of docs) await addRec('documents', d); }, docs);
  await p.evaluate(()=>{pageState.repPeriod='month';openReport('incExpMonthly');}); await p.waitForTimeout(300); console.log(await p.evaluate(()=>byId('pageData').innerText));
  console.log(await p.evaluate(()=>JSON.stringify(cashFlowLines().map(f=>[f.date,f.amt,f.cat])))); console.log(errs); await b.close(); })();
