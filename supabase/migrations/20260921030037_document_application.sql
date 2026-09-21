create table public.document_application (
    application_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    document_type_id uuid not null references public.document_type(type_id),
    record_id uuid,

    applicant_id uuid references public.app_user(user_id),
    requestor_name text,
    requestor_contact text,
    relationship text not null,
    purpose text not null,

    subject_name text not null,
    subject_birth_date date,
    father_name text,
    mother_name text,
    sacrament_year integer,
    notes text,

    status text not null default 'pending',
    status_reason text,
    is_paid boolean not null default false,
    paid_at timestamptz,

    created_by uuid not null references public.app_user(user_id),
    submitted_at timestamptz not null default now(),
    verified_by uuid references public.app_user(user_id),
    verified_at timestamptz,
    approved_by uuid references public.app_user(user_id),
    approved_at timestamptz,
    rejected_by uuid references public.app_user(user_id),
    rejected_at timestamptz,
    cancelled_by uuid references public.app_user(user_id),
    cancelled_at timestamptz,

    constraint document_application_record_fk
    foreign key (record_id, parish_id)
    references public.sacramental_record (record_id, parish_id),

    constraint document_application_requestor_shape
    check (
        (applicant_id is not null and requestor_name is null and requestor_contact is null)
        or
        (applicant_id is null and requestor_name is not null)
    ),

    constraint document_application_creator_shape
    check (applicant_id is null or created_by = applicant_id),

    constraint document_application_relationship_valid
    check (relationship in ('self', 'parent', 'child', 'spouse', 'sibling', 'other')),

    constraint document_application_status_valid
    check (status in ('pending', 'verified', 'approved', 'rejected', 'cancelled')),

    constraint document_application_record_required
    check (status not in ('verified', 'approved') or record_id is not null),

    constraint document_application_verification_complete
    check ((verified_at is null) = (verified_by is null)),

    constraint document_application_verification_required
    check (status not in ('verified', 'approved') or verified_by is not null),

    constraint document_application_approval_complete
    check ((approved_at is null) = (approved_by is null)),

    constraint document_application_approval_required
    check (status <> 'approved' or approved_by is not null),

    constraint document_application_approval_absent
    check (status in ('approved', 'rejected', 'cancelled') or approved_by is null),

    constraint document_application_rejection_complete
    check ((rejected_at is null) = (rejected_by is null)),

    constraint document_application_rejection_required
    check (status <> 'rejected' or rejected_by is not null),

    constraint document_application_cancellation_complete
    check ((cancelled_at is null) = (cancelled_by is null)),

    constraint document_application_cancellation_required
    check (status <> 'cancelled' or cancelled_by is not null),

    constraint document_application_reason_scope
    check (status_reason is null or status in ('rejected', 'cancelled')),

    constraint document_application_payment_complete
    check ((paid_at is null) = (is_paid is false)),

    constraint document_application_parish_key
    unique (application_id, parish_id)
);

create index document_application_parish_queue
    on public.document_application (parish_id, status, submitted_at desc);

create index document_application_applicant
    on public.document_application (applicant_id)
    where applicant_id is not null;

create index document_application_record
    on public.document_application (record_id)
    where record_id is not null;

revoke insert, update, delete on public.document_application from patron_app;
grant insert (parish_id, document_type_id, applicant_id, requestor_name,
              requestor_contact, relationship, purpose, subject_name,
              subject_birth_date, father_name, mother_name, sacrament_year,
              notes, created_by)
    on public.document_application to patron_app;
grant update (record_id, status, status_reason, is_paid, paid_at,
              verified_by, verified_at, approved_by, approved_at,
              rejected_by, rejected_at, cancelled_by, cancelled_at)
    on public.document_application to patron_app;
revoke all on public.document_application from patron_admin;

alter table public.document_application enable row level security;

create policy "document_application_staff_select" on public.document_application
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "document_application_applicant_select" on public.document_application
    for select to patron_app
    using (applicant_id = public.current_user_id());

create policy "document_application_parishioner_insert" on public.document_application
    for insert to patron_app
    with check (
        public.current_user_role() = 'parishioner'
        and applicant_id = public.current_user_id()
        and created_by = public.current_user_id()
    );

create policy "document_application_manager_insert" on public.document_application
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and applicant_id is null
        and created_by = public.current_user_id()
    );

create policy "document_application_applicant_cancel" on public.document_application
    for update to patron_app
    using (
        applicant_id = public.current_user_id()
        and status = 'pending'
    )
    with check (
        applicant_id = public.current_user_id()
        and status = 'cancelled'
        and cancelled_by = public.current_user_id()
    );

create policy "document_application_manager_update" on public.document_application
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status in ('pending', 'verified')
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status in ('pending', 'verified', 'rejected')
        and approved_by is null
        and (verified_by is null or verified_by = public.current_user_id())
        and (rejected_by is null or rejected_by = public.current_user_id())
    );

create policy "document_application_priest_decide" on public.document_application
    for update to patron_app
    using (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status = 'verified'
    )
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and status in ('approved', 'rejected')
        and (approved_by is null or approved_by = public.current_user_id())
        and (rejected_by is null or rejected_by = public.current_user_id())
    );