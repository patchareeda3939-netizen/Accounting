/* ================= Branch filter on reports + group (multi-company) reports ================= */
/* ---- 1) กรองรายงานตามสาขา: pageState.repBranch = '' (ทุกสาขา) | '00000' (สำนักงานใหญ่) | รหัสสาขา ---- */
function docBranchCode(d) { var b = d && d.extra && d.extra.branch; return b && b !== '00000' ? String(b) : '00000'; }
function repBranchFilterHTML() {
  if (GROUP_REPORTS[pageState.repId] || !allBranches().length) return '';
  var cur = pageState.repBranch || '', list = allBranches();
  if (!list.some(function(b) { return b.code === '00000'; })) list = [{ code:'00000', name:'สำนักงานใหญ่' }].concat(list);
  return '<label class="date-chip">สาขา: <select id="repBranch" aria-label="สาขา"><option value="">ทุกสาขา (รวม)</option>' +
    list.map(function(b) { return '<option value="' + esc(b.code) + '"' + (cur === b.code ? ' selected' : '') + '>' + esc(branchLabel(b)) + (b.active === false ? ' (ปิดใช้งาน)' : '') + '</option>'; }).join('') + '</select></label>';
}
var _rvShell = reportViewShell, _rvData = reportViewData, _rvBind = bindReportView;
reportViewShell = function() {
  var h = _rvShell(), f = repBranchFilterHTML();
  return f ? h.replace('<div class="coa-filters" id="repFilters">', '<div class="coa-filters" id="repFilters">' + f) : h;
};
reportViewData = function() {
  var br = pageState.repBranch || '';
  if (!br || GROUP_REPORTS[pageState.repId]) return _rvData();
  var all = STORE.documents;
  STORE.documents = all.filter(function(d) { return docBranchCode(d) === br; });
  try {
    var h = _rvData(), b = branchOf(br);
    return h.replace('<div class="rep-co">' + esc(companyName()) + '</div>', '<div class="rep-co">' + esc(companyName()) + ' · ' + esc(b ? branchLabel(b) : 'สาขา ' + br) + '</div>');
  } finally { STORE.documents = all; }
};
bindReportView = function() {
  _rvBind();
  var s = byId('repBranch');
  if (s && !s._b) { s._b = 1; s.addEventListener('change', function() { pageState.repBranch = s.value; refreshPageData(); }); }
};

/* ---- 2) โหลดข้อมูลของบริษัทอื่นในกลุ่ม (อ่านอย่างเดียว) ---- */
var CO_CACHE = {};   // co id -> { store, at }
function collFor(co, coll) { return co === 'main' ? coll : coll + '__' + co; }
function onceSnap(name, f, d) {
  return new Promise(function(res, rej) {
    var u = null, done = false;
    try {
      u = db.collection(name).orderBy(f, d).limit(1000).onSnapshot(function(snap) {
        if (done) return; done = true;
        var out = snap.docs.map(function(x) { var o = Object.assign({}, x.data()); o._id = x.id; return o; });
        setTimeout(function() { try { u && u(); } catch (e) {} }, 0);
        res(out);
      }, function(e) { if (!done) { done = true; rej(e); } });
    } catch (e) { rej(e); }
  });
}
async function loadCoStore(co) {
  if (co === CUR_CO) return STORE;
  if (!db) {
    if (LOCAL_CO[co]) return LOCAL_CO[co];
    var s = { documents:[], accounts:[], contacts:[], settings:[], branches:[] };
    try { var raw = JSON.parse(localStorage.getItem('psmacc_data_' + co) || 'null'); if (raw) Object.keys(s).forEach(function(k) { if (Array.isArray(raw[k])) s[k] = raw[k]; }); } catch (e) {}
    return s;
  }
  var st = {};
  await Promise.all([['documents','createdAt','desc'],['accounts','code','asc'],['contacts','name','asc'],['settings','updatedAt','asc']].map(async function(c) { st[c[0]] = await onceSnap(collFor(co, c[0]), c[1], c[2]); }));
  st.branches = [];
  return st;
}
var _grpLoading = false, _grpErr = '';
function groupStores() {
  var cos = coList(), miss = cos.filter(function(c) { return c._id !== CUR_CO && !CO_CACHE[c._id]; });
  if (miss.length && !_grpLoading) {
    _grpLoading = true; _grpErr = '';
    Promise.all(miss.map(function(c) { return loadCoStore(c._id).then(function(s) { CO_CACHE[c._id] = { store: s, at: Date.now() }; }, function(e) { _grpErr = (c.name || c._id) + ': ' + (e.message || e); CO_CACHE[c._id] = { store: { documents:[], accounts:[], contacts:[], settings:[] }, at: Date.now(), err: true }; }); }))
      .then(function() { _grpLoading = false; if (GROUP_REPORTS[pageState.repId]) refreshPageData(); });
  }
  if (miss.length) return null;
  return cos.map(function(c) { return { id: c._id, name: c._id === CUR_CO ? companyName() : c.name, taxId: c._id === CUR_CO ? (companySettings().taxId || c.taxId || '') : (c.taxId || ''), store: c._id === CUR_CO ? STORE : CO_CACHE[c._id].store, err: c._id !== CUR_CO && CO_CACHE[c._id].err }; });
}
function refreshGroupData() { CO_CACHE = {}; refreshPageData(); }
// run fn with STORE temporarily pointed at another company's data (so acctName / postingsOf use that company's chart)
function withStore(s, fn) {
  var keep = STORE; STORE = Object.assign({}, keep, s);
  try { return fn(); } finally { STORE = keep; }
}

/* ---- 3) รายการระหว่างกัน: ผู้ติดต่อที่เลขผู้เสียภาษี (หรือชื่อ) ตรงกับบริษัทอื่นในกลุ่ม ---- */
function normName(s) { return String(s || '').replace(/บริษัท|จำกัด|\(มหาชน\)|สำนักงานใหญ่|co\.?,?|ltd\.?|\s|\./gi, '').toLowerCase(); }
function intercoMap(g, self) {
  // party name -> group company id, for documents of company `self`
  var m = {};
  (self.store.contacts || []).forEach(function(c) {
    var tax = String(c.taxId || '').replace(/\D/g, ''), n = normName(c.name);
    var hit = g.find(function(o) { return o.id !== self.id && ((tax && tax === String(o.taxId || '').replace(/\D/g, '')) || (n && n === normName(o.name))); });
    if (hit) m[c.name] = hit.id;
  });
  (self.store.documents || []).forEach(function(d) {
    if (!d.party || m[d.party] !== undefined) return;
    var n = normName(d.party), hit = g.find(function(o) { return o.id !== self.id && n && n === normName(o.name); });
    m[d.party] = hit ? hit.id : null;
  });
  return m;
}
// tax accounts stay in the group statements (they are owed to/by the Revenue Department, not to each other)
function isTaxAcc(code) { return [SYS.vatOut, SYS.vatIn, SYS.vatOutPend, SYS.vatInPend, SYS.whtPay, SYS.whtRec].indexOf(code) >= 0; }

/* per company: balances / P&L split into total and intercompany part */
function coFigures(c, g, range, end) {
  return withStore(c.store, function() {
    var im = intercoMap(g, c), acc = {}, ic = {}, names = {}, base = {}, pairs = {};
    (c.store.documents || []).forEach(function(d) {
      var other = d.party ? im[d.party] : null;
      postingsOf(d).forEach(function(l) {
        var b = accBaseOf(l.code), pl = b === 'income' || b === 'expense';
        if (pl ? (isYearClose(d) || !inRange(l.date || '', range)) : (l.date || '') > end) return;
        names[l.code] = names[l.code] || acctName(l.code); base[l.code] = b;
        var v = l.dr - l.cr;
        acc[l.code] = (acc[l.code] || 0) + v;
        if (other && !isTaxAcc(l.code)) {
          ic[l.code] = (ic[l.code] || 0) + v;
          var p = pairs[other] = pairs[other] || { rev:0, exp:0, bal:0 };
          if (b === 'income') p.rev += -v; else if (b === 'expense') p.exp += v; else p.bal += v;   // bal > 0 = ลูกหนี้, < 0 = เจ้าหนี้
        }
      });
    });
    return { acc: acc, ic: ic, names: names, base: base, pairs: pairs };
  });
}
function groupRange() { var r = repRange(); return r; }
function groupEnd() { var r = repRange(); return r[1] === '9999-12-31' ? todayStr() : r[1]; }
function groupPending() { return { cols: [['']], rows: [], emptyMsg: _grpLoading ? 'กำลังโหลดข้อมูลทุกบริษัทในกลุ่ม…' : 'ไม่มีข้อมูล', note: 'รวมข้อมูลจากทุกบริษัทที่คุณมีสิทธิ์เข้าถึง' }; }
function groupNote(g, extra) {
  var errs = g.filter(function(c) { return c.err; }).map(function(c) { return c.name; });
  return (g.length < 2 ? 'มีบริษัทเดียว — เพิ่มบริษัทจากเมนูชื่อบริษัทมุมขวาบนเพื่อดูงบรวม · ' : '') +
    'ตัดรายการระหว่างกัน: ผู้ติดต่อที่เลขผู้เสียภาษีหรือชื่อตรงกับบริษัทในกลุ่ม (ไม่ตัดบัญชีภาษี VAT/หัก ณ ที่จ่าย)' + (extra ? ' · ' + extra : '') +
    (errs.length ? ' · โหลดไม่สำเร็จ: ' + errs.join(', ') : '');
}
function groupCols(g, firstLabel) { return [[firstLabel || 'บัญชี']].concat(g.map(function(c) { return [c.name, 1]; })).concat([['ตัดรายการระหว่างกัน', 1], ['งบรวม', 1]]); }

function groupTB() {
  var g = groupStores(); if (!g) return groupPending();
  var end = groupEnd(), figs = g.map(function(c) { return coFigures(c, g, ['0000-01-01', end], end); });
  var codes = {}, nm = {};
  figs.forEach(function(f) { Object.keys(f.acc).forEach(function(k) { codes[k] = 1; nm[k] = nm[k] || f.names[k]; }); });
  var tot = g.map(function() { return 0; }), tIc = 0, tAll = 0;
  var rows = Object.keys(codes).sort().map(function(k) {
    var vals = figs.map(function(f) { return round2(f.acc[k] || 0); }), elim = -round2(figs.reduce(function(s, f) { return s + (f.ic[k] || 0); }, 0)), sum = round2(vals.reduce(function(a, b) { return a + b; }, 0) + elim);
    vals.forEach(function(v, i) { tot[i] += v; }); tIc += elim; tAll += sum;
    return ['<span class="num">' + esc(k) + '</span> ' + esc(nm[k] || '')].concat(vals.map(M)).concat([M(elim), M(sum)]);
  });
  if (rows.length) rows.push(T(['รวม (เดบิต − เครดิต ต้องเป็น 0)'].concat(tot.map(M)).concat([M(tIc), M(tAll)])));
  return { cols: groupCols(g), rows: rows, asOf: true, note: groupNote(g, 'ยอดบวก = เดบิต, ยอดลบ = เครดิต') };
}
function groupPL() {
  var g = groupStores(); if (!g) return groupPending();
  var range = groupRange(), figs = g.map(function(c) { return coFigures(c, g, range, '0000-00-00'); });
  var rows = [], sums = {};
  [['income', 'รายได้', -1], ['expense', 'ค่าใช้จ่าย', 1]].forEach(function(sec) {
    rows.push(G(sec[1]));
    var codes = {}, nm = {};
    figs.forEach(function(f) { Object.keys(f.acc).forEach(function(k) { if (f.base[k] === sec[0]) { codes[k] = 1; nm[k] = nm[k] || f.names[k]; } }); });
    var t = g.map(function() { return 0; }).concat([0, 0]);
    Object.keys(codes).sort().forEach(function(k) {
      var vals = figs.map(function(f) { return round2((f.acc[k] || 0) * sec[2]); }), elim = -round2(figs.reduce(function(s, f) { return s + (f.ic[k] || 0) * sec[2]; }, 0));
      var all = vals.concat([elim, round2(vals.reduce(function(a, b) { return a + b; }, 0) + elim)]);
      all.forEach(function(v, i) { t[i] += v; });
      rows.push(['&nbsp;&nbsp;<span class="num muted">' + esc(k) + '</span> ' + esc(nm[k] || '')].concat(all.map(M)));
    });
    sums[sec[0]] = t;
    rows.push(T(['รวม' + sec[1]].concat(t.map(M))));
  });
  rows.push(T(['กำไร (ขาดทุน) สุทธิ'].concat(sums.income.map(function(v, i) { return M(v - sums.expense[i]); }))));
  return { cols: groupCols(g, ''), rows: rows, note: groupNote(g) };
}
function groupBS() {
  var g = groupStores(); if (!g) return groupPending();
  var end = groupEnd(), figs = g.map(function(c) { return coFigures(c, g, ['0000-01-01', end], end); });
  var labels = { asset:'สินทรัพย์', liability:'หนี้สิน', equity:'ส่วนของเจ้าของ' }, sign = { asset:1, liability:-1, equity:-1 }, rows = [], tot = {};
  var n = g.length + 2, earn = figs.map(function(f) { return round2(-Object.keys(f.acc).reduce(function(s, k) { return s + (f.base[k] === 'income' || f.base[k] === 'expense' ? f.acc[k] : 0); }, 0)); });
  var earnIc = -round2(-figs.reduce(function(s, f) { return s + Object.keys(f.ic).reduce(function(a, k) { return a + (f.base[k] === 'income' || f.base[k] === 'expense' ? f.ic[k] : 0); }, 0); }, 0));
  ['asset', 'liability', 'equity'].forEach(function(s) {
    rows.push(G(labels[s]));
    var codes = {}, nm = {}, t = []; for (var i = 0; i < n; i++) t.push(0);
    figs.forEach(function(f) { Object.keys(f.acc).forEach(function(k) { if (f.base[k] === s) { codes[k] = 1; nm[k] = nm[k] || f.names[k]; } }); });
    Object.keys(codes).sort().forEach(function(k) {
      var vals = figs.map(function(f) { return round2((f.acc[k] || 0) * sign[s]); }), elim = -round2(figs.reduce(function(a, f) { return a + (f.ic[k] || 0) * sign[s]; }, 0));
      var all = vals.concat([elim, round2(vals.reduce(function(a, b) { return a + b; }, 0) + elim)]);
      all.forEach(function(v, i) { t[i] += v; });
      rows.push(['&nbsp;&nbsp;<span class="num muted">' + esc(k) + '</span> ' + esc(nm[k] || '')].concat(all.map(M)));
    });
    if (s === 'equity') {
      var e = earn.concat([earnIc, round2(earn.reduce(function(a, b) { return a + b; }, 0) + earnIc)]);
      e.forEach(function(v, i) { t[i] += v; });
      rows.push(['&nbsp;&nbsp;กำไร (ขาดทุน) สะสมที่ยังไม่ปิดบัญชี'].concat(e.map(M)));
    }
    tot[s] = t;
    rows.push(T(['รวม' + labels[s]].concat(t.map(M))));
  });
  rows.push(T(['รวมหนี้สินและส่วนของเจ้าของ'].concat(tot.liability.map(function(v, i) { return M(v + tot.equity[i]); }))));
  return { cols: groupCols(g, ''), rows: rows, asOf: true, note: groupNote(g, 'ยอดในคอลัมน์ตัดรายการระหว่างกันของสินทรัพย์/หนี้สินอาจไม่เท่ากันถ้าบันทึกฝั่งเดียว — ดูรายงานกระทบยอดระหว่างกัน') };
}
function groupIcRecon() {
  var g = groupStores(); if (!g) return groupPending();
  var range = groupRange(), end = groupEnd();
  var figs = g.map(function(c) { var a = coFigures(c, g, range, end); return a; });
  var nameOf = {}; g.forEach(function(c) { nameOf[c.id] = c.name; });
  var rows = [], seen = {};
  g.forEach(function(a, i) {
    Object.keys(figs[i].pairs).forEach(function(bid) {
      var key = [a.id, bid].sort().join('|'); if (seen[key]) return; seen[key] = 1;
      var j = g.findIndex(function(x) { return x.id === bid; });
      var pa = figs[i].pairs[bid], pb = (j >= 0 && figs[j].pairs[a.id]) || { rev:0, exp:0, bal:0 };
      var d1 = round2(pa.rev - pb.exp), d2 = round2(pb.rev - pa.exp), d3 = round2(pa.bal + pb.bal);
      var ok = function(x) { return Math.abs(x) < 0.01 ? '<span class="status st-paid">ตรงกัน</span>' : '<span class="status st-overdue">ต่าง ' + M(x) + '</span>'; };
      rows.push(G(a.name + ' ↔ ' + nameOf[bid]));
      rows.push(['&nbsp;&nbsp;รายได้ ' + esc(a.name) + ' จาก ' + esc(nameOf[bid]) + ' เทียบกับค่าใช้จ่ายของอีกฝั่ง', M(pa.rev), M(pb.exp), ok(d1)]);
      rows.push(['&nbsp;&nbsp;รายได้ ' + esc(nameOf[bid]) + ' จาก ' + esc(a.name) + ' เทียบกับค่าใช้จ่ายของอีกฝั่ง', M(pb.rev), M(pa.exp), ok(d2)]);
      rows.push(['&nbsp;&nbsp;ยอดค้างระหว่างกัน ณ ' + fmtDateNum(end) + ' (ลูกหนี้ + / เจ้าหนี้ −)', M(pa.bal), M(pb.bal), ok(d3)]);
    });
  });
  return { cols: [['รายการ'], ['ฝั่งที่ 1', 1], ['ฝั่งที่ 2', 1], ['ผล']], rows: rows, emptyMsg: g.length < 2 ? 'ต้องมีอย่างน้อย 2 บริษัท' : 'ไม่พบรายการระหว่างกัน — ตั้งเลขผู้เสียภาษีของผู้ติดต่อให้ตรงกับบริษัทในกลุ่ม', note: groupNote(g, 'ยอดรายได้/ค่าใช้จ่ายตามช่วงรายงาน ยอดค้างตามวันสิ้นงวด') };
}

var GROUP_REPORTS = { grpTB: groupTB, grpPL: groupPL, grpBS: groupBS, grpIC: groupIcRecon };
(function() {
  var items = [['grpPL','งบกำไรขาดทุนรวม (ทุกบริษัท)'],['grpBS','งบดุลรวม (ทุกบริษัท)'],['grpTB','งบทดลองรวม (ทุกบริษัท)'],['grpIC','กระทบยอดรายการระหว่างกัน']];
  REPORT_GROUPS.splice(1, 0, ['หลายบริษัท (งบรวม)', items]);
  items.forEach(function(r) { REPORT_NAME[r[0]] = r[1]; RG[r[0]] = GROUP_REPORTS[r[0]]; });
})();
// group report title shows the group, plus a reload button
var _rvData2 = reportViewData;
reportViewData = function() {
  if (!GROUP_REPORTS[pageState.repId]) return _rvData2();
  var h = _rvData2();
  return h.replace('<div class="rep-co">' + esc(companyName()) + '</div>', '<div class="rep-co">กลุ่มบริษัท (' + coList().length + ' บริษัท) <button type="button" class="chip-link" onclick="refreshGroupData()">โหลดข้อมูลใหม่</button></div>');
};
