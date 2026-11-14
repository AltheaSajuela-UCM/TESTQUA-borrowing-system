-- Mirrors the tables as they exist in the team's webventory database.
CREATE DATABASE IF NOT EXISTS webventory;
USE webventory;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_number VARCHAR(50) NOT NULL UNIQUE,
    username VARCHAR(50) NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin','working_scholar','student') NOT NULL,
    mobile_number VARCHAR(20) NULL,
    campus VARCHAR(100) NULL,
    academic_level VARCHAR(100) NULL,
    program_year VARCHAR(100) NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category ENUM('Academic','Non-Academic') NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    item_condition VARCHAR(50) NOT NULL DEFAULT 'Good',
    is_available TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    inventory_id INT NOT NULL,
    status ENUM('pending','active','returned','rejected','cancelled') NOT NULL DEFAULT 'pending',
    notes VARCHAR(500) NULL,
    reject_reason VARCHAR(500) NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_by INT NULL,
    processed_at DATETIME NULL,
    expected_return_date DATETIME NULL,
    returned_at DATETIME NULL,
    received_by INT NULL,
    return_condition ENUM('Good','Damaged','Lost') NULL,
    INDEX (user_id), INDEX (inventory_id), INDEX (status), INDEX (processed_by), INDEX (received_by),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (inventory_id) REFERENCES inventories(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO inventories (item_code, name, category, stock)
VALUES ('ACA-001', 'Scientific Calculator', 'Academic', 5);