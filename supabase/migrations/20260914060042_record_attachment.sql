create table public.record_attachment (
    attachment_id uuid primary key default gen_random_uuid(),
    record_id uuid not null,
    parish_id uuid not null,
    file_name text not null,
    content_type text not null,
    byte_size integer not null,
    content bytea not null,
    uploaded_by uuid not null references public.app_user(user_id),
    uploaded_at timestamptz not null default now(),

    constraint record_attachment_record_fk
    foreign key (record_id, parish_id)
    references public.sacramental_record (record_id, parish_id),

    constraint record_attachment_type_valid
    check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),

    constraint record_attachment_size_valid
    check (byte_size > 0 and byte_size <= 5242880)
);

create index record_attachment_record_id on public.record_attachment (record_id);

revoke insert, update, delete on public.record_attachment from patron_app;
grant insert (record_id, parish_id, file_name, content_type, byte_size, content, uploaded_by)
    on public.record_attachment to patron_app;
grant delete on public.record_attachment to patron_app;
revoke all on public.record_attachment from patron_admin;

alter table public.record_attachment enable row level security;

create policy "record_attachment_staff_select" on public.record_attachment
    for select to patron_app
    using (parish_id = public.current_parish_id());

create policy "record_attachment_manager_insert" on public.record_attachment
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and uploaded_by = public.current_user_id()
    );

create policy "record_attachment_manager_delete" on public.record_attachment
    for delete to patron_app
    using (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
    );