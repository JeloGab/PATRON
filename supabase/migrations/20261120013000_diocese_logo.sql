create table public.diocese (
    id                smallint primary key default 1,
    logo              bytea,
    logo_content_type text,
    updated_at        timestamptz,
    updated_by        uuid references public.app_user(user_id),

    constraint diocese_single_row    check (id = 1),
    constraint diocese_logo_complete check ((logo is null) = (logo_content_type is null)),
    constraint diocese_logo_type     check (logo_content_type is null
                                            or logo_content_type in ('image/png', 'image/jpeg')),
    constraint diocese_logo_size     check (logo is null or octet_length(logo) <= 1048576)
);

insert into public.diocese (id) values (1);

alter table public.diocese enable row level security;

create policy "diocese_read" on public.diocese
    for select to patron_app using (true);

create policy "diocese_admin_all" on public.diocese
    for all to patron_admin using (true) with check (true);

grant select on public.diocese to patron_app;
revoke insert, update, delete on public.diocese from patron_app;
grant select, insert, update, delete on public.diocese to patron_admin;
