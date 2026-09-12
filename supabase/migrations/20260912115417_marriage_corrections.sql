update public.record_subject
   set role = case when gender = 'male' then 'groom' else 'bride' end
 where role = 'spouse';

alter table public.record_subject
  drop constraint record_subject_role_valid;

alter table public.record_subject
  add constraint record_subject_role_valid
  check (
    role = 'primary'
    or (role = 'groom' and gender = 'male')
    or (role = 'bride' and gender = 'female')
  );

create unique index record_subject_role_key
    on public.record_subject (record_id, role);

grant update (role) on public.record_subject to patron_app;