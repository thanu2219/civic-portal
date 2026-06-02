-- =====================================================
-- CivicPortal — Request status model update
-- Adds 'routed' (admin-approved, awaiting dept work) and
-- 'rejected' (admin-rejected) to public.requests.status.
-- Idempotent: safe to re-run.
-- =====================================================

-- 1) Drop the existing check constraint (if present) and add the new one
alter table public.requests
  drop constraint if exists requests_status_check;

alter table public.requests
  add constraint requests_status_check
  check (status in ('pending', 'routed', 'in_progress', 'completed', 'rejected', 'closed'));

-- 2) Backfill: existing "in_progress" rows were created by admin approvals
-- under the previous model. Move them to the new "routed" state.
update public.requests
   set status = 'routed'
 where status = 'in_progress';
