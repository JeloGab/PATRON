
alter table public.announcement
    drop constraint announcement_sync_status_valid;

alter table public.announcement
    add constraint announcement_sync_status_valid
    check (sync_status is null
           or sync_status in ('synced', 'failed', 'skipped', 'removed'));

alter table public.announcement
    drop constraint announcement_post_id_requires_sync;

alter table public.announcement
    add constraint announcement_post_id_requires_sync
    check (facebook_post_id is null
           or sync_status in ('synced', 'removed'));

alter table public.announcement
    add column if not exists facebook_checked_at timestamptz;

create or replace function public.record_announcement_sync(
    p_announcement_id uuid, p_sync_status text, p_post_id text)
returns boolean
language sql
volatile
security definer
set search_path = public
as $$
    update public.announcement
       set sync_status = p_sync_status,
           facebook_post_id = p_post_id,
           facebook_checked_at = now()
     where announcement_id = p_announcement_id
       and parish_id = public.current_parish_id()
       and status = 'approved'
    returning true;
$$;
