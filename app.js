const KEY='crm_grupojota_v1';
const FUNIS={
  cliente:{nome:'Clientes',etapas:['Novo','Contatado','Qualificado','Proposta','Negociação','Ganho','Perdido'],ganho:'Ganho',perdido:'Perdido',ganhoLbl:'Vendas ganhas',
    bant:['Tem orçamento','Fala com quem decide','Tem necessidade real','Compra em até 30 dias']},
  oficina:{nome:'Oficinas',etapas:['Prospecção','Contato feito','Reunião agendada','Proposta enviada','Em credenciamento','Credenciada','Perdida'],ganho:'Credenciada',perdido:'Perdida',ganhoLbl:'Oficinas credenciadas',
    bant:['Quer receber mais clientes','Fala com o dono/decisor','Tem estrutura e equipamentos','Pode começar em até 30 dias']}
};
const ETAPAS_ANTIGAS=['Novo','Contatado','Qualificado','Proposta','Negociação','Ganho','Perdido'];
const ORIGENS=['Indicação','WhatsApp','Instagram','Site','Google','Evento','Ligação ativa','Outro'];
let leads=[],edit=null,view='b',funil='cliente';
const $=id=>document.getElementById(id);
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let synced=new Map(),chain=Promise.resolve(),warned=false,live=false;
const aviso=()=>{if(!warned){warned=true;alert('Não foi possível salvar na nuvem agora. Verifique a internet e tente de novo.')}};
const save=()=>{chain=chain.then(sync)};
async function sync(){
  try{
    const cur=new Map(leads.map(l=>[l.id,JSON.stringify(l)]));
    const up=[...cur].filter(([id,s])=>synced.get(id)!==s);
    if(up.length){
      const {error}=await sb.from('leads').upsert(up.map(([id,s])=>({id,dados:JSON.parse(s)})));
      if(error)throw error;
      up.forEach(([id,s])=>synced.set(id,s));
    }
    const del=[...synced.keys()].filter(id=>!cur.has(id));
    if(del.length){
      const {error}=await sb.from('leads').delete().in('id',del);
      if(error)throw error;
      del.forEach(id=>synced.delete(id));
    }
  }catch(e){console.error(e);aviso()}
}
async function carregar(){
  const {data,error}=await sb.from('leads').select('id,dados');
  if(error){console.error(error);aviso();return}
  leads=data.map(r=>({...r.dados,id:r.id}));
  synced=new Map(leads.map(l=>[l.id,JSON.stringify(l)]));
  let mig=false;
  leads.forEach(l=>{if(!l.tipo){
    if(norm(l.interesse||'').includes('credenciamento')){
      l.tipo='oficina';const i=ETAPAS_ANTIGAS.indexOf(l.etapa);l.etapa=FUNIS.oficina.etapas[i<0?0:i];
    }else l.tipo='cliente';
    mig=true;}});
  if(mig)save();
  if(edit)edit=leads.find(l=>l.id===edit.id)||edit;
  render();
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const score=l=>(l.b1?25:0)+(l.b2?25:0)+(l.b3?25:0)+(l.b4?25:0);
const temp=l=>{const s=score(l);return s>=75?['Quente','t-q']:s>=50?['Morno','t-m']:['Frio','t-f']};
const today=()=>new Date().toISOString().slice(0,10);
const tipoDe=l=>l.tipo==='oficina'?'oficina':'cliente';
const fechada=l=>{const f=FUNIS[tipoDe(l)];return l.etapa===f.ganho||l.etapa===f.perdido};
const atrasado=l=>l.prox&&l.prox<today()&&!fechada(l);
const tag=l=>{const[t,c]=temp(l);return `<span class="tag ${c}">${t} ${score(l)}</span>`};
const wa=l=>{const n=String(l.tel||'').replace(/\D/g,'');if(!n)return '';const f=n.length<=11?'55'+n:n;return `<a class="wa" target="_blank" rel="noopener" href="https://wa.me/${f}" onclick="event.stopPropagation()">WhatsApp</a>`};
const fmtD=d=>d?d.split('-').reverse().join('/'):'-';
const gc=l=>{if(!l.prox)return '';const n=new Date(l.prox+'T12:00:00');n.setDate(n.getDate()+1);const e=n.toISOString().slice(0,10).replace(/-/g,'');const t=encodeURIComponent('Follow-up: '+l.nome+(l.empresa?' ('+l.empresa+')':''));const d=encodeURIComponent('Etapa: '+l.etapa+(l.interesse?' | Interesse: '+l.interesse:'')+(l.tel?' | Tel: '+l.tel:'')+(l.valor?' | Valor: '+brl(l.valor):''));return `<a class="wa" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${l.prox.replace(/-/g,'')}/${e}&details=${d}" onclick="event.stopPropagation()">Agenda</a>`};

function popTipo(t,et){
  $('etapa').innerHTML=FUNIS[t].etapas.map(e=>`<option>${e}</option>`).join('');
  if(et)$('etapa').value=et;
  FUNIS[t].bant.forEach((x,i)=>$('bl'+(i+1)).textContent=' '+x);
}
$('tipo').innerHTML=Object.entries(FUNIS).map(([k,v])=>`<option value="${k}">${v.nome}</option>`).join('');
$('tipo').onchange=()=>popTipo($('tipo').value);
popTipo('cliente');
function setFunil(f){
  funil=f;
  document.querySelectorAll('#funis button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));
  render();
}
document.querySelectorAll('#funis button').forEach(b=>b.onclick=()=>setFunil(b.dataset.f));
$('origem').innerHTML=ORIGENS.map(e=>`<option>${e}</option>`).join('');
$('fO').innerHTML+=ORIGENS.map(e=>`<option>${e}</option>`).join('');

function filtrados(){
  const q=$('q').value.toLowerCase(),t=$('fT').value,o=$('fO').value;
  return leads.filter(l=>tipoDe(l)===funil&&(!q||[l.nome,l.empresa,l.tel,l.email,l.interesse].join(' ').toLowerCase().includes(q))&&(!t||temp(l)[0]===t)&&(!o||l.origem===o));
}
function kpis(){
  const A=leads.filter(l=>tipoDe(l)===funil),f=FUNIS[funil];
  const abertos=A.filter(l=>!fechada(l));
  const g=A.filter(l=>l.etapa===f.ganho),p=A.filter(l=>l.etapa===f.perdido);
  const fechados=g.length+p.length;
  const conv=fechados?Math.round(g.length/fechados*100)+'%':'-';
  const quentes=abertos.filter(l=>temp(l)[0]==='Quente').length;
  const at=abertos.filter(atrasado).length;
  const soma=L=>brl(L.reduce((a,l)=>a+(+l.valor||0),0));
  const nC=leads.filter(l=>tipoDe(l)==='cliente').length,nO=leads.length-nC;
  const v=[[leads.length,`Total nos dois funis<br>${nC} clientes · ${nO} oficinas`],[A.length,'Total neste funil'],
    funil==='cliente'?[soma(abertos),'Em negociação']:[abertos.length,'Em andamento'],
    [quentes,'Leads quentes'],
    funil==='cliente'?[soma(g),f.ganhoLbl]:[g.length,f.ganhoLbl],
    [conv,'Conversão'],[at,'Follow-ups atrasados']];
  $('kpis').innerHTML=v.map(([a,b])=>`<div class="k"><b>${a}</b><span>${b}</span></div>`).join('');
  $('nc').textContent=nC;
  $('no').textContent=nO;
}
function cardH(l){
  const c=temp(l)[1].replace('t-','c-');
  return `<div class="card ${c}" draggable="true" data-id="${l.id}">
  <div class="ch"><span class="av">${esc((l.nome||'?').trim().charAt(0).toUpperCase())}</span><div class="cn"><strong>${esc(l.nome)}</strong><small>${esc(l.empresa||l.interesse||'')}</small></div></div>
  <div class="vr"><b class="val">${l.valor?brl(l.valor):'&nbsp;'}</b>${tag(l)}</div>
  <div class="cf"><small class="${atrasado(l)?'late':''}">${l.prox?'Contato: '+fmtD(l.prox).slice(0,5):'Sem follow-up'}</small><span>${gc(l)} ${wa(l)}</span></div></div>`;
}
function render(){
  kpis();
  const f=filtrados();
  const v=$('view');
  if(!leads.some(l=>tipoDe(l)===funil)){v.innerHTML='<div class="empty">Nenhum lead neste funil ainda. Clique em "+ Novo lead" ou importe um CSV.</div>';return}
  if(view==='b'){
    v.innerHTML='<div class="board">'+FUNIS[funil].etapas.map(e=>{const L=f.filter(l=>l.etapa===e);
      return `<div class="col" data-e="${e}"><h3><span><i class="dot d${FUNIS[funil].etapas.indexOf(e)}"></i>${e}</span><small>${L.length} · ${brl(L.reduce((a,l)=>a+(+l.valor||0),0))}</small></h3>${L.map(cardH).join('')}</div>`}).join('')+'</div>';
    v.querySelectorAll('.card').forEach(c=>{
      c.onclick=()=>abrir(c.dataset.id);
      c.ondragstart=ev=>ev.dataTransfer.setData('text/plain',c.dataset.id);
    });
    v.querySelectorAll('.col').forEach(c=>{
      c.ondragover=ev=>ev.preventDefault();
      c.ondrop=ev=>{ev.preventDefault();const l=leads.find(x=>x.id===ev.dataTransfer.getData('text/plain'));if(l){l.etapa=c.dataset.e;save();render()}};
    });
  }else{
    let L=f;
    if(view==='a')L=f.filter(l=>l.prox&&!fechada(l)).sort((a,b)=>a.prox.localeCompare(b.prox));
    else L=[...f].sort((a,b)=>score(b)-score(a));
    v.innerHTML=L.length?`<div class="tw"><table><tr><th>Lead</th><th>Etapa</th><th>Qualificação</th><th>Valor</th><th>Origem</th><th>Próx. contato</th><th></th></tr>`+
      L.map(l=>`<tr class="c" data-id="${l.id}"><td><b>${esc(l.nome)}</b><br><small>${esc(l.empresa)}</small></td><td>${l.etapa}</td><td>${tag(l)}</td><td>${l.valor?brl(l.valor):'-'}</td><td>${esc(l.origem)}</td><td class="${atrasado(l)?'late':''}">${fmtD(l.prox)}</td><td>${gc(l)} ${wa(l)}</td></tr>`).join('')+'</table></div>':'<div class="empty">Nada por aqui.</div>';
    v.querySelectorAll('tr.c').forEach(r=>r.onclick=()=>abrir(r.dataset.id));
  }
}
const campos=['nome','empresa','tel','email','origem','etapa','interesse','valor','prox','motivo','obs'];
function abrir(id){
  edit=id?leads.find(l=>l.id===id):null;
  const t=edit?tipoDe(edit):funil;
  const l=edit||{etapa:FUNIS[t].etapas[0],origem:ORIGENS[0]};
  $('tipo').value=t;popTipo(t);
  campos.forEach(c=>$(c).value=l[c]??'');
  ['b1','b2','b3','b4'].forEach(c=>$(c).checked=!!l[c]);
  $('dt').textContent=edit?'Editar lead':'Novo lead';
  $('del').style.visibility=edit?'visible':'hidden';
  $('dlg').showModal();
}
$('novo').onclick=()=>abrir(null);
$('cancel').onclick=()=>$('dlg').close();
$('x').onclick=()=>$('dlg').close();
$('save').onclick=()=>{
  if(!$('nome').value.trim()){$('nome').focus();return}
  const o=edit||{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),criado:today()};
  campos.forEach(c=>o[c]=$(c).value.trim());
  ['b1','b2','b3','b4'].forEach(c=>o[c]=$(c).checked);
  o.tipo=$('tipo').value;
  if(!edit)leads.push(o);
  save();$('dlg').close();setFunil(o.tipo);
};
$('del').onclick=()=>{if(edit&&confirm('Excluir este lead?')){leads=leads.filter(l=>l!==edit);save();$('dlg').close();render()}};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('on'));b.classList.add('on');view=b.dataset.v;render();
});
['q','fT','fO'].forEach(i=>$(i).oninput=render);
const parseCSV=t=>{t=t.replace(/^\ufeff/,'');const first=t.split(/\r?\n/)[0],Q=String.fromCharCode(34);const sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch===Q){if(t[i+1]===Q){c+=Q;i++}else q=false}else c+=ch}else if(ch===Q)q=true;else if(ch===sep){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';rows.push(r);r=[]}else c+=ch}if(c||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(y=>y.trim()))};
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const MAP={nome:'nome',empresa:'empresa',telefone:'tel',whatsapp:'tel',celular:'tel',email:'email',origem:'origem',etapa:'etapa',interesse:'interesse',produto:'interesse',valor:'valor',tipo:'tipo',funil:'tipo',proximocontato:'prox',proximo:'prox',score:'score',observacoes:'obs',observacao:'obs',obs:'obs'};
const pValor=v=>{v=String(v||'').replace(/[^\d,.-]/g,'');if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');return v&&!isNaN(v)?v:''};
const pData=d=>{d=String(d||'').trim();const m=d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:''};
$('imp').onclick=()=>$('file').click();
$('file').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{if(rd.result.includes('\ufffd')&&!rd.retry){rd.retry=1;rd.readAsText(f,'windows-1252');return}try{const rows=parseCSV(rd.result);const h=rows.shift().map(x=>MAP[norm(x)]||null);let add=0,skip=0;rows.forEach(r=>{const o={};h.forEach((k,i)=>{if(k)o[k]=(r[i]||'').trim()});if(!o.nome||leads.some(l=>l.nome.toLowerCase()===o.nome.toLowerCase()&&String(l.tel||'')===String(o.tel||''))){skip++;return}const n=Math.min(4,Math.round((+o.score||0)/25));const tp=(norm(o.tipo||'').startsWith('oficina')||(!o.tipo&&norm(o.interesse||'').includes('credenciamento')))?'oficina':'cliente';const et=FUNIS[tp].etapas.find(x=>norm(x)===norm(o.etapa||''))||FUNIS[tp].etapas[0];const og=ORIGENS.find(x=>norm(x)===norm(o.origem||''))||'Outro';leads.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6)+add,criado:today(),nome:o.nome,empresa:o.empresa||'',tel:o.tel||'',email:o.email||'',origem:og,tipo:tp,etapa:et,interesse:o.interesse||'',valor:pValor(o.valor),prox:pData(o.prox),motivo:'',obs:o.obs||'',b1:n>0,b2:n>1,b3:n>2,b4:n>3});add++});save();render();alert(add+' leads importados'+(skip?'; '+skip+' ignorados (sem nome ou repetidos).':'.'))}catch(x){alert('Não foi possível ler o arquivo. Use um CSV com cabeçalho na primeira linha.')}e.target.value=''};rd.readAsText(f,'utf-8')};
$('exp').onclick=()=>{
  const h=['Nome','Empresa','Telefone','Email','Origem','Etapa','Interesse','Valor','Proximo contato','Score','Temperatura','Observacoes','Tipo'];
  const r=leads.map(l=>[l.nome,l.empresa,l.tel,l.email,l.origem,l.etapa,l.interesse,String(l.valor||'').replace('.',','),l.prox,score(l),temp(l)[0],l.obs,FUNIS[tipoDe(l)].nome]);
  const csv=[h,...r].map(a=>a.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='leads-grupo-jota.csv';a.click();
};
render();

// ---- Login e inicialização ----
async function entrar(){
  $('login').hidden=true;$('app').hidden=false;
  await carregar();
  if(!live){live=true;
    sb.channel('leads-equipe').on('postgres_changes',{event:'*',schema:'public',table:'leads'},()=>{chain=chain.then(carregar)}).subscribe();
  }
}
$('lbtn').onclick=async()=>{
  $('lerr').textContent='';
  const {error}=await sb.auth.signInWithPassword({email:$('lemail').value.trim(),password:$('lsenha').value});
  if(error){$('lerr').textContent='E-mail ou senha incorretos.';return}
  entrar();
};
$('lsenha').onkeydown=e=>{if(e.key==='Enter')$('lbtn').click()};
$('out').onclick=async()=>{await sb.auth.signOut();location.reload()};
sb.auth.getSession().then(({data})=>{if(data.session)entrar();else $('login').hidden=false});
