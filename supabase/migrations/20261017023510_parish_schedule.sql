alter table public.parish
    add column office_hours  text,
    add column mass_schedule text;

grant update (office_hours, mass_schedule) on public.parish to patron_app;

create or replace view public.parish_directory
    with (security_invoker = off) as
    select parish_id, name, address, contact_no, email,
           office_hours, mass_schedule
    from public.parish
    where status = 'active';
