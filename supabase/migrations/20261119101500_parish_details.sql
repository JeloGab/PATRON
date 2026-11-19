

alter table public.parish
    add column patron_saint     text,
    add column feast_day        text,
    add column year_established smallint,
    add column history          text;

alter table public.parish
    add constraint parish_year_established_range
    check (year_established is null or year_established between 1521 and 2100);

grant update (patron_saint, feast_day, year_established, history)
    on public.parish to patron_app;


create or replace view public.parish_directory
    with (security_invoker = off) as
    select parish_id, name, address, contact_no, email,
           office_hours, mass_schedule,
           patron_saint, feast_day, year_established, history
    from public.parish
    where status = 'active';
