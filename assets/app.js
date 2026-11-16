(function(){
"use strict";
const P = window.PRACTICE, T = window.THEORY, L = window.SUMMARIES;
const app = document.getElementById('app');
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inr = (n, d=0) => { if (n==null || isNaN(n)) return '–'; const neg=n<0; n=Math.abs(n);
  let [i,f] = n.toFixed(d).split('.'); let last3=i.slice(-3), rest=i.slice(0,-3);
  if (rest) last3=','+last3; rest=rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg?'−':'')+rest+last3+(f?'.'+f:''); };
const store = {
  get(k, d){ try{ const v=localStorage.getItem('epx:'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k, v){ try{ localStorage.setItem('epx:'+k, JSON.stringify(v)); }catch(e){} }
};
let mastered = store.get('mastered', {});
function masteredBox(id){ return `<label class="mastered"><input type="checkbox" data-master="${id}" ${mastered[id]?'checked':''}> Mastered</label>`; }
document.addEventListener('change', e => {
  const id = e.target.dataset && e.target.dataset.master;
  if (id){ mastered[id] = e.target.checked; store.set('mastered', mastered); updateProgress(); }
});
function allTrackIds(){
  const ids=[];
  P.project.questions.forEach(q=>ids.push(q.id)); P.bep.questions.forEach(q=>ids.push(q.id)); P.funding.questions.forEach(q=>ids.push(q.id));
  T.forEach((g,gi)=>g.items.forEach((_,ii)=>ids.push(`t-${gi}-${ii}`)));
  L.forEach(l=>ids.push('lec-'+l.id));
  return ids;
}
function updateProgress(){
  const ids=allTrackIds(), done=ids.filter(i=>mastered[i]).length;
  $$('[data-progress]').forEach(el=>{ el.querySelector('div').style.width=(100*done/ids.length)+'%'; });
  $$('[data-progress-text]').forEach(el=>el.textContent=`${done} / ${ids.length} items mastered`);
}

/* ---------------- theme & menu ---------------- */
const themeSaved = store.get('theme', null);
if (themeSaved) document.documentElement.dataset.theme = themeSaved;
$('#themeBtn').onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  const nx = cur==='dark'?'light':'dark'; document.documentElement.dataset.theme = nx; store.set('theme', nx); redrawCharts();
};
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#lectureNav').innerHTML = L.map(l=>`<a href="#/lec/${l.id}">${l.id.replace('L','L ')} · ${esc(l.title)}</a>`).join('');

/* ---------------- full question text from the papers ---------------- */
const REFS = {
  'pr-s25':['S25:Q6'], 'pr-a24':['A24:Q7'], 'pr-s24':['S24:Q7'],
  'b-s23':['S23:Q9'], 'b-a23':['A23:Q9'], 'b-a24':['A24:Q1'], 'b-s25':['S25:Q4'], 'b-s24a':['S24:Q2ii'], 'b-s24b':['S24:Q3'], 'b-a23b':['A23:Q2'],
  'f-s25':['S25:Q5'], 'f-a24':['A24:Q6'], 'f-a23':['A23:Q6','A23:Q7'], 'f-s23':['S23:Q5','S23:Q6','S23:Q8'], 'f-s24':['S24:Q1'], 'f-s24b':['S24:Q2i','S24:Q5f'],
  't-0-0':['S25:Q3b'], 't-0-1':['S23:Q4vii'], 't-0-2':['S24:Q5f'],
  't-1-0':['A23:Q4','S23:Q2'], 't-1-1':['S24:Q4'], 't-1-2':['S25:Q2'], 't-1-3':['S23:Q7'], 't-1-4':['S23:Q1i'],
  't-2-0':['A24:Q4'], 't-2-1':['A24:Q5'], 't-2-2':['S23:Q1iii'],
  't-3-0':['A24:Q2i'], 't-3-1':['S23:Q1ii'], 't-3-2':['S23:Q3'], 't-3-3':['S23:Q4viii'], 't-3-4':['S25:Q1'], 't-3-5':['S24:Q5b'], 't-3-6':['S24:Q5d'], 't-3-7':['S24:Q5e'],
  't-4-0':['S25:Q3a'], 't-4-1':['S24:Q5a'],
  't-5-0':['A23:Q3'], 't-5-1':['A23:Q8','A24:Q3','S24:Q5c'], 't-5-2':['A24:Q2ii'],
  'fs-0':['A23:Q1'], 'pr-a23':['A23:Q5']
};
const SOL_HREF = {};   // paper block key -> where its solution lives
(function(){
  const page = id => id.startsWith('pr-')?'project':id.startsWith('b-')?'bep':id.startsWith('f-')?'funding':id.startsWith('t-')?'theory':'fs';
  Object.entries(REFS).forEach(([id,keys])=>keys.forEach(k=>{ (SOL_HREF[k]=SOL_HREF[k]||[]).push(`#/${page(id)}?a=${id}`); }));
})();
function fullQ(keys){
  if(!window.PAPER_BLOCK || !keys) return '';
  const storyShown = {};
  return keys.map(k=>{ const r=PAPER_BLOCK(k); if(!r) return '';
    const st = r.block.story && r.paper.story && !storyShown[r.paper.id] ? (storyShown[r.paper.id]=1, `<details class="storybox"><summary>📖 Read the case story this question is based on — ${esc(r.paper.storyTitle||'story')}</summary><div class="body story">${r.paper.story}</div></details>`) : '';
    return `<div class="fullq"><div class="fullq-h">📄 Exact question · ${esc(r.paper.title)} (${r.paper.id}) · ${esc(r.block.label)}</div>${st}${r.block.html}</div>`; }).join('');
}

/* ---------------- generic question block ---------------- */
function questionBlock(q, opts={}){
  if (REFS[q.id]) { q = Object.assign({}, q, {text: fullQ(REFS[q.id]), intro:null}); opts = Object.assign({}, opts, {extra:''}); }
  const steps = opts.stepsHtml || (q.steps||[]).map((s,i)=>`<div class="step" data-i="${i}">${s}</div>`).join('');
  const checks = (q.checks||[]).map((c,i)=>`<div class="check"><span>${esc(c[0])}</span><input type="number" step="any" data-ans="${c[1]}" aria-label="${esc(c[0])}"><button class="small" data-chk>Check</button><span class="res"></span></div>`).join('');
  return `<div class="q" id="${q.id}">
    <div class="qhead"><div><span class="tag y">${esc(q.marks||'')}</span> <span class="src">${esc(q.src)}</span></div>${masteredBox(q.id)}</div>
    <div class="qtext">${q.text||q.intro||''}</div>
    ${opts.extra||''}
    ${checks?`<details><summary>✏️ Attempt first — check your numbers</summary><div class="body">${checks}<p class="muted">Tolerance ±1% (rounding differences are fine).</p></div></details>`:''}
    ${steps?`<div class="steps">${steps}</div><div class="row"><button class="primary small" data-next>Show next step</button><button class="small" data-all>Show full solution</button><button class="small" data-hide>Hide</button></div>`:''}
    ${opts.after||''}
  </div>`;
}
document.addEventListener('click', e => {
  const t = e.target;
  const q = t.closest && t.closest('.q');
  if (t.matches('[data-next]') && q){ const nx=$$('.step',q).find(s=>!s.classList.contains('show')); if(nx) nx.classList.add('show'); if(!$$('.step',q).some(s=>!s.classList.contains('show'))) t.textContent='All steps shown'; }
  if (t.matches('[data-all]') && q){ $$('.step',q).forEach(s=>s.classList.add('show')); }
  if (t.matches('[data-hide]') && q){ $$('.step',q).forEach(s=>s.classList.remove('show')); const b=$('[data-next]',q); if(b) b.textContent='Show next step'; }
  if (t.matches('[data-chk]')){ const row=t.parentElement, inp=$('input',row), res=$('.res',row);
    const ans=parseFloat(inp.dataset.ans), v=parseFloat(inp.value);
    if (isNaN(v)){ res.innerHTML='<span class="muted">enter a number</span>'; return; }
    const ok = Math.abs(v-ans) <= Math.max(Math.abs(ans)*0.01, 0.5);
    res.innerHTML = ok?'<span class="ok">✓ correct</span>':`<span class="no">✗ expected ≈ ${inr(ans, ans%1?2:0)}</span>`; }
  if (t.matches('.mcq .opt')){ const box=t.closest('.mcq'); if(box.classList.contains('done')) return;
    box.classList.add('done'); const a=+box.dataset.a; $$('.opt',box).forEach((b,i)=>{ if(i===a) b.classList.add('right'); else if(b===t) b.classList.add('wrong'); });
    const sc=t.closest('[data-quiz]'); if(sc){ const right=$$('.mcq.done',sc).filter(m=>$$('.opt',m)[+m.dataset.a].classList.contains('right') && !$$('.opt.wrong',m).length).length; const tot=$$('.mcq',sc).length, done=$$('.mcq.done',sc).length; const s=$('.qscore',sc); if(s) s.textContent=`Score: ${right}/${done} answered (of ${tot})`; } }
  if (t.closest('.flash')) t.closest('.flash').classList.toggle('flip');
  if (t.matches('.sidebar a')) $('#sidebar').classList.remove('open');
});

/* ---------------- PROJECT REPORT engine ---------------- */
function prCalc(d){
  const s=d.units*d.price, pct=k=>s*(+d[k]||0)/100;
  const rm=pct('rm'), pf=pct('power'), mt=pct('maint'), pk=pct('pack'), dl=pct('labour'), fo=pct('factory');
  const bld=(+d.factory_shed||0)+(+d.office||0);
  const dep=bld*0.05+((+d.machinery||0)+(+d.truck||0)+(+d.utilities||0))*0.10;
  const am = d.amort!=null && d.amort!=='' ? +d.amort : (+d.startup||0)*0.10;
  const cop=rm+pf+mt+pk+dl+fo+dep+am;
  const cogs=(+d.open_fg||0)+cop-(+d.close_fg||0), gp=s-cogs;
  const sm=pct('selling'), ad=pct('admin'), oo=pct('other'), opex=sm+ad+oo, cos=cogs+opex;
  const op=gp-opex, pbt=op-(+d.interest||0), tax=Math.max(pbt,0)*0.2, np=pbt-tax;
  const div=(+d.div_pct||0)/100*(+d.equity||0), re=np-div;
  const fc={land:+d.land||0,buildings:bld,machinery:+d.machinery||0,truck:+d.truck||0,utilities:+d.utilities||0,startup:+d.startup||0};
  const FC=Object.values(fc).reduce((a,b)=>a+b,0);
  const h=d.hold;
  const wc={rm:rm/300*h.rm, wip:cop/300*h.wip, fg:cop/300*h.fg, rec:cos/300*h.rec, cash:+d.cash||0};
  const pay=rm/300*h.pay, WCg=Object.values(wc).reduce((a,b)=>a+b,0), WC=WCg-pay;
  const cont = d.cont_abs!=null && d.cont_abs!=='' ? +d.cont_abs : (FC+WC)*(+d.cont_pct||0)/100;
  const TPC=FC+WC+cont;
  const src={equity:+d.equity||0, retained:re, bank:+d.bank||0, angel:+d.angel||0, suppliers:+d.suppliers||0};
  const SRC=Object.values(src).reduce((a,b)=>a+b,0);
  return {s,rm,pf,mt,pk,dl,fo,dep,am,cop,cogs,gp,sm,ad,oo,opex,cos,op,pbt,tax,np,div,re,fc,FC,wc,pay,WCg,WC,cont,TPC,src,SRC,gap:SRC-TPC,d};
}
function prTables(r){
  const d=r.d, row=(a,b,c='')=>`<tr class="${c}"><td>${a}</td><td class="n">${inr(b)}</td></tr>`;
  const pl = `<h4>Projected profit &amp; loss account (next year)</h4><div class="tablewrap"><table>
    ${row(`Sales (${inr(d.units)} units × ₹${inr(d.price)})`, r.s,'sub')}
    ${row(`Raw materials (${d.rm}%)`, r.rm)}${row(`Power &amp; fuel (${d.power||0}%)`, r.pf)}${r.mt?row(`Maintenance (${d.maint}%)`, r.mt):''}
    ${row(`Packaging (${d.pack||0}%)`, r.pk)}${row(`Direct labour (${d.labour||0}%)`, r.dl)}${row(`Factory overhead (${d.factory||0}%)`, r.fo)}
    ${row('Depreciation (bldg 5%, machinery/truck/utilities 10%)', r.dep)}${row('Amortization of startup expenses', r.am)}
    ${row('Cost of production', r.cop,'sub')}
    ${row('+ Opening stock of finished goods', +d.open_fg||0)}${row('− Closing stock of finished goods', +d.close_fg||0)}
    ${row('Cost of goods sold', r.cogs,'sub')}${row('<b>Gross profit</b>', r.gp,'sub')}
    ${row(`Selling &amp; marketing (${d.selling||0}%)`, r.sm)}${row(`Administrative overhead (${d.admin||0}%)`, r.ad)}${row(`Other operating expenses (${d.other||0}%)`, r.oo)}
    ${row('Operating expenses', r.opex,'sub')}${row('<b>Operating profit</b>', r.op,'sub')}
    ${row('− Interest on bank loan', +d.interest||0)}${row('Profit before tax', r.pbt,'sub')}${row('Income tax @20%', r.tax)}
    ${row('<b>Net profit</b>', r.np,'total')}${row(`Dividend (${d.div_pct||0}% of equity capital)`, r.div)}${row('Retained earnings', r.re,'sub')}
  </table></div>`;
  const pc = `<h4>Total project cost</h4><div class="grid g2"><div class="tablewrap"><table>
    <tr class="sub"><td colspan="2">A. Fixed capital investment</td></tr>
    ${row('Land', r.fc.land)}${row('Buildings (factory shed + office)', r.fc.buildings)}${row('Machinery', r.fc.machinery)}${r.fc.truck?row('Truck / transporter', r.fc.truck):''}
    ${row('Utilities (electric, drainage, sanitary)', r.fc.utilities)}${row('Startup / preliminary expenses', r.fc.startup)}${row('Total fixed capital', r.FC,'total')}
  </table></div><div class="tablewrap"><table>
    <tr class="sub"><td colspan="2">B. Working capital (300-day year)</td></tr>
    ${row(`RM stock: ${inr(r.rm)}/300 × ${d.hold.rm} d`, r.wc.rm)}${row(`Goods-in-process: CoP/300 × ${d.hold.wip} d`, r.wc.wip)}
    ${row(`Finished goods: CoP/300 × ${d.hold.fg} d`, r.wc.fg)}${row(`Receivables: cost of sales/300 × ${d.hold.rec} d`, r.wc.rec)}${row('Cash', r.wc.cash)}
    ${row(`− Payables: RM/300 × ${d.hold.pay} d`, -r.pay)}${row('Working capital', r.WC,'total')}
  </table></div></div>
  <div class="tablewrap"><table>
    ${row('Fixed capital + working capital', r.FC+r.WC)}${row(d.cont_abs!=null?'Contingencies (given)':`Contingencies (${d.cont_pct}% of FC + WC)`, r.cont)}${row('<b>Total project cost</b>', r.TPC,'total')}
  </table></div>`;
  const fcl = `<h4>Means of finance &amp; financial closure</h4><div class="tablewrap"><table>
    ${row("Founders' equity", r.src.equity)}${row('Retained earnings (internal accrual)', r.src.retained)}${row('Long-term bank loan', r.src.bank)}
    ${row('Angel / investor', r.src.angel)}${row("Suppliers' credit (fixed assets)", r.src.suppliers)}${row('Total sources', r.SRC,'total')}
    ${row('Total project cost', r.TPC)}${row(r.gap>=0?'<b>Surplus</b>':'<b>Shortfall</b>', r.gap,'sub')}
  </table></div>
  <div class="callout ${r.gap>=0?'good':'bad'}">${r.gap>=0?`<b>Financial closure achieved</b> — funds arranged exceed the project cost by ₹${inr(r.gap)}.`:`<b>Financial closure NOT achieved</b> — shortfall of ₹${inr(-r.gap)} (${(100*-r.gap/r.TPC).toFixed(1)}% of project cost). Bridge with more equity/angel money, a larger loan, extra suppliers' credit, lower dividend or tighter holding periods.`}
  ${Math.abs(r.src.retained)>0?` Without counting retained earnings, external sources are ₹${inr(r.SRC-r.src.retained)} (${r.SRC-r.src.retained>=r.TPC?'still enough':'not enough'} on their own).`:''}</div>`;
  return {pl, pc, fcl};
}
function prQuestion(q){
  const r=prCalc(q.inputs), t=prTables(r);
  const data = q.data?`<details><summary>📋 Data given in the paper (${q.data.length} items)</summary><div class="body"><div class="tablewrap"><table>${q.data.map(x=>`<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join('')}</table></div></div></details>`:'';
  const plan = q.plan?`<div class="step"><b>(i) Business plan — one/two sentences per element</b><ol>${q.plan.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`:'';
  const steps = (plan?[plan]:[]).concat([`<div class="step">${t.pl}</div>`, `<div class="step">${t.pc}</div>`, `<div class="step">${t.fcl}${q.note?`<p class="muted">${esc(q.note)}</p>`:''}</div>`]);
  return questionBlock({id:q.id, src:q.src, marks:q.marks, text:`<p>${esc(q.intro)}</p>`, checks:[["Net profit (₹)",Math.round(r.np)],["Fixed capital (₹)",Math.round(r.FC)],["Working capital (₹)",Math.round(r.WC)],["Total project cost (₹)",Math.round(r.TPC)]]},
    {extra:data, stepsHtml:steps.join(''), after:`<div class="row" style="margin-top:8px"><a class="btn small" href="#/tools?pr=${q.id}">Open in calculator ↗</a></div>`});
}

/* ---------------- PAGES ---------------- */
const pages = {};
pages.home = () => {
  const yrs=P.papers.map(p=>p.id);
  const heat = `<div class="tablewrap"><table class="heat"><tr><th>Topic</th>${yrs.map(y=>`<th class="n">${y}</th>`).join('')}<th class="n">Total</th></tr>
   ${P.heat.map(h=>{const tot=yrs.reduce((a,y)=>a+h.m[y],0);return `<tr><td><a href="${h.link}">${esc(h.t)}</a></td>${yrs.map(y=>`<td class="h${h.m[y]==0?0:h.m[y]>=20?2:1}">${h.m[y]||'–'}</td>`).join('')}<td class="n"><b>${tot}</b></td></tr>`}).join('')}</table></div>
   <p class="muted">S = End-Spring, A = End-Autumn. Approximate marks per 100-mark paper. Dark = 20+ marks.</p>`;
  return `<h1>EP61201 Entrepreneurship Essentials — End-Sem Prep</h1>
  <p class="lead">Built from the last five end-sem papers, Prof. Mondal's exam notice and tutorial sheets, and every in-syllabus slide (crossed-out slides and anything past a "syllabus up to here" marker were removed).</p>
  <div class="callout warn"><b>Prof's notice for this exam:</b> Financial statements → <i>no long answers</i>, short answers possible. Project report → <b>one full-length question of 30 marks</b>. Break-even point and financing a new venture → <b>one question each</b>.</div>
  <div class="grid g4">
    <div class="stat"><b>3</b><span>numericals that decide the paper: project report, BEP, funding</span></div>
    <div class="stat"><b>5/5</b><span>past papers had a BEP question and a funding/valuation question</span></div>
    <div class="stat"><b>4/5</b><span>had a project report; the last two at 30 marks</span></div>
    <div class="stat"><b>17</b><span>lecture decks summarised (syllabus only)</span></div>
  </div>
  <h2>Your progress</h2>
  <div class="progress" data-progress><div></div></div><p class="muted" data-progress-text></p>
  <h2>Study plan for tonight (≈5 hours)</h2>
  <div class="card"><ol>
   <li><b>60–75 min · <a href="#/project">Project report</a></b> — learn the 12-step sequence and the working-capital bases, then do AgriMind (S25) on paper and check each part. Then NextGen (A24). Memorise the 8 business-plan chapters.</li>
   <li><b>45 min · <a href="#/bep">Break-even</a></b> — play the cost-classification drill until you score 100%, then S23 Q9, A24 Q1, S25 Q4 (demand–supply).</li>
   <li><b>45 min · <a href="#/funding">Financing</a></b> — do S25 Q5 and A24 Q6 fully (rounds → VC method → holdings → shares → liquidation). Use the cap-table simulator to check.</li>
   <li><b>20 min · <a href="#/fs">Financial statements</a></b> short answers + <a href="#/flash">formula flashcards</a>.</li>
   <li><b>40 min · <a href="#/theory">Theory bank</a></b> — legal forms, market research, pricing/funnel, hypotheses, pitching.</li>
   <li><b>30 min · <a href="#/mock">Timed mock</a></b>, then skim <a href="#/lec/L15">L15</a>, <a href="#/lec/L09">L09</a>, <a href="#/lec/L11">L11</a> summaries.</li>
  </ol></div>
  <h2>What the last five papers asked</h2>${heat}
  <div class="grid g2">${P.papers.map(p=>`<div class="card"><h4>${esc(p.name)}</h4><p class="muted">${esc(p.note)}</p></div>`).join('')}</div>
  <h2>Pattern notes</h2>
  <div class="card"><ul>
   <li><b>Same skeletons recur with new numbers.</b> Funding questions always run founders → HNI/seed → angel → VC (VC method with P/E) → acquisition with 3 liquidation cases. BEP questions always mix fixed, variable and non-cost items — classification is where marks are lost.</li>
   <li><b>Project report question format is fixed:</b> (i) 1–2 lines on every business-plan element, (ii) projected P&amp;L, (iii) total project cost, (iv) financial closure + comments — split 10+10+6+4.</li>
   <li>Theory questions are applied to a story ("do not write the definition"). Use the startup's own facts.</li>
   <li>Design thinking and patents appeared in older papers but there is no deck on them this term — low priority.</li>
  </ul></div>`;
};
pages.project = () => {
  const pj=P.project;
  return `<h1>Project report — the 30-mark question</h1>
  <p class="lead">The prof's notice: one full-length question carrying 30 marks. The method below follows his Nov-2026 tutorial sheet exactly.</p>
  <h2>1 · The 12-step sequence (memorise)</h2>
  <div class="card"><ol>${pj.sequence.map(s=>`<li><b>${s[0].replace(/^\d+\.\s*/,'')}</b> — ${s[1]}</li>`).join('')}</ol></div>
  <h2>2 · Working-capital bases</h2>
  <div class="tablewrap"><table><tr><th>Component</th><th>Base</th><th>Formula</th></tr>${pj.wcBases.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><code>${r[2]}</code></td></tr>`).join('')}</table></div>
  <h2>3 · Traps that cost marks</h2><div class="card"><ul>${pj.traps.map(t=>`<li>${t}</li>`).join('')}</ul></div>
  <h2>4 · Business plan elements (part i, ≈10 marks)</h2>
  <p class="muted">Vaughan Evans' structure, as taught. Write 1–2 sentences each, using the story's facts.</p>
  <div class="grid g2">${pj.planElements.map((e,i)=>`<div class="card"><h4>${i+1}. ${e[0]}</h4><p>${e[1]}</p></div>`).join('')}</div>
  <div class="callout">Also worth one line each if time permits: <b>the four critical factors</b> (people, opportunity, context, risk &amp; reward), the <b>USP</b>, and <b>sensitivity</b> (e.g. effect of a 5% price fall).</div>
  <h2>5 · Past questions with full solutions</h2>
  <p class="muted">Try each on paper first. Each solution unfolds part by part. "Open in calculator" loads the data so you can change numbers.</p>
  ${pj.questions.map(prQuestion).join('')}
  <h2>6 · Theory version (A23 Q5, 20 marks)</h2>
  <div class="card" id="pr-a23">${fullQ(REFS['pr-a23'])}
  <p><b>How to answer:</b> Use the 8 chapter headings above. Under Financials, invent a small but consistent table: project cost (fixed capital + working capital + contingency), means of finance, 3-year sales and net profit, BEP. Add risks (greenwashing scepticism, competition from FMCG giants, raw-material cost) with mitigations, and the ask (amount, use of funds, expected return).</p></div>`;
};
pages.bep = () => {
  const b=P.bep;
  const items = b.classify.slice().sort(()=>Math.random()-.5);
  return `<h1>Break-even point (cost–volume–profit)</h1>
  <p class="lead">One question guaranteed. In every past paper, marks were won or lost in the cost classification.</p>
  <h2>1 · Formulas</h2><div class="grid g2">${b.formulas.map(f=>`<div class="card"><h4>${f[0]}</h4><div class="formula">${f[1]}</div></div>`).join('')}</div>
  <h2>2 · Cost classification drill (prof's exam rules)</h2>
  <div class="callout">Exam rules from the slides: <b>insurance = fixed</b>, <b>maintenance = variable</b>, <b>interest on long-term loan = fixed</b>, <b>interest on short-term / working-capital loan = variable</b>, <b>income tax and dividend are not costs</b>; capital purchases and loan repayments are not costs either (depreciation already covers fixed assets).</div>
  <div class="card" id="classifyGame"><div class="row"><b>Classify each item:</b><span class="muted" id="cgScore"></span><button class="small" id="cgReset">Shuffle &amp; reset</button></div>
   <div class="sort-items">${items.map((it,i)=>`<div class="chipq" data-k="${it[1]}"><span>${esc(it[0])}</span><div class="btns"><button class="small" data-c="F">Fixed</button><button class="small" data-c="V">Variable</button><button class="small" data-c="N">Not a cost</button></div></div>`).join('')}</div></div>
  <h2>3 · Interactive break-even chart</h2>
  <div class="card">${bepChartControls()}<canvas id="bepCanvas" width="900" height="420"></canvas><div id="bepOut"></div></div>
  <h2>4 · Uses, assumptions, limitations (short-answer fodder)</h2>
  <div class="grid g3"><div class="card"><h4>Uses</h4><ul>${b.uses.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="card"><h4>Assumptions</h4><ul>${b.assumptions.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="card"><h4>Limitations</h4><ul>${b.limitations.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>
  <div class="card"><h4>Operating leverage &amp; cost indifference (in syllabus up to slide 76)</h4><ul>
   <li>High fixed / low variable cost ⇒ high operating leverage: BEP is higher, but every unit after BEP earns more. Low operating leverage ⇒ easy BEP, small incremental profit.</li>
   <li>DOL = % change in operating profit ÷ % change in sales. DOL of 2: sales +25% ⇒ operating profit +50%. Exciting above BEP, painful below it — a risk measure.</li>
   <li>Cost indifference point: volume at which two cost structures give equal profit (10-carat jewellery example: 18,000 units). Above it choose the automated / high-fixed option.</li>
   <li>Inventory costs money: working-capital interest on stock can turn profit into loss — keep inventory low.</li></ul></div>
  <h2>5 · Past questions</h2>
  ${b.questions.map(q=>questionBlock(q)).join('')}`;
};
function bepChartControls(){
  const s=(id,l,min,max,step,v)=>`<div class="slider"><label for="${id}">${l}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><input type="number" data-for="${id}" value="${v}" step="${step}"></div>`;
  return s('bF','Fixed cost F (₹)',0,5000,50,1500)+s('bS','Price per unit S (₹)',0.5,20,0.1,4)+s('bV','Variable cost/unit V (₹)',0,19,0.1,2.5)+s('bQ','Actual units Q',0,6000,50,2500);
}
function drawBep(){
  const c=$('#bepCanvas'); if(!c) return; const g=c.getContext('2d');
  const F=+$('#bF').value, S=+$('#bS').value, V=+$('#bV').value, Q=+$('#bQ').value;
  const cs=getComputedStyle(document.documentElement), col=k=>cs.getPropertyValue(k).trim();
  const W=c.width, H=c.height, pad=55;
  g.clearRect(0,0,W,H); g.fillStyle=col('--surface'); g.fillRect(0,0,W,H);
  const bep = S>V? F/(S-V) : Infinity;
  const qmax = Math.max(Q*1.3, isFinite(bep)?bep*1.6:Q*1.5, 10);
  const ymax = Math.max(S*qmax, F+V*qmax)*1.05;
  const X=q=>pad+(W-pad-20)*q/qmax, Y=v=>H-pad-(H-pad-20)*v/ymax;
  g.strokeStyle=col('--line'); g.lineWidth=1; g.font='12px Inter, sans-serif'; g.fillStyle=col('--muted');
  for(let i=0;i<=5;i++){ const q=qmax*i/5, v=ymax*i/5; g.beginPath(); g.moveTo(X(q),Y(0)); g.lineTo(X(q),20); g.stroke(); g.fillText(inr(q),X(q)-12,H-pad+16); g.beginPath(); g.moveTo(pad,Y(v)); g.lineTo(W-20,Y(v)); g.stroke(); g.fillText(inr(v),4,Y(v)+4); }
  g.fillText('Quantity →',W-90,H-12); g.save(); g.translate(14,40); g.fillText('₹',0,0); g.restore();
  if(isFinite(bep)){ // zones
    g.fillStyle='rgba(201,42,42,.10)'; g.beginPath(); g.moveTo(X(0),Y(0)); g.lineTo(X(0),Y(F)); g.lineTo(X(bep),Y(F+V*bep)); g.closePath(); g.fill();
    g.fillStyle='rgba(43,138,62,.12)'; g.beginPath(); g.moveTo(X(bep),Y(S*bep)); g.lineTo(X(qmax),Y(S*qmax)); g.lineTo(X(qmax),Y(F+V*qmax)); g.closePath(); g.fill();
  }
  const line=(x1,y1,x2,y2,c,w=2.5,dash)=>{ g.strokeStyle=c; g.lineWidth=w; g.setLineDash(dash||[]); g.beginPath(); g.moveTo(X(x1),Y(y1)); g.lineTo(X(x2),Y(y2)); g.stroke(); g.setLineDash([]); };
  line(0,F,qmax,F,'#868e96',2,[6,4]); line(0,0,qmax,V*qmax,'#f08c00',2,[3,3]); line(0,F,qmax,F+V*qmax,'#c92a2a'); line(0,0,qmax,S*qmax,'#2b8a3e');
  g.font='600 12px Inter, sans-serif';
  g.fillStyle='#2b8a3e'; g.fillText('Sales = S·Q',X(qmax*0.82),Y(S*qmax*0.82)-8);
  g.fillStyle='#c92a2a'; g.fillText('Total cost = F + V·Q',X(qmax*0.62),Y(F+V*qmax*0.62)+18);
  g.fillStyle='#868e96'; g.fillText('Fixed cost',X(qmax*0.02),Y(F)-6);
  g.fillStyle='#f08c00'; g.fillText('Variable cost',X(qmax*0.75),Y(V*qmax*0.75)+16);
  if(isFinite(bep)){ g.fillStyle=col('--text'); g.beginPath(); g.arc(X(bep),Y(S*bep),6,0,7); g.fill(); g.fillText('BEP',X(bep)+8,Y(S*bep)-8);
    g.fillStyle=col('--muted'); g.fillText('Loss zone',X(bep*0.25),Y(F*0.6)); g.fillStyle='#2b8a3e'; g.fillText('Profit zone',X(qmax*0.88),Y(S*qmax*0.98)); }
  line(Q,0,Q,ymax*0.95,col('--accent'),1.5,[4,4]); g.fillStyle=col('--accent'); g.fillText('Actual Q',X(Q)+4,30);
  if(isFinite(bep) && Q>bep){ g.strokeStyle=col('--accent'); g.lineWidth=2; g.beginPath(); g.moveTo(X(bep),Y(0)+22); g.lineTo(X(Q),Y(0)+22); g.stroke(); g.fillText('Margin of safety',X((bep+Q)/2)-45,Y(0)+38); }
  const profit=Q*(S-V)-F;
  $('#bepOut').innerHTML = `<div class="grid g4" style="margin-top:10px"><div class="stat"><b>${S>V?inr(S-V,2):'—'}</b><span>contribution / unit</span></div><div class="stat"><b>${isFinite(bep)?inr(bep,1):'never'}</b><span>BEP units (₹${isFinite(bep)?inr(bep*S):'—'})</span></div><div class="stat"><b>${inr(profit)}</b><span>profit at Q = ${inr(Q)}</span></div><div class="stat"><b>${isFinite(bep)?inr(Q-bep,0):'—'}</b><span>margin of safety (units)${isFinite(bep)&&Q?` · ${(100*(Q-bep)/Q).toFixed(1)}%`:''}</span></div></div>
  <p class="muted">Defaults = End-Spring 2023 Q9 (F ₹1,500, S ₹4, V ₹2.50, Q 2,500 → BEP 1,000). Drag the sliders to see how a price cut or automation moves the BEP.</p>`;
}
function wireBep(){
  ['bF','bS','bV','bQ'].forEach(id=>{ const r=$('#'+id), n=$(`[data-for="${id}"]`);
    r.oninput=()=>{n.value=r.value; drawBep();}; n.oninput=()=>{r.value=n.value; drawBep();}; });
  drawBep();
  const game=$('#classifyGame');
  const score=()=>{ const all=$$('.chipq',game), done=all.filter(x=>x.dataset.done), ok=done.filter(x=>x.classList.contains('right')); $('#cgScore').textContent=`${ok.length}/${done.length} correct · ${all.length-done.length} left`; };
  game.addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; const chip=b.closest('.chipq'); if(chip.dataset.done) return;
    chip.dataset.done=1; const k=chip.dataset.k; chip.classList.add(b.dataset.c===k?'right':'wrong');
    if(b.dataset.c!==k){ const nm={F:'Fixed',V:'Variable',N:'Not a cost'}; const s=document.createElement('small'); s.textContent='→ '+nm[k]; chip.appendChild(s); } score(); });
  $('#cgReset').onclick=()=>route();
  score();
}
pages.funding = () => {
  const f=P.funding;
  return `<h1>Financing a new venture &amp; valuation</h1>
  <p class="lead">One question guaranteed. Every past paper had the same skeleton: founders → seed/HNI → angel → VC (VC method) → exit with liquidation preferences.</p>
  <h2>1 · Rules you apply</h2><div class="grid g2">${f.rules.map(r=>`<div class="card"><h4>${r[0]}</h4><p>${r[1]}</p></div>`).join('')}</div>
  <h2>2 · Worked slide examples (memorise the logic)</h2>
  <div class="card"><b>BA invests ₹50 M for 25%; venture sold for ₹100 M</b> (post-money 200, pre 150):
   <ul><li>No liquidation preference: BA gets 25% × 100 = ₹25 M; founders ₹75 M.</li><li>1X, non-participating: BA ₹50 M; founders ₹50 M.</li><li>1X + participating: 50 + 25% × 50 = ₹62.5 M; founders ₹37.5 M.</li><li>2X + participating: 100 + 25% × 0 = ₹100 M; founders get nothing. At ₹400 M sale: 100 + 75 = ₹175 M to BA, ₹225 M founders. At ₹1,000 M: 100 + 225 = ₹325 M.</li></ul>
   <b>VC method:</b> ₹100 L needed, exit year 5 revenue ₹2,000 L, NP 10% = 200 L, P/E 25 ⇒ TV ₹5,000 L; 10X ⇒ post-money ₹500 L; VC 20%; pre ₹400 L.</div>
  <div class="callout">Typical expected returns: seed 20× (IRR 82%+), early 10× (60%), growth 5× (40%), later 3× (25%).</div>
  <h2>3 · Try it live</h2><p><a class="btn primary" href="#/tools">Open cap-table, VC-method &amp; liquidation calculators →</a></p>
  <h2>4 · Past questions</h2>${f.questions.map(q=>questionBlock(q)).join('')}
  <h2>5 · Theory points for short answers</h2><div class="grid g2">${f.theory.map(t=>`<div class="card"><h4>${t[0]}</h4><p>${t[1]}</p></div>`).join('')}</div>`;
};
pages.fs = () => `<h1>Financial statements — short answers only</h1>
  <p class="lead">Per the notice, no long question from this pre-mid-sem topic. Know these crisply; click a question to reveal.</p>
  <div class="card" id="fs-0">${fullQ(REFS['fs-0'])}<p class="muted">The first three answers below solve this question (book vs market value, how book value changes, DBC's figures).</p></div>
  ${P.fs.map((x,i)=>`<details><summary>${esc(x.q)}</summary><div class="body"><p>${esc(x.a)}</p></div></details>`).join('')}
  <div class="callout">The full P&amp;L → balance sheet → cash-flow mechanics also feed the project report — see <a href="#/lec/L03">L03 summary</a>.</div>`;
pages.theory = () => `<h1>Theory answer bank</h1><p class="lead">Every theory question from the last five papers, with a model answer built from the slides. Read the question, draft your bullets, then open the model answer.</p>
  ${T.map((g,gi)=>`<h2>${esc(g.topic)} <span class="tag ${g.prio==='high'?'y':''}">${g.prio} priority</span></h2>${g.items.map((it,ii)=>{ const id=`t-${gi}-${ii}`, fq=fullQ(REFS[id]);
    return `<details id="${id}"><summary>${esc(it.q)} <span class="tag">${esc(it.src)}</span></summary><div class="body">${fq}${fq?`<details class="answer"><summary>✅ Show model answer</summary><div class="body"><ul>${it.a.map(x=>`<li>${x}</li>`).join('')}</ul></div></details>`:`<ul>${it.a.map(x=>`<li>${x}</li>`).join('')}</ul>`}${masteredBox(id)}</div></details>`; }).join('')}`).join('')}`;

/* ---------------- PAST PAPERS (full text) ---------------- */
pages.papers = () => `<h1>Past papers — full text</h1>
  <p class="lead">All five end-sem papers, word for word, with every case story and data table. Each question links to its worked solution in this guide.</p>
  <div class="grid g2">${(window.PAPERS||[]).map(p=>`<a class="card paperlink" href="#/paper/${p.id}"><h4>${esc(p.title)} (${p.id})</h4><p class="muted">${esc(p.header)}</p><p>${p.blocks.length} question blocks${p.story?' · includes case story':''}</p></a>`).join('')}</div>`;
pages.paper = (qs, id) => {
  const p=(window.PAPERS||[]).find(x=>x.id===id); if(!p) return '<p>Paper not found.</p>';
  const i=PAPERS.indexOf(p), prev=PAPERS[i-1], next=PAPERS[i+1];
  return `<h1>${esc(p.title)} <span class="tag">${p.id}</span></h1>
  <p class="muted">${esc(p.header)}</p>
  <div class="card"><b>Instructions</b><ul>${p.instructions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  ${p.story?`<h2>${esc(p.storyTitle||'Story')}</h2><div class="card story">${p.story}</div>`:''}
  <h2>Questions</h2>
  ${p.blocks.map(b=>`<div class="fullq paperq"><div class="fullq-h">${esc(b.label)}</div>${b.html}${(SOL_HREF[b.key]||[]).length?`<div class="row" style="margin-top:8px">${SOL_HREF[b.key].map(h=>`<a class="btn small" href="${h}">See solution →</a>`).join('')}</div>`:''}</div>`).join('')}
  <div class="row" style="justify-content:space-between;margin-top:24px">${prev?`<a class="btn" href="#/paper/${prev.id}">← ${prev.id}</a>`:'<span></span>'}${next?`<a class="btn" href="#/paper/${next.id}">${next.id} →</a>`:''}</div>`;
};

/* ---------------- TOOLS ---------------- */
const prFields=[["units","SOM / sales units"],["price","Selling price (₹)"],["rm","Raw materials %"],["power","Power & fuel %"],["maint","Maintenance %"],["pack","Packaging %"],["labour","Direct labour %"],["factory","Factory overhead %"],["selling","Selling & marketing %"],["admin","Admin overhead %"],["other","Other operating %"],["interest","Interest on bank loan (₹)"],["open_fg","Opening stock FG (₹)"],["close_fg","Closing stock FG (₹)"],["land","Land (₹)"],["factory_shed","Factory shed (₹)"],["office","Office building (₹)"],["machinery","Machinery (₹)"],["truck","Truck (₹)"],["utilities","Utilities: electric, drainage (₹)"],["startup","Startup expenses (₹)"],["amort","Amortization (₹, blank = 10%)"],["cash","Cash to maintain (₹)"],["cont_pct","Contingency % of FC+WC"],["cont_abs","Contingency amount (₹, overrides %)"],["equity","Founders' equity (₹)"],["div_pct","Dividend % of equity"],["bank","Long-term bank loan (₹)"],["angel","Angel / investor (₹)"],["suppliers","Suppliers' credit (₹)"]];
const holdFields=[["rm","RM days"],["wip","WIP days"],["fg","FG days"],["rec","Receivable days"],["pay","Payable days"]];
pages.tools = (qs) => {
  const pick = qs.get('pr') || 'pr-s25';
  return `<h1>Calculators</h1><p class="lead">Check your hand-calculations. Everything recomputes instantly.</p>
  <div class="tabs" id="toolTabs"><button data-t="pr" class="on">Project report</button><button data-t="cap">Cap table &amp; VC method</button><button data-t="liq">Liquidation waterfall</button><button data-t="eq">Demand–supply equilibrium</button></div>
  <section data-tool="pr" class="card"><div class="row"><b>Load:</b><select id="prLoad">${P.project.questions.map(q=>`<option value="${q.id}" ${q.id===pick?'selected':''}>${esc(q.src)}</option>`).join('')}<option value="blank">Blank</option></select><span class="muted">Depreciation: buildings 5%, machinery/truck/utilities 10%. 300-day year.</span></div>
   <div class="form-grid" id="prForm" style="margin-top:10px">${prFields.map(f=>`<label>${f[1]}<input type="number" step="any" data-f="${f[0]}"></label>`).join('')}${holdFields.map(f=>`<label>${f[1]}<input type="number" step="any" data-h="${f[0]}"></label>`).join('')}</div>
   <div id="prOut"></div></section>
  <section data-tool="cap" class="card" hidden>
   <h3>VC method <span class="muted">(₹ crore)</span></h3><div class="form-grid">
    <label>Exit-year revenue<input type="number" id="vRev" value="303.03" step="any"></label><label>Net profit %<input type="number" id="vNp" value="11" step="any"></label><label>P/E ratio<input type="number" id="vPe" value="30" step="any"></label><label>Required multiple (X)<input type="number" id="vX" value="5" step="any"></label><label>Investment<input type="number" id="vInv" value="50" step="any"></label></div><div id="vOut"></div>
   <h3>Cap table through rounds</h3><p class="muted">Founders first (name, number of shares). Then each round: investor, amount (₹), pre-money (₹). Preset = S25 Q5 (founders' shares at face value ₹5). "Add VC round" converts the VC-method figures above (₹ crore) into ₹.</p>
   <div id="capFounders"></div><button class="small" id="addF">+ founder</button>
   <div id="capRounds" style="margin-top:10px"></div><button class="small" id="addR">+ round</button> <button class="small" id="vcToRound">Add VC round from VC method</button>
   <div id="capOut"></div></section>
  <section data-tool="liq" class="card" hidden>
   <h3>Liquidation waterfall (one preferred investor)</h3><div class="form-grid">
    <label>Exit / sale value<input type="number" id="lExit" value="200" step="any"></label><label>Debt to repay first<input type="number" id="lDebt" value="0" step="any"></label><label>Preferred investor's investment<input type="number" id="lInv" value="50" step="any"></label><label>Investor's % holding<input type="number" id="lPct" value="25" step="any"></label><label>Liquidation preference (n×, 0 = none)<input type="number" id="lN" value="3" step="any"></label>
    <label>Participating?<select id="lPart"><option value="1">Yes</option><option value="0">No</option></select></label><label>Your holder's % of total<input type="number" id="lMe" value="8.4375" step="any"></label></div><div id="lOut"></div></section>
  <section data-tool="eq" class="card" hidden>
   <h3>Linear demand–supply equilibrium from two price points</h3><div class="form-grid">
    <label>Price 1<input type="number" id="eP1" value="5000"></label><label>Demand at P1<input type="number" id="eD1" value="14000"></label><label>Supply at P1<input type="number" id="eS1" value="1000"></label>
    <label>Price 2<input type="number" id="eP2" value="14000"></label><label>Demand at P2<input type="number" id="eD2" value="1000"></label><label>Supply at P2<input type="number" id="eS2" value="14000"></label></div><div id="eOut"></div><canvas id="eqCanvas" width="700" height="340"></canvas></section>`;
};
function wireTools(qs){
  $('#toolTabs').onclick=e=>{ const b=e.target.closest('[data-t]'); if(!b) return; $$('#toolTabs button').forEach(x=>x.classList.toggle('on',x===b)); $$('[data-tool]').forEach(s=>s.hidden=s.dataset.tool!==b.dataset.t); if(b.dataset.t==='eq') eqCalc(); };
  // project report
  const load=id=>{ const q=P.project.questions.find(x=>x.id===id); const d=q?q.inputs:{hold:{}};
    $$('#prForm [data-f]').forEach(i=>i.value=d[i.dataset.f]!=null?d[i.dataset.f]:''); $$('#prForm [data-h]').forEach(i=>i.value=d.hold[i.dataset.h]!=null?d.hold[i.dataset.h]:''); prRun(); };
  const prRun=()=>{ const d={hold:{}}; $$('#prForm [data-f]').forEach(i=>{ if(i.value!=='') d[i.dataset.f]=+i.value; }); $$('#prForm [data-h]').forEach(i=>d.hold[i.dataset.h]=+i.value||0);
    if(d.amort===undefined) delete d.amort; if(d.cont_abs===undefined) delete d.cont_abs; d.units=d.units||0; d.price=d.price||0;
    const t=prTables(prCalc(d)); $('#prOut').innerHTML=t.pl+t.pc+t.fcl; };
  $('#prLoad').onchange=e=>load(e.target.value); $('#prForm').oninput=prRun; load($('#prLoad').value);
  // VC method
  const vc=()=>{ const tv=+vRev.value*(+vNp.value)/100*(+vPe.value), post=tv/(+vX.value), pre=post-(+vInv.value);
    $('#vOut').innerHTML=`<div class="grid g4"><div class="stat"><b>${inr(tv,2)}</b><span>terminal value = rev × NP% × P/E</span></div><div class="stat"><b>${inr(post,2)}</b><span>post-money = TV ÷ ${vX.value}X</span></div><div class="stat"><b>${inr(pre,2)}</b><span>pre-money = post − investment</span></div><div class="stat"><b>${(100*vInv.value/post).toFixed(3)}%</b><span>investor's stake</span></div></div>`; return {pre,inv:+vInv.value}; };
  ['vRev','vNp','vPe','vX','vInv'].forEach(id=>$('#'+id).oninput=vc); vc();
  // cap table
  let founders=[['Ayon',20000],['Nayon',30000],['Sayon',50000]], rounds=[['HNI Aneesh',1e7,3e7],['Angel',5e7,15e7],['VC',50e7,150e7]];
  const drawCap=()=>{
    $('#capFounders').innerHTML=founders.map((f,i)=>`<div class="row" style="margin:4px 0"><input type="text" value="${esc(f[0])}" data-fi="${i}" data-k="0"><input type="number" value="${f[1]}" data-fi="${i}" data-k="1"> shares <button class="small" data-delf="${i}">✕</button></div>`).join('');
    $('#capRounds').innerHTML=rounds.map((r,i)=>`<div class="row" style="margin:4px 0"><input type="text" value="${esc(r[0])}" data-ri="${i}" data-k="0"> invests <input type="number" step="any" value="${r[1]}" data-ri="${i}" data-k="1"> at pre-money <input type="number" step="any" value="${r[2]}" data-ri="${i}" data-k="2"> <button class="small" data-delr="${i}">✕</button></div>`).join('');
    capRun(); };
  const capRun=()=>{
    let holders=founders.map(f=>({n:f[0],sh:+f[1]})); let html='';
    rounds.forEach(r=>{ const tot=holders.reduce((a,h)=>a+h.sh,0); const price=r[2]/tot, newSh=r[1]/price; const post=+r[2]+(+r[1]);
      holders.push({n:r[0],sh:newSh}); const T=tot+newSh;
      html+=`<h4>${esc(r[0])}: invests ${inr(r[1],2)} at pre-money ${inr(r[2],2)} → post-money ${inr(post,2)}</h4><p class="muted">Price/share = ${inr(r[2],2)} ÷ ${inr(tot)} = <b>${price.toPrecision(6)}</b>; new shares = <b>${inr(newSh,1)}</b>; stake = ${(100*r[1]/post).toFixed(3)}%</p>
      <div class="tablewrap"><table><tr><th>Holder</th><th class="n">Shares</th><th class="n">% holding</th><th class="n">Value at post-money</th></tr>${holders.map(h=>`<tr><td>${esc(h.n)}</td><td class="n">${inr(h.sh,1)}</td><td class="n">${(100*h.sh/T).toFixed(4)}%</td><td class="n">${inr(h.sh*price,2)}</td></tr>`).join('')}<tr class="total"><td>Total</td><td class="n">${inr(T,1)}</td><td class="n">100%</td><td class="n">${inr(post,2)}</td></tr></table></div>`; });
    $('#capOut').innerHTML=html; };
  $('#capFounders').oninput=e=>{ const i=e.target.dataset.fi; if(i!=null){ founders[i][e.target.dataset.k]=e.target.value; capRun(); } };
  $('#capRounds').oninput=e=>{ const i=e.target.dataset.ri; if(i!=null){ rounds[i][e.target.dataset.k]=e.target.value; capRun(); } };
  $('#capFounders').onclick=e=>{ if(e.target.dataset.delf!=null){ founders.splice(+e.target.dataset.delf,1); drawCap(); } };
  $('#capRounds').onclick=e=>{ if(e.target.dataset.delr!=null){ rounds.splice(+e.target.dataset.delr,1); drawCap(); } };
  $('#addF').onclick=()=>{ founders.push(['Founder',10000]); drawCap(); };
  $('#addR').onclick=()=>{ rounds.push(['Investor',1,4]); drawCap(); };
  $('#vcToRound').onclick=()=>{ const v=vc(); rounds.push(['VC',Math.round(v.inv*1e7),Math.round(v.pre*1e7)]); drawCap(); };
  drawCap();
  // liquidation
  const liq=()=>{ const exit=+lExit.value, debt=+lDebt.value, inv=+lInv.value, pct=+lPct.value/100, n=+lN.value, part=lPart.value==='1', me=+lMe.value/100;
    const pool=Math.max(exit-debt,0); const pref=Math.min(n*inv,pool); let rest=pool-pref; let partAmt=0;
    if(part){ partAmt=(n>0?pct*rest:pct*pool); if(n===0){ rest=pool; } }
    const invTotal = n>0 ? pref+(part?partAmt:0) : (part?pct*pool:0);
    const common = pool-invTotal; const commonPct=1-pct; const myShare = commonPct>0 ? common*me/commonPct : 0;
    const conv = pct*pool;
    $('#lOut').innerHTML=`<div class="tablewrap"><table><tr><td>Exit value</td><td class="n">${inr(exit,3)}</td></tr><tr><td>− Debt repaid first</td><td class="n">${inr(debt,3)}</td></tr><tr class="sub"><td>Available to shareholders</td><td class="n">${inr(pool,3)}</td></tr>
     <tr><td>Liquidation preference (${n}× ${inr(inv,2)}, capped at pool)</td><td class="n">${inr(n>0?pref:0,3)}</td></tr><tr><td>Participation (${(pct*100).toFixed(3)}% of ${n>0?'remainder':'pool'})</td><td class="n">${inr(part?partAmt:0,3)}</td></tr>
     <tr class="total"><td>Preferred investor receives</td><td class="n">${inr(invTotal,3)}</td></tr><tr><td>Left for common holders (${(commonPct*100).toFixed(3)}%)</td><td class="n">${inr(common,3)}</td></tr>
     <tr class="total"><td>Your holder (${(me*100).toFixed(4)}% of total ⇒ ${(commonPct?100*me/commonPct:0).toFixed(3)}% of common)</td><td class="n">${inr(myShare,4)}</td></tr></table></div>
     ${(!part && n>0 && conv>pref)?`<p class="callout warn">Remark: a non-participating holder would rather convert to common and take ${(pct*100).toFixed(2)}% × pool = ${inr(conv,3)} &gt; ${inr(pref,3)}. Mention this, but exam keys usually apply the preference as stated.</p>`:''}
     <p class="muted">"Participation only" = set preference to 0 and Participating = Yes.</p>`; };
  ['lExit','lDebt','lInv','lPct','lN','lPart','lMe'].forEach(id=>$('#'+id).oninput=liq); liq();
  ['eP1','eD1','eS1','eP2','eD2','eS2'].forEach(id=>$('#'+id).oninput=eqCalc);
}
function eqCalc(){
  const c=$('#eqCanvas'); if(!c) return; const v=id=>+$('#'+id).value;
  const P1=v('eP1'),P2=v('eP2'),D1=v('eD1'),D2=v('eD2'),S1=v('eS1'),S2=v('eS2');
  const bd=(D2-D1)/(P2-P1), bs=(S2-S1)/(P2-P1); // Q = a + b P
  const ad=D1-bd*P1, as=S1-bs*P1; const P=(as-ad)/(bd-bs), Q=ad+bd*P;
  $('#eOut').innerHTML=`<p>Demand: Q = ${inr(ad,1)} ${bd<0?'−':'+'} ${Math.abs(bd).toFixed(4)}·P &nbsp; | &nbsp; Supply: Q = ${inr(as,1)} ${bs<0?'−':'+'} ${Math.abs(bs).toFixed(4)}·P</p><div class="callout good">Equilibrium price <b>₹${inr(P,2)}</b>, quantity <b>${inr(Q,1)}</b> units. Feed these into the BEP calculation.</div>`;
  const g=c.getContext('2d'), cs=getComputedStyle(document.documentElement), col=k=>cs.getPropertyValue(k).trim(), W=c.width,H=c.height,pad=50;
  g.fillStyle=col('--surface'); g.fillRect(0,0,W,H);
  const qmax=Math.max(D1,D2,S1,S2,Q)*1.1, pmin=0, pmax=Math.max(P1,P2,P)*1.15;
  const X=q=>pad+(W-pad-20)*q/qmax, Y=p=>H-pad-(H-pad-20)*(p-pmin)/(pmax-pmin);
  g.strokeStyle=col('--line'); g.beginPath(); g.moveTo(pad,20); g.lineTo(pad,H-pad); g.lineTo(W-20,H-pad); g.stroke();
  g.fillStyle=col('--muted'); g.font='12px Inter'; g.fillText('Quantity →',W-90,H-15); g.fillText('Price',8,30);
  const seg=(a,b,colr)=>{ g.strokeStyle=colr; g.lineWidth=2.5; g.beginPath(); let first=true; for(let p=pmin;p<=pmax;p+=(pmax-pmin)/50){ const q=a+b*p; if(q<0||q>qmax) continue; first?g.moveTo(X(q),Y(p)):g.lineTo(X(q),Y(p)); first=false;} g.stroke(); };
  seg(ad,bd,'#3b5bdb'); seg(as,bs,'#c92a2a'); g.fillStyle='#3b5bdb'; g.fillText('Demand',X(ad+bd*pmax*0.15)+4,Y(pmax*0.15)); g.fillStyle='#c92a2a'; g.fillText('Supply',X(as+bs*pmax*0.9)+4,Y(pmax*0.9));
  if(isFinite(P)){ g.fillStyle=col('--text'); g.beginPath(); g.arc(X(Q),Y(P),5,0,7); g.fill(); g.fillText(`E (₹${inr(P)}, ${inr(Q)})`,X(Q)+8,Y(P)-8); }
}

/* ---------------- FLASHCARDS ---------------- */
pages.flash = (qs) => {
  const deck = qs.get('d') || 'formulas';
  return `<h1>Flashcards &amp; formula sheet</h1>
  <div class="tabs" id="fcTabs">${[['formulas','Formulas'],['fs','Financial statements'],['terms','Key terms (all lectures)'],['sheet','One-page formula sheet']].map(t=>`<button data-d="${t[0]}" class="${deck===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>
  <div id="fcBody"></div>`;
};
function cardsFor(deck){
  if(deck==='formulas'){ const c=P.bep.formulas.map(f=>[f[0],f[1]]).concat(P.funding.rules.map(r=>[r[0],r[1]])).concat(P.project.wcBases.map(w=>['WC: '+w[0], w[2]+' (base: '+w[1]+')'])); L.forEach(l=>(l.formulas||[]).forEach(f=>c.push([f.name, f.expr+(f.note?' — '+f.note:'')]))); return c; }
  if(deck==='fs') return P.fs.map(x=>[x.q,x.a]);
  if(deck==='terms'){ const c=[]; L.forEach(l=>(l.keyTerms||[]).forEach(k=>c.push([k.term+' ('+l.id+')',k.def]))); return c; }
  return [];
}
function wireFlash(qs){
  const deck=qs.get('d')||'formulas';
  $('#fcTabs').onclick=e=>{ const b=e.target.closest('[data-d]'); if(b) location.hash='#/flash?d='+b.dataset.d; };
  if(deck==='sheet'){ $('#fcBody').innerHTML=`<div class="card"><h3>Project report</h3><ol>${P.project.sequence.map(s=>`<li>${s[1]}</li>`).join('')}</ol><h3>Break-even</h3>${P.bep.formulas.map(f=>`<div class="formula"><b>${f[0]}:</b> ${f[1]}</div>`).join('')}<h3>Funding</h3>${P.funding.rules.map(r=>`<div class="formula"><b>${r[0]}:</b> ${r[1]}</div>`).join('')}</div><button onclick="print()">🖨️ Print</button>`; return; }
  let cards=cardsFor(deck), i=0;
  const show=()=>{ const c=cards[i]; $('#fcBody').innerHTML=`<p class="muted">Card ${i+1} of ${cards.length} · click card to flip · ← → keys</p><div class="flash"><div class="inner"><div class="face"><h3>${esc(c[0])}</h3></div><div class="face back"><div>${esc(c[1])}</div></div></div></div><div class="row" style="margin-top:12px"><button id="fcPrev">← Prev</button><button id="fcNext" class="primary">Next →</button><button id="fcShuf">Shuffle</button></div>`;
    $('#fcPrev').onclick=()=>{i=(i-1+cards.length)%cards.length;show();}; $('#fcNext').onclick=()=>{i=(i+1)%cards.length;show();}; $('#fcShuf').onclick=()=>{cards=cards.sort(()=>Math.random()-.5);i=0;show();}; };
  show();
  document.onkeydown=e=>{ if(!location.hash.startsWith('#/flash')) return; if(e.key==='ArrowRight'){i=(i+1)%cards.length;show();} if(e.key==='ArrowLeft'){i=(i-1+cards.length)%cards.length;show();} if(e.key===' '){ e.preventDefault(); const f=$('.flash'); if(f) f.classList.toggle('flip'); } };
}

/* ---------------- MOCK ---------------- */
pages.mock = () => {
  const pr=P.project.questions.filter(q=>q.id!=='pr-tut'), bq=P.bep.questions.filter(q=>q.checks), fq=P.funding.questions;
  const r=a=>a[Math.floor(Math.random()*a.length)];
  const a=r(pr), b=r(bq), c=r(fq.slice(0,4)), d=P.fs[Math.floor(Math.random()*P.fs.length)];
  return `<h1>Predicted paper &amp; timed mock</h1>
  <div class="callout warn">${esc(P.mock.intro)}</div>
  <h2>Predicted structure</h2>${P.mock.questions.map(q=>`<div class="card"><h4>${esc(q.t)}</h4><p>${esc(q.b)}</p><a href="${q.link}">Practise →</a></div>`).join('')}
  <h2>Timed mock (random draw from past papers)</h2>
  <div class="card"><div class="row"><span class="timer" id="timer">60:00</span><button class="primary" id="tStart">Start</button><button id="tPause">Pause</button><button id="tReset">Reset</button><select id="tMin"><option value="60">60 min</option><option value="90">90 min</option><option value="45">45 min</option></select><a class="btn" href="#/mock" onclick="setTimeout(()=>location.reload(),10)">New draw ↻</a></div>
  <ol><li><b>Project report [30]</b> — ${esc(a.src)}. <a href="#/project">solution in Project report → ${esc(a.id)}</a></li>
  <li><b>Break-even</b> — ${esc(b.src)}: ${fullQ(REFS[b.id])||b.text}</li>
  <li><b>Financing</b> — ${esc(c.src)}: ${fullQ(REFS[c.id])||c.text}</li>
  <li><b>Short answer</b> — ${esc(d.q)}</li></ol>
  <p class="muted">Work on paper. When time is up, compare with the step-by-step solutions on each topic page.</p></div>`;
};
let timerId=null, remain=3600;
function wireMock(){
  const show=()=>{ const m=Math.floor(remain/60), s=remain%60; $('#timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
  $('#tMin').onchange=e=>{ remain=+e.target.value*60; show(); };
  $('#tStart').onclick=()=>{ if(timerId) return; timerId=setInterval(()=>{ remain--; show(); if(remain<=0){ clearInterval(timerId); timerId=null; $('#timer').textContent="Time's up"; } },1000); };
  $('#tPause').onclick=()=>{ clearInterval(timerId); timerId=null; };
  $('#tReset').onclick=()=>{ clearInterval(timerId); timerId=null; remain=+$('#tMin').value*60; show(); };
  show();
}

/* ---------------- LECTURES ---------------- */
pages.lec = (qs, id) => {
  const l=L.find(x=>x.id===id); if(!l) return '<p>Not found.</p>';
  const idx=L.indexOf(l), prev=L[idx-1], next=L[idx+1];
  return `<div class="lecture-head"><h1>${l.id} · ${esc(l.title)}</h1>${masteredBox('lec-'+l.id)}</div>
  <p class="lead">${esc(l.oneLiner)}</p>
  <div class="callout"><b>Exam relevance:</b> ${esc(l.examRelevance)}</div>
  ${l.excluded?`<p class="muted">✂️ ${esc(l.excluded)}</p>`:''}
  ${l.sections.map(s=>`<details open><summary>${esc(s.heading)}</summary><div class="body"><ul>${s.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div></details>`).join('')}
  ${l.formulas&&l.formulas.length?`<h2>Formulas</h2>${l.formulas.map(f=>`<div class="formula"><b>${esc(f.name)}:</b> ${esc(f.expr)}${f.note?`<br><span class="muted">${esc(f.note)}</span>`:''}</div>`).join('')}`:''}
  ${l.cases&&l.cases.length?`<h2>Cases &amp; stories — the crux</h2><div class="grid g2">${l.cases.map(c=>`<div class="case"><b>${esc(c.name)}</b>${esc(c.crux)}</div>`).join('')}</div>`:''}
  ${l.keyTerms&&l.keyTerms.length?`<h2>Key terms</h2><dl class="kv">${l.keyTerms.map(k=>`<dt>${esc(k.term)}</dt><dd>${esc(k.def)}</dd>`).join('')}</dl>`:''}
  ${l.examAnswerTips&&l.examAnswerTips.length?`<h2>How to write the answer</h2><div class="card"><ul>${l.examAnswerTips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}
  ${l.quiz&&l.quiz.length?`<h2>Quick quiz</h2><div data-quiz><p class="qscore muted">Score: 0/0</p>${l.quiz.map(q=>`<div class="mcq" data-a="${q.answer}"><b>${esc(q.q)}</b>${q.options.map(o=>`<button class="opt">${esc(o)}</button>`).join('')}<div class="why">${esc(q.why)}</div></div>`).join('')}</div>`:''}
  <div class="row" style="justify-content:space-between;margin-top:24px">${prev?`<a class="btn" href="#/lec/${prev.id}">← ${prev.id} ${esc(prev.title)}</a>`:'<span></span>'}${next?`<a class="btn" href="#/lec/${next.id}">${next.id} ${esc(next.title)} →</a>`:''}</div>`;
};

/* ---------------- SEARCH ---------------- */
function buildIndex(){
  const idx=[]; const strip=s=>String(s).replace(/<[^>]+>/g,' ');
  P.project.questions.forEach(q=>idx.push({t:q.src,x:q.intro+' '+(q.note||''),h:'#/project',a:q.id}));
  P.bep.questions.forEach(q=>idx.push({t:q.src,x:strip(q.text+' '+q.steps.join(' ')),h:'#/bep',a:q.id}));
  P.funding.questions.forEach(q=>idx.push({t:q.src,x:strip(q.text+' '+q.steps.join(' ')),h:'#/funding',a:q.id}));
  (window.PAPERS||[]).forEach(p=>{ p.blocks.forEach(b=>idx.push({t:`${p.id} paper · ${b.label}`,x:strip(b.html),h:'#/paper/'+p.id})); if(p.story) idx.push({t:`${p.id} paper · story`,x:strip(p.story),h:'#/paper/'+p.id}); });
  P.funding.theory.forEach(t=>idx.push({t:'Funding: '+t[0],x:t[1],h:'#/funding'}));
  P.fs.forEach(f=>idx.push({t:'Financial statements: '+f.q,x:f.a,h:'#/fs'}));
  T.forEach((g,gi)=>g.items.forEach((it,ii)=>idx.push({t:it.q,x:strip(it.a.join(' ')),h:'#/theory',a:`t-${gi}-${ii}`})));
  L.forEach(l=>{ l.sections.forEach(s=>idx.push({t:`${l.id} · ${s.heading}`,x:s.points.join(' '),h:'#/lec/'+l.id}));
    (l.cases||[]).forEach(c=>idx.push({t:`${l.id} · case: ${c.name}`,x:c.crux,h:'#/lec/'+l.id}));
    (l.keyTerms||[]).forEach(k=>idx.push({t:`${l.id} · term: ${k.term}`,x:k.def,h:'#/lec/'+l.id})); });
  return idx;
}
let INDEX=null;
pages.search = (qs) => {
  const q=(qs.get('q')||'').trim(); if(!INDEX) INDEX=buildIndex();
  if(q.length<2) return '<h1>Search</h1><p>Type at least 2 characters.</p>';
  const terms=q.toLowerCase().split(/\s+/);
  const hits=INDEX.filter(e=>{ const s=(e.t+' '+e.x).toLowerCase(); return terms.every(t=>s.includes(t)); }).slice(0,80);
  const hl=s=>{ let o=esc(s); terms.forEach(t=>{ o=o.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>'); }); return o; };
  return `<h1>Search: “${esc(q)}”</h1><p class="muted">${hits.length} result(s)</p>${hits.map(h=>`<div class="hit"><a href="${h.h}${h.a?'?a='+h.a:''}"><b>${hl(h.t)}</b></a><br><small>${hl(h.x.slice(0,240))}${h.x.length>240?'…':''}</small></div>`).join('')}`;
};
let sTimer; $('#search').addEventListener('input',e=>{ clearTimeout(sTimer); sTimer=setTimeout(()=>{ location.hash='#/search?q='+encodeURIComponent(e.target.value); },250); });

/* ---------------- ROUTER ---------------- */
function redrawCharts(){ drawBep(); eqCalc(); }
function route(){
  const h=location.hash.replace(/^#\/?/,'') || 'home';
  const [path, query] = h.split('?'); const qs=new URLSearchParams(query||''); const parts=path.split('/');
  const name=parts[0]; const fn=pages[name]||pages.home;
  app.innerHTML = fn(qs, parts[1]) + `<footer class="pg">Built from Prof. Mondal's EP61201 slides, tutorial sheets and the last five end-sem papers. Out-of-syllabus slides excluded. Verify anything surprising against your class notes.</footer>`;
  $$('.sidebar a').forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#/'+path));
  if(name==='bep') wireBep(); if(name==='tools') wireTools(qs); if(name==='flash') wireFlash(qs); if(name==='mock') wireMock();
  updateProgress();
  const anchor=qs.get('a'); if(anchor){ const el=document.getElementById(anchor); if(el){ if(el.tagName==='DETAILS') el.open=true; el.scrollIntoView({behavior:'smooth',block:'start'}); return; } }
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();
})();
