/* ================= รายงานเงินเดือน / ภาษี / การลา ================= */
var PR_REPORTS = [
  ['monthly','เงินเดือน/ค่าจ้าง'],['cert','เอกสาร 50 ทวิ'],['ytd','เงินเดือน/ค่าจ้างสะสม'],
  ['leave','รายงานการลา'],['leaveDetail','รายละเอียดการลา'],['workmen','เอกสาร กท.20 ก']
];
function prHandler(name,args) { return esc(name + '(' + args.map(function(v) { return JSON.stringify(v); }).join(',') + ')'); }
function prReportCompanyOk(co) { if (co === CUR_CO) return true; showToast('เปลี่ยนบริษัทแล้ว กรุณาเปิดรายงานใหม่'); return false; }
function prReportButtons() {
  return '<div class="toolbar pr-report-buttons" aria-label="รายงานเงินเดือนและการลา">' + PR_REPORTS.map(function(r) {
    return '<button type="button" class="btn btn-outline" data-pr-report="' + r[0] + '" onclick="openPrReport(\'' + r[0] + '\')">' + r[1] + '</button>';
  }).join('') + '</div>';
}
var _prShellReports = prShell;
prShell = function() { return _prShellReports() + prReportButtons(); };
function prYear(value) { var y = Number(value); if (y > 2400) y -= 543; return Number.isInteger(y) && y >= 1900 && y <= 2200 ? String(y) : ''; }
function prReportEntries(year, month) {
  var rows = [];
  STORE.documents.filter(function(d) { return d.type === 'payroll' && !d.voided && String(d.date || '').slice(0,4) === year && (!month || String(d.date).slice(0,7) === month); })
    .sort(function(a,b) { return String(a.date).localeCompare(String(b.date)) || String(a._id).localeCompare(String(b._id)); })
    .forEach(function(d) { (d.items || []).forEach(function(x,i) {
      var id = x.empId || (/^\d{13}$/.test(String(x.taxId || '').replace(/\D/g,'')) ? 'tin-' + String(x.taxId).replace(/\D/g,'') : 'unidentified-' + d._id + '-' + i);
      rows.push({key:id,d:d,index:i,line:x,date:d.date,name:x.name || '',taxId:x.taxId || '',income:prIncomeTotal(x),taxable:prAmount(x,x.taxGross == null ? 'gross' : 'taxGross'),deductions:prDeductTotal(x),sso:prAmount(x,'sso'),pvd:prAmount(x,'pvd'),wht:prAmount(x,'wht'),net:prAmount(x,'net')});
    }); });
  return rows;
}
function prYtdRows(year, month) {
  var groups = new Map();
  prReportEntries(year,month).forEach(function(r) {
    if (!groups.has(r.key)) groups.set(r.key,{key:r.key,name:r.name,taxId:r.taxId,taxIds:[],entries:[],income:0,taxable:0,deductions:0,sso:0,pvd:0,wht:0,net:0,components:{},legacyDeduct:0});
    var g = groups.get(r.key); g.name = r.name; if (r.taxId) { g.taxId=r.taxId; var tin=String(r.taxId).replace(/\D/g,''); if (!g.taxIds.includes(tin)) g.taxIds.push(tin); }
    g.entries.push(r); ['income','taxable','deductions','sso','pvd','wht','net'].forEach(function(k) { g[k]=round2(g[k]+r[k]); });
    PR_INCOME.concat(PR_DEDUCT).forEach(function(f) { g.components[f.key]=round2((g.components[f.key] || 0)+prAmount(r.line,f.key)); });
    g.legacyDeduct=round2(g.legacyDeduct+(r.line.detailVersion === 2 ? prAmount(r.line,'legacyWageDeduct') : prAmount(r.line,'deduct')));
  });
  return Array.from(groups.values()).sort(function(a,b) { return a.name.localeCompare(b.name,'th') || a.key.localeCompare(b.key); });
}
function prReportTable(headers, rows, footer) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.map(function(r) { return '<tr>' + r.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + headers.length + '" class="empty-hint">ยังไม่มีข้อมูลในช่วงที่เลือก</td></tr>') +
    '</tbody>' + (footer ? '<tfoot><tr>' + footer.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr></tfoot>' : '') + '</table></div>';
}
function prMoneyCells(r) { return ['income','taxable','deductions','sso','wht','net'].map(function(k) { return fmtMoney(r[k]); }); }
function prReportContent(kind,year,ym) {
  if (kind === 'leave' || kind === 'leaveDetail') return prLeaveContent(kind,year);
  if (kind === 'workmen') return prWorkmenContent(year);
  if (kind === 'monthly') {
    var entries=prReportEntries(year,ym);
    return '<p>เดือนที่จ่ายเงิน ' + esc(monthLabel(ym,true)) + ' · รวมเฉพาะรอบที่ยังไม่ยกเลิก</p>' + prReportTable(['วันที่จ่าย','เอกสาร','พนักงาน','รวมรายรับ','เงินได้ในฐานภาษี','รวมรายการหัก','ประกันสังคม','ภาษี','สุทธิ','สลิป'],entries.map(function(r) {
      return [fmtDateNum(r.date),esc(r.d.docNo || ''),esc(r.name)].concat(prMoneyCells(r),['<button type="button" class="linkish" onclick="' + prHandler('openPayslip',[r.d._id,r.index]) + '">ดูสลิป</button>']);
    }),['รวม','',''].concat(['income','taxable','deductions','sso','wht','net'].map(function(k) { return fmtMoney(prSum(entries,k)); }),['']));
  }
  var rows=prYtdRows(year),headers=['พนักงาน','จำนวนครั้งที่จ่าย','รวมรายรับ','เงินได้ในฐานภาษี','รวมรายการหัก','ประกันสังคม','ภาษี','สุทธิ',kind === 'cert' ? '50 ทวิ' : 'รายละเอียด'];
  return '<p>ปีภาษี ' + (Number(year)+543) + ' · สะสมตามวันที่จ่ายเงินจริง รวมผู้ที่ลาออกและรายการที่ไม่มีภาษีหัก</p>' +
    (kind === 'cert' ? '<p class="small muted">เอกสารใช้เงินได้ในฐานภาษี ภาษีที่หัก ประกันสังคม และกองทุนสำรองเลี้ยงชีพของปีที่เลือก ตรวจเลขผู้เสียภาษี ที่อยู่ และยอดนำส่งก่อนลงนาม</p>' : '') +
    prReportTable(headers,rows.map(function(r) { return [esc(r.name),String(r.entries.length)].concat(prMoneyCells(r),['<button type="button" class="linkish" onclick="' + prHandler(kind === 'cert' ? 'openPr50' : 'openPrYtdDetail',[year,r.key]) + '">' + (kind === 'cert' ? 'ดู/จัดทำ 50 ทวิ' : 'ดูรายละเอียด') + '</button>']); }),['รวม',String(rows.reduce(function(n,r) { return n+r.entries.length; },0))].concat(['income','taxable','deductions','sso','wht','net'].map(function(k) { return fmtMoney(prSum(rows,k)); }),['']));
}
var _whtListShellPayrollReports=whtListShell;
whtListShell=function() { return _whtListShellPayrollReports() + '<div class="toolbar"><button type="button" class="btn btn-outline" onclick="openPrReport(\'cert\')">เอกสาร 50 ทวิเงินเดือน</button></div>'; };
var prReportState = null;
function openPrReport(kind, year, ym) {
  if (!PR_REPORTS.some(function(r) { return r[0] === kind; })) return;
  ym = ym || pageState.prYm || todayStr().slice(0,7); year = prYear(year || ym.slice(0,4));
  if (!year || !/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) { showToast('ระบุปีหรือเดือนให้ถูกต้อง'); return; }
  if (kind === 'monthly') year=ym.slice(0,4);
  prReportState={kind:kind,year:year,ym:ym,company:CUR_CO};
  var title=PR_REPORTS.find(function(r) { return r[0] === kind; })[1];
  var filter=kind === 'monthly' ? '<label for="prReportMonth">เดือนที่จ่ายเงิน</label><input id="prReportMonth" type="month" value="' + ym + '" onchange="openPrReport(\'monthly\',null,this.value)">' : '<label for="prReportYear">ปี ค.ศ. / พ.ศ.</label><input id="prReportYear" type="number" value="' + year + '" onchange="openPrReport(\'' + kind + '\',this.value)">';
  openModal({title:title,full:true,focus:false,body:'<div class="field" style="max-width:240px">' + filter + '</div><div id="prReportContent">' + prReportContent(kind,year,ym) + '</div>',buttons:[
    {label:'ส่งออก CSV',onClick:function() { prExportReport(kind,year,ym); }},
    {label:'ดู/พิมพ์',onClick:function() { prPrintReport(kind,year,ym); }},
    {label:'รีเฟรช',onClick:function() { openPrReport(kind,year,ym); }},
    {label:'ปิด',cls:'btn-dark',onClick:closeModal}
  ],onMount:function() { if (kind === 'workmen') prUpdateWorkmen(year); }});
}
function prPrintReport(kind,year,ym) {
  if (prReportState && !prReportCompanyOk(prReportState.company)) return;
  var title=PR_REPORTS.find(function(r) { return r[0] === kind; })[1];
  var node=byId('prReportContent').cloneNode(true); node.querySelectorAll('details').forEach(function(el) { el.open=true; }); node.querySelectorAll('button').forEach(function(b) { b.remove(); });
  node.querySelectorAll('input,select').forEach(function(el) { var span=document.createElement('span'); span.textContent=el.value; el.replaceWith(span); });
  openPrintViewer({typeLabel:title,docNo:kind === 'monthly' ? ym : String(Number(year)+543),type:'payrollReport'},'<div class="pf-paper pr-report-paper"><h2>' + esc(companyName()) + '</h2><h3>' + esc(title) + '</h3>' + node.innerHTML + '</div>',title + '-' + year + '.pdf');
}
async function prSaveCsv(filename,rows) { try { await (await getSaver()).save({filename:filename,data:toCsv(rows)}); } catch(e) { if (!e || e.code !== 'declined') showToast('ส่งออกไม่สำเร็จ ลองอีกครั้ง'); } }
function prExportReport(kind,year,ym) {
  if (prReportState && !prReportCompanyOk(prReportState.company)) return;
  if (kind === 'leave' || kind === 'leaveDetail') return prExportLeave(kind,year);
  if (kind === 'workmen') return prExportWorkmen(year);
  var fields=PR_INCOME.concat(PR_DEDUCT),headers=['พนักงาน','เลขผู้เสียภาษี'].concat(kind === 'monthly' ? ['วันที่จ่าย','เอกสาร'] : ['จำนวนครั้งที่จ่าย']);
  headers=headers.concat(fields.map(function(f) { return f.label; }),['หักขาด/ลาเดิม','รวมรายรับ','เงินได้ในฐานภาษี','รวมรายการหัก','ประกันสังคมรวม','ภาษีรวม','สุทธิ']);
  var groups=kind === 'monthly' ? prReportEntries(year,ym).map(function(r) { return Object.assign({},r,{components:r.line,legacyDeduct:r.line.detailVersion === 2 ? prAmount(r.line,'legacyWageDeduct') : prAmount(r.line,'deduct')}); }) : prYtdRows(year);
  return prSaveCsv('รายงาน-' + kind + '-' + (kind === 'monthly' ? ym : year) + '.csv',[headers].concat(groups.map(function(r) { return [r.name,r.taxId].concat(kind === 'monthly' ? [r.date,r.d.docNo] : [r.entries.length],fields.map(function(f) { return prAmount(r.components,f.key); }),[r.legacyDeduct,r.income,r.taxable,r.deductions,r.sso,r.wht,r.net]); })));
}
function openPrYtdDetail(year,key) {
  var r=prYtdRows(year).find(function(x) { return x.key === key; }); if (!r) return;
  var detail=function(fields) { return prReportTable(['รายการ','ยอดสะสม'],fields.map(function(f) { return [esc(f.label),fmtMoney(prAmount(r.components,f.key))]; })); };
  openModal({title:'เงินเดือน/ค่าจ้างสะสม — ' + r.name + ' ปี ' + (Number(year)+543),full:true,body:'<div class="pr-component-cols">' + detail(PR_INCOME) + detail(PR_DEDUCT) + '</div><p>รวมรายรับ ' + fmtMoney(r.income) + ' · รวมรายการหัก ' + fmtMoney(r.deductions) + ' · สุทธิ ' + fmtMoney(r.net) + (r.legacyDeduct ? ' · หักขาด/ลาเดิม ' + fmtMoney(r.legacyDeduct) : '') + '</p>' + prReportTable(['วันที่จ่าย','เอกสาร','รายรับ','ภาษี','สุทธิ'],r.entries.map(function(x) { return [fmtDateNum(x.date),esc(x.d.docNo),fmtMoney(x.income),fmtMoney(x.wht),fmtMoney(x.net)]; })),buttons:[{label:'กลับ',cls:'btn-dark',onClick:function() { openPrReport('ytd',year); }}]});
}
/* 50 ทวิเงินเดือน: แยกผู้รับเงินจากผู้ติดต่อผู้ขาย และเก็บฉบับที่บันทึกเป็น snapshot */
EMPLOYEE_FIELDS.splice(EMPLOYEE_FIELDS.findIndex(function(f) { return f.key === 'phone'; }),0,{key:'address',label:'ที่อยู่พนักงานสำหรับเอกสารภาษี'});
var prCertDraft = null;
function prCertId(year,key) { return 'payroll50-' + year + '-' + key; }
function prCertCurrent(year,key) {
  var all=prYtdRows(year), r=all.find(function(x) { return x.key === key; }); if (!r) return null;
  var e=STORE.employees.find(function(x) { return x._id === key; }) || {}, co=companySettings();
  return {year:year,key:key,sequence:all.indexOf(r)+1,number:'PR50-' + (Number(year)+543) + '-' + key,issueDate:todayStr(),lastPayment:r.entries[r.entries.length-1].date,
    values:{base:r.taxable,wht:r.wht,sso:r.sso,pvd:r.pvd},person:{name:r.name,taxId:r.taxId || e.taxId || '',address:e.address || '',entity:'person'},company:{taxId:co.taxId || ''},companyInfo:coInfoFor({extra:{}})};
}
function prCertHtml(draft) {
  var c={d:{party:draft.person.name,extra:{}},seq:draft.sequence || 1,no:draft.number,date:draft.year+'-12-31',base:draft.values.base,wht:draft.values.wht};
  var html=renderWht(c,{cfg:{form:'1a',income:'1',payer:'1'},contact:Object.assign({entity:'person'},draft.person),company:draft.company,companyInfo:draft.companyInfo,sso:draft.values.sso,pvd:draft.values.pvd,incomeDateText:String(Number(draft.year)+543),issueDate:draft.issueDate});
  return !draft.savedAt || draft._dirty ? html.replace('<div class="wt-paper">','<div class="wt-paper"><p class="pr-cert-draft">ร่าง — ยังไม่บันทึกเอกสาร</p>') : html;
}
function openPr50(year,key,latest) {
  year=prYear(year); if (!year) return;
  var row=prYtdRows(year).find(function(x) { return x.key === key; }), saved=STORE.settings.find(function(x) { return x._id === prCertId(year,key); });
  if (row && row.taxIds.length > 1 && (!saved || latest)) { openModal({title:'ตรวจเลขผู้เสียภาษีก่อนจัดทำ 50 ทวิ',body:'<p>ข้อมูลเงินเดือนของพนักงานคนนี้มีเลขผู้เสียภาษีต่างกันในปีเดียวกัน โปรดตรวจและแก้รอบเงินเดือนก่อนจัดทำเอกสาร</p>',buttons:[{label:'กลับ',onClick:function() { openPrReport('cert',year); }}]}); return; }
  var current=prCertCurrent(year,key); if (!current && !saved) return;
  if (latest && saved && current) { current.sequence=saved.sequence || current.sequence; current.number=saved.number; }
  var sourceCompany=CUR_CO;
  prCertDraft=JSON.parse(JSON.stringify(saved && !latest ? strip(saved) : current));
  var draft=prCertDraft, missing=[];
  if (!/^\d{13}$/.test(String(draft.company.taxId).replace(/\D/g,''))) missing.push('เลขผู้เสียภาษีบริษัท');
  if (!/^\d{13}$/.test(String(draft.person.taxId).replace(/\D/g,''))) missing.push('เลขผู้เสียภาษีพนักงาน');
  if (!draft.person.address) missing.push('ที่อยู่พนักงาน');
  if (!draft.companyInfo.address) missing.push('ที่อยู่บริษัท');
  var changed=saved && current && JSON.stringify(saved.values)!==JSON.stringify(current.values);
  var controls='<p>' + (saved && !latest ? 'แสดงฉบับที่บันทึกไว้ รุ่น ' + (saved.version || 1) : 'ร่างจากเงินเดือนที่จ่ายในปีที่เลือก') + (changed ? ' · ข้อมูลเงินเดือนปัจจุบันต่างจากฉบับที่บันทึก กดโหลดข้อมูลล่าสุดหากต้องการจัดทำฉบับปรับปรุง' : '') + '</p>' +
    (missing.length ? '<div class="banner warn">ยังขาด ' + missing.map(esc).join(' / ') + ' — เติมข้อมูลก่อนใช้เอกสารจริง</div>' : '') +
    '<div class="field"><label for="prCertSequence">ลำดับในแบบ ภ.ง.ด.1ก (ตรวจให้ตรงกับแบบที่ยื่น)</label><input id="prCertSequence" type="number" min="1" step="1" value="' + esc(String(draft.sequence || 1)) + '"></div><div class="grid-2"><div class="field"><label for="prCertNo">เลขที่เอกสาร</label><input id="prCertNo" value="' + esc(draft.number) + '"></div><div class="field"><label for="prCertDate">วันที่ออกเอกสาร</label><input id="prCertDate" type="date" value="' + esc(draft.issueDate) + '"></div></div><div id="prCertError" class="form-error" hidden></div>';
  var readDraft=function() { if (draft.sequence !== Number(byId('prCertSequence').value) || draft.number !== byId('prCertNo').value.trim() || draft.issueDate !== byId('prCertDate').value) draft._dirty=true; draft.number=byId('prCertNo').value.trim(); draft.issueDate=byId('prCertDate').value; draft.sequence=Number(byId('prCertSequence').value); return draft; };
  var buttons=[];
  if (!fbReadOnly()) buttons.push({label:'บันทึกเอกสาร',cls:'btn-dark',onClick:async function(btn) {
    if (!prReportCompanyOk(sourceCompany) || fbReadOnly()) return;
    readDraft(); var err=byId('prCertError');
    if (!Number.isInteger(draft.sequence) || draft.sequence < 1 || !draft.number || !prValidIsoDate(draft.issueDate) || draft.issueDate < draft.lastPayment) { err.hidden=false; err.textContent='ระบุลำดับในแบบเป็นจำนวนเต็มตั้งแต่ 1 เลขที่ และวันที่ออกเอกสาร โดยวันที่ออกต้องไม่ก่อนวันที่จ่ายเงินล่าสุดในรายงาน'; return; }
    if (missing.length) { err.hidden=false; err.textContent='เติมข้อมูลที่ขาดในข้อมูลพนักงาน/บริษัท แล้วโหลดข้อมูลล่าสุดก่อนบันทึกเอกสาร'; return; }
    btn.disabled=true;
    try {
      var history=saved ? (saved.history || []).concat([Object.fromEntries(Object.entries(strip(saved)).filter(function(kv) { return kv[0] !== 'history'; }))]) : [];
      var packet=Object.assign({},draft); delete packet._dirty;
      await saveSettings(prCertId(year,key),Object.assign(packet,{kind:'payroll50',version:(saved && saved.version || 0)+1,history:history,savedAt:Date.now()}));
      showToast('บันทึกเอกสาร 50 ทวิแล้ว'); openPr50(year,key);
    } catch(e) { btn.disabled=false; err.hidden=false; err.textContent=writeError(e); }
  }});
  if (current) buttons.push({label:'โหลดข้อมูลเงินเดือนล่าสุด',onClick:function() { openPr50(year,key,true); }});
  buttons.push({label:'ดู/พิมพ์',onClick:function() { if (!prReportCompanyOk(sourceCompany)) return; readDraft(); if (!Number.isInteger(draft.sequence) || draft.sequence < 1 || !draft.number || !prValidIsoDate(draft.issueDate) || draft.issueDate < draft.lastPayment) { byId('prCertError').hidden=false; byId('prCertError').textContent='ตรวจลำดับในแบบ เลขที่ และวันที่ออกเอกสาร ต้องไม่ก่อนวันที่จ่ายล่าสุด'; return; } openPrintViewer({typeLabel:'50 ทวิ เงินเดือน',docNo:draft.number,type:'payroll50'},prCertHtml(draft),'50ทวิ-' + year + '-' + draft.person.name + '.pdf'); }},{label:'กลับ',onClick:function() { openPrReport('cert',year); }});
  openModal({title:'เอกสาร 50 ทวิ — ' + draft.person.name,full:true,focus:false,body:controls + '<div id="prCertPreview" class="pf-scroll">' + prCertHtml(draft) + '</div>',buttons:buttons,onMount:function() {
    ['prCertNo','prCertDate','prCertSequence'].forEach(function(id) { byId(id).addEventListener('change',function() { readDraft(); byId('prCertPreview').innerHTML=prCertHtml(draft); }); });
  }});
}
/* การลาเก็บเป็นจำนวนวันจริง แยกจากเงินหักในเงินเดือนและไม่สร้างรายการบัญชี */
var PR_LEAVE_TYPES=[['annual','ลาพักร้อน'],['sick','ลาป่วย'],['personal','ลากิจ'],['maternity','ลาคลอด'],['other','ลาอื่น ๆ']];
var PR_LEAVE_STATUS=[['approved','อนุมัติ'],['pending','รออนุมัติ'],['rejected','ไม่อนุมัติ'],['cancelled','ยกเลิก']];
function prLeaveRows(year) { return (STORE.leaves || []).filter(function(l) { return String(l.startDate || '').slice(0,4) === year; }).sort(function(a,b) { return String(b.startDate).localeCompare(String(a.startDate)) || String(a._id).localeCompare(String(b._id)); }); }
function prLeaveEntitlementId(year,empId) { return 'leaveEntitlement-' + year + '-' + empId; }
function prLeaveBalances(year) {
  var people=new Map(STORE.employees.map(function(e) { return [e._id,{key:e._id,name:e.name}]; }));
  prLeaveRows(year).forEach(function(l) { if (!people.has(l.empId)) people.set(l.empId,{key:l.empId,name:l.name || 'ไม่พบชื่อพนักงาน'}); });
  return Array.from(people.values()).sort(function(a,b) { return a.name.localeCompare(b.name,'th'); }).map(function(p) {
    var saved=STORE.settings.find(function(s) { return s._id === prLeaveEntitlementId(year,p.key); }) || {}, ent=saved.days || {};
    p.types={}; PR_LEAVE_TYPES.forEach(function(t) {
      var relevant=prLeaveRows(year).filter(function(l) { return l.empId === p.key && l.leaveType === t[0]; });
      var used=round2(relevant.filter(function(l) { return l.status === 'approved'; }).reduce(function(n,l) { return n + (Number(l.days) || 0); },0));
      var pending=round2(relevant.filter(function(l) { return l.status === 'pending'; }).reduce(function(n,l) { return n + (Number(l.days) || 0); },0));
      var allowance=ent[t[0]] == null || ent[t[0]] === '' ? null : Number(ent[t[0]]);
      p.types[t[0]]={entitlement:allowance,used:used,pending:pending,balance:allowance == null ? null : round2(allowance-used)};
    }); return p;
  });
}
function prLeaveContent(kind,year) {
  var actions=fbReadOnly() ? '' : '<div class="toolbar"><button type="button" class="btn btn-dark" onclick="openPrLeaveForm(null,\'' + year + '\')">+ บันทึกรายละเอียดการลา</button></div>';
  if (kind === 'leaveDetail') return actions + '<p>ปี ' + (Number(year)+543) + ' · จำนวนวันตามวันทำงานจริงที่ผู้บันทึกระบุ ไม่คำนวณจากยอดหักเงินเดือน</p>' + prReportTable(['พนักงาน','ประเภท','เริ่มลา','สิ้นสุด','จำนวนวัน','รับค่าจ้าง','สถานะ','หมายเหตุ',''],prLeaveRows(year).map(function(l) {
    return [esc(l.name),esc((PR_LEAVE_TYPES.find(function(t) { return t[0] === l.leaveType; }) || ['','ไม่ระบุ'])[1]),fmtDateNum(l.startDate),fmtDateNum(l.endDate),fmtNum(l.days),l.paid === 'yes' ? 'ได้รับ' : 'ไม่ได้รับ',esc((PR_LEAVE_STATUS.find(function(t) { return t[0] === l.status; }) || ['','ไม่ระบุ'])[1]),esc(l.note || ''),fbReadOnly() ? '' : '<button type="button" class="linkish" onclick="' + prHandler('openPrLeaveForm',[l._id,year]) + '">แก้ไข</button>'];
  }));
  var rows=[]; prLeaveBalances(year).forEach(function(p) { PR_LEAVE_TYPES.forEach(function(t) { var b=p.types[t[0]];
    rows.push([esc(p.name),esc(t[1]),b.entitlement == null ? 'ยังไม่กำหนดสิทธิ' : fmtNum(b.entitlement),fmtNum(b.used),fmtNum(b.pending),b.balance == null ? '—' : fmtNum(b.balance),fbReadOnly() ? '' : '<button type="button" class="linkish" onclick="' + prHandler('openPrLeaveEntitlement',[year,p.key]) + '">กำหนดสิทธิ</button>']);
  }); });
  return actions + '<p>ปี ' + (Number(year)+543) + ' · ใช้สิทธิเฉพาะสถานะอนุมัติ รายการรออนุมัติแสดงแยก ยกเลิก/ไม่อนุมัติไม่นับใช้สิทธิ</p><p class="small muted">กำหนดสิทธิตามนโยบายที่ใช้จริงของแต่ละปี รวมยอดยกมาที่อนุญาตแล้ว ระบบไม่กำหนดสิทธิตามกฎหมายหรือยกยอดอัตโนมัติ และไม่หักเงินเดือนซ้ำจากรายการลา</p>' + prReportTable(['พนักงาน','ประเภทลา','สิทธิ (วัน)','ใช้แล้ว','รออนุมัติ','คงเหลือ',''],rows);
}
function prValidIsoDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var d=new Date(s+'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s; }
function prLeaveError(rec) {
  if (!STORE.employees.some(function(e) { return e._id === rec.empId; }) && !(STORE.leaves || []).some(function(l) { return l.empId === rec.empId; })) return 'เลือกพนักงาน';
  if (!PR_LEAVE_TYPES.some(function(t) { return t[0] === rec.leaveType; }) || !PR_LEAVE_STATUS.some(function(t) { return t[0] === rec.status; })) return 'ประเภทหรือสถานะการลาไม่ถูกต้อง';
  if (!prValidIsoDate(rec.startDate) || !prValidIsoDate(rec.endDate) || rec.endDate < rec.startDate) return 'ตรวจวันที่เริ่มและสิ้นสุดการลา';
  if (rec.startDate.slice(0,4) !== rec.endDate.slice(0,4)) return 'การลาคร่อมปีให้แยกบันทึกปีละรายการ เพื่อแยกสิทธิและวันลาให้ถูกต้อง';
  var span=(Date.parse(rec.endDate+'T00:00:00Z')-Date.parse(rec.startDate+'T00:00:00Z'))/86400000+1;
  if (!Number.isFinite(rec.days) || rec.days <= 0 || rec.days > span || Math.abs(rec.days*2-Math.round(rec.days*2)) > 0.000001) return 'จำนวนวันต้องมากกว่าศูนย์ เป็นครึ่งวัน/เต็มวัน และไม่เกินช่วงวันที่ลา';
  if (!['yes','no'].includes(rec.paid)) return 'ระบุการรับค่าจ้าง';
  return '';
}
function openPrLeaveForm(id,year) {
  if (fbReadOnly()) return;
  var sourceCompany=CUR_CO;
  var old=(STORE.leaves || []).find(function(l) { return l._id === id; }), start=old ? old.startDate : (year === todayStr().slice(0,4) ? todayStr() : year+'-01-01');
  if (id && !old) { showToast('ไม่พบรายการลาในบริษัทนี้'); return; }
  var people=STORE.employees.slice(); if (old && !people.some(function(e) { return e._id === old.empId; })) people.push({_id:old.empId,name:old.name});
  if (!people.length) { showToast('เพิ่มพนักงานก่อนบันทึกการลา'); return; }
  openModal({title:old ? 'แก้ไขรายละเอียดการลา' : 'บันทึกรายละเอียดการลา',body:
    '<div class="field"><label for="prLeaveEmp">พนักงาน</label><select id="prLeaveEmp">' + pcOpts(people.map(function(e) { return [e._id,e.name]; }),old && old.empId) + '</select></div>' +
    '<div class="grid-2"><div class="field"><label for="prLeaveType">ประเภท</label><select id="prLeaveType">' + pcOpts(PR_LEAVE_TYPES,old && old.leaveType || 'annual') + '</select></div><div class="field"><label for="prLeaveStatus">สถานะ</label><select id="prLeaveStatus">' + pcOpts(PR_LEAVE_STATUS,old && old.status || 'pending') + '</select></div></div>' +
    '<div class="grid-2"><div class="field"><label for="prLeaveStart">เริ่มลา</label><input id="prLeaveStart" type="date" value="' + esc(start) + '"></div><div class="field"><label for="prLeaveEnd">สิ้นสุด</label><input id="prLeaveEnd" type="date" value="' + esc(old ? old.endDate : start) + '"></div></div>' +
    '<div class="grid-2"><div class="field"><label for="prLeaveDays">จำนวนวันทำงานที่ลา (รองรับครึ่งวัน)</label><input id="prLeaveDays" type="number" min="0.5" step="0.5" value="' + esc(String(old ? old.days : 1)) + '"></div><div class="field"><label for="prLeavePaid">รับค่าจ้าง</label><select id="prLeavePaid">' + pcOpts([['yes','ได้รับค่าจ้าง'],['no','ไม่ได้รับค่าจ้าง']],old && old.paid || 'yes') + '</select></div></div>' +
    '<div class="field"><label for="prLeaveNote">หมายเหตุ</label><input id="prLeaveNote" value="' + esc(old && old.note || '') + '"></div><p class="small muted">ระบุจำนวนวันตามตารางทำงานจริง ไม่รวมวันหยุดที่ไม่ได้ลา การบันทึกนี้ไม่หักเงินเดือนอัตโนมัติ และถ้าคร่อมปีให้แยกรายการ</p><div id="prLeaveError" class="form-error" hidden></div>',buttons:[CANCEL_BTN,{label:'บันทึก',cls:'btn-dark',onClick:async function(btn) {
      if (fbReadOnly() || !prReportCompanyOk(sourceCompany)) return;
      var emp=people.find(function(e) { return e._id === byId('prLeaveEmp').value; });
      var rec={empId:byId('prLeaveEmp').value,name:emp && emp.name || '',leaveType:byId('prLeaveType').value,status:byId('prLeaveStatus').value,startDate:byId('prLeaveStart').value,endDate:byId('prLeaveEnd').value,days:Number(byId('prLeaveDays').value),paid:byId('prLeavePaid').value,note:byId('prLeaveNote').value.trim(),createdAt:old ? old.createdAt : Date.now(),updatedAt:Date.now()};
      var error=prLeaveError(rec), host=byId('prLeaveError'); if (error) { host.hidden=false; host.textContent=error; return; }
      btn.disabled=true; try { if (old) await setRec('leaves',old._id,rec); else await addRec('leaves',rec); showToast('บันทึกการลาแล้ว'); openPrReport('leaveDetail',rec.startDate.slice(0,4)); } catch(e) { btn.disabled=false; host.hidden=false; host.textContent=writeError(e); }
    }}]});
}
function openPrLeaveEntitlement(year,key) {
  if (fbReadOnly()) return;
  var sourceCompany=CUR_CO;
  var p=prLeaveBalances(year).find(function(x) { return x.key === key; }); if (!p) return;
  openModal({title:'สิทธิการลา — ' + p.name + ' ปี ' + (Number(year)+543),body:PR_LEAVE_TYPES.map(function(t) { return '<div class="field"><label for="prLeaveEnt_' + t[0] + '">' + esc(t[1]) + ' (วัน)</label><input id="prLeaveEnt_' + t[0] + '" type="number" min="0" step="0.5" value="' + (p.types[t[0]].entitlement == null ? '' : p.types[t[0]].entitlement) + '" placeholder="ยังไม่กำหนดสิทธิ"></div>'; }).join('') + '<p class="small muted">รวมยอดยกมาที่ใช้ได้ในปีนี้แล้ว เว้นว่างหมายถึงยังไม่กำหนดสิทธิ ไม่ใช่ศูนย์วัน</p><div id="prLeaveEntError" class="form-error" hidden></div>',buttons:[CANCEL_BTN,{label:'บันทึกสิทธิ',cls:'btn-dark',onClick:async function(btn) {
    if (fbReadOnly() || !prReportCompanyOk(sourceCompany)) return;
    var days={},valid=true; PR_LEAVE_TYPES.forEach(function(t) { var v=byId('prLeaveEnt_'+t[0]).value; days[t[0]]=v === '' ? null : Number(v); if (days[t[0]] != null && (!Number.isFinite(days[t[0]]) || days[t[0]] < 0 || Math.abs(days[t[0]]*2-Math.round(days[t[0]]*2)) > 0.000001)) valid=false; });
    var host=byId('prLeaveEntError'); if (!valid) { host.hidden=false; host.textContent='สิทธิต้องเป็นจำนวนวันตั้งแต่ศูนย์ เพิ่มทีละครึ่งวัน หรือเว้นว่าง'; return; }
    btn.disabled=true; try { await saveSettings(prLeaveEntitlementId(year,key),{year:year,empId:key,days:days}); openPrReport('leave',year); } catch(e) { btn.disabled=false; host.hidden=false; host.textContent=writeError(e); }
  }}]});
}
function prExportLeave(kind,year) {
  var rows;
  if (kind === 'leaveDetail') rows=[['พนักงาน','ประเภทลา','เริ่มลา','สิ้นสุด','จำนวนวัน','รับค่าจ้าง','สถานะ','หมายเหตุ']].concat(prLeaveRows(year).map(function(l) { return [l.name,(PR_LEAVE_TYPES.find(function(t) { return t[0]===l.leaveType; }) || ['',''])[1],l.startDate,l.endDate,l.days,l.paid,(PR_LEAVE_STATUS.find(function(t) { return t[0]===l.status; }) || ['',''])[1],l.note]; }));
  else { rows=[['พนักงาน','ประเภทลา','สิทธิ (วัน)','ใช้แล้ว','รออนุมัติ','คงเหลือ']]; prLeaveBalances(year).forEach(function(p) { PR_LEAVE_TYPES.forEach(function(t) { var b=p.types[t[0]]; rows.push([p.name,t[1],b.entitlement == null ? 'ยังไม่กำหนดสิทธิ' : b.entitlement,b.used,b.pending,b.balance == null ? '' : b.balance]); }); }); }
  return prSaveCsv('รายงาน-'+kind+'-'+year+'.csv',rows);
}
/* กท.20 ก: ข้อมูลประกอบ ไม่สมมติอัตราธุรกิจ เพดาน หรือจำนวนลูกจ้างที่ไม่มีข้อมูล */
function prWorkmenSettings(year) { return STORE.settings.find(function(s) { return s._id === 'payrollWorkmen-'+year; }) || {}; }
function prWorkmenInput(year,readUi) {
  var saved=prWorkmenSettings(year), source=prYtdRows(year), root=readUi && byId('prWorkmenForm');
  var capValue=root ? byId('prWorkmenCap').value : (saved.cap == null ? '' : String(saved.cap));
  var rateValue=root ? byId('prWorkmenRate').value : (saved.rate == null ? '' : String(saved.rate));
  var cap=capValue === '' ? null : Number(capValue), rate=rateValue === '' ? null : Number(rateValue);
  var invalid=(cap != null && (!Number.isFinite(cap) || cap <= 0 || Math.abs(cap-round2(cap)) > 0.00000001)) || (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100));
  var rows=source.map(function(g,i) {
    var v=root ? byId('prWorkmenWage_'+i).value : ((saved.wages || {})[g.key] == null ? String(g.taxable) : String(saved.wages[g.key]));
    var wage=v === '' ? NaN : Number(v); if (!Number.isFinite(wage) || wage < 0 || Math.abs(wage-round2(wage)) > 0.00000001) invalid=true;
    var capped=cap == null || !Number.isFinite(wage) ? null : round2(Math.min(wage,cap));
    return {key:g.key,name:g.name,income:g.income,taxable:g.taxable,wage:wage,capped:capped,contribution:capped == null || rate == null ? null : round2(capped*rate/100)};
  });
  return {cap:cap,rate:rate,invalid:invalid,rows:rows,accountNo:root ? byId('prWorkmenAccount').value.trim() : saved.accountNo || '',activity:root ? byId('prWorkmenActivity').value.trim() : saved.activity || ''};
}
function prWorkmenContribution(data) {
  return data.invalid || data.cap == null || data.rate == null ? null : round2(prSum(data.rows,'capped')*data.rate/100);
}
function prWorkmenContent(year) {
  var saved=prWorkmenSettings(year), data=prWorkmenInput(year,false), ro=fbReadOnly();
  var months=Array.from({length:12},function(_,i) { var ym=year+'-'+String(i+1).padStart(2,'0'), entries=prReportEntries(year,ym), hasData=entries.length>0;
    var salary=round2(entries.reduce(function(n,r) { return n+prAmount(r.line,'base'); },0)), income=prSum(entries,'income');
    return [esc(monthLabel(ym,true)),hasData ? String(new Set(entries.map(function(r) { return r.key; })).size) : 'ไม่มีข้อมูลเงินเดือน',hasData ? fmtMoney(salary) : '—','—',hasData ? fmtMoney(round2(income-salary)) : '—',hasData ? fmtMoney(income) : '—'];
  });
  var monthly='<section class="pr-workmen-months" aria-label="สรุปค่าจ้างรายเดือน">'+prReportTable(['เดือน','จำนวนผู้มีรายการเงินเดือน','เงินเดือน/ค่าจ้างพื้นฐาน','ค่าจ้างรายวัน','ค่าตอบแทนอื่นๆ','รวมรายรับ'],data.rows.length ? months : []).replace('<tr><td colspan="6" class="empty-hint">ยังไม่มีข้อมูลในช่วงที่เลือก</td></tr>','')+'</section>';
  var empty= data.rows.length ? '' : '<div class="pr-workmen-empty"><svg width="72" height="84" viewBox="0 0 72 84" fill="none" aria-hidden="true"><rect x="13" y="5" width="47" height="70" rx="4" stroke="currentColor" stroke-width="2"/><path d="M45 5v16h15M21 31h31M21 41h31M21 51h31M21 61h20" stroke="currentColor" stroke-width="2"/></svg><p>ยังไม่มีข้อมูลเงินเดือนในปีที่เลือก</p><span>เลือกปีที่มีรายการเงินเดือนเพื่อแสดงรายงาน</span></div>';
  return '<div id="prWorkmenForm" class="pr-workmen"><header class="pr-workmen-header"><div><h2>เอกสาร กท. 20 ก</h2><div class="pr-workmen-company">'+esc(companyName())+'</div><p class="pr-workmen-period">ณ วันที่ '+esc(fmtDateNum(todayStr()))+'<br>ช่วงวันที่ 1 มกราคม – 31 ธันวาคม '+(Number(year)+543)+'</p></div><div class="pr-workmen-summary"><span>ฐานค่าจ้างหลังเพดาน (ประมาณ)</span><strong id="prWorkmenNet">—</strong><small>บาท · ตามข้อมูลประกอบรายปี</small></div></header>'+monthly+empty+
    '<p class="small muted">ค่าจ้างรายวันแสดง — เนื่องจากข้อมูลเงินเดือนยังไม่แยกรายวัน ค่าตอบแทนอื่นๆ คือรายรับนอกค่าจ้างพื้นฐาน รวมเงินเบิกคืนตามจริง ยอดรายรับนี้ยังไม่ใช่ฐานค่าจ้างที่ต้องแจ้ง</p>'+
    '<details class="pr-workmen-details"><summary>ตรวจสอบและปรับข้อมูลประกอบแบบ <span>เลขบัญชีนายจ้าง · เพดานค่าจ้าง · อัตราเงินสมทบ</span></summary><div class="pr-workmen-detail-body"><div class="banner info">ข้อมูลประกอบการจัดทำแบบ กท.20 ก อ้างอิงวันที่จ่ายเงินเดือน ไม่ใช่แบบนำส่งหรือไฟล์ยื่นอัตโนมัติ จำนวนคนคือผู้มีรายการเงินเดือน ต้องตรวจเทียบลูกจ้างจริง รวมผู้ที่ไม่มีรายการเงินเดือนด้วย</div>' +
    '<div class="grid-2"><div class="field"><label for="prWorkmenAccount">เลขบัญชีนายจ้างกองทุนเงินทดแทน</label><input id="prWorkmenAccount" value="' + esc(saved.accountNo || '') + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label for="prWorkmenActivity">ประเภทกิจการ/รหัสกิจการ</label><input id="prWorkmenActivity" value="' + esc(saved.activity || '') + '"' + (ro ? ' disabled' : '') + '></div></div>' +
    '<div class="grid-2"><div class="field"><label for="prWorkmenCap">เพดานค่าจ้างต่อคนต่อปีที่ใช้ยื่น (บาท)</label><input id="prWorkmenCap" type="number" min="0.01" step="0.01" value="' + (data.cap == null ? '' : data.cap) + '" placeholder="ระบุตามประกาศปีที่ยื่น" oninput="prUpdateWorkmen(\'' + year + '\')"' + (ro ? ' disabled' : '') + '></div><div class="field"><label for="prWorkmenRate">อัตราเงินสมทบของกิจการ (%)</label><input id="prWorkmenRate" type="number" min="0" max="100" step="0.001" value="' + (data.rate == null ? '' : data.rate) + '" placeholder="ระบุตามหนังสือแจ้งอัตรา" oninput="prUpdateWorkmen(\'' + year + '\')"' + (ro ? ' disabled' : '') + '></div></div>' +
    '<p class="small muted">ยอดในฐานภาษีเป็นเพียงค่าเริ่มต้นสำหรับตรวจสอบ ไม่ได้ยืนยันว่าเป็นค่าจ้างกองทุนเงินทดแทน ปรับค่าจ้างรายคนให้ตรงหลักเกณฑ์และช่วงการจ้างจริงก่อนใช้ รวมถึงกรณีต้องเฉลี่ยเพดานตามระยะเวลาจ้าง ระบบไม่เฉลี่ยให้เอง</p>' +
    prReportTable(['พนักงาน','รวมรายรับจากเงินเดือน','เงินได้ในฐานภาษี (อ้างอิง)','ค่าจ้างประกอบแบบ (ปรับได้)','ฐานหลังเพดาน (ประมาณ)','เงินสมทบประมาณ'],data.rows.map(function(r,i) {
      return [esc(r.name),fmtMoney(r.income),fmtMoney(r.taxable),'<input id="prWorkmenWage_' + i + '" class="pr-in" type="number" min="0" step="0.01" aria-label="ค่าจ้างประกอบแบบ ' + esc(r.name) + '" value="' + r.wage + '" oninput="prUpdateWorkmen(\'' + year + '\')"' + (ro ? ' disabled' : '') + '>','<span id="prWorkmenCapped_' + i + '">' + (r.capped == null ? 'ยังไม่ระบุเพดาน' : fmtMoney(r.capped)) + '</span>','<span id="prWorkmenContribution_' + i + '">' + (r.contribution == null ? 'ยังไม่ระบุข้อมูลครบ' : fmtMoney(r.contribution)) + '</span>'];
    })) + '<p id="prWorkmenTotals"></p>' + (ro ? '' : '<button type="button" class="btn btn-dark" onclick="prSaveWorkmen(\'' + year + '\',this)">บันทึกข้อมูลประกอบปีนี้</button>') + '</div></details></div>';
}
function prUpdateWorkmen(year) {
  var d=prWorkmenInput(year,true), host=byId('prWorkmenTotals');
  d.rows.forEach(function(r,i) { byId('prWorkmenCapped_'+i).textContent=d.invalid ? 'ตรวจจำนวนเงิน' : (r.capped == null ? 'ยังไม่ระบุเพดาน' : fmtMoney(r.capped)); byId('prWorkmenContribution_'+i).textContent=d.invalid ? 'ตรวจจำนวนเงิน' : (r.contribution == null ? 'ยังไม่ระบุข้อมูลครบ' : fmtMoney(r.contribution)); });
  byId('prWorkmenNet').textContent=d.invalid || d.cap == null ? '—' : fmtMoney(prSum(d.rows,'capped'));
  host.textContent=d.invalid ? 'ตรวจเพดาน อัตรา และค่าจ้าง: ต้องเป็นตัวเลขที่ถูกต้อง ไม่ติดลบ และค่าจ้างมีทศนิยมไม่เกิน 2 ตำแหน่ง' : 'ค่าจ้างประกอบแบบรวม ' + fmtMoney(prSum(d.rows,'wage')) + ' · ฐานหลังเพดาน ' + (d.cap == null ? 'ยังไม่ระบุเพดาน' : fmtMoney(prSum(d.rows,'capped'))) + ' · เงินสมทบประมาณจากฐานรวมก่อนปัดเศษ ' + (prWorkmenContribution(d) == null ? 'ยังไม่ระบุข้อมูลครบ' : fmtMoney(prWorkmenContribution(d)));
}
async function prSaveWorkmen(year,btn) {
  if (fbReadOnly() || (prReportState && !prReportCompanyOk(prReportState.company))) return;
  var d=prWorkmenInput(year,true); if (d.invalid) { showToast('ตรวจเพดาน อัตรา และค่าจ้างก่อนบันทึก'); return; }
  btn.disabled=true; try { await saveSettings('payrollWorkmen-'+year,{year:year,accountNo:d.accountNo,activity:d.activity,cap:d.cap,rate:d.rate,wages:Object.fromEntries(d.rows.map(function(r) { return [r.key,r.wage]; }))}); showToast('บันทึกข้อมูลประกอบ กท.20 ก แล้ว'); } catch(e) { showToast(writeError(e)); } finally { btn.disabled=false; }
}
function prExportWorkmen(year) {
  var d=prWorkmenInput(year,true); if (d.invalid) { showToast('ตรวจค่าจ้าง เพดาน และอัตราก่อนส่งออก'); return; }
  var rows=[['ข้อมูลประกอบ กท.20 ก — ไม่ใช่ไฟล์ยื่นอัตโนมัติ'],['ปีที่รายงาน',Number(year)+543],['เลขบัญชีนายจ้าง',d.accountNo],['ประเภท/รหัสกิจการ',d.activity],['พนักงาน','รวมรายรับเงินเดือน','ฐานภาษีอ้างอิง','ค่าจ้างประกอบแบบ','เพดานต่อปี','ฐานหลังเพดานประมาณ','อัตรา (%)','เงินสมทบประมาณ']].concat(d.rows.map(function(r) { return [r.name,r.income,r.taxable,r.wage,d.cap == null ? '' : d.cap,r.capped == null ? '' : r.capped,d.rate == null ? '' : d.rate,r.contribution == null ? '' : r.contribution]; }));
  rows.push(['รวมฐานหลังเพดาน',d.cap == null ? '' : prSum(d.rows,'capped')],['เงินสมทบประมาณจากฐานรวมก่อนปัดเศษ',prWorkmenContribution(d) == null ? '' : prWorkmenContribution(d)]);
  return prSaveCsv('ข้อมูลประกอบ-กท20ก-'+year+'.csv',rows);
}
