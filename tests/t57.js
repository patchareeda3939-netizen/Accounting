const { chromium } = require('playwright'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  const docs = fs.readdirSync('/tmp/dbdump2/documents').map(f=>{ const j=JSON.parse(fs.readFileSync('/tmp/dbdump2/documents/'+f)); return j.data||j; });
  console.log(await p.evaluate(async(docs)=>{ for (const d of docs) await addRec('documents', d);
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'N',date:'2026-09-15',docNo:'EX-2',vatMode:'none',whtRate:3,subtotal:1000,vat:0,total:1000,wht:30,net:970,extra:{},createdAt:5});
    return whtCerts().map(c=>c.d.docNo+' '+c.date+' '+c.no).join(' | '); }, docs), errs); await b.close(); })();
