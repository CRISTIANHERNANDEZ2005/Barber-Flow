-- Create services table for barbershop records
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  service_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access for reading and writing
-- Since this is a single-user barbershop app
CREATE POLICY "Allow public access to services" 
ON public.services 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries on created_at
CREATE INDEX idx_services_created_at ON public.services(created_at DESC);