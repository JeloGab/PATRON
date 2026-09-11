create table public.sacramental_record (
    record_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    record_type text not null,
    book_no text not null,
    page_no text not null,
    entry_no text not null,
    record_date date not null,
    date_of_death date,
    officiant_name text not null,
    created_by uuid not null references public.app_user(user_id),
    created_at timestamptz not null default now(),
    updated_by uuid references public.app_user(user_id),
    updated_at timestamptz,

    constraint sacramental_record_type_valid
    check (record_type in ('baptism', 'confirmation', 'marriage', 'death')),

    constraint sacramental_record_death_date_scope
    check (date_of_death is null or record_type = 'death'),

    constraint sacramental_record_update_complete
    check ((updated_at is null) = (updated_by is null)),

    constraint sacramental_record_parish_key
    unique (record_id, parish_id)
);

create unique index sacramental_record_registry_key
    on public.sacramental_record
    (parish_id, record_type, lower(book_no), lower(page_no), lower(entry_no));

create table public.record_subject (
    recordsubject_id uuid primary key default gen_random_uuid(),
    record_id uuid not null,
    parish_id uuid not null,
    role text not null,
    full_name text not null,
    date_of_birth date,
    place_of_birth text,
    gender text not null,
    father_name text,
    mother_name text,
    sponsor_names text,

    constraint record_subject_record_fk
    foreign key (record_id, parish_id)
    references public.sacramental_record (record_id, parish_id),

    constraint record_subject_role_valid
    check (role in ('primary', 'spouse')),

    constraint record_subject_gender_valid
    check (gender in ('male', 'female'))
);

create index record_subject_record_id on public.record_subject (record_id);

revoke insert, update, delete on public.sacramental_record from patron_app;
grant insert (parish_id, record_type, book_no, page_no, entry_no,
              record_date, date_of_death, officiant_name, created_by)
    on public.sacramental_record to patron_app;
grant update (book_no, page_no, entry_no, record_date, date_of_death,
              officiant_name, updated_by, updated_at)
    on public.sacramental_record to patron_app;

revoke insert, update, delete on public.record_subject from patron_app;
grant insert (record_id, parish_id, role, full_name, date_of_birth,
              place_of_birth, gender, father_name, mother_name, sponsor_names)
    on public.record_subject to patron_app;
grant update (full_name, date_of_birth, place_of_birth, gender,
              father_name, mother_name, sponsor_names)
    on public.record_subject to patron_app;

revoke all on public.sacramental_record from patron_admin;
revoke all on public.record_subject from patron_admin;

alter table public.sacramental_record enable row level security;

create policy "sacramental_record_staff_select" on public.sacramental_record
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "sacramental_record_manager_insert" on public.sacramental_record
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and created_by = public.current_user_id()
    );

create policy "sacramental_record_manager_update" on public.sacramental_record
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and updated_by = public.current_user_id()
    );

alter table public.record_subject enable row level security;

create policy "record_subject_staff_select" on public.record_subject
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "record_subject_manager_insert" on public.record_subject
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    );

create policy "record_subject_manager_update" on public.record_subject
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    );