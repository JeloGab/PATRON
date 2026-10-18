alter table public.app_user
    add column photo              bytea,
    add column photo_content_type text;

alter table public.app_user
    add constraint app_user_photo_complete
    check ((photo is null) = (photo_content_type is null));

grant update(photo, photo_content_type) on public.app_user to patron_app;

create view public.parish_clergy_public
    with (security_invoker = off) as
    select u.parish_id,
           u.user_id,
           u.full_name,
           (u.photo is not null) as has_photo
    from public.app_user u
    join public.parish_directory d on d.parish_id = u.parish_id
    where u.role = 'priest' and u.status = 'active';

grant select on public.parish_clergy_public to patron_app;

create view public.parish_clergy_photo_public
    with (security_invoker = off) as
    select u.parish_id,
           u.user_id,
           u.photo,
           u.photo_content_type
    from public.app_user u
    join public.parish_directory d on d.parish_id = u.parish_id
    where u.role = 'priest' and u.status = 'active'
      and u.photo is not null;

grant select on public.parish_clergy_photo_public to patron_app;



alter table public.document_application
    add column invoice_no           text,
    add column id_file              bytea,
    add column id_file_content_type text,
    add column id_file_name         text;

alter table public.document_application
    add constraint document_application_id_file_complete
    check ((id_file is null) = (id_file_content_type is null)
       and (id_file is null) = (id_file_name is null));

alter table public.document_application
    add constraint document_application_id_file_type
    check (id_file_content_type is null
           or id_file_content_type in ('image/jpeg', 'image/png',
                                       'image/webp', 'application/pdf'));

alter table public.document_application
    add constraint document_application_id_file_size
    check (id_file is null or octet_length(id_file) <= 5242880);

grant insert (invoice_no, id_file, id_file_content_type, id_file_name)
    on public.document_application to patron_app;
grant update (invoice_no, id_file, id_file_content_type, id_file_name)
    on public.document_application to patron_app;


create policy "document_application_applicant_attach" on public.document_application
    for update to patron_app
    using (
        applicant_id = public.current_user_id()
        and status = 'pending'
    )
    with check (
        applicant_id = public.current_user_id()
        and status = 'pending'
        and record_id is null
        and status_reason is null
        and is_paid is false
        and paid_at is null
        and verified_by is null and verified_at is null
        and approved_by is null and approved_at is null
        and rejected_by is null and rejected_at is null
        and cancelled_by is null and cancelled_at is null
    );