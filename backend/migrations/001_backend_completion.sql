-- Webventory: schema additions required by the completed back-end.
-- Run ONCE in phpMyAdmin (SQL tab) against the `webventory` database.
-- Written for MariaDB (XAMPP default). Uses "IF NOT EXISTS" so it is safe to re-run.
USE webventory;

-- ---------- users ----------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL AFTER full_name,
    ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS is_flagged TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME NULL,
    ADD UNIQUE INDEX IF NOT EXISTS uq_users_email (email);

-- ---------- categories (replaces the fixed ENUM) ----------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    requires_waiver TINYINT(1) NOT NULL DEFAULT 0,
    requires_id_surrender TINYINT(1) NOT NULL DEFAULT 0,
    max_active_borrows INT NOT NULL DEFAULT 2,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO categories (name, requires_waiver, requires_id_surrender, max_active_borrows) VALUES
    ('Academic', 0, 0, 2),
    ('Non-Academic', 1, 1, 2);

-- ---------- inventories ----------
ALTER TABLE inventories MODIFY category VARCHAR(100) NOT NULL;
ALTER TABLE inventories
    ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS requires_waiver TINYINT(1) NULL,          -- NULL = inherit from category
    ADD COLUMN IF NOT EXISTS requires_id_surrender TINYINT(1) NULL,    -- NULL = inherit from category
    ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) NOT NULL DEFAULT 'Available'; -- Available | Under Maintenance | Unavailable

-- ---------- transactions ----------
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS waiver_accepted_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS id_surrendered TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS id_returned_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS release_condition VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS late_notes VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS last_reminder_at DATETIME NULL;

-- ---------- notifications (were global; now per user) ----------
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS user_id INT NULL,
    ADD COLUMN IF NOT EXISTS transaction_id INT NULL,
    ADD COLUMN IF NOT EXISTS alert_key VARCHAR(100) NULL,
    ADD INDEX IF NOT EXISTS idx_notif_user (user_id, is_read),
    ADD UNIQUE INDEX IF NOT EXISTS uq_notif_alert (user_id, alert_key);

-- ---------- cancellation requests (student asks, working scholar accepts) ----------
CREATE TABLE IF NOT EXISTS cancellation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(500) NULL,
    status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_by INT NULL,
    resolved_at DATETIME NULL,
    INDEX (transaction_id), INDEX (status),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- ---------- password recovery codes ----------
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel ENUM('email','number') NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ---------- accountability (lost / damaged items) ----------
CREATE TABLE IF NOT EXISTS accountability_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NULL,
    user_id INT NOT NULL,
    inventory_id INT NOT NULL,
    type ENUM('Lost','Damaged','Overdue') NOT NULL,
    status ENUM('Open','Resolved') NOT NULL DEFAULT 'Open',
    notes VARCHAR(500) NULL,
    replacement_received TINYINT(1) NOT NULL DEFAULT 0,
    resolved_by INT NULL,
    resolved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (status), INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (inventory_id) REFERENCES inventories(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- ---------- audit trail / history ----------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    role VARCHAR(30) NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    details VARCHAR(500) NULL,
    event_type VARCHAR(30) NOT NULL DEFAULT 'General', -- Borrow Request | Cancellation Request | Item Update | Return | User | Category | Accountability | Auth
    student_name VARCHAR(255) NULL,
    item_name VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (created_at), INDEX (event_type), INDEX (user_id)
);
