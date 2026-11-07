-- Bookpal ilk şema: kullanıcılar, danışanlar, randevular, oturumlar.
-- Uygulanmış bir dosya değiştirilmez; şema değişikliği yeni numaralı dosya olur.

-- Randevu çakışma kuralı (EXCLUDE) için gerekli.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TABLE users (
  id           text PRIMARY KEY,
  email        text NOT NULL,
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE clients (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id),
  first_name text NOT NULL,
  last_name  text NOT NULL,
  birth_date date NOT NULL,
  gender     text NOT NULL CHECK (gender IN ('female', 'male', 'other', 'undisclosed')),
  deleted_at timestamptz
);
-- Yumuşak silme: silinmişler listede çıkmaz.
CREATE INDEX clients_user_active_idx ON clients (user_id) WHERE deleted_at IS NULL;

CREATE TABLE appointments (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id),
  client_id  text NOT NULL REFERENCES clients (id),
  date       date NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  status     text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  note       text NOT NULL DEFAULT '',
  CHECK (end_time > start_time),
  -- Aynı kullanıcının iptal edilmemiş iki randevusu aynı saat aralığına giremez.
  -- Kontrol ve yazma tek adımda, atomik olur.
  EXCLUDE USING gist (
    user_id WITH =,
    tsrange(date + start_time, date + end_time) WITH &&
  ) WHERE (status <> 'cancelled')
);
CREATE INDEX appointments_user_date_idx ON appointments (user_id, date);

CREATE TABLE sessions (
  -- Jetonun SHA-256 özeti (hex); düz jeton saklanmaz.
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
