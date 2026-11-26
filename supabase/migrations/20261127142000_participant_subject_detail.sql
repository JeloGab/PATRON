alter table public.event_participant
    add column if not exists father_name text,
    add column if not exists mother_name text,
    add column if not exists place_of_birth text;

grant insert (father_name, mother_name, place_of_birth)
    on public.event_participant to patron_app;
grant update (father_name, mother_name, place_of_birth)
    on public.event_participant to patron_app;
