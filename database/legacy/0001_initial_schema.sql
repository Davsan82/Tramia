BEGIN;

CREATE TABLE IF NOT EXISTS app_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  user_type text NOT NULL DEFAULT 'ciudadano'
    CHECK (user_type IN ('ciudadano', 'emprendedor', 'profesional', 'estudiante')),
  department text,
  dni_ruc text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  entity_name text,
  official_url text,
  estimated_days integer CHECK (estimated_days IS NULL OR estimated_days >= 0),
  estimated_cost numeric(12, 2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedure_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  required_format text,
  position integer NOT NULL CHECK (position > 0),
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (procedure_id, position)
);

CREATE TABLE IF NOT EXISTS procedure_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  modality text CHECK (modality IS NULL OR modality IN ('virtual', 'presencial', 'mixta')),
  official_url text,
  estimated_hours numeric(8, 2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  estimated_cost numeric(12, 2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  position integer NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (procedure_id, position)
);

CREATE TABLE IF NOT EXISTS user_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES procedures(id),
  mode text NOT NULL DEFAULT 'autonomo' CHECK (mode IN ('autonomo', 'delegado')),
  status text NOT NULL DEFAULT 'en_progreso'
    CHECK (status IN ('borrador', 'en_progreso', 'bloqueado', 'completado', 'cancelado')),
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  current_step_id uuid REFERENCES procedure_steps(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_procedure_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_procedure_id uuid NOT NULL REFERENCES user_procedures(id) ON DELETE CASCADE,
  procedure_step_id uuid NOT NULL REFERENCES procedure_steps(id),
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_progreso', 'completado', 'bloqueado')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  scheduled_for date,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_procedure_id, procedure_step_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_procedure_id uuid NOT NULL REFERENCES user_procedures(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES procedure_requirements(id),
  uploaded_by uuid NOT NULL REFERENCES app_user_profiles(id),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  storage_key text NOT NULL UNIQUE,
  validation_status text NOT NULL DEFAULT 'pendiente'
    CHECK (validation_status IN ('pendiente', 'procesando', 'aprobado', 'corregir', 'error')),
  validation_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz
);

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  user_procedure_id uuid REFERENCES user_procedures(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'enviado', 'leido', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES app_user_profiles(id) ON DELETE SET NULL,
  user_procedure_id uuid REFERENCES user_procedures(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS procedures_active_category_idx
  ON procedures (category, title)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS user_procedures_user_status_idx
  ON user_procedures (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_procedure_steps_parent_status_idx
  ON user_procedure_steps (user_procedure_id, status);

CREATE INDEX IF NOT EXISTS documents_user_procedure_idx
  ON documents (user_procedure_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reminders_user_due_idx
  ON reminders (user_id, due_at)
  WHERE status = 'pendiente';

CREATE INDEX IF NOT EXISTS audit_events_user_procedure_idx
  ON audit_events (user_procedure_id, created_at DESC);

COMMIT;
