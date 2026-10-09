create role patron_admin login noinherit;

grant usage on schema public to patron_admin;
grant select, insert, update, delete on all tables in schema public to patron_admin;
grant usage, select on all sequences in schema public to patron_admin;

alter default privileges in schema public
 grant select,insert,update,delete on tables to patron_admin;
 alter default privileges in schema public
    grant usage, select on sequences to patron_admin;

create table public.parish(
    parish_id uuid primary key default gen_random_uuid(),
    name text not null,
    address text not null,
    contact_no text not null,
    email text,
    facebook_page_id text,
    status text not null default 'active',
    deactivated_at timestamptz,
    deactivated_by uuid,
    created_at timestamptz not null default now(),

    constraint parish_status_valid
    check (status in ('active', 'inactive')),
    constraint parish_deactivation_complete
    check (status= 'active' or (status='inactive' and deactivated_at is not null and deactivated_by is not null))
);

revoke insert, update, delete on public.parish from patron_app;
grant update(name,address,contact_no,email,facebook_page_id) on public.parish to patron_app;

alter table public.parish enable row level security;

create policy "parish_staff_select" on public.parish
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "parish_staff_update" on public.parish
    for update to patron_app
    using (parish_id = public.current_parish_id())
    with check (parish_id = public.current_parish_id());

create policy "parish_admin_all" on public.parish
    for all to patron_admin
    using (true)
    with check (true);

create view public.parish_directory 
    with (security_invoker = off) as
    select parish_id, name ,address, contact_no,email
    from public.parish
    where status = 'active';

    grant select on public.parish_directory to patron_app;



