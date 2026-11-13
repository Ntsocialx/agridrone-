-- Stage 5 (training to earning): SACAA credentials with expiry, a required training
-- record, province for reporting, and the "updating" status for approved pilots.

-- Licence (RPL) and Remote Operating Certificate (ROC) details, training record and province.
ALTER TABLE operator_profiles
  ADD COLUMN province text CHECK (province IN ('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape')),
  ADD COLUMN rpl_number text CHECK (char_length(rpl_number) <= 40),
  ADD COLUMN rpl_expires_on date,
  ADD COLUMN roc_holder_name text CHECK (char_length(roc_holder_name) <= 120),
  ADD COLUMN roc_number text CHECK (char_length(roc_number) <= 40),
  ADD COLUMN roc_expires_on date,
  ADD COLUMN training_provider text CHECK (char_length(training_provider) <= 120),
  ADD COLUMN training_programme text CHECK (char_length(training_programme) <= 120),
  ADD COLUMN training_completed_on date,
  -- The last day this pilot may bid or be selected, based on what an admin verified:
  -- the earlier of the RPL and ROC expiry dates (or a grace-period deadline). NULL = not eligible.
  ADD COLUMN eligible_until date,
  -- Expiry reminders already sent (e.g. 'rpl:7:2027-03-01'), so each goes out once.
  ADD COLUMN reminders_sent text[] NOT NULL DEFAULT '{}';

-- 'updating': an approved pilot is editing their details. They keep bidding until
-- eligible_until while they update, then resubmit for review.
ALTER TABLE operator_profiles DROP CONSTRAINT operator_profiles_verification_status_check;
ALTER TABLE operator_profiles ADD CONSTRAINT operator_profiles_verification_status_check
  CHECK (verification_status IN ('not_submitted', 'in_review', 'approved', 'rejected', 'updating'));

-- Province of the farm for new jobs (older jobs stay NULL = not set).
ALTER TABLE jobs
  ADD COLUMN province text CHECK (province IN ('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'));

-- ROC proof and training certificate are private evidence like the licence: no stored URL.
ALTER TABLE uploads DROP CONSTRAINT uploads_kind_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_kind_check
  CHECK (kind IN ('licence', 'roc', 'training_certificate', 'portfolio', 'avatar'));
ALTER TABLE uploads DROP CONSTRAINT uploads_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_private_has_no_url_check
  CHECK ((kind IN ('licence', 'roc', 'training_certificate')) = (url IS NULL));
CREATE UNIQUE INDEX uploads_one_roc_idx ON uploads(user_id) WHERE kind = 'roc';
CREATE UNIQUE INDEX uploads_one_training_certificate_idx ON uploads(user_id) WHERE kind = 'training_certificate';

-- Pilots approved before these rules: 30 days to add the new details, then blocked
-- until an admin re-approves them (user decision, 13 November 2026).
UPDATE operator_profiles SET eligible_until = CURRENT_DATE + 30 WHERE verification_status = 'approved';
INSERT INTO notifications (user_id, kind, title, body)
SELECT user_id, 'verification', 'Update your pilot details',
  'AgricDrone Hub now checks your Remote Operating Certificate, licence expiry and training. Add them in Profile by '
    || to_char(CURRENT_DATE + 30, 'FMDD Mon YYYY') || ' to keep bidding.'
FROM operator_profiles WHERE verification_status = 'approved';
