/* ================= Firebase: Login + shared database (ใช้เมื่อกำหนด FIREBASE_CONFIG ใน src/config.js) ================= */
var FB = null, FB_MODE = false, CUR_ROLE = null, FB_NEW_CO = null, _fbRoleUnsub = null;
var FB_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
var ROLE_LABEL = { owner:'เจ้าของ', editor:'ผู้แก้ไข', viewer:'ผู้ดู', removed:'ถูกนำออก', none:'-' };
function fbConfigured() { return typeof FIREBASE_CONFIG !== 'undefined' && !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey); }
function fbReadOnly() { return FB_MODE && CUR_ROLE === 'viewer'; }
// ชื่อบริษัท เลขผู้เสียภาษี และข้อมูลนิติบุคคลหลัก: แก้ได้เฉพาะเจ้าของ (บังคับซ้ำใน firestore.rules)
var LEGAL_FIELDS = ['name', 'legalName', 'taxId', 'branch', 'branches', 'businessType', 'legalAddress', 'vatRegistered', 'fiscalStart'];
function canEditLegal() { return !FB_MODE || CUR_ROLE === 'owner'; }
function fbEmail() { return FB && FB.user ? String(FB.user.email || '').toLowerCase() : ''; }

/* ---- Firestore stores nested arrays, undefined and '' keys poorly: encode on write, decode on read ---- */
function fbEncode(v) {
  if (Array.isArray(v)) return v.map(function(x) { x = fbEncode(x); return Array.isArray(x) ? { __arr: x } : x === undefined ? null : x; });
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function(k) { var x = fbEncode(v[k]); if (x !== undefined && typeof x !== 'function') o[k === '' ? '_$empty' : k] = x; }); return o; }
  return v;
}
function fbDecode(v) {
  if (Array.isArray(v)) return v.map(function(x) { return x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.__arr) && Object.keys(x).length === 1 ? fbDecode(x.__arr) : fbDecode(x); });
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function(k) { o[k === '_$empty' ? '' : k] = fbDecode(v[k]); }); return o; }
  return v;
}

/* ---- Adapter with the same shape as the Claude database used by the rest of the app.
   'documents__<co>' → companies/<co>/documents ; 'companies' → only companies this user belongs to ---- */
function fbDb(fs, uid) {
  function colRef(name) {
    if (name === 'companies') return fs.collection('companies');
    var i = name.indexOf('__'), coll = i < 0 ? name : name.slice(0, i), co = i < 0 ? CUR_CO : name.slice(i + 2);
    return fs.collection('companies').doc(co).collection(coll);
  }
  return {
    collection: function(name) {
      var ref = colRef(name), sortF = null, sortDir = 1, lim = 0;
      var api = {
        // sorted in the browser: a Firestore orderBy would silently drop records missing the field
        orderBy: function(f, d) { sortF = f; sortDir = d === 'desc' ? -1 : 1; return api; },
        limit: function(n) { if (name === 'companies') lim = n; return api; },
        onSnapshot: function(cb, err) {
          var q = name === 'companies' ? ref.where('memberIds', 'array-contains', uid) : ref;
          if (lim) q = q.limit(lim);
          return q.onSnapshot(function(qs) {
            var docs = qs.docs.map(function(d) { var data = fbDecode(d.data()); return { id: d.id, data: function() { return data; } }; });
            if (sortF) docs.sort(function(a, b) { var x = a.data()[sortF], y = b.data()[sortF]; return (x > y ? 1 : x < y ? -1 : 0) * sortDir; });
            cb({ docs: docs });
          }, err);
        },
        add: function(v) { return ref.add(fbEncode(v)); }
      };
      return api;
    },
    doc: function(path) {
      var i = path.lastIndexOf('/'), name = path.slice(0, i), ref = colRef(name).doc(path.slice(i + 1));
      return {
        // company registry: merge so ownerId/memberIds are never overwritten
        set: function(v) { return name === 'companies' ? ref.set(fbEncode(v), { merge: true }) : ref.set(fbEncode(v)); },
        delete: function() { return ref.delete(); }
      };
    }
  };
}

/* ---- Start-up: load SDK → sign in → accept invites → pick company ---- */
async function fbStart() {
  authShow('loading', 'กำลังเชื่อมต่อ…');
  try {
    await loadScriptOnce(FB_SDK + 'firebase-app-compat.js', function() { return !!window.firebase; });
    await loadScriptOnce(FB_SDK + 'firebase-auth-compat.js', function() { return !!(window.firebase && firebase.auth); });
    await loadScriptOnce(FB_SDK + 'firebase-firestore-compat.js', function() { return !!(window.firebase && firebase.firestore); });
  } catch (e) {
    authShow('error', 'โหลดระบบเข้าสู่ระบบไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า');
    return new Promise(function() {});
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  var auth = firebase.auth(), fs = firebase.firestore();
  if (typeof FIREBASE_EMULATOR_HOST !== 'undefined' && FIREBASE_EMULATOR_HOST) { auth.useEmulator('http://' + FIREBASE_EMULATOR_HOST + ':9099', { disableWarnings: true }); fs.useEmulator(FIREBASE_EMULATOR_HOST, 8080); }
  FB = { auth: auth, fs: fs, user: null };
  var user = await new Promise(function(res) {
    auth.onAuthStateChanged(function(u) {
      if (u && !FB.user) { FB.user = u; res(u); }
      else if (!u && FB.user) location.reload(); // signed out (here or in another tab)
      else if (!u) authShow('login');
    });
  });
  authShow('loading', 'กำลังโหลดบริษัท…');
  var joined = await fbAcceptInvites();
  var cos = await fbMyCompanies();
  while (!cos.length) { await authNoCompany(); cos = await fbMyCompanies(); }
  if (!cos.some(function(c) { return c._id === CUR_CO; })) CUR_CO = cos[0]._id;
  try { localStorage.setItem('psm_company', CUR_CO); } catch (e) {}
  COMPANIES = cos; FB_MODE = true;
  authHide(); fbAvatar(); fbWatchRole();
  if (joined.length) setTimeout(function() { showToast('เข้าร่วมบริษัท ' + joined.join(', ') + ' แล้ว'); }, 600);
  return fbDb(fs, user.uid);
}
// called by initDb once data subscriptions are running
function fbAfterStart() {
  if (!FB_NEW_CO) return;
  var info = FB_NEW_CO; FB_NEW_CO = null;
  saveSettings('company', { name: info.name, legalName: info.name, taxId: info.taxId, branch: 'สำนักงานใหญ่' }).catch(function() {});
  setTimeout(function() { loadStandardCoa(); }, 800);
}
async function fbMyCompanies() {
  var qs = await FB.fs.collection('companies').where('memberIds', 'array-contains', FB.user.uid).get();
  return qs.docs.map(function(d) { var o = Object.assign({}, d.data()); o._id = d.id; return o; }).sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
}
// every change to companies/{co}/members goes with an audit entry in the same batch (enforced by firestore.rules)
function fbAudit(b, co, action, target, fromRole, toRole, grantedBy) {
  var ref = FB.fs.collection('companies/' + co + '/audit').doc(), a = { action: action, actorUid: FB.user.uid, actorEmail: fbEmail(), targetUid: target.uid, targetEmail: target.email || '', fromRole: fromRole, toRole: toRole, at: firebase.firestore.FieldValue.serverTimestamp() };
  if (grantedBy) a.grantedBy = grantedBy;
  b.set(ref, a);
  return ref.id;
}
async function fbCreateCompany(id, name, taxId) {
  var fs = FB.fs, u = FB.user, b = fs.batch(), me = { uid: u.uid, email: fbEmail() };
  b.set(fs.doc('companies/' + id), { name: name, taxId: taxId || '', createdAt: Date.now(), ownerId: u.uid, memberIds: [u.uid] });
  var aid = fbAudit(b, id, 'create', me, 'none', 'owner');
  b.set(fs.doc('companies/' + id + '/members/' + u.uid), { role: 'owner', email: me.email, addedAt: Date.now(), auditId: aid });
  await b.commit();
}
// invites need a verified email, otherwise anyone could sign up with an invited address
async function fbAcceptInvites() {
  var u = FB.user, names = [];
  if (!u.emailVerified) return names;
  var qs;
  try { qs = await FB.fs.collection('invites').where('email', '==', fbEmail()).get(); } catch (e) { return names; }
  for (var i = 0; i < qs.docs.length; i++) {
    var d = qs.docs[i], inv = d.data(), fs = FB.fs, b = fs.batch(), mref = fs.doc('companies/' + inv.coId + '/members/' + u.uid);
    try {
      var cur = await mref.get(), before = cur.exists ? cur.data().role : 'none';
      if (before !== 'none' && before !== 'removed') throw new Error('already a member');
      var aid = fbAudit(b, inv.coId, 'join', { uid: u.uid, email: fbEmail() }, before, inv.role, inv.invitedByUid);
      b.set(mref, { role: inv.role, email: fbEmail(), addedAt: Date.now(), auditId: aid });
      b.update(fs.doc('companies/' + inv.coId), { memberIds: firebase.firestore.FieldValue.arrayUnion(u.uid) });
      b.delete(d.ref);
      await b.commit(); names.push(inv.coName || inv.coId);
    } catch (e) { try { await d.ref.delete(); } catch (e2) {} } // already a member or invite revoked
  }
  return names;
}
function fbPrimaryOwner() { var c = COMPANIES.find(function(x) { return x._id === CUR_CO; }); return c ? c.ownerId : null; }
function fbWatchRole() {
  if (_fbRoleUnsub) { try { _fbRoleUnsub(); } catch (e) {} }
  CUR_ROLE = null; fbRoleBadge();
  var co = CUR_CO;
  var removed = function() { if (co !== CUR_CO) return; showToast('คุณถูกนำออกจากบริษัทนี้แล้ว'); setTimeout(function() { location.reload(); }, 1500); };
  _fbRoleUnsub = FB.fs.doc('companies/' + co + '/members/' + FB.user.uid).onSnapshot(function(s) {
    if (co !== CUR_CO) return;
    if (!s.exists || s.data().role === 'removed') return removed();
    var changed = CUR_ROLE !== s.data().role;
    CUR_ROLE = s.data().role; fbRoleBadge();
    if (changed && byId('sectionView') && !byId('sectionView').hidden) refreshPageData(); // edit controls depend on the role
  }, function(e) { if (e && e.code === 'permission-denied') removed(); });
}
function fbRoleBadge() {
  var el = byId('roleBadge');
  if (!el) { var mb = byId('modeBadge'); if (!mb) return; el = document.createElement('span'); el.id = 'roleBadge'; el.className = 'mode-badge'; mb.parentNode.insertBefore(el, mb); }
  el.hidden = !fbReadOnly(); el.textContent = 'สิทธิ์ดูอย่างเดียว';
}
function fbAvatar() {
  var av = document.querySelector('.topbar .avatar'); if (!av) return;
  av.textContent = (fbEmail()[0] || 'U').toUpperCase(); av.title = fbEmail();
  av.setAttribute('role', 'button'); av.tabIndex = 0; av.style.cursor = 'pointer';
  av.onclick = fbOpenAccount; av.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fbOpenAccount(); } };
}
function fbSignOut() { FB.auth.signOut().then(function() { location.reload(); }); }
function fbRoleText(uid, role) { return uid && uid === fbPrimaryOwner() ? 'เจ้าของหลัก' : (ROLE_LABEL[role] || role || '-'); }
function fbOpenAccount() {
  var u = FB.user;
  var body = '<div style="line-height:1.9"><div><span class="muted">อีเมล</span> <b>' + esc(fbEmail()) + '</b> ' + (u.emailVerified ? '<span class="status st-paid">ยืนยันแล้ว</span>' : '<span class="status st-overdue">ยังไม่ยืนยัน</span>') + '</div>' +
    '<div><span class="muted">บริษัทปัจจุบัน</span> ' + esc(companyName()) + '</div><div><span class="muted">สิทธิ์ของคุณ</span> ' + esc(fbRoleText(u.uid, CUR_ROLE)) + '</div></div>' +
    (u.emailVerified ? '' : '<div class="banner info" style="margin:10px 0 0">ยืนยันอีเมลเพื่อรับคำเชิญเข้าบริษัทอื่น <button type="button" class="linkish" id="accResend">ส่งอีเมลยืนยันอีกครั้ง</button></div>');
  openModal({ title:'บัญชีผู้ใช้', focus:false, body: body, buttons:[
    { label:'ออกจากระบบ', cls:'btn-outline', left:true, onClick: fbSignOut },
    { label:'จัดการผู้ใช้', onClick: function() { fbOpenMembers(); } },
    { label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
  var rs = byId('accResend'); if (rs) rs.onclick = function() { u.sendEmailVerification().then(function() { showToast('ส่งอีเมลยืนยันแล้ว'); }, function(e) { showToast(fbAuthError(e)); }); };
}

/* ---- Users & roles of the current company ---- */
var AUDIT_LABEL = { create:'สร้างบริษัท', join:'เข้าร่วมตามคำเชิญ', role:'เปลี่ยนสิทธิ์', remove:'นำออก', transfer:'โอนสิทธิ์เจ้าของหลัก' };
function fbOpenMembers() {
  openModal({ title:'จัดการผู้ใช้', focus:false, body:'<div id="mbBody" class="muted">กำลังโหลด…</div>', buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
  fbRenderMembers();
}
async function fbRenderMembers() {
  var co = CUR_CO, owner = CUR_ROLE === 'owner', fs = FB.fs, me = FB.user.uid, ms, inv = [], log = [], primary;
  try {
    primary = (await fs.doc('companies/' + co).get()).data().ownerId;
    ms = (await fs.collection('companies/' + co + '/members').get()).docs.map(function(d) { return Object.assign({ uid: d.id }, d.data()); }).filter(function(m) { return m.role !== 'removed'; });
    if (owner) {
      inv = (await fs.collection('invites').where('coId', '==', co).get()).docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      log = (await fs.collection('companies/' + co + '/audit').orderBy('at', 'desc').limit(50).get()).docs.map(function(d) { return d.data(); });
    }
  } catch (e) { var h0 = byId('mbBody'); if (h0) h0.textContent = 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ'; return; }
  var host = byId('mbBody'); if (!host || co !== CUR_CO) return;
  host.className = '';
  var iAmPrimary = primary === me;
  var roleSel = function(attr, cur, opts) { return '<select ' + attr + '>' + opts.map(function(r) { return '<option value="' + r + '"' + (r === cur ? ' selected' : '') + '>' + ROLE_LABEL[r] + '</option>'; }).join('') + '</select>'; };
  var roleName = function(uid, r) { return uid === primary ? 'เจ้าของหลัก' : (ROLE_LABEL[r] || r); };
  var fmtAt = function(t) { return t && t.toDate ? t.toDate().toLocaleString('th-TH') : '-'; };
  ms.sort(function(a, b) { return (a.uid === primary ? -1 : b.uid === primary ? 1 : 0) || (a.addedAt || 0) - (b.addedAt || 0); });
  host.innerHTML = '<ul class="small muted" style="margin:0 0 12px;padding-left:20px;line-height:1.8"><li><b>เจ้าของหลัก</b> ผู้สร้างบริษัท ไม่มีใครลดสิทธิ์หรือนำออกได้ เปลี่ยนได้ด้วยการโอนสิทธิ์เท่านั้น</li><li><b>เจ้าของ</b> ทำได้ทุกอย่าง รวมถึงเชิญและกำหนดสิทธิ์ผู้ใช้</li><li><b>ผู้แก้ไข</b> สร้างและแก้ไขเอกสาร ผังบัญชี และข้อมูลทั้งหมด</li><li><b>ผู้ดู</b> ดูข้อมูลและรายงานได้อย่างเดียว</li></ul>' +
    '<div class="items-wrap"><table class="data-table"><thead><tr><th>อีเมล</th><th>สิทธิ์</th><th></th></tr></thead><tbody>' +
    ms.map(function(m) {
      var self = m.uid === me, locked = self || m.uid === primary || !owner;
      return '<tr><td>' + esc(m.email || m.uid) + (self ? ' <span class="muted small">(คุณ)</span>' : '') + '</td><td>' + (locked ? esc(roleName(m.uid, m.role)) : roleSel('data-mbrole="' + esc(m.uid) + '"', m.role, ['owner', 'editor', 'viewer'])) + '</td><td style="white-space:nowrap">' +
        (locked ? '' : '<button type="button" class="linkish" data-mbdel="' + esc(m.uid) + '">นำออก</button>') +
        (iAmPrimary && !self ? (locked ? '' : ' · ') + '<button type="button" class="linkish" data-mbxfer="' + esc(m.uid) + '">โอนสิทธิ์เจ้าของหลัก</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    (owner ?
      '<h3 style="margin:18px 0 8px;font-size:15px">เชิญผู้ใช้</h3><div class="grid-2"><div class="field"><label for="mbEmail">อีเมล</label><input id="mbEmail" type="email" autocomplete="off" placeholder="name@example.com"></div><div class="field"><label for="mbRole">สิทธิ์</label>' + roleSel('id="mbRole"', 'editor', ['editor', 'viewer']) + '</div></div>' +
      '<div class="toolbar"><button type="button" class="btn btn-dark" id="mbInvite">เชิญ</button></div><div class="form-error" id="formError" hidden></div>' +
      '<p class="small muted" style="margin:6px 0 0">ระบบไม่ได้ส่งอีเมลเชิญให้ แจ้งผู้ใช้ให้สมัครสมาชิกด้วยอีเมลนี้และกดยืนยันอีเมล แล้วบริษัทนี้จะปรากฏให้อัตโนมัติเมื่อเข้าสู่ระบบ</p>' +
      (inv.length ? '<h3 style="margin:18px 0 8px;font-size:15px">คำเชิญที่รอตอบรับ</h3><div class="items-wrap"><table class="data-table"><tbody>' + inv.map(function(x) { return '<tr><td>' + esc(x.email) + '</td><td>' + esc(ROLE_LABEL[x.role] || x.role) + '</td><td><button type="button" class="linkish" data-mbrevoke="' + esc(x.id) + '">ยกเลิกคำเชิญ</button></td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      '<h3 style="margin:18px 0 8px;font-size:15px">ประวัติการเปลี่ยนสิทธิ์</h3>' + (log.length ? '<div class="items-wrap"><table class="data-table" id="mbAudit"><thead><tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>รายการ</th><th>ผู้ใช้</th><th>สิทธิ์</th></tr></thead><tbody>' +
        log.map(function(a) { return '<tr><td class="small">' + esc(fmtAt(a.at)) + '</td><td>' + esc(a.actorEmail) + '</td><td>' + esc(AUDIT_LABEL[a.action] || a.action) + '</td><td>' + esc(a.targetEmail) + '</td><td class="small">' + esc((ROLE_LABEL[a.fromRole] || a.fromRole) + ' → ' + (ROLE_LABEL[a.toRole] || a.toRole)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="small muted" style="margin:0">ยังไม่มีรายการ</p>')
      : '<p class="small muted" style="margin:10px 0 0">เฉพาะเจ้าของบริษัทเท่านั้นที่เชิญหรือเปลี่ยนสิทธิ์ผู้ใช้ได้</p>');
  var fail = function(e) { showToast(writeError(e)); fbRenderMembers(); };
  var find = function(uid) { return ms.find(function(x) { return x.uid === uid; }); };
  var mref = function(uid) { return fs.doc('companies/' + co + '/members/' + uid); };
  host.querySelectorAll('[data-mbrole]').forEach(function(s) { s.onchange = function() {
    var m = find(s.dataset.mbrole), b = fs.batch(), aid = fbAudit(b, co, 'role', m, m.role, s.value);
    b.update(mref(m.uid), { role: s.value, auditId: aid });
    b.commit().then(function() { showToast('เปลี่ยนสิทธิ์แล้ว'); fbRenderMembers(); }, fail);
  }; });
  host.querySelectorAll('[data-mbdel]').forEach(function(btn) { btn.onclick = function() {
    var m = find(btn.dataset.mbdel);
    if (!confirm('นำ ' + (m.email || m.uid) + ' ออกจากบริษัทนี้?')) return;
    var b = fs.batch(), aid = fbAudit(b, co, 'remove', m, m.role, 'removed');
    b.update(mref(m.uid), { role: 'removed', auditId: aid });
    b.update(fs.doc('companies/' + co), { memberIds: firebase.firestore.FieldValue.arrayRemove(m.uid) });
    b.commit().then(function() { showToast('นำผู้ใช้ออกแล้ว'); fbRenderMembers(); }, fail);
  }; });
  host.querySelectorAll('[data-mbxfer]').forEach(function(btn) { btn.onclick = function() {
    var m = find(btn.dataset.mbxfer);
    var typed = prompt('โอนสิทธิ์เจ้าของหลักของ "' + companyName() + '" ให้ ' + m.email + '\n\nหลังโอน คุณจะเป็น "เจ้าของ" และเจ้าของหลักคนใหม่สามารถลดสิทธิ์หรือนำคุณออกได้\nการโอนจะถูกบันทึกในประวัติการเปลี่ยนสิทธิ์\n\nพิมพ์อีเมลของผู้รับเพื่อยืนยัน:');
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== String(m.email || '').toLowerCase()) { showToast('อีเมลไม่ตรงกัน ยกเลิกการโอนสิทธิ์'); return; }
    var b = fs.batch(), aid = fbAudit(b, co, 'transfer', m, m.role, 'owner');
    b.update(mref(m.uid), { role: 'owner', auditId: aid });
    b.update(fs.doc('companies/' + co), { ownerId: m.uid });
    b.commit().then(function() { showToast('โอนสิทธิ์เจ้าของหลักให้ ' + m.email + ' แล้ว'); fbRenderMembers(); }, fail);
  }; });
  host.querySelectorAll('[data-mbrevoke]').forEach(function(b) { b.onclick = function() { fs.doc('invites/' + b.dataset.mbrevoke).delete().then(function() { showToast('ยกเลิกคำเชิญแล้ว'); fbRenderMembers(); }, fail); }; });
  var ib = byId('mbInvite');
  if (ib) ib.onclick = async function() {
    var err = byId('formError'), email = byId('mbEmail').value.trim().toLowerCase(), role = byId('mbRole').value;
    err.hidden = true;
    if (!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(email)) { err.textContent = 'อีเมลไม่ถูกต้อง'; err.hidden = false; return; }
    if (ms.some(function(m) { return (m.email || '').toLowerCase() === email; })) { err.textContent = 'ผู้ใช้นี้อยู่ในบริษัทแล้ว'; err.hidden = false; return; }
    if (inv.some(function(x) { return x.email === email; })) { err.textContent = 'มีคำเชิญค้างอยู่แล้วสำหรับอีเมลนี้ ยกเลิกคำเชิญเดิมก่อนถ้าต้องการเปลี่ยนสิทธิ์'; err.hidden = false; return; }
    ib.disabled = true;
    try { await fs.doc('invites/' + co + '__' + email).set({ coId: co, coName: companyName(), email: email, role: role, invitedBy: fbEmail(), invitedByUid: me, createdAt: Date.now() }); showToast('บันทึกคำเชิญ ' + email + ' แล้ว'); fbRenderMembers(); }
    catch (e) { ib.disabled = false; err.textContent = writeError(e); err.hidden = false; }
  };
}

/* ---- Sign-in screen ---- */
function fbAuthError(e) {
  var c = e && e.code;
  return ({
    'auth/invalid-email': 'อีเมลไม่ถูกต้อง',
    'auth/user-not-found': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'auth/wrong-password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'auth/invalid-login-credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use': 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน',
    'auth/weak-password': 'รหัสผ่านสั้นเกินไป',
    'auth/too-many-requests': 'ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
    'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้',
    'auth/operation-not-allowed': 'ยังไม่ได้เปิดการเข้าสู่ระบบด้วยอีเมลใน Firebase Console'
  })[c] || ('เกิดข้อผิดพลาด' + (c ? ' (' + c + ')' : ''));
}
function authEl() {
  var el = byId('authScreen');
  if (!el) { el = document.createElement('div'); el.id = 'authScreen'; el.className = 'auth-screen'; el.innerHTML = '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle"></div>'; document.body.appendChild(el); }
  el.hidden = false;
  return el.querySelector('.auth-card');
}
function authHide() { var el = byId('authScreen'); if (el) el.hidden = true; }
function authShow(mode, msg) {
  var card = authEl(), head = '<div class="auth-brand">PSMacc</div>';
  if (mode === 'loading' || mode === 'error') { card.innerHTML = head + '<p class="auth-msg' + (mode === 'error' ? ' neg-text' : '') + '" id="authTitle">' + esc(msg) + '</p>'; return; }
  var signup = mode === 'signup', reset = mode === 'reset';
  card.innerHTML = head + '<h1 id="authTitle">' + (signup ? 'สมัครสมาชิก' : reset ? 'ตั้งรหัสผ่านใหม่' : 'เข้าสู่ระบบ') + '</h1>' +
    '<form id="authForm" novalidate><div class="field"><label for="auEmail">อีเมล</label><input id="auEmail" type="email" autocomplete="email" required></div>' +
    (reset ? '<p class="small muted" style="margin:0">ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลนี้</p>' :
      '<div class="field"><label for="auPw">รหัสผ่าน</label><input id="auPw" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" required></div>') +
    (signup ? '<div class="field"><label for="auPw2">ยืนยันรหัสผ่าน</label><input id="auPw2" type="password" autocomplete="new-password" required></div><p class="small muted" style="margin:0">รหัสผ่านอย่างน้อย 8 ตัวอักษร</p>' : '') +
    '<div class="form-error" id="authErr" hidden></div><div class="banner ok" id="authOk" hidden></div>' +
    '<button type="submit" class="btn btn-dark auth-submit" id="authSubmit">' + (signup ? 'สมัครสมาชิก' : reset ? 'ส่งลิงก์ตั้งรหัสผ่าน' : 'เข้าสู่ระบบ') + '</button></form>' +
    '<div class="auth-links">' + (signup || reset ? '<button type="button" class="linkish" data-auth="login">กลับไปหน้าเข้าสู่ระบบ</button>' :
      '<button type="button" class="linkish" data-auth="reset">ลืมรหัสผ่าน?</button><span>ยังไม่มีบัญชี? <button type="button" class="linkish" data-auth="signup">สมัครสมาชิก</button></span>') + '</div>';
  card.querySelectorAll('[data-auth]').forEach(function(b) { b.onclick = function() { var em = byId('auEmail').value; authShow(b.dataset.auth); byId('auEmail').value = em; }; });
  byId('auEmail').focus();
  byId('authForm').onsubmit = async function(ev) {
    ev.preventDefault();
    var err = byId('authErr'), ok = byId('authOk'), btn = byId('authSubmit'), email = byId('auEmail').value.trim(), pw = byId('auPw') ? byId('auPw').value : '';
    var bad = function(m) { err.textContent = m; err.hidden = false; btn.disabled = false; };
    err.hidden = true; ok.hidden = true;
    if (!email) return bad('กรุณากรอกอีเมล');
    if (!reset && !pw) return bad('กรุณากรอกรหัสผ่าน');
    if (signup && pw.length < 8) return bad('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (signup && pw !== byId('auPw2').value) return bad('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    btn.disabled = true;
    try {
      if (reset) { await FB.auth.sendPasswordResetEmail(email); ok.textContent = 'ส่งลิงก์แล้ว ตรวจสอบกล่องอีเมลของคุณ'; ok.hidden = false; btn.disabled = false; }
      else if (signup) { var cr = await FB.auth.createUserWithEmailAndPassword(email, pw); cr.user.sendEmailVerification().catch(function() {}); }
      else await FB.auth.signInWithEmailAndPassword(email, pw);
    } catch (e) { bad(fbAuthError(e)); }
  };
}
// signed in but not a member of any company yet: create one, or wait for an invite
function authNoCompany() {
  return new Promise(function(res) {
    var card = authEl(), u = FB.user;
    card.innerHTML = '<div class="auth-brand">PSMacc</div><h1 id="authTitle">สร้างบริษัทแรกของคุณ</h1><p class="small muted" style="margin:0">เข้าสู่ระบบเป็น <b>' + esc(fbEmail()) + '</b></p>' +
      '<form id="ncForm" novalidate><div class="field"><label for="auCo">ชื่อบริษัท</label><input id="auCo" placeholder="เช่น บริษัท ตัวอย่าง จำกัด" required></div>' +
      '<div class="field"><label for="auTax">เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)</label><input id="auTax" maxlength="13" inputmode="numeric"></div>' +
      '<div class="form-error" id="authErr" hidden></div><button type="submit" class="btn btn-dark auth-submit" id="authSubmit">สร้างบริษัท</button></form>' +
      '<div class="banner info auth-invite">ถ้าได้รับเชิญเข้าบริษัทที่มีอยู่แล้ว ' + (u.emailVerified ? 'ให้เจ้าของบริษัทเชิญอีเมลนี้ แล้วกด <button type="button" class="linkish" id="auRecheck">ตรวจสอบคำเชิญ</button>' :
        'ต้องยืนยันอีเมลก่อน (ตรวจสอบกล่องอีเมล) แล้วกด <button type="button" class="linkish" id="auRecheck">ฉันยืนยันอีเมลแล้ว</button> · <button type="button" class="linkish" id="auResend">ส่งอีเมลยืนยันอีกครั้ง</button>') + '</div>' +
      '<div class="auth-links"><button type="button" class="linkish" id="auOut">ออกจากระบบ</button></div>';
    byId('auCo').focus();
    byId('auOut').onclick = fbSignOut;
    var rs = byId('auResend'); if (rs) rs.onclick = function() { u.sendEmailVerification().then(function() { showToast('ส่งอีเมลยืนยันแล้ว'); }, function(e) { showToast(fbAuthError(e)); }); };
    byId('auRecheck').onclick = async function() {
      authShow('loading', 'กำลังตรวจสอบ…');
      try { await u.reload(); FB.user = FB.auth.currentUser; await FB.user.getIdToken(true); } catch (e) {}
      var joined = await fbAcceptInvites();
      if (joined.length) setTimeout(function() { showToast('เข้าร่วมบริษัท ' + joined.join(', ') + ' แล้ว'); }, 600);
      else setTimeout(function() { showToast(FB.user.emailVerified ? 'ยังไม่พบคำเชิญสำหรับอีเมลนี้' : 'อีเมลยังไม่ได้รับการยืนยัน'); }, 300);
      res();
    };
    byId('ncForm').onsubmit = async function(ev) {
      ev.preventDefault();
      var name = byId('auCo').value.trim(), taxId = byId('auTax').value.trim(), err = byId('authErr'), btn = byId('authSubmit');
      if (!name) { err.textContent = 'กรุณาระบุชื่อบริษัท'; err.hidden = false; return; }
      btn.disabled = true; err.hidden = true;
      var id = 'c' + Date.now().toString(36);
      try { await fbCreateCompany(id, name, taxId); CUR_CO = id; FB_NEW_CO = { name: name, taxId: taxId }; res(); }
      catch (e) { btn.disabled = false; err.textContent = 'สร้างบริษัทไม่สำเร็จ: ' + (e.message || e); err.hidden = false; }
    };
  });
}
