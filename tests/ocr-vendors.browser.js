// Isolated OCR UI test. LIVE_RD=1 additionally queries the public RD service.
// Contact writes remain in this page's in-memory store, never in production.
const assert = require('node:assert/strict');
const http = require('node:http');
const {chromium} = require('playwright');
const row={nid:'0107561000013',branchNo:'00056',titleCode:'บริษัท',firstName:'ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)',addressInformation:{addNo:'16',mooNo:'12',ampName:'น้ำพอง',provName:'ขอนแก่น',postCode:'40140'}};
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<div id="pageData"></div><select id="ocrEngine"><option value="tess">tess</option></select>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox']});
  const page=await browser.newPage();const errors=[];if(process.env.LIVE_RD) page.on('requestfailed',r=>console.error('RD network error:',r.failure()?.errorText));page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^http:\/\/127\.0\.0\.1:/,r=>r.fulfill({contentType:'text/html',body:'<div id="pageData"></div><select id="ocrEngine"><option value="tess">tess</option></select>'}));
  if(!process.env.LIVE_RD) await page.route('https://eservice.rd.go.th/rd-ves-service/**',r=>r.fulfill({json:[row]}));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{
   window.STORE={contacts:[],accounts:[],documents:[]}; window.byId=id=>document.getElementById(id);
   window.esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
   window.accountsFor=()=>[];window.round2=n=>Math.round(n*100)/100;window.VAT_RATE=.07;window.fmtMoney=n=>Number(n).toFixed(2);
   window.showToast=s=>{window.lastToast=s;};window.addRec=async(coll,rec)=>{STORE[coll].push({...rec,_id:'vendor'+STORE[coll].length});};
   window.refreshPageData=()=>{byId('pageData').innerHTML=ocrData();bindOcr();};
  });
  await page.addScriptTag({path:'src/part17.js'});
  await page.evaluate(()=>{
   ocr.items=[{name:'receipt.jpg',data:{kind:'expense',vendorName:'ชื่อ OCR ผิด',vendorTaxId:'0107561000013',vendorBranch:'00056',docNo:'145479436610120364',items:[{name:'น้ำมัน',qty:1,price:934.58}],vatMode:'exclusive'}}];refreshPageData();
  });
  await page.locator('[data-ocrrd="0"]').click();
  await page.waitForFunction(()=>window.lastToast || ocr.items[0].data.vendorName==='บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)',{},{timeout:25000});
  assert.equal(await page.evaluate(()=>window.lastToast),undefined);
  assert.equal(await page.locator('[data-ocr="0:vendorBranch"]').inputValue(),'สาขาที่ 00056');
  assert.equal(await page.locator('[data-ocr="0:docNo"]').inputValue(),'145479436610120364');
  assert.ok((await page.locator('.ocr-sum').innerText()).includes('65.42'));
  await page.locator('[data-ocrvendoradd="0"]').click();
  await page.waitForFunction(()=>STORE.contacts.length===1);
  await page.locator('[data-ocrvendoradd="0"]').click();assert.equal(await page.evaluate(()=>STORE.contacts.length),1);
  await page.locator('[data-ocr="0:vendorName"]').fill('เปลี่ยนชื่อ');await page.locator('[data-ocr="0:vendorName"]').dispatchEvent('change');
  await page.locator('[data-ocrvendor="0"]').selectOption('vendor0');
  assert.equal(await page.locator('[data-ocr="0:vendorName"]').inputValue(),'บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)');
  assert.deepEqual(errors,[]);
  console.log('PASS OCR browser: '+(process.env.LIVE_RD?'live RD lookup':'mocked RD response')+', branch autofill, invoice/VAT display, add/select vendor and duplicate prevention');
 } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
