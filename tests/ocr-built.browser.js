// Verify the real bundled page and its styles, including the Claude artifact export.
// Firebase is disabled and all writes remain in isolated browser storage.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{},args:['--no-sandbox']});
 try{
  for(const file of ['dist/index.html','dist/artifact.html']){
   const page=await browser.newPage({viewport:{width:1534,height:959}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const html=fs.readFileSync(file,'utf8').replace(/^var FIREBASE_CONFIG = (?:null|\{[\s\S]*?\n\});$/m,'var FIREBASE_CONFIG = null;').replace(/^var FIREBASE_EMULATOR_HOST = [^\n]*;$/m,'var FIREBASE_EMULATOR_HOST = null;');
   await page.route('**/*',r=>r.request().url()==='http://127.0.0.1/'?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());
   await page.goto('http://127.0.0.1/');await page.waitForFunction(()=>typeof go==='function' && typeof STORE==='object');
   await page.evaluate(()=>{
    STORE.contacts.push({_id:'s1',name:'บริษัท ผู้ขายทดสอบ จำกัด',entity:'company',kind:'supplier',taxId:'0107561000013',branch:'00056',address:'ที่อยู่บริษัท'},{_id:'s2',name:'นาย ผู้ขายทดสอบ',entity:'person',kind:'supplier',taxId:'1234567890123',branch:'',address:'ที่อยู่บุคคล'});
    STORE.accounts.push({code:'5360',name:'ค่าน้ำมัน',accType:'expense',type:'expense'});
    STORE.documents.push({_id:'av1',type:'advance',party:'พนักงาน',date:'2026-10-01',total:2000,extra:{advAcc:'1150'}});
    go('accounting','receiptCapture');ocr.items=[{name:'fuel.jpg',data:{kind:'expense',vendorName:'บริษัท ปตท.',vendorTaxId:'0107561000013',vendorBranch:'00056',docNo:'145479436610120364',items:[{name:'DIESEL B7',qty:1,price:934.58}],vatMode:'exclusive'}}];refreshPageData();
   });
   for(const viewport of [{width:1534,height:959},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    assert.ok(await page.getByText('รุ่น OCR 2026.11.12.6',{exact:true}).isVisible());
    assert.ok(await page.locator('[data-ocrvendoradd="0"]').isVisible());
    assert.ok(await page.locator('[data-ocr="0:vendorBranch"]').isVisible());
    assert.ok(await page.locator('[data-ocracc="0:5360"]').isVisible());
  assert.equal(await page.getByRole('link',{name:'ค้น VAT ที่เว็บกรมสรรพากร'}).count(),0);
   }
   assert.equal(await page.locator('[data-ocr="0:vendorEntity"]').isVisible(),false,'entity type starts inside the closed vendor menu');
   await page.locator('[data-ocrvendor="0"]').click();
   assert.equal(await page.locator('[data-ocrvendor="0"]').getAttribute('aria-expanded'),'true');
   assert.ok(await page.locator('[data-ocrvendorpick="0:s1"]').isVisible(),'click opens all suppliers even when input has an OCR name');
   assert.ok(await page.locator('[data-ocr="0:vendorEntity"]').isVisible());
   await page.locator('[data-ocrvendorpick="0:s1"]').click();
   assert.equal(await page.locator('[data-ocrvendor="0"]').inputValue(),'บริษัท ผู้ขายทดสอบ จำกัด');
   assert.equal(await page.locator('[data-ocr="0:vendorAddress"]').inputValue(),'ที่อยู่บริษัท');
   await page.locator('[data-ocrvendortoggle="0"]').click();
   await page.locator('[data-ocrvendorpick="0:s2"]').click();
   assert.equal(await page.locator('[data-ocr="0:vendorBranch"]').getAttribute('required'),null);
   await page.locator('[data-ocrvendor="0"]').fill('ชื่อผู้ขายใหม่');
   assert.equal(await page.locator('[data-ocrvendorpick="0:s1"]').isVisible(),false);
   await page.locator('[data-ocrvendor="0"]').press('Escape');
   assert.equal(await page.locator('[data-ocrvendor="0"]').getAttribute('aria-expanded'),'false');
   await page.locator('[data-ocrvendor="0"]').click();
   assert.equal(await page.locator('[data-ocrvendor="0"]').getAttribute('aria-expanded'),'true');
   await page.locator('[data-ocrvendorpick="0:s1"]').click();
   await page.locator('[data-ocr="0:kind"]').selectOption('advance');
   await page.locator('[data-ocr="0:advanceId"]').selectOption('av1');
   assert.ok(await page.locator('[data-ocrvendoradd="0"]').isVisible());
   assert.ok(await page.locator('[data-ocracc="0:5360"]').isVisible());
   await page.locator('[data-ocracc="0:5360"]').click();
   const itemName=page.locator('[data-ocri="0:0:name"]');
   assert.equal(await itemName.inputValue(),'DIESEL B7');
   await itemName.fill('');
   await itemName.press('Tab');
   assert.equal(await itemName.inputValue(),'ค่าน้ำมัน');
   await page.locator('[data-ocr="0:account"]').selectOption('');
   assert.equal(await itemName.inputValue(),'');
   await itemName.fill('DIESEL B7');
   await itemName.press('Tab');
   await page.evaluate(()=>{STORE.accounts=[];refreshPageData();});
   assert.ok((await page.locator('.ocr-form').innerText()).includes('หมวดที่แนะนำ: ค่าน้ำมัน'));
   for (const [type, child] of [['expense', 'expenseTx'], ['bill', 'bill']]) {
    await page.evaluate(type=>{
     STORE.documents.push({_id:type, type, group:'supplier', date:'2020-01-01', docNo:'OCR-' + type, total:235, items:[]});
     ocr.items[0].docId=type;
     go('accounting','receiptCapture');
    },type);
    await page.getByRole('button',{name:'เปิดเอกสาร',exact:true}).click();
    assert.equal(await page.evaluate(()=>pageId()),'billing:' + child);
    assert.ok(await page.getByRole('cell',{name:'OCR-' + type,exact:true}).isVisible());
    assert.ok(await page.locator('#overlay.open.full').isVisible());
    assert.equal(await page.locator('#f_docno').inputValue(),'OCR-' + type);
    await page.locator('#modalFoot').getByRole('button',{name:'ยกเลิก',exact:true}).click();
    assert.equal(await page.locator('#overlay.open').count(),0);
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS built OCR web page and artifact: visible vendor tools/recommendations, mobile/desktop, advance destination, official VAT URL and missing-account category');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
