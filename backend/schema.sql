CREATE DATABASE IF NOT EXISTS webventory;
USE webventory;

CREATE TABLE IF NOT EXISTS inventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    item_condition VARCHAR(50) NOT NULL DEFAULT 'Good',
    is_available TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id_number VARCHAR(50) NOT NULL,
    inventory_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATETIME NULL,
    returned_at DATETIME NULL,
    FOREIGN KEY (inventory_id) REFERENCES inventories(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sample item so you can test borrowing
INSERT IGNORE INTO inventories (item_code, name, category, stock)
VALUES ('ACA-001', 'Scientific Calculator', 'Academic', 5);