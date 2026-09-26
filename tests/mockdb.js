(function(){ const cols={}, subs=[]; let n=0;
 function col(name){ return cols[name]=cols[name]||{}; }
 function emit(name){ subs.filter(s=>s.name===name).forEach(s=>s.cb({docs:Object.entries(col(name)).map(([id,v])=>({id,data:()=>v}))})); }
 const db={ collection(name){ const q={orderBy(){return q;},limit(){return q;},onSnapshot(cb){const s={name,cb};subs.push(s);setTimeout(()=>emit(name),0);return ()=>{subs.splice(subs.indexOf(s),1);};},async add(v){const id='d'+(++n);col(name)[id]=v;emit(name);return {id};}}; return q; },
  doc(path){ const [c,id]=path.split('/'); return { async set(v){col(c)[id]=v;emit(c);}, async delete(){delete col(c)[id];emit(c);} }; } };
 window.__cols=cols; window.claude={ use: async (n)=> n==='db'?db:null };
})();
