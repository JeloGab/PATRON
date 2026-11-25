

alter table public.parish
    add column facebook_page_token text;


alter table public.parish
    add constraint parish_page_token_needs_page
    check (facebook_page_token is null or facebook_page_id is not null);


create unique index parish_facebook_page_unique
    on public.parish (facebook_page_id)
    where facebook_page_id is not null;


grant update (facebook_page_token) on public.parish to patron_app;


revoke select on public.parish from patron_app;
grant select (parish_id, name, address, contact_no, email, facebook_page_id,
              status, deactivated_at, deactivated_by, created_at,
              photo, photo_content_type, office_hours, mass_schedule,
              patron_saint, feast_day, year_established, history,
              seal, seal_content_type)
    on public.parish to patron_app;

revoke select on public.parish from patron_admin;
grant select (parish_id, name, address, contact_no, email, facebook_page_id,
              status, deactivated_at, deactivated_by, created_at,
              photo, photo_content_type, office_hours, mass_schedule,
              patron_saint, feast_day, year_established, history,
              seal, seal_content_type)
    on public.parish to patron_admin;


create or replace function public.current_parish_page_token()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select facebook_page_token
      from public.parish
     where parish_id = public.current_parish_id();
$$;

revoke all on function public.current_parish_page_token() from public;
grant execute on function public.current_parish_page_token() to patron_app;


create or replace function public.current_parish_has_page_token()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select facebook_page_token is not null
      from public.parish
     where parish_id = public.current_parish_id();
$$;

revoke all on function public.current_parish_has_page_token() from public;
grant execute on function public.current_parish_has_page_token() to patron_app;
