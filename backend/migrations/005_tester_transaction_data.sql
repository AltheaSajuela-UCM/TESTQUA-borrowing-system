-- 005_tester_transactions.sql
-- Fills the 9 tester accounts with ready-made borrow data (needs migrations 001-003 and the 9 tester accounts).
-- Run in phpMyAdmin: click your database first, then the SQL tab. Safe to re-run: it first wipes ONLY the
-- tester accounts' own transactions and rebuilds them.
--
-- Result (per student, per item): 7 requests -> 6 CANCELLED (accepted by the matching working scholar) + 1 APPROVED (Borrowed).
--   StuT01 / SchT01 : Pick-up Sticks, Sungka, Word Factory
--   StuT02 / SchT02 : Basic Calculator, Boggle, Chess
--   StuT03 / SchT03 : Scientific Calculator, Scrabble, Snake and Ladder
-- Each request gets its own unit (e.g. NC-007-01 ... NC-007-07), exactly like the real borrow flow.

SET @now = NOW();

DROP TABLE IF EXISTS tmp_seed_plan;
DROP TABLE IF EXISTS tmp_seed_units;
DROP TABLE IF EXISTS tmp_seed_testers;

CREATE TABLE tmp_seed_testers AS
SELECT id FROM users
WHERE id_number IN ('StuT01','StuT02','StuT03','SchT01','SchT02','SchT03','AdT01','AdT02','AdT03');

-- ---------- 1. clear the testers' previous transactions (so re-running does not duplicate) ----------
DELETE a FROM audit_logs a
JOIN transactions t ON a.entity = 'Transaction' AND a.entity_id = CONCAT('TXN-', LPAD(t.id, 5, '0'))
WHERE t.user_id IN (SELECT id FROM tmp_seed_testers);

DELETE FROM notifications
WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id IN (SELECT id FROM tmp_seed_testers));

DELETE FROM cancellation_requests
WHERE user_id IN (SELECT id FROM tmp_seed_testers)
   OR transaction_id IN (SELECT id FROM transactions WHERE user_id IN (SELECT id FROM tmp_seed_testers));

DELETE FROM accountability_cases
WHERE user_id IN (SELECT id FROM tmp_seed_testers)
   OR transaction_id IN (SELECT id FROM transactions WHERE user_id IN (SELECT id FROM tmp_seed_testers));

UPDATE item_units u
JOIN transactions t ON t.unit_id = u.id AND t.status IN ('pending','active')
SET u.status = 'available'
WHERE t.user_id IN (SELECT id FROM tmp_seed_testers);

DELETE FROM transactions WHERE user_id IN (SELECT id FROM tmp_seed_testers);

-- ---------- 2. the plan: 7 requests for each student + item ----------
CREATE TABLE tmp_seed_plan AS
SELECT su.id AS stu_id, wu.id AS ws_id, i.id AS inv_id, n.k,
       COALESCE(i.requires_waiver, c.requires_waiver, 0)             AS needs_waiver,
       COALESCE(i.requires_id_surrender, c.requires_id_surrender, 0) AS needs_id
FROM (SELECT 'StuT01' AS s, 'SchT01' AS w, 'Pick-up Sticks'        AS item UNION ALL
      SELECT 'StuT01', 'SchT01', 'Sungka'                                  UNION ALL
      SELECT 'StuT01', 'SchT01', 'Word Factory'                            UNION ALL
      SELECT 'StuT02', 'SchT02', 'Basic Calculator'                        UNION ALL
      SELECT 'StuT02', 'SchT02', 'Boggle'                                  UNION ALL
      SELECT 'StuT02', 'SchT02', 'Chess'                                   UNION ALL
      SELECT 'StuT03', 'SchT03', 'Scientific Calculator'                   UNION ALL
      SELECT 'StuT03', 'SchT03', 'Scrabble'                                UNION ALL
      SELECT 'StuT03', 'SchT03', 'Snake and Ladder') p
JOIN users su       ON su.id_number = p.s
JOIN users wu       ON wu.id_number = p.w
JOIN inventories i  ON i.name = p.item
LEFT JOIN categories c ON c.name = i.category
JOIN (SELECT 1 AS k UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) n;

-- ---------- 3. pick 7 free units per item (unit 1, 2, 3 ... of the ones on the shelf) ----------
CREATE TABLE tmp_seed_units AS
SELECT u.id AS unit_id, u.inventory_id,
       ROW_NUMBER() OVER (PARTITION BY u.inventory_id ORDER BY u.unit_no) AS rn
FROM item_units u
WHERE u.status = 'available'
  AND u.inventory_id IN (SELECT DISTINCT inv_id FROM tmp_seed_plan);

-- ---------- 4. the transactions: request #1 approved (active), #2-#7 cancelled ----------
INSERT INTO transactions
    (user_id, inventory_id, unit_id, status, requested_at, processed_by, processed_at, expected_return_date,
     waiver_accepted_at, id_surrendered, release_condition)
SELECT p.stu_id, p.inv_id, un.unit_id,
       IF(p.k = 1, 'active', 'cancelled'),
       DATE_SUB(@now, INTERVAL (120 - p.k) MINUTE),
       p.ws_id,
       DATE_SUB(@now, INTERVAL 30 MINUTE),
       DATE_ADD(@now, INTERVAL 3 DAY),
       IF(p.needs_waiver, DATE_SUB(@now, INTERVAL (120 - p.k) MINUTE), NULL),
       IF(p.k = 1 AND p.needs_id, 1, 0),
       IF(p.k = 1, 'Good', NULL)
FROM tmp_seed_plan p
JOIN tmp_seed_units un ON un.inventory_id = p.inv_id AND un.rn = p.k;

-- the 6 cancelled ones also get their (accepted) cancellation request, like the real flow
INSERT INTO cancellation_requests (transaction_id, user_id, reason, status, requested_at, resolved_by, resolved_at)
SELECT t.id, t.user_id, NULL, 'accepted', DATE_ADD(t.requested_at, INTERVAL 5 MINUTE), t.processed_by, t.processed_at
FROM transactions t
WHERE t.status = 'cancelled' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

-- ---------- 5. units: the approved ones are borrowed, the cancelled ones stay on the shelf ----------
UPDATE item_units u
JOIN transactions t ON t.unit_id = u.id AND t.status = 'active'
SET u.status = 'borrowed'
WHERE t.user_id IN (SELECT id FROM tmp_seed_testers);

UPDATE inventories i
SET i.stock = (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available'),
    i.is_available = (i.availability_status = 'Available'
                      AND (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available') > 0);

-- ---------- 6. history (audit trail) so the History pages are not empty ----------
INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name, created_at)
SELECT t.user_id, 'student', 'Submitted Request', 'Transaction', CONCAT('TXN-', LPAD(t.id, 5, '0')),
       CONCAT('Requested ', i.name, ' (', un.unit_code, ')'), 'Borrow Request', su.full_name, i.name, t.requested_at
FROM transactions t
JOIN users su ON su.id = t.user_id JOIN inventories i ON i.id = t.inventory_id JOIN item_units un ON un.id = t.unit_id
WHERE t.user_id IN (SELECT id FROM tmp_seed_testers);

INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name, created_at)
SELECT t.user_id, 'student', 'Requested Cancellation', 'Transaction', CONCAT('TXN-', LPAD(t.id, 5, '0')),
       CONCAT('Asked to cancel ', i.name), 'Cancellation Request', su.full_name, i.name, DATE_ADD(t.requested_at, INTERVAL 5 MINUTE)
FROM transactions t
JOIN users su ON su.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
WHERE t.status = 'cancelled' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name, created_at)
SELECT t.processed_by, 'working_scholar', 'Accepted Cancellation', 'Transaction', CONCAT('TXN-', LPAD(t.id, 5, '0')),
       CONCAT('Cancelled ', i.name), 'Cancellation Request', su.full_name, i.name, t.processed_at
FROM transactions t
JOIN users su ON su.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
WHERE t.status = 'cancelled' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name, created_at)
SELECT t.processed_by, 'working_scholar', 'Released Item', 'Transaction', CONCAT('TXN-', LPAD(t.id, 5, '0')),
       CONCAT('Released ', i.name, ' to ', su.full_name), 'Borrow Request', su.full_name, i.name, t.processed_at
FROM transactions t
JOIN users su ON su.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
WHERE t.status = 'active' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

-- ---------- 7. student notifications ----------
INSERT INTO notifications (user_id, message, type, transaction_id)
SELECT t.user_id,
       CONCAT(SUBSTRING_INDEX(wu.full_name, ' ', 1), ' approved your ', i.name, ' borrow request. Proceed to the SAO Office to claim the item. Thank you.'),
       'info', t.id
FROM transactions t
JOIN users wu ON wu.id = t.processed_by JOIN inventories i ON i.id = t.inventory_id
WHERE t.status = 'active' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

INSERT INTO notifications (user_id, message, type, transaction_id)
SELECT t.user_id, CONCAT('Your request for ', i.name, ' was cancelled.'), 'info', t.id
FROM transactions t
JOIN inventories i ON i.id = t.inventory_id
WHERE t.status = 'cancelled' AND t.user_id IN (SELECT id FROM tmp_seed_testers);

DROP TABLE tmp_seed_plan;
DROP TABLE tmp_seed_units;
DROP TABLE tmp_seed_testers;

-- ---------- check: every row should show cancelled = 6, active = 1 ----------
SELECT su.id_number AS student, i.name AS item,
       SUM(t.status = 'cancelled') AS cancelled,
       SUM(t.status = 'active')    AS approved_borrowed,
       SUM(t.status = 'pending')   AS pending
FROM transactions t
JOIN users su ON su.id = t.user_id
JOIN inventories i ON i.id = t.inventory_id
WHERE su.id_number IN ('StuT01','StuT02','StuT03')
GROUP BY su.id_number, i.name
ORDER BY su.id_number, i.name;
