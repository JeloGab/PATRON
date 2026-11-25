create function public.parish_deactivation_guard()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'inactive'
       and old.status <> 'inactive'
       and public.parish_has_open_requests(new.parish_id)
    then
        raise exception 'parish has open document requests'
            using errcode = 'PT001';
    end if;
    return new;
end
$$;

create trigger parish_deactivation_guard
before update of status on public.parish
for each row
execute function public.parish_deactivation_guard();


drop function public.auth_lookup_staff(text);

create function public.auth_lookup_staff(p_username text)
returns table (
    user_id uuid,
    full_name text,
    role text,
    status text,
    parish_id uuid,
    password_hash text,
    must_change_password boolean,
    parish_status text
)
language sql
security definer
set search_path = public
stable
as $$
    select u.user_id, u.full_name, u.role, u.status, u.parish_id,
           u.password_hash, u.must_change_password, p.status
      from public.app_user u
      left join public.parish p on p.parish_id = u.parish_id
     where lower(u.username) = lower(p_username)
$$;

revoke execute on function public.auth_lookup_staff(text) from public;
grant execute on function public.auth_lookup_staff(text) to patron_app;


drop function public.auth_session_check(uuid);

create function public.auth_session_check(p_user_id uuid)
returns table (
    status text,
    role text,
    parish_id uuid,
    must_change_password boolean,
    password_changed_at timestamptz,
    parish_status text
)
language sql
security definer
set search_path = public
stable
as $$
    select u.status, u.role, u.parish_id, u.must_change_password,
           u.password_changed_at, p.status
      from public.app_user u
      left join public.parish p on p.parish_id = u.parish_id
     where u.user_id = p_user_id
$$;

revoke execute on function public.auth_session_check(uuid) from public;
grant execute on function public.auth_session_check(uuid) to patron_app;
