create table public.announcement (
    announcement_id  uuid primary key default gen_random_uuid(),
    parish_id        uuid not null references public.parish(parish_id),
    title            text not null,
    content          text not null,
    status           text not null default 'pending',
    rejection_reason text,
    facebook_post_id text,
    sync_status      text,
    created_by       uuid not null references public.app_user(user_id),
    created_at       timestamptz not null default now(),
    approved_by      uuid references public.app_user(user_id),
    approved_at      timestamptz,

    
    constraint announcement_parish_unique unique (announcement_id, parish_id),

    constraint announcement_status_valid
      check (status in ('pending', 'approved', 'rejected', 'archived')),

    constraint announcement_sync_status_valid
      check (sync_status is null or sync_status in ('synced', 'failed', 'skipped')),

    
    constraint announcement_post_id_requires_sync
      check (facebook_post_id is null or sync_status = 'synced'),

   
    constraint announcement_approval_paired
      check ((approved_by is null) = (approved_at is null)),
    constraint announcement_approval_complete
      check (status <> 'approved' or (approved_by is not null and approved_at is not null)),
    constraint announcement_approval_scope
      check (approved_by is null or status in ('approved', 'archived')),

    
    constraint announcement_reason_scope
      check (rejection_reason is null or status = 'rejected')
);

create index announcement_parish_status
    on public.announcement (parish_id, status, approved_at desc);

revoke insert, update, delete on public.announcement from patron_app;
grant insert (parish_id, title, content, status, created_by, approved_by, approved_at)
    on public.announcement to patron_app;
grant update (title, content, status, rejection_reason, approved_by, approved_at)
    on public.announcement to patron_app;
revoke all on public.announcement from patron_admin;

alter table public.announcement enable row level security;

create policy "announcement_staff_select" on public.announcement
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "announcement_manager_insert" on public.announcement
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and created_by = public.current_user_id()
        and status = 'pending'
        and approved_by is null
    );

create policy "announcement_priest_insert" on public.announcement
    for insert to patron_app
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and created_by = public.current_user_id()
        and status = 'approved'
        and approved_by = public.current_user_id()
    );

create policy "announcement_manager_update" on public.announcement
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status in ('pending', 'rejected')
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status in ('pending', 'archived')
    );

create policy "announcement_priest_decide" on public.announcement
    for update to patron_app
    using (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status = 'pending'
    )
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status in ('approved', 'rejected')
        and (status <> 'approved' or approved_by = public.current_user_id())
    );

create policy "announcement_priest_archive" on public.announcement
    for update to patron_app
    using (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status = 'approved'
    )
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status = 'archived'
    );


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
           facebook_post_id = p_post_id
     where announcement_id = p_announcement_id
       and parish_id = public.current_parish_id()
       and status = 'approved'
    returning true;
$$;

revoke all on function public.record_announcement_sync(uuid, text, text) from public;
grant execute on function public.record_announcement_sync(uuid, text, text) to patron_app;


create table public.announcement_image (
    image_id        uuid primary key default gen_random_uuid(),
    announcement_id uuid not null,
    parish_id       uuid not null,
    file_name       text not null,
    content_type    text not null,
    byte_size       integer not null,
    content         bytea not null,
    slot_no         integer not null,
    uploaded_by     uuid not null references public.app_user(user_id),
    uploaded_at     timestamptz not null default now(),

    constraint announcement_image_announcement_fk
      foreign key (announcement_id, parish_id)
      references public.announcement (announcement_id, parish_id),

    constraint announcement_image_type_valid
      check (content_type in ('image/jpeg', 'image/png')),
    constraint announcement_image_size_valid
      check (byte_size > 0 and byte_size <= 2097152),
    constraint announcement_image_slot_valid
      check (slot_no between 1 and 4)
);

create unique index announcement_image_slot
    on public.announcement_image (announcement_id, slot_no);

revoke insert, update, delete on public.announcement_image from patron_app;
grant insert (announcement_id, parish_id, file_name, content_type, byte_size,
              content, slot_no, uploaded_by)
    on public.announcement_image to patron_app;
grant delete on public.announcement_image to patron_app;
revoke all on public.announcement_image from patron_admin;

alter table public.announcement_image enable row level security;

create policy "announcement_image_staff_select" on public.announcement_image
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "announcement_image_author_insert" on public.announcement_image
    for insert to patron_app
    with check (
        public.current_user_role() in ('manager', 'priest')
        and parish_id = public.current_parish_id()
        and uploaded_by = public.current_user_id()
        and exists (
            select 1 from public.announcement a
             where a.announcement_id = announcement_image.announcement_id
               and a.status in ('pending', 'rejected')
        )
    );

create policy "announcement_image_author_delete" on public.announcement_image
    for delete to patron_app
    using (
        public.current_user_role() in ('manager', 'priest')
        and parish_id = public.current_parish_id()
        and exists (
            select 1 from public.announcement a
             where a.announcement_id = announcement_image.announcement_id
               and a.status in ('pending', 'rejected')
        )
    );


create view public.announcement_feed
    with (security_invoker = off) as
    select a.announcement_id,
           a.title,
           a.content,
           a.approved_at as published_on,
           a.parish_id,
           p.name as parish_name,
           (select count(*) from public.announcement_image i
             where i.announcement_id = a.announcement_id) as image_count
    from public.announcement a
    join public.parish p on p.parish_id = a.parish_id
    where a.status = 'approved'
      and p.status = 'active';

grant select on public.announcement_feed to patron_app;

create view public.announcement_image_public
    with (security_invoker = off) as
    select i.announcement_id, i.slot_no, i.content_type, i.content
    from public.announcement_image i
    join public.announcement a on a.announcement_id = i.announcement_id
    join public.parish p on p.parish_id = a.parish_id
    where a.status = 'approved'
      and p.status = 'active';

grant select on public.announcement_image_public to patron_app;