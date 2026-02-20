-- Priya Task Manager (PostgreSQL)
-- --------------------------------
-- Section 1: Run this section while connected to the default "postgres" database.
-- Skip if task_manager already exists.
CREATE DATABASE task_manager;

-- Section 2: Reconnect Query Tool to database "task_manager" and run below.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_role CHECK (role IN ('admin', 'user'))
);

CREATE TABLE IF NOT EXISTS task_statuses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  due_date DATE NULL,
  status_id BIGINT NOT NULL REFERENCES task_statuses(id),
  assigned_to_user_id BIGINT NOT NULL REFERENCES users(id),
  created_by_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tasks_priority CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_statuses_updated_at ON task_statuses;
CREATE TRIGGER trg_statuses_updated_at
BEFORE UPDATE ON task_statuses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO task_statuses (name)
VALUES ('To Do'), ('In Progress'), ('Completed'), ('Blocked')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES
  (
    'Priya Admin',
    'admin@ptm.com',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90:73131c5058394fdb31f889884d88814df7f36f2bb59d7b5955768f2812464385fd714e8604496c4b972c70279bd6bf001e243b8afceb0ce5d51bb14c10729b6b',
    'admin',
    TRUE
  ),
  (
    'Priya User',
    'user@ptm.com',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90:044ead2c32ce6342a273d37727d0c80a6d2aa2f0aa0622bb837ce3740e55b291170b791b3236b3f8972d4761bf7706f8569ac85b6ee5b88fadaa4f5a1562697b',
    'user',
    TRUE
  )
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

INSERT INTO tasks (
  title,
  description,
  priority,
  due_date,
  status_id,
  assigned_to_user_id,
  created_by_user_id
)
SELECT
  'Complete onboarding docs',
  'Prepare account setup and first-week checklist.',
  'high',
  CURRENT_DATE + INTERVAL '1 day',
  s.id,
  u.id,
  a.id
FROM task_statuses s
INNER JOIN users u ON u.email = 'user@ptm.com'
INNER JOIN users a ON a.email = 'admin@ptm.com'
WHERE s.name = 'To Do'
  AND NOT EXISTS (
    SELECT 1 FROM tasks WHERE title = 'Complete onboarding docs'
  );
