const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fund = {id:'pc1',name:'กองทุนสำนักงาน',acc:'1112'};
const advance = {_id:'av1',type:'advance',party:'พนักงาน',date:'2026-10-01',total:1000,extra:{advAcc:'1150'}};
const messages = [];
const ctx = vm.createContext({
  STORE:{contacts:[{name:'ผู้ขาย'}],accounts:[],documents:[advance]},
  DOC_TYPES:{expense:{label:'ค่าใช้จ่าย',template:'itemized',flow:'exp'},bill:{label:'บิล',template:'itemized',status:true}},
  pcFunds:()=>[fund], pcFund:id=>id===fund.id?fund:null,
  esc:s=>String(s), round2:n=>Math.round(n*100)/100, VAT_RATE:0.07,
  todayStr:()=> '2026-11-12', showToast:s=>messages.push(s), refreshPageData:()=>{},
  getAssets:async()=>null, nextDocNo:type=>type+'-001'
});
vm.runInContext(fs.readFileSync('src/part17.js','utf8'),ctx);
const pcSource = fs.readFileSync('src/part29.js','utf8');
vm.runInContext(pcSource.slice(pcSource.indexOf('function advInfo('),pcSource.indexOf('var ADV_ST')),ctx);
let saves = [];
ctx.addRec = async (coll,rec)=>{assert.equal(coll,'documents');saves.push(rec);return 'saved-'+saves.length;};
const draft = kind=>({kind,vendorName:'ผู้ขาย',date:'2026-11-12',docNo:'INV-1',items:[{name:'บริการ',qty:1,price:776.14}],vatMode:'exclusive',pettyFund:'pc1',advanceId:'av1',dueDate:'2026-12-01'});
(async()=>{
  for(const kind of ['expense','bill','pettyCash','advance']) {
    const d=draft(kind);ctx.ocr.items=[{data:d,file:{name:'receipt.jpg'}}];
    const html=ctx.ocrDestinationFields(d,0);
    for(const option of ['expense','bill','pettyCash','advance']) assert.ok(html.includes('value="'+option+'"'));
    if(kind==='pettyCash') assert.ok(html.includes(':pettyFund'));
    if(kind==='advance') assert.ok(html.includes(':advanceId'));
    const btn={}; await ctx.ocrCreate(0,btn);
    const saved=saves.at(-1);
    assert.equal(saved.type,kind==='bill'?'bill':'expense');
    assert.equal(saved.extra.supInvNo,'INV-1');
    assert.equal(saved.vat,54.33);assert.equal(saved.total,830.47);
    if(kind==='bill'){assert.equal(saved.status,'unpaid');assert.equal(saved.extra.dueDate,'2026-12-01');assert.equal(saved.extra.method,undefined);}
    if(kind==='expense') assert.equal(saved.extra.method,'โอนเงิน');
    if(kind==='pettyCash'){assert.equal(saved.extra.bankAcc,'1112');assert.equal(saved.extra.pettyFund,'pc1');assert.equal(saved.extra.advanceId,undefined);}
    if(kind==='advance'){
      assert.equal(saved.extra.bankAcc,'1150');assert.equal(saved.extra.advanceId,'av1');assert.equal(saved.extra.pettyFund,undefined);
      ctx.STORE.documents.push(saved);
      assert.equal(ctx.advInfo(advance).spent,830.47);assert.equal(ctx.advInfo(advance).out,169.53);
      ctx.STORE.documents.pop();
    }
    const count=saves.length;await ctx.ocrCreate(0,{});assert.equal(saves.length,count,'prevent creating the same receipt twice');
  }
  for(const data of [Object.assign(draft('pettyCash'),{pettyFund:''}),Object.assign(draft('advance'),{advanceId:''}),Object.assign(draft('advance'),{date:'2026-09-01'}),draft('invalid')]){
    const count=saves.length;ctx.ocr.items=[{data,file:{name:'receipt.jpg'}}];await ctx.ocrCreate(0,{});assert.equal(saves.length,count);
  }
  advance.voided=true;assert.throws(()=>ctx.ocrPaymentExtra(draft('advance')),/ยังไม่เคลียร์/);advance.voided=false;
  ctx.STORE.documents.push({type:'expense',total:1000,extra:{advanceId:'av1'}});
  assert.throws(()=>ctx.ocrPaymentExtra(draft('advance')),/ยังไม่เคลียร์/);
  assert.ok(!ctx.ocrDestinationFields(draft('advance'),0).includes('value="av1"'));
  console.log('PASS OCR destinations: all four saves, VAT, fund/advance links, settlement balance, validation and duplicate protection');
})().catch(e=>{console.error(e);process.exitCode=1;});
