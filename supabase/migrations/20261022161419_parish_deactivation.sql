-- Parish deactivation. Closes the step 8 deferral recorded in backlog.md.
--
-- Nothing is added that step 8 did not already design:
--
--   * parish.status, deactivated_at and deactivated_by have existed since
--     20260831060817_parish.sql, with parish_status_valid and
--     parish_deactivation_complete.
--   * patron_admin already holds update on every table and its parish policy is
--     using (true) with check (true), so no grant is needed.
--   * public.parish_has_open_requests(uuid) shipped with
--     20260921042007_document_file.sql -- a security definer boolean granted to
--     patron_admin alone, so the sysadmin learns WHETHER a parish has open
--     requests without ever reading one. PARISH_HAS_OPEN_REQUESTS has been
--     reserved in error_codes.md since then, waiting for a thrower.
--
-- So this migration adds no column, no policy, no grant and no new hole in RLS.
-- It adds the thing that was missing: the enforcement.
--
-- THE GUARD IS A TRIGGER, NOT A SERVICE PRE-CHECK. backlog.md proposed calling
-- parish_has_open_requests() from the service before the update. That is a race
-- of exactly the kind CLAUDE.md forbids: a request filed between the check and
-- the write would be stranded against a closed parish. Inside the statement
-- there is no window. The service maps PT001 the way 23505 is mapped to
-- REGISTRY_ENTRY_TAKEN.
--
-- The trigger function does NOT need security definer. It runs as the role
-- performing the update -- patron_admin -- which already holds execute on
-- parish_has_open_requests. The existing definer function stays the only path
-- to document_application, which is why the step 8 boundary is unchanged.
--
-- The guard also binds a hand-written UPDATE in the SQL editor, which until now
-- was the only way this column could ever change.
--
-- The two auth functions change their RETURN TYPE, which create or replace
-- cannot do, so they are dropped and recreated and their grants re-issued --
-- a drop takes the grant with it. The join is LEFT: a sysadmin and a
-- parishioner have no parish, so parish_status is null for them and null must
-- pass. auth_lookup_staff refuses the sign-in; auth_session_check stops a
-- priest already holding a token on his next request.
--
-- Additive and touches no rows, so it is safe to apply before the server is
-- updated. The reverse is not.


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
