create table public.document_type (
    type_id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    record_type text not null,
    availability boolean not null default true,

    constraint document_type_record_type_valid
    check (record_type in ('baptism', 'confirmation', 'marriage', 'death')),

    constraint document_type_record_type_key
    unique (record_type)
);

insert into public.document_type (name, description, record_type) values
    ('Baptismal Certificate',   'Certifies a baptism recorded in the parish baptismal register.',   'baptism'),
    ('Confirmation Certificate','Certifies a confirmation recorded in the parish register.',         'confirmation'),
    ('Marriage Certificate',    'Certifies a marriage recorded in the parish marriage register.',    'marriage'),
    ('Death Certificate',       'Certifies a death recorded in the parish register of the dead.',    'death');

revoke insert, update, delete on public.document_type from patron_app;
revoke all on public.document_type from patron_admin;

alter table public.document_type enable row level security;

create policy "document_type_read" on public.document_type
    for select to patron_app
    using (true);