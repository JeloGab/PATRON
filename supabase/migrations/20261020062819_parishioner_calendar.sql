create view public.parish_calendar_feed
    with (security_invoker = off) as
    select e.event_id,
           e.parish_id,
           e.title,
           e.description,
           e.event_type,
           e.event_date,
           e.start_time,
           e.end_time
      from public.parish_event e
      join public.parish p on p.parish_id = e.parish_id
     where e.event_type <> 'sacramental'
       and e.status in ('approved', 'completed')
       and p.status = 'active';

grant select on public.parish_calendar_feed to patron_app;


create view public.parish_calendar_reserved
    with (security_invoker = off) as
    select distinct e.parish_id,
           e.event_date
      from public.parish_event e
      join public.parish p on p.parish_id = e.parish_id
     where e.event_type = 'sacramental'
       and e.status in ('approved', 'completed')
       and p.status = 'active';

grant select on public.parish_calendar_reserved to patron_app;


create view public.parish_calendar_blocked
    with (security_invoker = off) as
    select b.blocked_date_id,
           b.parish_id,
           b.date,
           b.start_time,
           b.end_time,
           b.reason
      from public.blocked_date b
      join public.parish p on p.parish_id = b.parish_id
     where b.type = 'parish'
       and p.status = 'active';

grant select on public.parish_calendar_blocked to patron_app;
