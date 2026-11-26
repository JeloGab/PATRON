

alter table public.parish_event
    drop constraint parish_event_status_scope;

alter table public.parish_event
    add constraint parish_event_status_scope
    check (
        event_type = 'sacramental'
        or assigned_priest_id is not null
        or status not in ('pending', 'rejected')
    );



alter table public.parish_event
    drop constraint parish_event_approver_is_assigned;

alter table public.parish_event
    add constraint parish_event_approver_is_assigned
    check (
        approved_by is null
        or assigned_priest_id is null
        or approved_by = assigned_priest_id
    )
    not valid;



alter policy "parish_event_priest_decide" on public.parish_event
    using (
        public.current_user_role() = 'priest'
        and parish_id = public.current_parish_id()
        and assigned_priest_id = public.current_user_id()
        and status = 'pending'
    );
