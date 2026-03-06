-- Run this in the Supabase SQL Editor to fix the RLS policies for scheduled_interviews

-- Ensure RLS is enabled on the table
ALTER TABLE public.scheduled_interviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read pending schedules" ON public.scheduled_interviews;
DROP POLICY IF EXISTS "Students can only see their own pending schedules" ON public.scheduled_interviews;
DROP POLICY IF EXISTS "Admins can do everything on scheduled_interviews" ON public.scheduled_interviews;

-- Allow students to read their own schedules
CREATE POLICY "Students can read own schedules"
ON public.scheduled_interviews
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow admins full access (Insert, Update, Delete, Select)
CREATE POLICY "Admins full access to schedules"
ON public.scheduled_interviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
