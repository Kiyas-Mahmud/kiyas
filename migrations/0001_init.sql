-- One JSON document per page section (hero, about, projects, …).
CREATE TABLE IF NOT EXISTS sections (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Failed admin logins, for rate limiting (5 per IP per 15 minutes).
CREATE TABLE IF NOT EXISTS login_failures (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_failures_ip_ts ON login_failures (ip, ts);
