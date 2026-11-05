-- In-app notifications, job violation reports, account suspension, and admin
-- removal of job posts.

-- user_id NULL = admin broadcast to everyone; otherwise a personal system notice.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('announcement', 'update', 'job', 'verification', 'review', 'report')),
  title text NOT NULL,
  body text NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications(user_id, created_at DESC);

-- One table tracks reads for both personal and broadcast notifications.
CREATE TABLE notification_reads (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK (category IN ('fraud', 'fake_listing', 'unsafe_flying', 'harassment', 'other')),
  note text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'resolved', 'job_removed', 'owner_suspended')),
  admin_note text,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, reporter_id)
);
CREATE INDEX job_reports_open_idx ON job_reports(status, created_at);

-- Suspended accounts can't sign in; their open jobs drop out of the marketplace.
ALTER TABLE users ADD COLUMN suspended_at timestamptz;
ALTER TABLE users ADD COLUMN suspension_reason text;

-- 'removed' = taken down by an admin after a violation report.
ALTER TABLE jobs ADD COLUMN removed_reason text;
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('open', 'on_hold', 'assigned', 'pending_confirmation', 'completed', 'cancelled', 'removed'));
ALTER TABLE jobs DROP CONSTRAINT jobs_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_spraying_held_check
  CHECK (service <> 'Spraying' OR status IN ('on_hold', 'cancelled', 'removed'));
