create table public.blocked_date (
    blocked_date_id uuid primary key default gen_random_uuid(),
    parish_id uuid not null references public.parish(parish_id),
    type text not null,
    priest_id uuid references public.app_user(user_id),
    date date not null,
    start_time time,
    end_time time,
    reason text,
    blocked_by uuid not null references public.app_user(user_id),
    created_at timestamptz not null default now(),

    constraint blocked_date_type_valid
    check (type in ('parish', 'priest')),

    constraint blocked_date_type_scope
    check (
        (type = 'parish' and priest_id is null)
        or
        (type = 'priest' and priest_id is not null)
    ),

    constraint blocked_date_hours_complete
    check ((start_time is null) = (end_time is null)),

    constraint blocked_date_hours_order
    check (start_time < end_time)
);

create index blocked_date_parish_day
    on public.blocked_date (parish_id, date);

create index blocked_date_priest_day
    on public.blocked_date (priest_id, date)
    where priest_id is not null;

revoke insert, update, delete on public.blocked_date from patron_app;
grant insert (parish_id, type, priest_id, date, start_time, end_time, reason, blocked_by)
    on public.blocked_date to patron_app;
grant delete on public.blocked_date to patron_app;
revoke all on public.blocked_date from patron_admin;

alter table public.blocked_date enable row level security;

create policy "blocked_date_staff_select" on public.blocked_date
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "blocked_date_staff_insert" on public.blocked_date
    for insert to patron_app
    with check (
        parish_id = public.current_parish_id()
        and blocked_by = public.current_user_id()
        and (
            public.current_user_role() = 'manager'
            or (
                public.current_user_role() = 'priest'
                and (type = 'parish' or priest_id = public.current_user_id())
            )
        )
    );

create policy "blocked_date_staff_delete" on public.blocked_date
    for delete to patron_app
    using (
        parish_id = public.current_parish_id()
        and (
            public.current_user_role() = 'manager'
            or (
                public.current_user_role() = 'priest'
                and (type = 'parish' or priest_id = public.current_user_id())
            )
        )
    );