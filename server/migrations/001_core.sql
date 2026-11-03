-- Core marketplace schema: accounts, consent records, operator verification,
-- jobs and bids. Timestamps are UTC (timestamptz).

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('operator', 'farm_owner', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- POPIA: record which notice version each user accepted, and when.
CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('terms_privacy', 'licence_upload')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_user_idx ON consents(user_id, kind);

CREATE TABLE operator_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  base text NOT NULL DEFAULT '',
  radius_km integer NOT NULL DEFAULT 50 CHECK (radius_km BETWEEN 1 AND 500),
  services text[] NOT NULL DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (verification_status IN ('not_submitted', 'in_review', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Restricted services (spraying) are created as 'on_hold' and can never be
-- assigned until an approved compliance policy exists.
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  service text NOT NULL CHECK (service IN ('Mapping', 'Monitoring', 'Surveying', 'Spraying')),
  location text NOT NULL,
  area_ha numeric(10, 2) NOT NULL CHECK (area_ha > 0),
  preferred_date date NOT NULL,
  budget_zar integer NOT NULL CHECK (budget_zar > 0),
  brief text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('open', 'on_hold', 'assigned', 'pending_confirmation', 'completed', 'cancelled')),
  assigned_operator_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (service <> 'Spraying' OR status IN ('on_hold', 'cancelled'))
);
CREATE INDEX jobs_status_idx ON jobs(status, created_at DESC);
CREATE INDEX jobs_owner_idx ON jobs(owner_id);
CREATE INDEX jobs_operator_idx ON jobs(assigned_operator_id);

CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES users(id),
  amount_zar integer NOT NULL CHECK (amount_zar > 0),
  days integer NOT NULL CHECK (days BETWEEN 1 AND 60),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, operator_id)
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
