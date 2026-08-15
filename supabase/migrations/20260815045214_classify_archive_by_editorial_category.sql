alter table public.raw_items
  add column if not exists editorial_category text;

update public.raw_items
set editorial_category = case
  when content_type = 'culture_event' then 'culture'
  when content_type = 'news_article' then 'news'
  when content_type = 'press_release' then 'official'
  when coalesce(title,'') || ' ' || coalesce(raw_text,'') ~* '(논[[:space:]]*평|성명|입장문|입장[[:space:]])' then 'statement'
  when coalesce(title,'') || ' ' || coalesce(raw_text,'') ~* '(일시[[:space:]]*:|장소[[:space:]]*:|기자회견|문화제|간담회|참여를)' then 'event'
  else 'record'
end
where editorial_category is null;

alter table public.raw_items alter column editorial_category set default 'record';
alter table public.raw_items alter column editorial_category set not null;
alter table public.raw_items drop constraint if exists raw_items_editorial_category_check;
alter table public.raw_items add constraint raw_items_editorial_category_check
  check (editorial_category in ('news','statement','official','event','culture','record'));

create index if not exists raw_items_editorial_category_date_idx
  on public.raw_items(editorial_category,published_at desc);

create schema if not exists private;

create or replace function private.classify_raw_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.editorial_category is null or new.editorial_category = 'record' then
    new.editorial_category := case
      when new.content_type = 'culture_event' then 'culture'
      when new.content_type = 'news_article' then 'news'
      when new.content_type = 'press_release' then 'official'
      when coalesce(new.title,'') || ' ' || coalesce(new.raw_text,'') ~* '(논[[:space:]]*평|성명|입장문|입장[[:space:]])' then 'statement'
      when coalesce(new.title,'') || ' ' || coalesce(new.raw_text,'') ~* '(일시[[:space:]]*:|장소[[:space:]]*:|기자회견|문화제|간담회|참여를)' then 'event'
      else 'record'
    end;
  end if;

  return new;
end;
$$;

revoke all on function private.classify_raw_item() from public;

drop trigger if exists classify_raw_item_before_write on public.raw_items;
create trigger classify_raw_item_before_write
before insert or update of title, raw_text, content_type, editorial_category
on public.raw_items
for each row execute function private.classify_raw_item();
