-- Profile pictures: one per user, public delivery like portfolio photos.
ALTER TABLE uploads DROP CONSTRAINT uploads_kind_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_kind_check CHECK (kind IN ('licence', 'portfolio', 'avatar'));
CREATE UNIQUE INDEX uploads_one_avatar_idx ON uploads(user_id) WHERE kind = 'avatar';
