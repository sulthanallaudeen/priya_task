CREATE DATABASE IF NOT EXISTS task_manager;
USE task_manager;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
);

CREATE TABLE IF NOT EXISTS task_statuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_statuses_name (name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  due_date DATE NULL,
  status_id BIGINT UNSIGNED NOT NULL,
  assigned_to_user_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tasks_status_id (status_id),
  INDEX idx_tasks_priority (priority),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_assigned_to (assigned_to_user_id),
  INDEX idx_tasks_created_by (created_by_user_id),
  INDEX idx_tasks_created_at (created_at),
  CONSTRAINT fk_tasks_status FOREIGN KEY (status_id) REFERENCES task_statuses (id),
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES users (id),
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_sessions_token_hash (token_hash),
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_expires_at (expires_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

INSERT INTO task_statuses (name)
VALUES ('To Do'), ('In Progress'), ('Completed'), ('Blocked')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES
  (
    'Priya Admin',
    'admin@ptm.com',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90:73131c5058394fdb31f889884d88814df7f36f2bb59d7b5955768f2812464385fd714e8604496c4b972c70279bd6bf001e243b8afceb0ce5d51bb14c10729b6b',
    'admin',
    1
  ),
  (
    'Priya User',
    'user@ptm.com',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90:044ead2c32ce6342a273d37727d0c80a6d2aa2f0aa0622bb837ce3740e55b291170b791b3236b3f8972d4761bf7706f8569ac85b6ee5b88fadaa4f5a1562697b',
    'user',
    1
  )
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), is_active = VALUES(is_active);

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
  DATE_ADD(CURDATE(), INTERVAL 1 DAY),
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
