alter policy "document_application_applicant_attach" on public.document_application
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
        and verified_by is null and verified_at is null
        and approved_by is null and approved_at is null
        and rejected_by is null and rejected_at is null
        and cancelled_by is null and cancelled_at is null
    );


alter table public.document_application
    drop column paid_at,
    drop column notes;
