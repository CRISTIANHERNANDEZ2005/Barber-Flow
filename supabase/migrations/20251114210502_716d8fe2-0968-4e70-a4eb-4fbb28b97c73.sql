-- Create clients table for client information
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add phone format validation for clients
ALTER TABLE public.clients
ADD CONSTRAINT clients_valid_phone_format
CHECK (length(phone) = 10 AND phone ~ '^[0-9]+$');

-- Create services table for barbershop records
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add documentation comments for clients table
COMMENT ON TABLE public.clients IS 'Clients registry with unique phone numbers';
COMMENT ON COLUMN public.clients.phone IS 'Client phone number (10 digits, unique)';
COMMENT ON COLUMN public.clients.first_name IS 'Client first name (required)';
COMMENT ON COLUMN public.clients.last_name IS 'Client last name (optional)';

-- Add documentation comments for services table
COMMENT ON COLUMN public.services.client_id IS 'Reference to client who received the service';

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for reading and writing
-- Since this is a single-user barbershop app
CREATE POLICY "Allow public access to clients"
ON public.clients
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public access to services"
ON public.services
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for faster queries on clients
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_name ON public.clients(first_name, last_name);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

-- Create indexes for faster queries on services
CREATE INDEX idx_services_created_at ON public.services(created_at DESC);
CREATE INDEX idx_services_client_id ON public.services(client_id);
CREATE INDEX idx_services_service_type ON public.services(service_type);

-- Basic analytical indexes for daily patterns (simplified to avoid PostgreSQL issues)
-- These indexes support efficient analysis without complex expressions
CREATE INDEX idx_services_created_at_analysis ON public.services(created_at, price);
CREATE INDEX idx_services_service_type_analysis ON public.services(service_type, created_at);
CREATE INDEX idx_services_client_analysis ON public.services(client_id, created_at);

-- Additional comments for analytical queries optimization
COMMENT ON INDEX idx_services_created_at_analysis IS 'Supports date-based revenue analysis and daily patterns';
COMMENT ON INDEX idx_services_service_type_analysis IS 'Optimizes service popularity and trend analysis';
COMMENT ON INDEX idx_services_client_analysis IS 'Enables efficient client loyalty and frequency analysis';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create specialized views for client analytics
-- Client statistics view with service counts and totals
CREATE VIEW public.client_stats AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.phone,
  c.created_at as client_since,
  COUNT(s.id) as total_services,
  COALESCE(SUM(s.price), 0) as total_spent,
  COALESCE(AVG(s.price), 0) as avg_service_price,
  MAX(s.created_at) as last_service_date,
  MIN(s.created_at) as first_service_date,
  -- Calculate days between first and last service for frequency analysis
  CASE
    WHEN COUNT(s.id) > 1 THEN
      EXTRACT(days FROM (MAX(s.created_at) - MIN(s.created_at)))
    ELSE 0
  END as service_span_days,
  -- Service frequency (services per month)
  CASE
    WHEN COUNT(s.id) > 1 AND EXTRACT(days FROM (MAX(s.created_at) - MIN(s.created_at))) > 0 THEN
      (COUNT(s.id)::float / (EXTRACT(days FROM (MAX(s.created_at) - MIN(s.created_at))) / 30.0))
    ELSE 0
  END as services_per_month
FROM public.clients c
LEFT JOIN public.services s ON c.id = s.client_id
GROUP BY c.id, c.first_name, c.last_name, c.phone, c.created_at;

-- Client loyalty ranking view
CREATE VIEW public.client_loyalty_ranking AS
SELECT
  cs.*,
  -- Loyalty score calculation (weighted by recency, frequency, and monetary value)
  CASE
    WHEN cs.total_services = 0 THEN 0
    ELSE (
      -- Recency score (0-40 points): More recent = higher score
      CASE
        WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
        WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
        WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
        ELSE 5
      END +
      -- Frequency score (0-35 points): More services = higher score
      CASE
        WHEN cs.total_services >= 20 THEN 35
        WHEN cs.total_services >= 10 THEN 25
        WHEN cs.total_services >= 5 THEN 15
        WHEN cs.total_services >= 2 THEN 8
        ELSE 2
      END +
      -- Monetary score (0-25 points): Higher spending = higher score
      CASE
        WHEN cs.total_spent >= 500 THEN 25
        WHEN cs.total_spent >= 200 THEN 18
        WHEN cs.total_spent >= 100 THEN 12
        WHEN cs.total_spent >= 50 THEN 6
        ELSE 2
      END
    )
  END as loyalty_score,
  -- Client tier based on loyalty score
  CASE
    WHEN cs.total_services = 0 THEN 'Sin Servicios'
    WHEN (
      CASE
        WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
        WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
        WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
        ELSE 5
      END +
      CASE
        WHEN cs.total_services >= 20 THEN 35
        WHEN cs.total_services >= 10 THEN 25
        WHEN cs.total_services >= 5 THEN 15
        WHEN cs.total_services >= 2 THEN 8
        ELSE 2
      END +
      CASE
        WHEN cs.total_spent >= 500 THEN 25
        WHEN cs.total_spent >= 200 THEN 18
        WHEN cs.total_spent >= 100 THEN 12
        WHEN cs.total_spent >= 50 THEN 6
        ELSE 2
      END
    ) >= 80 THEN 'VIP'
    WHEN (
      CASE
        WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
        WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
        WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
        ELSE 5
      END +
      CASE
        WHEN cs.total_services >= 20 THEN 35
        WHEN cs.total_services >= 10 THEN 25
        WHEN cs.total_services >= 5 THEN 15
        WHEN cs.total_services >= 2 THEN 8
        ELSE 2
      END +
      CASE
        WHEN cs.total_spent >= 500 THEN 25
        WHEN cs.total_spent >= 200 THEN 18
        WHEN cs.total_spent >= 100 THEN 12
        WHEN cs.total_spent >= 50 THEN 6
        ELSE 2
      END
    ) >= 60 THEN 'Fiel'
    WHEN (
      CASE
        WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
        WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
        WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
        ELSE 5
      END +
      CASE
        WHEN cs.total_services >= 20 THEN 35
        WHEN cs.total_services >= 10 THEN 25
        WHEN cs.total_services >= 5 THEN 15
        WHEN cs.total_services >= 2 THEN 8
        ELSE 2
      END +
      CASE
        WHEN cs.total_spent >= 500 THEN 25
        WHEN cs.total_spent >= 200 THEN 18
        WHEN cs.total_spent >= 100 THEN 12
        WHEN cs.total_spent >= 50 THEN 6
        ELSE 2
      END
    ) >= 40 THEN 'Regular'
    WHEN (
      CASE
        WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
        WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
        WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
        ELSE 5
      END +
      CASE
        WHEN cs.total_services >= 20 THEN 35
        WHEN cs.total_services >= 10 THEN 25
        WHEN cs.total_services >= 5 THEN 15
        WHEN cs.total_services >= 2 THEN 8
        ELSE 2
      END +
      CASE
        WHEN cs.total_spent >= 500 THEN 25
        WHEN cs.total_spent >= 200 THEN 18
        WHEN cs.total_spent >= 100 THEN 12
        WHEN cs.total_spent >= 50 THEN 6
        ELSE 2
      END
    ) >= 20 THEN 'Ocasional'
    ELSE 'Inactivo'
  END as client_tier,
  RANK() OVER (ORDER BY
    CASE
      WHEN cs.total_services = 0 THEN 0
      ELSE (
        CASE
          WHEN cs.last_service_date >= NOW() - INTERVAL '30 days' THEN 40
          WHEN cs.last_service_date >= NOW() - INTERVAL '90 days' THEN 25
          WHEN cs.last_service_date >= NOW() - INTERVAL '180 days' THEN 15
          ELSE 5
        END +
        CASE
          WHEN cs.total_services >= 20 THEN 35
          WHEN cs.total_services >= 10 THEN 25
          WHEN cs.total_services >= 5 THEN 15
          WHEN cs.total_services >= 2 THEN 8
          ELSE 2
        END +
        CASE
          WHEN cs.total_spent >= 500 THEN 25
          WHEN cs.total_spent >= 200 THEN 18
          WHEN cs.total_spent >= 100 THEN 12
          WHEN cs.total_spent >= 50 THEN 6
          ELSE 2
        END
      )
    END DESC
  ) as loyalty_rank
FROM public.client_stats cs;

-- Client service history with time periods
CREATE VIEW public.client_service_periods AS
SELECT
  c.id as client_id,
  c.first_name,
  c.last_name,
  -- Weekly stats
  COUNT(CASE WHEN s.created_at >= date_trunc('week', NOW()) THEN 1 END) as services_this_week,
  SUM(CASE WHEN s.created_at >= date_trunc('week', NOW()) THEN s.price ELSE 0 END) as spent_this_week,
  -- Monthly stats
  COUNT(CASE WHEN s.created_at >= date_trunc('month', NOW()) THEN 1 END) as services_this_month,
  SUM(CASE WHEN s.created_at >= date_trunc('month', NOW()) THEN s.price ELSE 0 END) as spent_this_month,
  -- Yearly stats
  COUNT(CASE WHEN s.created_at >= date_trunc('year', NOW()) THEN 1 END) as services_this_year,
  SUM(CASE WHEN s.created_at >= date_trunc('year', NOW()) THEN s.price ELSE 0 END) as spent_this_year,
  -- Last 30 days
  COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as services_last_30_days,
  SUM(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN s.price ELSE 0 END) as spent_last_30_days,
  -- Last 90 days
  COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '90 days' THEN 1 END) as services_last_90_days,
  SUM(CASE WHEN s.created_at >= NOW() - INTERVAL '90 days' THEN s.price ELSE 0 END) as spent_last_90_days
FROM public.clients c
LEFT JOIN public.services s ON c.id = s.client_id
GROUP BY c.id, c.first_name, c.last_name;

-- Client service types preferences
CREATE VIEW public.client_service_preferences AS
SELECT
  c.id as client_id,
  c.first_name,
  c.last_name,
  s.service_type,
  COUNT(*) as service_count,
  SUM(s.price) as total_spent_on_service,
  AVG(s.price) as avg_price_for_service,
  MAX(s.created_at) as last_service_of_type,
  RANK() OVER (PARTITION BY c.id ORDER BY COUNT(*) DESC) as preference_rank
FROM public.clients c
JOIN public.services s ON c.id = s.client_id
GROUP BY c.id, c.first_name, c.last_name, s.service_type;

-- Function to get client risk analysis (clients at risk of churning)
CREATE OR REPLACE FUNCTION get_client_risk_analysis()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  phone TEXT,
  risk_level TEXT,
  days_since_last_service INTEGER,
  total_services BIGINT,
  avg_days_between_services NUMERIC,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    CASE
      WHEN cs.last_name IS NOT NULL THEN cs.first_name || ' ' || cs.last_name
      ELSE cs.first_name
    END,
    cs.phone,
    CASE
      WHEN cs.total_services = 0 THEN 'Sin Servicios'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 180 THEN 'Alto Riesgo'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 90 THEN 'Riesgo Medio'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 45 THEN 'Riesgo Bajo'
      ELSE 'Activo'
    END,
    EXTRACT(days FROM (NOW() - cs.last_service_date))::INTEGER,
    cs.total_services,
    CASE
      WHEN cs.total_services > 1 AND cs.service_span_days > 0 THEN
        (cs.service_span_days / cs.total_services::NUMERIC)
      ELSE 0
    END,
    CASE
      WHEN cs.total_services = 0 THEN 'Contactar para primer servicio'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 180 THEN 'Campaña de reactivación urgente'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 90 THEN 'Oferta especial de regreso'
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 45 THEN 'Recordatorio amigable'
      ELSE 'Mantener satisfacción actual'
    END
  FROM public.client_stats cs
  ORDER BY
    CASE
      WHEN cs.total_services = 0 THEN 4
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 180 THEN 1
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 90 THEN 2
      WHEN EXTRACT(days FROM (NOW() - cs.last_service_date)) > 45 THEN 3
      ELSE 5
    END,
    cs.total_services DESC;
END;
$$ LANGUAGE plpgsql;

-- Additional indexes for analytics performance
CREATE INDEX idx_services_client_date_range ON public.services(client_id, created_at DESC);
CREATE INDEX idx_services_price_analysis ON public.services(client_id, price DESC);
CREATE INDEX idx_services_type_client ON public.services(service_type, client_id);

-- Comments for analytics views
COMMENT ON VIEW public.client_stats IS 'Complete client statistics including service counts, spending, and frequency metrics';
COMMENT ON VIEW public.client_loyalty_ranking IS 'Client loyalty analysis with scores, tiers, and rankings based on RFM model';
COMMENT ON VIEW public.client_service_periods IS 'Client activity broken down by time periods (weekly, monthly, yearly)';
COMMENT ON VIEW public.client_service_preferences IS 'Client preferences by service type with ranking';
COMMENT ON FUNCTION get_client_risk_analysis() IS 'Identifies clients at risk of churning with recommended actions';

INSERT INTO public.clients (id, first_name, last_name, phone, created_at)
VALUES
('3fa85f64-5717-4562-b3fc-2c963f66afa6', 'John', 'Doe', '1234567890', NOW()),
('c9b1f9d2-2b2e-4b5a-9d4b-1f4a2f6a7e8c', 'Jane', 'Smith', '0987654321', NOW());

-- Añadimos datos a la base de datos
INSERT INTO public.services (id, client_id, service_type, price, created_at)
VALUES
('11111111-1111-1111-1111-111111111111', '3fa85f64-5717-4562-b3fc-2c963f66afa6', 'Covi', 15.00, NOW()),
('22222222-2222-2222-2222-222222222222', '3fa85f64-5717-4562-b3fc-2c963f66afa6', 'Covi',  5.00, NOW()),
('33333333-3333-3333-3333-333333333333', 'c9b1f9d2-2b2e-4b5a-9d4b-1f4a2f6a7e8c', 'Degradado', 15.00, NOW()),
('44444444-4444-4444-4444-444444444444', 'c9b1f9d2-2b2e-4b5a-9d4b-1f4a2f6a7e8c', 'Barba', 10.00, NOW());