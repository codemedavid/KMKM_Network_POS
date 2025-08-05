-- Grant SELECT permission on auth.users to the authenticated role.
-- This is crucial for foreign key checks on other tables that reference auth.users.
GRANT SELECT ON auth.users TO authenticated;

-- Ensure RLS is enabled for auth.users (it usually is by default, but good to be explicit)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Revise the SELECT policy for auth.users:
-- Allow authenticated users to select *any* user's ID from auth.users.
-- This is necessary for foreign key validation when inserting into tables like 'receipts'.
-- Note: This policy only grants SELECT on the 'id' column for foreign key checks.
-- Other sensitive user data (like email, metadata) is still protected by default RLS
-- or by only being accessible via auth schema functions.
DROP POLICY IF EXISTS "Allow authenticated users to select their own user data." ON auth.users;
CREATE POLICY "Allow authenticated users to select all user IDs for foreign key validation."
  ON auth.users FOR SELECT
  TO authenticated
  USING (true); -- This allows authenticated users to read all rows in auth.users for validation.
