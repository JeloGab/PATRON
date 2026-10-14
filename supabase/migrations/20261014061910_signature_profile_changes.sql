alter table public.parish
    add column photo              bytea,
    add column photo_content_type text;

alter table public.parish
    add constraint parish_photo_complete
    check ((photo is null) = (photo_content_type is null));

grant update(name,address,contact_no,email,facebook_page_id,photo,photo_content_type)
    on public.parish to patron_app;

create view public.parish_photo_public
    with (security_invoker = off) as
    select parish_id, photo, photo_content_type
    from public.parish
    where status = 'active'
      and photo is not null;

grant select on public.parish_photo_public to patron_app;

alter table public.app_user
    add column signature              bytea,
    add column signature_content_type text;

alter table public.app_user
    add constraint app_user_signature_complete
    check ((signature is null) = (signature_content_type is null));


alter table public.app_user
    add constraint app_user_signature_priest_only
    check (signature is null or role = 'priest');

alter table public.document_file
    add column signature              bytea,
    add column signature_content_type text;

alter table public.document_file
    add constraint document_file_signature_complete
    check ((signature is null) = (signature_content_type is null));

grant update (full_name,password_hash,must_change_password,signature,signature_content_type)
    on public.app_user to patron_app;

grant insert (parish_id, document_type_id, record_id, application_id,
              source_event_id, release_type, verification_code, snapshot,
              signatory_id, issued_by, signature, signature_content_type)
    on public.document_file to patron_app;