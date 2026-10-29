/* นโยบายหักมาสาย/ขาดงาน: ใช้รายการอนุมัติและให้ตรวจยอดก่อนลงบัญชี */
function prAttendancePolicy() { return STORE.settings.find(function(s) { return s._id === 'payrollAttendance'; }) || {}; }
function openPrAttendanceSettings() {
  if (fbReadOnly()) return;
  var co=CUR_CO, c=prAttendancePolicy();
  openModal({title:'ตั้งค่าหักมาสาย / ขาดงาน',body:
    '<div class="grid-2"><div class="field"><label for="paMinutes">มาสายทุกกี่นาที</label><input id="paMinutes" type="number" min="1" step="1" value="'+esc(String(c.minutes || ''))+'"></div><div class="field"><label for="paAmount">หักกี่บาทต่อช่วง</label><input id="paAmount" type="number" min="0" step="0.01" value="'+esc(String(c.amount == null ? '' : c.amount))+'"></div></div>'+
    '<div class="field"><label for="paRounding">เศษนาทีต่อครั้ง</label><select id="paRounding">'+pcOpts([['floor','นับเฉพาะช่วงที่ครบ'],['ceil','ปัดขึ้นเป็นหนึ่งช่วง']],c.rounding || 'floor')+'</select></div>'+
    '<div class="field"><label for="paDivisor">ขาดงานหักเต็มวัน: เงินเดือน ÷</label><input id="paDivisor" type="number" min="1" max="31" step="1" value="'+esc(String(c.divisor || 30))+'" placeholder="เช่น 30 หรือตามวันทำงานจริง"></div><p class="small muted">ขาดงานหักตามจำนวนวันที่อนุมัติ × ค่าจ้างเต็มวันจากเงินเดือนพื้นฐาน หากใช้วันทำงานจริงให้แก้ตัวหารให้ตรงเดือนก่อนนำเข้า · มาสายคิดแยกแต่ละครั้ง · การตั้งค่านี้ไม่เปลี่ยนรอบเงินเดือนที่บันทึกแล้ว</p><div id="paError" class="form-error" hidden></div>',buttons:[CANCEL_BTN,{label:'บันทึก',cls:'btn-dark',onClick:async function(btn) {
      if (fbReadOnly() || !prReportCompanyOk(co)) return;
      var v={minutes:Number(byId('paMinutes').value),amount:byId('paAmount').value === '' ? NaN : Number(byId('paAmount').value),rounding:byId('paRounding').value,divisor:Number(byId('paDivisor').value)};
      if (!Number.isInteger(v.minutes) || v.minutes<1 || !Number.isFinite(v.amount) || v.amount<0 || round2(v.amount)!==v.amount || !Number.isInteger(v.divisor) || v.divisor<1 || v.divisor>31) { byId('paError').hidden=false; byId('paError').textContent='ระบุนาทีและตัวหารเป็นจำนวนเต็ม จำนวนเงินตั้งแต่ศูนย์ ทศนิยมไม่เกินสองตำแหน่ง'; return; }
      btn.disabled=true; try { await saveSettings('payrollAttendance',v); closeModal(); showToast('บันทึกนโยบายแล้ว'); } catch(e) { btn.disabled=false; byId('paError').hidden=false; byId('paError').textContent=writeError(e); }
    }}]});
}
var _prShellAttendance=prShell;
prShell=function() { return _prShellAttendance()+(fbReadOnly() ? '' : '<div class="toolbar"><button class="btn btn-outline" type="button" onclick="openPrAttendanceSettings()">ตั้งค่าหักมาสาย / ขาดงาน</button></div>'); };
function prAttendanceDeduction(line,ym,c) {
  if (!Number.isInteger(c.minutes) || c.minutes<1 || !Number.isFinite(c.amount) || c.amount<0 || !Number.isInteger(c.divisor) || c.divisor<1 || c.divisor>31 || !['floor','ceil'].includes(c.rounding)) throw Error('กรุณาตั้งค่าหักมาสาย / ขาดงานก่อน');
  var records=(STORE.leaves || []).filter(function(l) { return l.empId===line.empId && l.status==='approved' && ['late','absence'].includes(l.leaveType) && l.startDate.slice(0,7)<=ym && l.endDate.slice(0,7)>=ym; });
  var late=0,days=0;
  records.forEach(function(l) {
    if (l.startDate.slice(0,7)!==ym || l.endDate.slice(0,7)!==ym) throw Error('รายการขาดงานคร่อมเดือน กรุณาแยกบันทึกตามเดือนก่อนนำเข้า');
    var error=prLeaveError(l); if (error) throw Error(error);
    if (l.leaveType==='late') late+=(c.rounding==='ceil' ? Math.ceil(l.minutes/c.minutes) : Math.floor(l.minutes/c.minutes))*c.amount;
    else days+=l.days;
  });
  return {late:round2(late),absence:round2(prAmount(line,'base')/c.divisor*days),days:days,ids:records.map(function(l) { return l._id; }),policy:Object.assign({},c),period:ym};
}
function prApplyAttendance() {
  if (fbReadOnly() || !prForm || !prReportCompanyOk(prForm.attendanceCompany)) return;
  try {
    var c=prAttendancePolicy(), lines=prForm.lines.map(function(l) {
      if (!l.on) return l;
      if (prAmount(l,l.detailVersion === 2 ? 'legacyWageDeduct' : 'deduct')>0) throw Error('มีหักขาด/ลาเดิมของ '+l.name+' กรุณาตรวจและล้างยอดเดิมก่อนนำเข้า เพื่อไม่ให้หักซ้ำ');
      var result=prAttendanceDeduction(l,prForm.ym,c), copy=Object.assign({},prUpgrade(l),{late:result.late,absence:result.absence,attendance:result});
      return prCalc(copy,STORE.employees.find(function(e) { return e._id===l.empId; }),prCfg(),l._manual ? l.wht : null);
    });
    prForm.lines=lines; renderPrRows(); byId('prAttendanceMessage').textContent='นำเข้าแล้ว: แทนที่ช่องสายและขาดงานด้วยยอดจากรายการอนุมัติ ตรวจยอดก่อนบันทึก กดซ้ำไม่บวกยอดซ้ำ';
  } catch(e) { byId('prAttendanceMessage').textContent=e.message; }
}
var _openPrRunAttendance=openPrRun;
openPrRun=function(ym) {
  if (fbReadOnly()) return;
  _openPrRunAttendance(ym);
  if (!byId('prRows')) return;
  prForm.attendanceCompany=CUR_CO;
  var host=document.createElement('div'); host.className='banner info';
  host.innerHTML='<button type="button" class="btn btn-outline" onclick="prApplyAttendance()">คำนวณหักมาสาย / ขาดงานจากรายการอนุมัติ</button><p id="prAttendanceMessage" class="small">ใช้เดือนรอบเงินเดือน ไม่ใช่เดือนที่จ่าย แทนที่ยอดสาย/ขาดงานที่กรอกเอง ไม่รวมลากิจหรือรายการรออนุมัติ ตรวจยอดก่อนบันทึกและลงบัญชี</p>';
  byId('prRows').closest('.items-wrap').before(host);
};
