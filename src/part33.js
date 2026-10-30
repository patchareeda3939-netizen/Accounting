/* คำขอลาจากหน้าพนักงาน ใช้ข้อมูลการลาเดิมและแยกสิทธิ์อนุมัติ */
function empLeaveActor() { return FB_MODE && FB && FB.user ? FB.user.uid : 'local'; }
function empLeaveActorName() { return FB_MODE && FB && FB.user ? FB.user.email || FB.user.uid : 'ผู้ใช้ในเครื่อง'; }
function empCanApproveLeave(l) { return !FB_MODE || (CUR_ROLE === 'owner' && l.requestedBy !== empLeaveActor()); }
function empLeavePanel() {
  var rows=(STORE.leaves || []).filter(function(l) { return l.workflow === 'request'; }).sort(function(a,b) { return (b.requestedAt || 0)-(a.requestedAt || 0); });
  return '<section class="page-block"><h2>คำขอลาและการอนุมัติ</h2><p class="small muted">ผู้ดูแลยื่นคำขอให้พนักงานจากปุ่มขอลาในแต่ละแถว เจ้าของบริษัทอีกบัญชีเป็นผู้อนุมัติ คำขอรออนุมัติยังไม่นับใช้สิทธิลา'+(!FB_MODE ? ' · โหมดข้อมูลในเครื่องไม่สามารถแยกตัวตนผู้ยื่นกับผู้อนุมัติได้' : '')+'</p>'+prReportTable(['พนักงาน','ประเภทลา','เริ่ม','สิ้นสุด','วัน','สถานะ','ผู้ยื่น','ผลพิจารณา',''],rows.map(function(l) {
    var actions='';
    if (l.status === 'pending' && !fbReadOnly()) {
      if (empCanApproveLeave(l)) actions+='<button class="btn btn-outline btn-sm" onclick="'+prHandler('empReviewLeave',[l._id])+'">พิจารณาคำขอ</button> ';
      if (l.requestedBy === empLeaveActor()) actions+='<button class="btn btn-outline btn-sm" onclick="'+prHandler('empCancelLeave',[l._id])+'">ถอนคำขอ</button>';
    }
    return [esc(l.name),esc((PR_LEAVE_TYPES.find(function(t) { return t[0]===l.leaveType; }) || ['',''])[1]),fmtDateNum(l.startDate),fmtDateNum(l.endDate),fmtNum(l.days),esc((PR_LEAVE_STATUS.find(function(t) { return t[0]===l.status; }) || ['',''])[1]),esc(l.requestedByName || ''),esc(l.reviewedByName || '')+'<div class="small muted">'+esc(l.reviewNote || '')+'</div>',actions];
  }))+'</section>';
}
var _empDataLeave=empData;
empData=function() {
  var holder=document.createElement('div');holder.innerHTML=_empDataLeave();
  if (!fbReadOnly()) holder.querySelectorAll('tr[data-emp]').forEach(function(tr) {
    var id=tr.dataset.emp, cell=tr.lastElementChild, button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-sm';button.textContent='ขอลา';button.setAttribute('onclick','event.stopPropagation();empRequestLeave('+JSON.stringify(id)+')');
    cell.appendChild(document.createTextNode(' '));cell.appendChild(button);
  });
  return holder.innerHTML+empLeavePanel();
};
function empRequestLeave(id) {
  if (fbReadOnly()) return;
  var co=CUR_CO, e=STORE.employees.find(function(x) { return x._id===id; });if (!e) return;
  openModal({title:'ขอลา — '+e.name,body:
    '<div class="field"><label for="elType">ประเภทการลา</label><select id="elType">'+pcOpts(PR_LEAVE_TYPES,'annual')+'</select></div><div class="grid-2"><div class="field"><label for="elStart">วันที่เริ่ม</label><input id="elStart" type="date" value="'+todayStr()+'"></div><div class="field"><label for="elEnd">วันที่สิ้นสุด</label><input id="elEnd" type="date" value="'+todayStr()+'"></div></div><div class="field"><label for="elDays">จำนวนวันทำงานที่ลา</label><input id="elDays" type="number" min="0.5" step="0.5" value="1"></div><div class="field"><label for="elNote">เหตุผลการลา</label><textarea id="elNote" maxlength="2000"></textarea></div><p class="small muted">คำขอจะส่งเป็นรออนุมัติ เจ้าของบริษัทอีกบัญชีตรวจสิทธิและการรับค่าจ้างก่อนอนุมัติ หากคร่อมปีให้แยกคำขอ</p><div id="elError" class="form-error" hidden></div>',buttons:[CANCEL_BTN,{label:'ส่งคำขออนุมัติ',cls:'btn-dark',onClick:async function(btn) {
      if (fbReadOnly() || !prReportCompanyOk(co)) return;
      var rec={workflow:'request',empId:id,name:e.name,leaveType:byId('elType').value,startDate:byId('elStart').value,endDate:byId('elEnd').value,days:Number(byId('elDays').value),paid:'yes',status:'pending',note:byId('elNote').value.trim(),requestedBy:empLeaveActor(),requestedByName:empLeaveActorName(),requestedAt:Date.now(),createdAt:Date.now()};
      var error=prLeaveError(rec) || (!rec.note ? 'ระบุเหตุผลการลา' : '');if (error) { byId('elError').hidden=false;byId('elError').textContent=error;return; }
      btn.disabled=true;try { await addRec('leaves',rec);closeModal();go('team','employees');showToast('ส่งคำขอแล้ว รอเจ้าของบริษัทอนุมัติ'); }catch(err) {btn.disabled=false;byId('elError').hidden=false;byId('elError').textContent=writeError(err);}
    }}]});
}
async function empWriteLeaveDecision(id,co,decision,note,paid) {
  if (fbReadOnly() || !prReportCompanyOk(co)) throw Error('ไม่มีสิทธิ์หรือเปลี่ยนบริษัทแล้ว');
  var old=(STORE.leaves || []).find(function(l) { return l._id===id; });
  if (!old || old.workflow!=='request' || old.status!=='pending') throw Error('คำขอนี้ถูกพิจารณาหรือถอนแล้ว กรุณาเปิดใหม่');
  var cancel=decision==='cancelled';
  if (cancel ? old.requestedBy!==empLeaveActor() : (!['approved','rejected'].includes(decision) || !empCanApproveLeave(old))) throw Error('ให้เจ้าของบริษัทอีกบัญชีอนุมัติคำขอนี้');
  var patch=cancel ? {status:decision,cancelledAt:Date.now()} : {status:decision,paid:paid,reviewNote:note,reviewedBy:empLeaveActor(),reviewedByName:empLeaveActorName(),reviewedAt:Date.now()};
  if (FB_MODE) {
    var ref=FB.fs.doc('companies/'+co+'/leaves/'+id);
    await FB.fs.runTransaction(async function(tx) { var snap=await tx.get(ref);if (!snap.exists || snap.data().status!=='pending') throw Error('คำขอนี้ถูกพิจารณาแล้ว');tx.update(ref,patch); });
  } else await setRec('leaves',id,Object.assign({},old,patch));
}
function empReviewLeave(id) {
  var co=CUR_CO,l=(STORE.leaves || []).find(function(x) {return x._id===id;});if (!l || l.status!=='pending' || fbReadOnly() || !empCanApproveLeave(l)) return;
  openModal({title:'พิจารณาคำขอลา — '+l.name,body:'<p>'+esc(l.note || '')+'</p><p>'+fmtDateNum(l.startDate)+' – '+fmtDateNum(l.endDate)+' · '+fmtNum(l.days)+' วัน</p><div class="field"><label for="elDecision">ผลพิจารณา</label><select id="elDecision">'+pcOpts([['approved','อนุมัติ'],['rejected','ไม่อนุมัติ']],'approved')+'</select></div><div class="field"><label for="elPaid">การรับค่าจ้าง</label><select id="elPaid">'+pcOpts([['yes','ได้รับค่าจ้าง'],['no','ไม่ได้รับค่าจ้าง']],'yes')+'</select></div><div class="field"><label for="elReviewNote">หมายเหตุผู้อนุมัติ</label><textarea id="elReviewNote" maxlength="2000"></textarea></div><div id="elError" class="form-error" hidden></div>',buttons:[CANCEL_BTN,{label:'บันทึกผลพิจารณา',cls:'btn-dark',onClick:async function(btn) {
    btn.disabled=true;try { await empWriteLeaveDecision(id,co,byId('elDecision').value,byId('elReviewNote').value.trim(),byId('elPaid').value);closeModal();go('team','employees');showToast('บันทึกผลพิจารณาแล้ว'); }catch(e) {btn.disabled=false;byId('elError').hidden=false;byId('elError').textContent=e.message;}
  }}]});
}
async function empCancelLeave(id) {try {await empWriteLeaveDecision(id,CUR_CO,'cancelled','','yes');refreshPageData();showToast('ถอนคำขอแล้ว');}catch(e){showToast(e.message);} }
var _openPrLeaveRequestGuard=openPrLeaveForm;
openPrLeaveForm=function(id,year) { var l=(STORE.leaves || []).find(function(x){return x._id===id;});if(l && l.workflow==='request'){empReviewLeave(id);return;}return _openPrLeaveRequestGuard(id,year); };
