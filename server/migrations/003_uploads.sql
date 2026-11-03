-- Files stored in Cloudinary. Licences are private evidence: their public_id
-- is never returned to non-admins and they have no stored URL. Portfolio
-- photos are public and keep their delivery URL.

CREATE TABLE uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('licence', 'portfolio')),
  public_id text NOT NULL UNIQUE,
  format text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0),
  url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'licence') = (url IS NULL))
);
-- One current licence per operator; a new upload replaces the old one.
CREATE UNIQUE INDEX uploads_one_licence_idx ON uploads(user_id) WHERE kind = 'licence';
CREATE INDEX uploads_user_idx ON uploads(user_id, kind, created_at DESC);
