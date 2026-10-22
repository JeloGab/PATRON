-- Drop two write-only columns from document_application.
--
--   paid_at  -- written by markPaid, read nowhere: it appeared in no API response
--               and on no page. The office reconciles against invoice_no.
--   notes    -- free-text on the request. Removed from both forms and from the
--               response shape; identifying information is structured fields only.
--
-- Accepted cost: the system can say a fee was paid, but not when it was confirmed.
--
-- The backend was updated and verified first (2026-10-21), so this is safe to apply:
-- markPaid no longer writes paid_at, the COLUMNS select list no longer names notes,
-- and insertApplication is renumbered to $14. Applying this against an older server
-- build raises 42703 undefined column -> INTERNAL_ERROR 500.
--
-- WHAT DROPS BY DEPENDENCY, with no statement here:
--   * constraint document_application_payment_complete
--       check ((paid_at is null) = (is_paid is false))   -- 20260921030037:89
--       A check constraint referencing a dropped column is dropped with it.
--   * paid_at from the grant update column list           -- 20260921030037:113
--   * notes   from the grant insert column list           -- 20260921030037:111
--       Column-level privileges disappear with the column.
--
-- WHAT DOES NOT, and is why the first attempt failed with 2BP01:
--   policy document_application_applicant_attach           -- 20261016040627:65
--   names `paid_at is null` in its WITH CHECK, so Postgres refuses the drop.
--   It is altered below BEFORE the drop, which removes the dependency. Dropping
--   and recreating the policy would work too, but ALTER cannot leave the table
--   briefly unprotected and cannot mistype the eleven clauses being preserved.
--
--   Removing that one clause loses nothing. The constraint above made
--   `paid_at is null` and `is_paid is false` equivalent by definition, so the
--   surviving `is_paid is false` carries the whole of the guard: an applicant
--   still cannot flip the paid flag on their own request.
--
-- Verified absent: no view, no index, no generated column, no trigger and no
-- function references either column.


-- 1. Release the dependency. USING is restated unchanged so the file shows the
--    whole policy; only the paid_at line is gone from WITH CHECK.
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


-- 2. Now the columns drop.
alter table public.document_application
    drop column paid_at,
    drop column notes;
