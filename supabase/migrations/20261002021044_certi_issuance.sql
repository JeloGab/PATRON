alter table public.sacramental_record
    add column source_event_id uuid;

alter table public.sacramental_record
    add constraint sacramental_record_event_fk
    foreign key (source_event_id, parish_id)
    references public.parish_event (event_id, parish_id);

create index sacramental_record_source_event
    on public.sacramental_record (source_event_id)
    where source_event_id is not null;

grant insert (source_event_id) on public.sacramental_record to patron_app;

create policy "document_file_manager_event_issue" on public.document_file
    for insert to patron_app
    with check (
        public.current_user_role() = 'manager'
        and parish_id = public.current_parish_id()
        and release_type = 'event_completion'
        and issued_by = public.current_user_id()
        and exists (
            select 1
              from public.parish_event e
             where e.event_id = document_file.source_event_id
               and e.parish_id = document_file.parish_id
               and e.status = 'completed'
               and e.assigned_priest_id = document_file.signatory_id
        )
    );

create unique index document_file_event_record_key
    on public.document_file (record_id)
    where source_event_id is not null;