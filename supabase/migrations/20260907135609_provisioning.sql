create or replace function public.current_user_role()
returns text
language sql
stable
as $$
    select nullif(current_setting('app.user_role', true), '')
$$;

alter table public.app_user
add column password_changed_at timestamptz;

create or replace function public.auth_session_check(p_user_id uuid)
returns table (
    status text,
    role text,
    parish_id uuid,
    must_change_password boolean,
    password_changed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
    select status, role, parish_id, must_change_password, password_changed_at
    from public.app_user
    where user_id = p_user_id
$$;

revoke execute on function public.auth_session_check(uuid) from public;
grant execute on function public.auth_session_check(uuid) to patron_app;

grant insert (username, password_hash, parish_id, must_change_password)
    on public.app_user to patron_app;
grant update (status, deactivated_at, deactivated_by, password_changed_at)
    on public.app_user to patron_app;

create policy "app_user_priest_provision" on public.app_user
    for insert to patron_app
    with check (
        public.current_user_role() = 'priest'
        and role = 'manager'
        and parish_id = public.current_parish_id()
    );

create policy "app_user_priest_manage" on public.app_user
    for update to patron_app
    using (
        public.current_user_role() = 'priest'
        and role = 'manager'
        and parish_id = public.current_parish_id()
    )
    with check (
        public.current_user_role() = 'priest'
        and role = 'manager'
        and parish_id = public.current_parish_id()
    );