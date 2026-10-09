create table public.requirement_template (
    template_id uuid primary key default gen_random_uuid(),
    sacrament_type text not null,
    requirement_name text not null,
    description text,
    auto_check_record_type text,
    validity_period_months integer,
    availability boolean not null default true,

    constraint requirement_template_sacrament_valid
    check (sacrament_type in ('baptism', 'confirmation', 'marriage', 'funeral')),

    constraint requirement_template_record_type_valid
    check (auto_check_record_type is null
           or auto_check_record_type in ('baptism', 'confirmation', 'marriage', 'death')),

    constraint requirement_template_validity_positive
    check (validity_period_months is null or validity_period_months > 0),

    constraint requirement_template_name_key
    unique (sacrament_type, requirement_name)
);

insert into public.requirement_template
    (sacrament_type, requirement_name, description, auto_check_record_type) values
    ('baptism',      'Birth Certificate (PSA)',        'Civil registry birth certificate of the child.',                   null),
    ('baptism',      'Parents'' Marriage Certificate', 'Church or civil marriage certificate of the parents, if married.', null),

    ('confirmation', 'Baptismal Certificate',          'Proof of baptism in this parish.',                                 'baptism'),
    ('confirmation', 'Confirmation Seminar',           'Attendance at the pre-confirmation catechesis.',                   null),

    ('marriage',     'Baptismal Certificate',          'Proof of baptism in this parish.',                                 'baptism'),
    ('marriage',     'Confirmation Certificate',       'Proof of confirmation in this parish.',                            'confirmation'),
    ('marriage',     'CENOMAR',                        'Certificate of No Marriage Record from the PSA.',                  null),
    ('marriage',     'Marriage License',               'Civil marriage license from the local civil registrar.',           null),
    ('marriage',     'Pre-Cana Seminar',               'Attendance at the pre-marriage seminar and canonical interview.',  null),
    ('marriage',     'Banns of Marriage',              'Publication of the banns in the parishes of both parties.',        null),

    ('funeral',      'Civil Death Certificate',        'Death certificate registered with the local civil registrar.',     null),
    ('funeral',      'Burial or Transfer Permit',      'Permit to bury or transfer issued by the local health office.',    null);

revoke insert, update, delete on public.requirement_template from patron_app;
revoke all on public.requirement_template from patron_admin;

alter table public.requirement_template enable row level security;

create policy "requirement_template_read" on public.requirement_template
    for select to patron_app
    using (true);

create table public.event_participant (
    participant_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    event_id uuid not null,
    participant_name text not null,
    participant_contact text,
    participant_date_of_birth date,
    gender text not null,
    sponsor_name text,
    status text not null default 'pending',
    created_by uuid not null references public.app_user(user_id),
    created_at timestamptz not null default now(),
    updated_by uuid references public.app_user(user_id),
    updated_at timestamptz,

    constraint event_participant_event_fk
    foreign key (event_id, parish_id)
    references public.parish_event (event_id, parish_id),

    constraint event_participant_gender_valid
    check (gender in ('male', 'female')),

    constraint event_participant_status_valid
    check (status in ('pending', 'cleared', 'withdrawn')),

    constraint event_participant_update_complete
    check ((updated_at is null) = (updated_by is null)),

    constraint event_participant_parish_key
    unique (participant_id, parish_id)
);

create index event_participant_event
    on public.event_participant (event_id);

revoke insert, update, delete on public.event_participant from patron_app;
grant insert (parish_id, event_id, participant_name, participant_contact,
              participant_date_of_birth, gender, sponsor_name, created_by)
    on public.event_participant to patron_app;
grant update (participant_name, participant_contact, participant_date_of_birth,
              gender, sponsor_name, status, updated_by, updated_at)
    on public.event_participant to patron_app;
revoke all on public.event_participant from patron_admin;

alter table public.event_participant enable row level security;

create policy "event_participant_staff_select" on public.event_participant
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "event_participant_manager_insert" on public.event_participant
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and created_by = public.current_user_id()
    );

create policy "event_participant_manager_update" on public.event_participant
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and (updated_by is null or updated_by = public.current_user_id())
    );


create table public.participant_requirement (
    requirement_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    participant_id uuid not null,
    template_id uuid not null references public.requirement_template(template_id),
    status text not null default 'pending',
    matched_record_id uuid,
    notes text,
    verified_by uuid references public.app_user(user_id),
    verified_at timestamptz,
    created_at timestamptz not null default now(),

    constraint participant_requirement_participant_fk
    foreign key (participant_id, parish_id)
    references public.event_participant (participant_id, parish_id),

    constraint participant_requirement_matched_record_fk
    foreign key (matched_record_id, parish_id)
    references public.sacramental_record (record_id, parish_id),

    constraint participant_requirement_status_valid
    check (status in ('pending', 'verified', 'auto_verified', 'waived')),

    constraint participant_requirement_timestamp_scope
    check ((verified_at is null) = (status = 'pending')),

    constraint participant_requirement_verifier_scope
    check (
        (status in ('pending', 'auto_verified') and verified_by is null)
        or
        (status in ('verified', 'waived') and verified_by is not null)
    ),

    constraint participant_requirement_match_scope
    check (matched_record_id is null or status in ('auto_verified', 'verified')),

    constraint participant_requirement_template_key
    unique (participant_id, template_id)
);

create index participant_requirement_participant
    on public.participant_requirement (participant_id);

create index participant_requirement_matched_record
    on public.participant_requirement (matched_record_id)
    where matched_record_id is not null;

revoke insert, update, delete on public.participant_requirement from patron_app;
grant insert (parish_id, participant_id, template_id)
    on public.participant_requirement to patron_app;
grant update (status, matched_record_id, notes, verified_by, verified_at)
    on public.participant_requirement to patron_app;
revoke all on public.participant_requirement from patron_admin;

alter table public.participant_requirement enable row level security;

create policy "participant_requirement_staff_select" on public.participant_requirement
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "participant_requirement_manager_insert" on public.participant_requirement
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    );

create policy "participant_requirement_manager_update" on public.participant_requirement
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and (verified_by is null or verified_by = public.current_user_id())
    );