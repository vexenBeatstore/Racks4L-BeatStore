const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={me:null,beats:[],about:{},licenses:{},cart:JSON.parse(localStorage.r4l||'[]'),cur:null,view:[],f:{q:'',g:'',s:'new'}},LIC=['mp3','wav','stems'];
const U=p=>p?S.media+p:'',fmt=t=>isFinite(t)?Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'):'0:00';
const api=async(p,body,method)=>{const r=await fetch('/api/'+p,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json'},body:body&&JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Ошибка');return d};
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._);t._=setTimeout(()=>t.style.display='none',3200)};
const ov=h=>{$('#box').className='box';$('#box').innerHTML=h;$('#ov').hidden=false},closeOv=()=>$('#ov').hidden=true;
const go=async f=>{try{await f()}catch(e){toast(e.message)}};
async function init(){const d=await api('init');Object.assign(S,d);head();render()}
function head(){$('#acc').textContent=S.me?(S.me.login||'@'+S.me.tg_username):'Войти';$('#adm').hidden=!S.me?.admin;$('#cc').textContent=S.cart.length}
function render(){
  const a=S.about,L=S.licenses;
  $('#about').innerHTML=`<div class="ab">${a.photo?`<img src="${U(a.photo)}" alt="">`:''}<div><small>О ПРОДЮСЕРЕ</small><h1>${esc(a.name||'Racks4L')}</h1><p>${esc(a.text||'Описание продюсера появится здесь.')}</p>
  <div class="tags">${(a.genres||[]).map(g=>`<span>${esc(g)}</span>`).join('')}</div><div class="links">${(a.links||[]).map(l=>`<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)} ↗</a>`).join('')}</div></div></div>`;
  $('#licenses').innerHTML=`<h2>Лицензии</h2><div class="lg">${LIC.map(k=>{const l=L[k]||{};return `<div class="lc"><div class="im">${l.cover?`<img src="${U(l.cover)}" alt="" loading="lazy">`:''}</div><div class="t"><h3>${k.toUpperCase()}</h3><p>${esc(l.terms||'Условия лицензии будут указаны здесь.')}</p></div></div>`}).join('')}</div>`;
  renderGenres();renderList();
}
const gl=b=>String(b.genre||'').split(/[,/]/).map(s=>s.trim()).filter(Boolean);
const price=b=>Math.min(...LIC.map(l=>b[l+'_price']).filter(p=>p>0),Infinity);
function hit(b,t){if(t==='bpm')return true;const r=t.match(/^(\d+)[-–](\d+)$/);if(r)return b.bpm>=+r[1]&&b.bpm<=+r[2];
  return [b.title,b.genre,b.musical_key].join(' ').toLowerCase().includes(t)||(/^\d+$/.test(t)&&String(b.bpm).startsWith(t))}
function calcView(){const f=S.f,toks=f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);let l=S.beats.filter(b=>(!f.g||gl(b).some(g=>g.toLowerCase()===f.g.toLowerCase()))&&toks.every(t=>hit(b,t)));
  const by={new:(a,b)=>b.id-a.id,old:(a,b)=>a.id-b.id,bpmA:(a,b)=>a.bpm-b.bpm||b.id-a.id,bpmD:(a,b)=>b.bpm-a.bpm||b.id-a.id,prA:(a,b)=>price(a)-price(b)||b.id-a.id,prD:(a,b)=>(isFinite(price(b))?price(b):-1)-(isFinite(price(a))?price(a):-1)||b.id-a.id,az:(a,b)=>String(a.title).localeCompare(b.title,'ru')};
  return S.view=l.sort(by[f.s]||by.new)}
function renderGenres(){const m=new Map();S.beats.forEach(b=>gl(b).forEach(g=>{const k=g.toLowerCase();if(!m.has(k))m.set(k,g)}));
  if(S.f.g&&!m.has(S.f.g.toLowerCase()))S.f.g='';
  $('#gf').innerHTML=m.size?[['','Все'],...[...m.values()].sort((a,b)=>a.localeCompare(b,'ru')).map(g=>[g,g])].map(([g,t])=>`<button class="chip ${S.f.g.toLowerCase()===g.toLowerCase()?'on':''}" data-g="${esc(g)}" onclick="setG(this.dataset.g)">${esc(t)}</button>`).join(''):''}
const setG=g=>{S.f.g=g;renderGenres();renderList()};
function renderList(){const l=calcView(),all=S.beats.length;
  $('#cnt').textContent=all?(l.length===all?`Битов: ${all}`:`Найдено: ${l.length} из ${all}`):'';
  $('#grid').innerHTML=l.map(b=>`<article class="beat ${S.cur===b.id?'on':''}" data-id="${b.id}"><button class="pbt" onclick="play(${b.id})" aria-label="Play" ${b.demo?'':'disabled'}></button>
  <div class="bt"><h3>${esc(b.title)}</h3></div><div class="mt"><span class="bg">${esc(b.genre)}</span><span class="bk">${esc(b.musical_key)}</span><span class="bb">${b.bpm||''}${b.bpm?' BPM':''}</span></div>
  <div class="lic">${LIC.filter(x=>b[x+'_price']>0).map(x=>`<button class="chip ${S.cart.some(c=>c.id==b.id&&c.l==x)?'on':''}" onclick="addCart(${b.id},'${x}')">${x.toUpperCase()} · ${b[x+'_price']} ₽</button>`).join('')||'<small>Недоступен</small>'}</div></article>`).join('')
  ||(all?'<p class="muted">Ничего не найдено. <button class="chip" onclick="resetF()">Сбросить фильтры</button></p>':'<p class="muted">Биты скоро появятся.</p>');
  mark()}
function resetF(){S.f={q:'',g:'',s:S.f.s};$('#q').value='';renderGenres();renderList()}
$('#q').oninput=e=>{S.f.q=e.target.value;renderList()};$('#so').onchange=e=>{S.f.s=e.target.value;renderList()};
// ---- Плеер
const A=new Audio();A.volume=.8;
function play(id){const b=S.beats.find(x=>x.id===id);if(!b?.demo)return toast('Нет демо');
  if(S.cur===id){return toggle()}S.cur=id;A.src=U(b.demo);A.play();$('#pl').hidden=false;$('#pt').textContent=b.title;$('#pm').textContent=`${b.genre} · ${b.musical_key} · ${b.bpm} BPM`;mark()}
const toggle=()=>A.paused?A.play():A.pause();
function step(d){const l=S.view.filter(b=>b.demo);if(!l.length)return;const i=l.findIndex(b=>b.id===S.cur),n=l[i<0?(d>0?0:l.length-1):(i+d+l.length)%l.length];if(n.id===S.cur){A.currentTime=0;A.play();return}play(n.id)}
function mark(){document.querySelectorAll('.beat').forEach(e=>{e.classList.toggle('on',+e.dataset.id===S.cur);e.classList.toggle('playing',+e.dataset.id===S.cur&&!A.paused)});$('#pp').textContent=A.paused?'▶':'❚❚'}
A.onplay=A.onpause=mark;A.onended=()=>step(1);
A.ontimeupdate=()=>{$('#tc').textContent=fmt(A.currentTime);$('#td').textContent=fmt(A.duration);if(A.duration)$('#sk').value=A.currentTime/A.duration*1000};
$('#sk').oninput=e=>{if(A.duration)A.currentTime=e.target.value/1000*A.duration};$('#vol').oninput=e=>A.volume=e.target.value/100;
// ---- Аккаунт
function account(){
  if(S.me)return ov(`<h3>${esc(S.me.login||'@'+S.me.tg_username)}</h3><button class="primary" onclick="go(async()=>{await api('auth/logout',{});location.reload()})">Выйти</button>`);
  ov(`<h3>Вход / регистрация</h3><label>Логин</label><input id="lg" autocomplete="username"><label>Пароль</label><input id="pw" type="password" autocomplete="current-password">
  <div style="display:flex;gap:8px;margin-bottom:18px"><button class="primary" onclick="auth('login')">Войти</button><button onclick="auth('register')">Регистрация</button></div><div id="tgw"></div>`);
  if(S.bot){const s=document.createElement('script');s.async=true;s.src='https://telegram.org/js/telegram-widget.js?22';s.dataset.telegramLogin=S.bot;s.dataset.size='large';s.dataset.radius='12';s.dataset.requestAccess='write';s.dataset.onauth='onTg(user)';$('#tgw').append(s)}
}
const auth=m=>go(async()=>{await api('auth/'+m,{login:$('#lg').value,password:$('#pw').value});await done()});
window.onTg=u=>go(async()=>{await api('auth/telegram',u);await done()});
async function done(){closeOv();await init();toast('Готово')}
// ---- Корзина / заказ
function addCart(id,l){const i=S.cart.findIndex(c=>c.id==id&&c.l==l);i<0?S.cart.push({id,l}):S.cart.splice(i,1);saveCart();renderList()}
function saveCart(){localStorage.r4l=JSON.stringify(S.cart);head()}
function cartView(){
  const it=S.cart.map(c=>{const b=S.beats.find(x=>x.id==c.id);return b&&b[c.l+'_price']>0?{...c,b,p:b[c.l+'_price']}:null}).filter(Boolean),t=it.reduce((a,i)=>a+i.p,0);
  ov(`<h3>Корзина</h3>${it.map(i=>`<div class="row"><span>${esc(i.b.title)} <small>${i.l.toUpperCase()}</small></span><span>${i.p} ₽ <button class="chip" onclick="addCart(${i.b.id},'${i.l}');cartView()">✕</button></span></div>`).join('')||'<p class="muted">Пусто</p>'}
  ${it.length?`<div class="row"><b>Итого</b><b>${t} ₽</b></div><label>Получение</label><select id="dl" onchange="dlChange()"><option value="site">На сайте (раздел «Мои заказы»)</option><option value="telegram">В Telegram${S.me?.telegram_id?' ✓ привязан':''}</option></select><div id="tgl"></div><button class="primary" style="width:100%" onclick="checkout()">Оформить заказ</button>`:''}`);
}
function tgWidget(sel,cb){if(!S.bot){$(sel).textContent='Бот не настроен';return}const s=document.createElement('script');s.async=true;s.src='https://telegram.org/js/telegram-widget.js?22';Object.assign(s.dataset,{telegramLogin:S.bot,size:'large',radius:'12',requestAccess:'write',onauth:cb});$(sel).append(s)}
function dlChange(){const t=$('#tgl');t.innerHTML='';if($('#dl').value!=='telegram'||S.me?.telegram_id)return;
  if(!S.me){t.innerHTML='<p class="muted" style="margin-bottom:10px">Сначала войдите в аккаунт, затем привяжите Telegram.</p>';return}
  t.innerHTML='<p class="muted" style="margin-bottom:10px">Привяжите Telegram, чтобы файлы пришли в чат с ботом:</p><div id="tgw2"></div>';tgWidget('#tgw2','onTgLink(user)')}
window.onTgLink=u=>go(async()=>{await api('auth/link-telegram',u);await init();cartView();$('#dl').value='telegram';toast('Telegram привязан')});
const myOrders=()=>S.me?orders():account();
const checkout=()=>go(async()=>{if(!S.me){return account()}
  const r=await api('order',{items:S.cart,delivery:$('#dl').value});S.cart=[];saveCart();render();
  ov(`<h3>Заказ ${esc(r.code)}</h3><p>Сумма: <b>${r.total} ₽</b></p><p class="muted" style="white-space:pre-line;margin:14px 0">${esc(S.pay||'Реквизиты уточняйте у продюсера.')}</p><p>В комментарии к переводу укажите код <b>${esc(r.code)}</b>. После подтверждения оплаты файлы появятся в «Мои заказы» или придут в Telegram.</p><button class="primary" onclick="orders()">Мои заказы</button>`)});
const orders=()=>go(async()=>{const os=await api('orders');ov(`<h3>Мои заказы</h3>${os.map(o=>`<div class="row" style="display:block"><b>${o.code}</b> · ${o.total} ₽ · <small>${o.status==='paid'?'оплачен':o.status==='declined'?'оплата не получена':'ожидает оплаты'}</small>${o.order_items.map(i=>`<div>${esc(i.title)} ${i.license.toUpperCase()} ${i.url?`<a href="${i.url}" download>Скачать</a>`:''}</div>`).join('')}</div>`).join('')||'<p class="muted">Заказов нет</p>'}`)});
// ---- Админка
const T=['Загрузить бит','Лицензии','О продюсере','Каталог','Заказы'];
function openAdmin(t=0){const v=$('#adminv');v.hidden=false;document.body.style.overflow='hidden';
  v.innerHTML=`<div><div class="tabs">${T.map((n,i)=>`<button class="${i==t?'on':''}" onclick="openAdmin(${i})">${n}</button>`).join('')}<button onclick="closeAdmin()" style="margin-left:auto">✕ Закрыть</button></div><div id="tab"></div></div>`;[tUpload,tLic,tAbout,tCat,tOrd][t]()}
const closeAdmin=()=>{$('#adminv').hidden=true;document.body.style.overflow=''};
async function up(f,bucket='media'){if(!f)return null;const s=await api('admin/sign',{bucket,name:f.name}),fd=new FormData();fd.append('cacheControl','3600');fd.append('',f);
  const r=await fetch(s.url,{method:'PUT',body:fd});if(!r.ok)throw new Error('Не загрузилось: '+f.name);return s.path}
const inp=(id,l,t='text',x='')=>`<label>${l}</label><input id="${id}" type="${t}" ${x}>`,fl=(id,l,a='')=>`<label>${l}</label><input id="${id}" type="file" ${a}>`,v=id=>$('#'+id).value,fv=id=>$('#'+id).files[0];
function tUpload(){$('#tab').innerHTML=`<div class="part"><h4>1 · Данные бита</h4>${inp('b_t','Название')}<div class="g3"><div>${inp('b_g','Жанр')}</div><div>${inp('b_k','Ключ (Am, F#m…)')}</div><div>${inp('b_b','BPM','number')}</div></div></div>
  <div class="part"><h4>2 · Файлы</h4>${fl('f_d','Demo (mp3)','accept="audio/*"')}${fl('f_m','MP3 (для продажи)','accept="audio/*"')}${fl('f_w','WAV','accept="audio/*"')}${fl('f_s','STEMS (zip)','accept=".zip"')}</div>
  <div class="part"><h4>3 · Цены, ₽</h4><div class="g3"><div>${inp('p_m','MP3','number','value=500')}</div><div>${inp('p_w','WAV','number','value=1000')}</div><div>${inp('p_s','STEMS','number','value=2000')}</div></div></div>
  <button class="primary" id="sv" onclick="saveBeat()">Опубликовать бит</button>`}
const saveBeat=()=>go(async()=>{const b=$('#sv');b.disabled=true;try{if(!v('b_t'))throw Error('Введите название');b.textContent='Загрузка файлов…';
  const [demo,mp3,wav,stems]=await Promise.all([up(fv('f_d')),up(fv('f_m'),'masters'),up(fv('f_w'),'masters'),up(fv('f_s'),'masters')]);
  await api('admin/beat',{title:v('b_t'),genre:v('b_g'),musical_key:v('b_k'),bpm:+v('b_b')||0,demo,mp3_file:mp3,wav_file:wav,stems_file:stems,mp3_price:+v('p_m')||0,wav_price:+v('p_w')||0,stems_price:+v('p_s')||0});
  toast('Бит опубликован');openAdmin(3);init()}finally{b.disabled=false;b.textContent='Опубликовать бит'}});
function tLic(){const L=S.licenses;$('#tab').innerHTML=LIC.map(k=>`<div class="part"><h4>${k.toUpperCase()}</h4><label>Условия</label><textarea id="t_${k}">${esc(L[k]?.terms||'')}</textarea>${fl('c_'+k,'Обложка (оставьте пустым, чтобы не менять)','accept="image/*"')}</div>`).join('')+`<button class="primary" onclick="saveLic()">Сохранить</button>`}
const saveLic=()=>go(async()=>{const o={};for(const k of LIC)o[k]={terms:v('t_'+k),cover:(await up(fv('c_'+k)))||S.licenses[k]?.cover||''};await api('admin/setting',{key:'licenses',value:o});await init();toast('Сохранено')});
function tAbout(){const a=S.about;$('#tab').innerHTML=`${inp('a_n','Имя / псевдоним',  'text',`value="${esc(a.name||'')}"`)}<label>Описание</label><textarea id="a_t">${esc(a.text||'')}</textarea>${inp('a_g','Жанры (через запятую)','text',`value="${esc((a.genres||[]).join(', '))}"`)}
  <label>Ссылки (по строке: Название | https://…)</label><textarea id="a_l">${esc((a.links||[]).map(l=>l.t+' | '+l.u).join('\n'))}</textarea>${fl('a_p','Фото (пусто — не менять)','accept="image/*"')}<button class="primary" onclick="saveAbout()">Сохранить</button>`}
const saveAbout=()=>go(async()=>{await api('admin/setting',{key:'about',value:{name:v('a_n'),text:v('a_t'),genres:v('a_g').split(',').map(s=>s.trim()).filter(Boolean),
  links:v('a_l').split('\n').map(s=>s.split('|').map(x=>x.trim())).filter(x=>x[1]).map(x=>({t:x[0]||x[1],u:x[1]})),photo:(await up(fv('a_p')))||S.about.photo||''}});await init();toast('Сохранено')});
const tCat=()=>go(async()=>{const bs=await api('admin/beats');$('#tab').innerHTML=bs.map(b=>`<div class="row"><span>${esc(b.title)} <small>${esc(b.genre)} · ${b.bpm}</small></span><span><button class="chip" onclick="togBeat(${b.id},${!b.active})">${b.active?'Скрыть':'Показать'}</button> <button class="chip" onclick="delBeat(${b.id})">Удалить</button></span></div>`).join('')||'<p class="muted">Пусто</p>'});
const togBeat=(id,active)=>go(async()=>{await api('admin/beat',{id,active});await init();tCat()}),delBeat=id=>confirm('Удалить бит?')&&go(async()=>{await api('admin/beat?id='+id,null,'DELETE');await init();tCat()});
const tOrd=()=>go(async()=>{const os=await api('admin/orders');$('#tab').innerHTML=os.map(o=>`<div class="row"><span>${o.code} · ${o.total} ₽ · ${esc(o.users?.login||'@'+o.users?.tg_username)} <small>${o.delivery} · ${o.status}</small></span>${o.status==='paid'?'':`<button class="chip" onclick="go(async()=>{const r=await api('admin/paid',{id:${o.id}});toast(r.failed?.length?'Не отправлено: '+r.failed.join(', '):'Оплата подтверждена');init();tOrd()})">Подтвердить оплату</button>`}</div>`).join('')||'<p class="muted">Заказов нет</p>'});
init();
