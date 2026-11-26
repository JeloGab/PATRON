

create policy "announcement_manager_archive" on public.announcement
    for update to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status = 'approved'
    )
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and status = 'archived'
    );
