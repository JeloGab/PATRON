alter table public.parish
    add column seal              bytea,
    add column seal_content_type text;

alter table public.parish
    add constraint parish_seal_complete
    check ((seal is null) = (seal_content_type is null));

grant update (seal, seal_content_type) on public.parish to patron_app;

create view public.parish_seal_public
    with (security_invoker = off) as
    select parish_id, seal, seal_content_type
    from public.parish
    where status = 'active'
      and seal is not null;

grant select on public.parish_seal_public to patron_app;

create table public.parish_gallery_image (
    image_id     uuid primary key default gen_random_uuid(),
    parish_id    uuid not null references public.parish(parish_id),
    file_name    text not null,
    content_type text not null,
    byte_size    integer not null,
    content      bytea not null,
    uploaded_by  uuid not null references public.app_user(user_id),
    uploaded_at  timestamptz not null default now(),

    constraint parish_gallery_image_type_valid
      check (content_type in ('image/jpeg', 'image/png')),
    constraint parish_gallery_image_size_valid
      check (byte_size > 0 and byte_size <= 5242880)
);

create index parish_gallery_image_parish
    on public.parish_gallery_image (parish_id, uploaded_at);

alter table public.parish_gallery_image enable row level security;

create policy "parish_gallery_image_tenant_isolation"
    on public.parish_gallery_image
    for all to patron_app
    using (parish_id = public.current_parish_id())
    with check (parish_id = public.current_parish_id());

revoke insert, update, delete on public.parish_gallery_image from patron_app;

grant insert (parish_id, file_name, content_type, byte_size, content, uploaded_by)
    on public.parish_gallery_image to patron_app;

grant delete on public.parish_gallery_image to patron_app;

create view public.parish_gallery_public
    with (security_invoker = off) as
    select g.image_id, g.parish_id, g.content_type, g.content, g.uploaded_at
    from public.parish_gallery_image g
    join public.parish p on p.parish_id = g.parish_id
    where p.status = 'active';

grant select on public.parish_gallery_public to patron_app;
