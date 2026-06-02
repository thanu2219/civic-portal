-- =====================================================
-- CivicPortal — Allow dept_admin to reroute requests
-- Fixes: "new row violates row-level security policy for table requests"
-- when a dept_admin uses the "Wrong Department" rejection (which sends
-- the request back to the admin queue by clearing department_id and
-- resetting status to 'pending').
--
-- Root cause: the prior policy had only a USING clause, so Postgres
-- applied the same expression as WITH CHECK. After reroute the row's
-- department_id is NULL, so the WITH CHECK fails because the user is
-- not staff of NULL.
--
-- Idempotent: safe to re-run.
-- =====================================================

drop policy if exists "Dept admins can update their requests" on public.requests;

create policy "Dept admins can update their requests"
  on public.requests for update
  to authenticated
  using (
    exists (
      select 1 from public.department_staff ds
      where ds.user_id = auth.uid() and ds.department_id = requests.department_id
    )
  )
  with check (
    -- Post-update, either the row still belongs to one of my departments
    exists (
      select 1 from public.department_staff ds
      where ds.user_id = auth.uid() and ds.department_id = requests.department_id
    )
    -- ...or I am rerouting it back to the admin queue
    --    (department cleared, status reset to pending).
    or (requests.department_id is null and requests.status = 'pending')
  );
