create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
    select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create table public.app_user(
    user_id uuid primary key default gen_random_uuid(),
    full_name text not null,
    username text,
    email text,
    password_hash text,
    supabase_user_id uuid,
    must_change_password boolean not null default false,
    role text not null,
    status text not null default 'active',
    parish_id uuid references public.parish(parish_id),
    created_at timestamptz not null default now(),
    deactivated_at timestamptz,
    deactivated_by uuid,

    constraint app_user_role_valid
    check(role in('sysadmin','priest','manager','parishioner')),

    constraint app_user_status_valid
    check(status in('active','inactive')),

    constraint app_user_deactivation_complete
    check(status='active' or (status='inactive' and deactivated_at is not null and deactivated_by is not null)),

    constraint app_user_parish_scope
    check(
        (role in ('priest','manager') and parish_id is not null)
        or
        (role in ('sysadmin','parishioner') and parish_id is null)
    ),

    constraint app_user_credential_shape
    check(
        (role = 'parishioner'
        and supabase_user_id is not null
        and password_hash is null
        and email is not null
        and username is null)
        or
        (role <> 'parishioner'
        and password_hash is not null
        and supabase_user_id is null
        and username is not null
        and email is null)
    )
);

create unique index app_user_username_key on public.app_user (lower(username));
create unique index app_user_email_key on public.app_user (lower(email));
create unique index app_user_supabase_user_id_key on public.app_user (supabase_user_id);
create index app_user_parish_id on public.app_user (parish_id);

revoke insert,update,delete on public.app_user from patron_app;
grant insert (full_name,email,supabase_user_id,role) on public.app_user to patron_app;
grant update (full_name,password_hash,must_change_password) on public.app_user to patron_app;

alter table public.app_user enable row level security;

create policy "app_user_select" on public.app_user
    for select to patron_app
    using (user_id = public.current_user_id());

create policy "app_user_parish_select" on public.app_user
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "app_user_self_update" on public.app_user
    for update to patron_app
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "app_user_parishioner_signup" on public.app_user
    for insert to patron_app
    with check(
        role = 'parishioner'
        and parish_id is null
        and public.current_user_id() is null
        and public.current_parish_id() is null
    );

create policy "app_user_admin_all" on public.app_user
    for all to patron_admin
    using (true)
    with check (true);

create or replace function public.auth_lookup_staff(p_username text)
returns table (
    user_id uuid,
    full_name text,
    role text,
    status text,
    parish_id uuid,
    password_hash text,
    must_change_password boolean
)
language sql
security definer
set search_path = public
stable
as $$
    select user_id,full_name, role, status, parish_id, password_hash, must_change_password
    from public.app_user
    where lower(username) = lower(p_username)
$$;

create or replace function public.auth_lookup_parishioner(p_supabase_user_id uuid)
returns table (
    user_id uuid,
    full_name text,
    role text,
    status text,
    email text
)
language sql
security definer
set search_path = public
stable
as $$
    select user_id,full_name, role, status, email
    from public.app_user
    where supabase_user_id = p_supabase_user_id
$$;

revoke execute on function public.auth_lookup_staff(text) from public;
revoke execute on function public.auth_lookup_parishioner(uuid) from public;
grant execute on function public.auth_lookup_staff(text) to patron_app;
grant execute on function public.auth_lookup_parishioner(uuid) to patron_app;

alter table public.parish
add constraint parish_deactivated_by_fk
foreign key (deactivated_by) references public.app_user(user_id);

alter table public.app_user
add constraint app_user_deactivated_by_fk
foreign key (deactivated_by) references public.app_user(user_id);