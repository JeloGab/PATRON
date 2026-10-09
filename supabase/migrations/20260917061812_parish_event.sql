create table public.parish_event (
    event_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    title text not null,
    description text,
    event_type text not null,
    sacrament_type text,
    event_date date not null,
    start_time time not null,
    end_time time not null,
    assigned_priest_id uuid references public.app_user(user_id),
    status text not null,
    status_reason text,
    created_by uuid not null references public.app_user(user_id),
    created_at timestamptz not null default now(),
    approved_by uuid references public.app_user(user_id),
    approved_at timestamptz,
    updated_by uuid references public.app_user(user_id),
    updated_at timestamptz,

    constraint parish_event_type_valid
    check (event_type in ('sacramental', 'general', 'seminar')),

    constraint parish_event_sacrament_valid
    check (sacrament_type in ('baptism', 'confirmation', 'marriage', 'funeral')),

    constraint parish_event_sacrament_scope
    check ((event_type = 'sacramental') = (sacrament_type is not null)),

    constraint parish_event_priest_required
    check (event_type <> 'sacramental' or assigned_priest_id is not null),

    constraint parish_event_status_valid
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')),

    constraint parish_event_status_scope
    check (event_type = 'sacramental' or status not in ('pending', 'rejected')),

    constraint parish_event_time_order
    check (start_time < end_time),

    constraint parish_event_approval_complete
    check ((approved_at is null) = (approved_by is null)),

    constraint parish_event_approval_required
    check (status not in ('approved', 'completed') or approved_by is not null),

    constraint parish_event_approval_absent
    check (status not in ('pending', 'rejected') or approved_by is null),

    constraint parish_event_approver_is_assigned
    check (event_type <> 'sacramental' or approved_by is null or approved_by = assigned_priest_id),

    constraint parish_event_update_complete
    check ((updated_at is null) = (updated_by is null)),

    constraint parish_event_reason_scope
    check (status_reason is null or status in ('rejected', 'cancelled')),

    constraint parish_event_parish_key
    unique (event_id, parish_id)
);

create index parish_event_parish_day
    on public.parish_event (parish_id, event_date);

create index parish_event_priest_day
    on public.parish_event (assigned_priest_id, event_date)
    where assigned_priest_id is not null;

revoke insert, update, delete on public.parish_event from patron_app;
grant insert (parish_id, title, description, event_type, sacrament_type,
              event_date, start_time, end_time, assigned_priest_id,
              status, created_by, approved_by, approved_at)
    on public.parish_event to patron_app;
grant update (title, description, event_date, start_time, end_time,
              assigned_priest_id, status, status_reason,
              approved_by, approved_at, updated_by, updated_at)
    on public.parish_event to patron_app;
revoke all on public.parish_event from patron_admin;

alter table public.parish_event enable row level security;

create policy "parish_event_staff_select" on public.parish_event
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "parish_event_manager_insert" on public.parish_event
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and created_by = public.current_user_id()
    );

create policy "parish_event_manager_update" on public.parish_event
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

create policy "parish_event_priest_decide" on public.parish_event
    for update to patron_app
    using (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and event_type = 'sacramental'
        and assigned_priest_id = public.current_user_id()
        and status = 'pending'
    )
    with check (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and assigned_priest_id = public.current_user_id()
        and status in ('approved', 'rejected')
        and (updated_by is null or updated_by = public.current_user_id())
    );