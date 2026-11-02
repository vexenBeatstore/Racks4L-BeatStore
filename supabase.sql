-- Supabase → SQL Editor → вставить всё → Run
create table if not exists users(id uuid primary key default gen_random_uuid(),login text unique,pass_hash text,telegram_id text unique,tg_username text,created_at timestamptz default now());
create table if not exists settings(key text primary key,value jsonb not null default '{}');
create table if not exists beats(id bigserial primary key,title text not null,genre text default '',musical_key text default '',bpm int default 0,cover text,demo text,mp3_file text,wav_file text,stems_file text,mp3_price int default 0,wav_price int default 0,stems_price int default 0,active boolean default true,created_at timestamptz default now());
create table if not exists orders(id bigserial primary key,code text unique,user_id uuid references users(id),delivery text default 'site',status text default 'pending',total int,created_at timestamptz default now(),paid_at timestamptz);
create table if not exists order_items(id bigserial primary key,order_id bigint references orders(id) on delete cascade,beat_id bigint,title text,license text,price int,file text);
alter table users enable row level security; alter table settings enable row level security; alter table beats enable row level security; alter table orders enable row level security; alter table order_items enable row level security;
insert into storage.buckets(id,name,public) values('media','media',true),('masters','masters',false) on conflict do nothing;
