-- Run this in the Supabase SQL Editor to add the Question Banks feature

-- 1. Create the Question Banks table
CREATE TABLE public.question_banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB NOT NULL, -- Array of strings representing the questions
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Question Banks
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to question banks"
ON public.question_banks
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

-- Students can read question banks (needed for when they take the interview)
CREATE POLICY "Students can read question banks"
ON public.question_banks
FOR SELECT
TO authenticated
USING (true);


-- 2. Modify scheduled_interviews to link to question_banks and support types
ALTER TABLE public.scheduled_interviews 
ADD COLUMN interview_type TEXT DEFAULT 'official' CHECK (interview_type IN ('demo', 'official')),
ADD COLUMN question_bank_id UUID REFERENCES public.question_banks(id) NULL;
