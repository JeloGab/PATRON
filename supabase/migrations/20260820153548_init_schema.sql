create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create role patron_app with login password 'kwEmYOJXDczMWmUuwjFIlfGD' noinherit;

grant usage on schema public to patron_app;
grant select, insert, update, delete on all tables in schema public to patron_app;
grant usage, select on all sequences in schema public to patron_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to patron_app;
alter default privileges in schema public
  grant usage, select on sequences to patron_app;

create or replace function public.current_parish_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.parish_id', true), '')::uuid
$$;

create table public.health_check (
  id smallint primary key default 1,
  checked_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.health_check (id) values (1);