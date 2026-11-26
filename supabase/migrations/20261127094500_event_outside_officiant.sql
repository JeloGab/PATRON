alter table public.parish_event
    add column if not exists officiant_name text;

alter table public.parish_event
    add constraint parish_event_officiant_scope
    check (officiant_name is null or event_type = 'sacramental');

grant insert (officiant_name) on public.parish_event to patron_app;
grant update (officiant_name) on public.parish_event to patron_app;
