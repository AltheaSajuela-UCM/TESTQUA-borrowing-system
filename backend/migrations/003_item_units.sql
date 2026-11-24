-- 003_item_units.sql
-- Gives EVERY physical item its own ID (a "unit"): Scientific Calculator AC-001 becomes AC-001-01, AC-001-02, ...
-- Each borrow request is tied to one specific unit, so two testers can never fight over the same copy.
-- Run in phpMyAdmin: click your database first, then the SQL tab. Needs migrations 001 + 002. Safe to re-run.
--
-- >>> Change the number below to get more / fewer copies per item (max 100). <<<
SET @units_per_item = 15;

-- ---------- tables / columns ----------
CREATE TABLE IF NOT EXISTS item_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id INT NOT NULL,
    unit_no INT NOT NULL,
    unit_code VARCHAR(120) NOT NULL UNIQUE,                 -- e.g. AC-001-07
    status ENUM('available','reserved','borrowed','lost') NOT NULL DEFAULT 'available',
        -- available = on the shelf | reserved = held by a pending request | borrowed = released to a student | lost
    unit_condition VARCHAR(50) NOT NULL DEFAULT 'Good',
    UNIQUE KEY uq_unit_no (inventory_id, unit_no),
    INDEX (inventory_id, status),
    FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE
);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS unit_id INT NULL,
    ADD INDEX IF NOT EXISTS idx_tx_unit (unit_id);

-- ---------- create the units (1..@units_per_item for every item) ----------
INSERT IGNORE INTO item_units (inventory_id, unit_no, unit_code)
SELECT i.id, d.n, CONCAT(i.item_code, '-', LPAD(d.n, 2, '0'))
FROM inventories i
JOIN (SELECT a.n + b.n * 10 + 1 AS n
      FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
      CROSS JOIN
           (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b) d
  ON d.n <= @units_per_item;

-- ---------- attach existing pending / active requests to a unit (one distinct unit each) ----------
UPDATE transactions t
JOIN item_units u ON u.inventory_id = t.inventory_id
SET t.unit_id = u.id
WHERE t.unit_id IS NULL
  AND t.status IN ('pending', 'active')
  AND u.unit_no = 1 + (SELECT COUNT(*)
                       FROM (SELECT id, inventory_id FROM transactions
                             WHERE unit_id IS NULL AND status IN ('pending', 'active')) x
                       WHERE x.inventory_id = t.inventory_id AND x.id < t.id);

UPDATE item_units u
JOIN transactions t ON t.unit_id = u.id AND t.status IN ('pending', 'active')
SET u.status = IF(t.status = 'active', 'borrowed', 'reserved');

-- ---------- stock = units still on the shelf ----------
UPDATE inventories i
SET i.stock = (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available'),
    i.is_available = (i.availability_status = 'Available'
                      AND (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available') > 0);

SELECT i.item_code, i.name, i.stock AS available_units, COUNT(u.id) AS total_units
FROM inventories i LEFT JOIN item_units u ON u.inventory_id = i.id
GROUP BY i.id ORDER BY i.item_code;
