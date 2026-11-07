// Racks4L Beats API — Cloudflare Pages Functions + Supabase
const ADM=env=>String(env.ADMIN_TELEGRAM_ID||'971616343');
const J=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json',...h}});
const err=(m,s=400)=>{throw Object.assign(new Error(m),{status:s})};
const enc=new TextEncoder(),hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hmacRaw=async(key,data)=>crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']),enc.encode(data));
const hmac=async(k,d)=>hex(await hmacRaw(enc.encode(k),d));
const pbk=async(pw,salt)=>hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']),256));
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const db=(env,path,method='GET',body)=>fetch(`${env.SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'content-type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},body:body&&JSON.stringify(body)}).then(async r=>{const t=await r.text();if(!r.ok)err(t,500);return t?JSON.parse(t):[]});
const st=(env,path,body)=>fetch(`${env.SUPABASE_URL}/storage/v1/${path}`,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'content-type':'application/json'},body:JSON.stringify(body||{})}).then(async r=>{const d=await r.json();if(!r.ok)err(d.message||'storage',500);return d});
const link=async(env,file,sec)=>{const d=await st(env,`object/sign/masters/${file}`,{expiresIn:sec});return `${env.SUPABASE_URL}/storage/v1${d.signedURL}`};
const tg=(env,method,body)=>fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
const isAdmin=(env,u)=>!!u&&((u.telegram_id&&u.telegram_id===String(ADM(env)))||(env.ADMIN_LOGIN&&u.login===env.ADMIN_LOGIN));

async function tgVerify(env,body){const {hash,...d}=body;const check=Object.keys(d).sort().map(k=>`${k}=${d[k]}`).join('\n');const key=await crypto.subtle.digest('SHA-256',enc.encode(env.BOT_TOKEN));if(hex(await hmacRaw(key,check))!==hash||Date.now()/1e3-d.auth_date>86400)err('Telegram-подпись неверна',401);return d}
async function session(env,u){const exp=Date.now()+2592e6,sig=await hmac(env.SESSION_SECRET,u.id+'.'+exp);return {'set-cookie':`s=${u.id}.${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}}
async function me(req,env){const c=(req.headers.get('cookie')||'').match(/(?:^|; )s=([^;]+)/);if(!c)return null;const [id,exp,sig]=c[1].split('.');if(+exp<Date.now()||sig!==await hmac(env.SESSION_SECRET,id+'.'+exp))return null;const [u]=await db(env,`users?id=eq.${id}&select=id,login,telegram_id,tg_username`);if(u)u.admin=isAdmin(env,u);return u||null}

async function sendFile(env,chat,file,name,caption){
  const r=await fetch(await link(env,file,600));if(!r.ok)return false;
  const fd=new FormData();fd.append('chat_id',chat);fd.append('caption',caption);fd.append('document',new Blob([await r.arrayBuffer()]),name);
  return (await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`,{method:'POST',body:fd}).then(x=>x.json())).ok;
}
async function markPaid(env,id){
  const [o]=await db(env,`orders?id=eq.${id}&select=*,users(telegram_id),order_items(beat_id,title,license,file)`);
  if(!o)err('Заказ не найден',404);
  if(o.status==='paid')return {code:o.code,already:true,failed:[]};
  await db(env,`orders?id=eq.${id}`,'PATCH',{status:'paid',paid_at:new Date().toISOString()});
  await db(env,`beats?id=in.(${o.order_items.map(i=>+i.beat_id).join(',')})`,'PATCH',{active:false});
  const failed=[],chat=o.users?.telegram_id;
  if(o.delivery==='telegram'){
    if(!chat)failed.push('Telegram покупателя не привязан');
    else{
      await tg(env,'sendMessage',{chat_id:chat,text:`Заказ ${o.code} оплачен ✅ Отправляю файлы…`});
      for(const i of o.order_items){
        const ext=(i.file.match(/\.[A-Za-z0-9]+$/)||[''])[0],name=`${i.title} - ${i.license.toUpperCase()}${ext}`.replace(/[\\/:*?"<>|]/g,'_');
        const ok=await sendFile(env,chat,i.file,name,`${i.title} · ${i.license.toUpperCase()}`).catch(()=>false);
        if(!ok)failed.push(`${i.title} ${i.license.toUpperCase()}`);
      }
    }
  }
  return {code:o.code,failed};
}

export async function onRequest({request,env}){
  const url=new URL(request.url),p=url.pathname.replace(/^\/api\//,'').replace(/\/$/,''),m=request.method;
  try{
    const body=m==='GET'||m==='DELETE'?{}:await request.json().catch(()=>({}));
    // ---- Telegram webhook (кнопки администратора)
    if(p==='tg'){
      if(request.headers.get('x-telegram-bot-api-secret-token')!==env.TG_SECRET)err('no',403);
      const q=body.callback_query;
      const msg=body.message;
      if(msg?.text?.startsWith('/start'))await tg(env,'sendMessage',{chat_id:msg.chat.id,text:`Racks4L Beats бот работает.\nВаш Telegram ID: ${msg.from.id}\nСюда приходят уведомления о заказах и ссылки на купленные файлы.`});
      if(q&&String(q.from.id)===String(ADM(env))){
        const [a,id]=q.data.split(':');
        const ed=(text,kb)=>tg(env,'editMessageText',{chat_id:q.message.chat.id,message_id:q.message.message_id,text,reply_markup:{inline_keyboard:kb||[]}});
        if(a==='ok'){const r=await markPaid(env,+id);await ed(r.already?`✅ ${r.code}: уже выдан`:`✅ ${r.code}: оплата подтверждена, бит снят с продажи`+(r.failed.length?`\n⚠️ Не отправлено: ${r.failed.join(', ')}`:'\nФайлы отправлены покупателю'))}
        if(a==='no'){const [o]=await db(env,`orders?id=eq.${+id}&select=code,status,users(telegram_id)`);
          if(o&&o.status!=='paid'){await db(env,`orders?id=eq.${+id}`,'PATCH',{status:'declined'});
            await ed(`❌ ${o.code}: деньги не получены`,[[{text:'✅ Всё же поступили, отправить товар',callback_data:'ok:'+id}]]);
            if(o.users?.telegram_id)await tg(env,'sendMessage',{chat_id:o.users.telegram_id,text:`По заказу ${o.code} оплата не поступила. Если вы оплатили — напишите продюсеру.`})}}
        await tg(env,'answerCallbackQuery',{callback_query_id:q.id});
      }
      return J({ok:true});
    }
    const u=await me(request,env);
    // ---- Публичное
    if(p==='init'){
      const [beats,sets]=await Promise.all([db(env,'beats?active=eq.true&order=id.desc'),db(env,'settings?select=*')]);
      const s=Object.fromEntries(sets.map(x=>[x.key,x.value]));
      return J({me:u,bot:env.BOT_USERNAME||'',bot_id:String(env.BOT_TOKEN||'').split(':')[0],pay:env.PAY_DETAILS||'',media:`${env.SUPABASE_URL}/storage/v1/object/public/media/`,about:s.about||{},licenses:s.licenses||{},
        beats:beats.map(b=>({id:b.id,title:b.title,genre:b.genre,musical_key:b.musical_key,bpm:b.bpm,cover:b.cover,demo:b.demo,
          mp3_price:b.mp3_file?b.mp3_price:0,wav_price:b.wav_file?b.wav_price:0,stems_price:b.stems_file?b.stems_price:0}))});
    }
    if(p==='auth/register'||p==='auth/login'){
      const login=String(body.login||'').trim().toLowerCase(),pw=String(body.password||'');
      if(!/^[a-z0-9_.-]{3,32}$/.test(login))err('Логин: 3–32 символа, латиница/цифры/_.-');
      if(pw.length<6)err('Пароль минимум 6 символов');
      let user;
      if(p==='auth/register'){
        if((await db(env,`users?login=eq.${login}&select=id`)).length)err('Логин занят');
        const salt=crypto.getRandomValues(new Uint8Array(16));
        [user]=await db(env,'users','POST',{login,pass_hash:hex(salt)+':'+await pbk(pw,salt)});
      }else{
        [user]=await db(env,`users?login=eq.${login}`);
        if(!user||!user.pass_hash)err('Неверный логин или пароль',401);
        const [s,h]=user.pass_hash.split(':');
        if(await pbk(pw,Uint8Array.from(s.match(/../g),x=>parseInt(x,16)))!==h)err('Неверный логин или пароль',401);
      }
      return J({ok:true},200,await session(env,user));
    }
    if(p==='auth/telegram'){
      const d=await tgVerify(env,body);
      let [user]=await db(env,`users?telegram_id=eq.${d.id}`);
      if(!user)[user]=await db(env,'users','POST',{telegram_id:String(d.id),tg_username:d.username||d.first_name||''});
      return J({ok:true},200,await session(env,user));
    }
    if(p==='auth/logout')return J({ok:true},200,{'set-cookie':'s=; Path=/; Max-Age=0'});
    // ---- Покупатель
    if(!u)err('Нужен вход',401);
    if(p==='auth/link-telegram'){const d=await tgVerify(env,body);const [x]=await db(env,`users?telegram_id=eq.${d.id}&select=id`);if(x&&x.id!==u.id)err('Этот Telegram уже привязан к другому аккаунту');await db(env,`users?id=eq.${u.id}`,'PATCH',{telegram_id:String(d.id),tg_username:d.username||d.first_name||''});return J({ok:true})}
    if(p==='order'){
      const items=(body.items||[]).slice(0,50),ids=[...new Set(items.map(i=>+i.id))].filter(Boolean);
      if(!ids.length)err('Корзина пуста');
      const delivery=body.delivery==='telegram'?'telegram':'site';
      if(delivery==='telegram'&&!u.telegram_id)err('Для выдачи в Telegram войдите через Telegram');
      const bs=await db(env,`beats?id=in.(${ids.join(',')})&active=eq.true`),rows=[];
      for(const i of items){const b=bs.find(x=>x.id==i.id),l=i.l;
        if(!b||!['mp3','wav','stems'].includes(l)||!(b[l+'_price']>0)||!b[l+'_file'])err('Лицензия недоступна');
        rows.push({beat_id:b.id,title:b.title,license:l,price:b[l+'_price'],file:b[l+'_file']})}
      const total=rows.reduce((a,r)=>a+r.price,0),code='R4L-'+rnd(3).toUpperCase();
      const [o]=await db(env,'orders','POST',{code,user_id:u.id,delivery,total});
      await db(env,'order_items','POST',rows.map(r=>({...r,order_id:o.id})));
      if(env.BOT_TOKEN&&ADM(env))await tg(env,'sendMessage',{chat_id:ADM(env),
        text:`🧾 Новый заказ ${code}\nПокупатель: ${u.login||'@'+u.tg_username}\nВыдача: ${delivery}\nСумма: ${total} ₽\n`+rows.map(r=>`• ${r.title} — ${r.license.toUpperCase()} (${r.price} ₽)`).join('\n'),
        reply_markup:{inline_keyboard:[[{text:'✅ Деньги поступили, отправить товар',callback_data:'ok:'+o.id}],[{text:'❌ Деньги не получил',callback_data:'no:'+o.id}]]}});
      return J({code,total});
    }
    if(p==='orders'){
      const os=await db(env,`orders?user_id=eq.${u.id}&order=id.desc&select=*,order_items(title,license,price,file)`);
      for(const o of os)for(const i of o.order_items){i.url=o.status==='paid'?await link(env,i.file,3600):null;delete i.file}
      return J(os);
    }
    // ---- Админ
    if(!u.admin)err('Нет доступа',403);
    if(p==='admin/sign'){
      const bucket=body.bucket==='masters'?'masters':'media',path=`${Date.now()}-${rnd(3)}-${String(body.name||'f').replace(/[^\w.-]/g,'_')}`;
      const d=await st(env,`object/upload/sign/${bucket}/${path}`);
      return J({path,url:d.url.startsWith('http')?d.url:`${env.SUPABASE_URL}/storage/v1${d.url}`});
    }
    if(p==='admin/beat'){
      if(m==='POST'){const {id,...b}=body;const f=['title','genre','musical_key','bpm','cover','demo','mp3_file','wav_file','stems_file','mp3_price','wav_price','stems_price','active'],v={};
        f.forEach(k=>{if(k in b)v[k]=b[k]});if(!id&&!v.title)err('Нужно название');
        return J(id?await db(env,`beats?id=eq.${+id}`,'PATCH',v):await db(env,'beats','POST',v));}
      if(m==='DELETE'){await db(env,`beats?id=eq.${+url.searchParams.get('id')}`,'DELETE');return J({ok:true})}
    }
    if(p==='admin/beats')return J(await db(env,'beats?order=id.desc&select=id,title,genre,bpm,active'));
    if(p==='admin/setting'){if(!['about','licenses'].includes(body.key))err('key');return J(await db(env,'settings?on_conflict=key','POST',{key:body.key,value:body.value}))}
    if(p==='admin/orders')return J(await db(env,'orders?order=id.desc&limit=50&select=id,code,status,total,delivery,created_at,users(login,tg_username)'));
    if(p==='admin/paid')return J(await markPaid(env,+body.id));
    err('Не найдено',404);
  }catch(e){return J({error:e.message},e.status||500)}
}
