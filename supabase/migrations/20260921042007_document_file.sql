create table public.document_file (
    file_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    document_type_id uuid not null references public.document_type(type_id),
    record_id uuid not null,
    application_id uuid,
    source_event_id uuid,

    release_type text not null,
    verification_code text not null,
    snapshot jsonb not null,
    signatory_id uuid not null references public.app_user(user_id),
    issued_by uuid not null references public.app_user(user_id),
    issued_at timestamptz not null default now(),

    constraint document_file_record_fk
    foreign key (record_id, parish_id)
    references public.sacramental_record (record_id, parish_id),

    constraint document_file_application_fk
    foreign key (application_id, parish_id)
    references public.document_application (application_id, parish_id),

    constraint document_file_event_fk
    foreign key (source_event_id, parish_id)
    references public.parish_event (event_id, parish_id),

    constraint document_file_release_type_valid
    check (release_type in ('request', 'event_completion')),

    constraint document_file_origin_one
    check (num_nonnulls(application_id, source_event_id) = 1),

    constraint document_file_origin_matches_type
    check ((release_type = 'request') = (application_id is not null)),

    constraint document_file_code_shape
    check (verification_code ~ '^[A-Z2-7]{12}$'),

    constraint document_file_snapshot_shape
    check (jsonb_typeof(snapshot) = 'object')
);

create unique index document_file_verification_code_key
    on public.document_file (verification_code);

create unique index document_file_application_key
    on public.document_file (application_id)
    where application_id is not null;

create index document_file_record
    on public.document_file (record_id);

create index document_file_parish_issued
    on public.document_file (parish_id, issued_at desc);

create index document_file_source_event
    on public.document_file (source_event_id)
    where source_event_id is not null;

revoke insert, update, delete on public.document_file from patron_app;
grant insert (parish_id, document_type_id, record_id, application_id,
              source_event_id, release_type, verification_code, snapshot,
              signatory_id, issued_by)
    on public.document_file to patron_app;
revoke all on public.document_file from patron_admin;

alter table public.document_file enable row level security;

create policy "document_file_staff_select" on public.document_file
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "document_file_applicant_select" on public.document_file
    for select to patron_app
    using (
        exists (
            select 1 from public.document_application a
            where a.application_id = document_file.application_id
              and a.applicant_id = public.current_user_id()
        )
    );

create policy "document_file_priest_issue" on public.document_file
    for insert to patron_app
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and release_type = 'request'
        and signatory_id = public.current_user_id()
        and issued_by = public.current_user_id()
    );

create view public.certificate_verification
    with (security_invoker = off) as
    select f.verification_code,
           t.name as document_name,
           f.snapshot ->> 'subjectName' as subject_name,
           p.name as parish_name,
           f.issued_at::date as issued_on
    from public.document_file f
    join public.document_type t on t.type_id = f.document_type_id
    join public.parish p on p.parish_id = f.parish_id;

grant select on public.certificate_verification to patron_app;

create or replace function public.parish_has_open_requests(p_parish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.document_application
        where parish_id = p_parish_id
          and status in ('pending', 'verified')
    )
$$;

revoke all on function public.parish_has_open_requests(uuid) from public;
grant execute on function public.parish_has_open_requests(uuid) to patron_admin;