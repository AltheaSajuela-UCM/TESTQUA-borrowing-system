-- Test data for the demo (Pending / Approved / Rejected + one Cancelled), for hosts with no command line (InfinityFree).
-- Run in phpMyAdmin: click YOUR database first, then SQL tab. Needs users 20240001-3 and 80000001, and migration 002.
-- Safe to re-run: it removes the previous sample rows (and puts their stock back) before adding them again.

-- ---------- reset previous sample rows ----------
UPDATE inventories i JOIN transactions t ON t.inventory_id = i.id
   SET i.stock = i.stock + 1 WHERE t.notes = 'SAMPLE DATA' AND t.status = 'active';
DELETE FROM cancellation_requests WHERE transaction_id IN (SELECT id FROM (SELECT id FROM transactions WHERE notes = 'SAMPLE DATA') x);
DELETE FROM notifications        WHERE transaction_id IN (SELECT id FROM (SELECT id FROM transactions WHERE notes = 'SAMPLE DATA') x);
DELETE FROM transactions WHERE notes = 'SAMPLE DATA';
DELETE FROM audit_logs   WHERE details LIKE '[sample]%';

SET @ws = (SELECT id FROM users WHERE id_number = '80000001');
SET @s1 = (SELECT id FROM users WHERE id_number = '20240001');
SET @s2 = (SELECT id FROM users WHERE id_number = '20240002');
SET @s3 = (SELECT id FROM users WHERE id_number = '20240003');

-- ---------- transactions ----------
INSERT INTO transactions
 (user_id, inventory_id, status, notes, reject_reason, requested_at, processed_by, processed_at, expected_return_date,
  returned_at, received_by, return_condition, waiver_accepted_at, id_surrendered, id_returned_at, release_condition)
VALUES
 -- PENDING
 (@s1, (SELECT id FROM inventories WHERE item_code='AC-001'), 'pending', 'SAMPLE DATA', NULL, NOW() - INTERVAL 3 HOUR,  NULL, NULL, NOW() + INTERVAL 2 DAY, NULL, NULL, NULL, NULL, 0, NULL, NULL),
 (@s2, (SELECT id FROM inventories WHERE item_code='NC-001'), 'pending', 'SAMPLE DATA', NULL, NOW() - INTERVAL 1 DAY,   NULL, NULL, NOW() + INTERVAL 3 DAY, NULL, NULL, NULL, NOW() - INTERVAL 1 DAY, 0, NULL, NULL),
 (@s3, (SELECT id FROM inventories WHERE item_code='NC-004'), 'pending', 'SAMPLE DATA', NULL, NOW() - INTERVAL 5 HOUR,  NULL, NULL, NOW() + INTERVAL 4 DAY, NULL, NULL, NULL, NOW() - INTERVAL 5 HOUR, 0, NULL, NULL),
 -- APPROVED, currently borrowed (second one is overdue)
 (@s1, (SELECT id FROM inventories WHERE item_code='NC-002'), 'active', 'SAMPLE DATA', NULL, NOW() - INTERVAL 2 DAY, @ws, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 1 DAY, NULL, NULL, NULL, NOW() - INTERVAL 2 DAY, 1, NULL, 'Good'),
 (@s2, (SELECT id FROM inventories WHERE item_code='AC-002'), 'active', 'SAMPLE DATA', NULL, NOW() - INTERVAL 4 DAY, @ws, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 1 DAY, NULL, NULL, NULL, NULL, 0, NULL, 'Good'),
 -- APPROVED, already returned
 (@s3, (SELECT id FROM inventories WHERE item_code='AC-001'), 'returned', 'SAMPLE DATA', NULL, NOW() - INTERVAL 9 DAY,  @ws, NOW() - INTERVAL 9 DAY,  NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY,  @ws, 'Good', NULL, 0, NULL, 'Good'),
 (@s1, (SELECT id FROM inventories WHERE item_code='NC-003'), 'returned', 'SAMPLE DATA', NULL, NOW() - INTERVAL 12 DAY, @ws, NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY, @ws, 'Good', NOW() - INTERVAL 12 DAY, 1, NOW() - INTERVAL 10 DAY, 'Good'),
 -- REJECTED
 (@s2, (SELECT id FROM inventories WHERE item_code='NC-005'), 'rejected', 'SAMPLE DATA', 'Incomplete request details',                    NOW() - INTERVAL 6 DAY, @ws, NOW() - INTERVAL 6 DAY, NOW() + INTERVAL 1 DAY, NULL, NULL, NULL, NULL, 0, NULL, NULL),
 (@s3, (SELECT id FROM inventories WHERE item_code='NC-007'), 'rejected', 'SAMPLE DATA', 'Student ID not presented at the SAO Office', NOW() - INTERVAL 8 DAY, @ws, NOW() - INTERVAL 8 DAY, NOW() + INTERVAL 2 DAY, NULL, NULL, NULL, NULL, 0, NULL, NULL),
 -- CANCELLED
 (@s1, (SELECT id FROM inventories WHERE item_code='NC-006'), 'cancelled', 'SAMPLE DATA', NULL, NOW() - INTERVAL 5 DAY, NULL, NULL, NOW() + INTERVAL 3 DAY, NULL, NULL, NULL, NULL, 0, NULL, NULL);

-- ---------- stock for the two items that are currently out ----------
UPDATE inventories SET stock = GREATEST(stock - 1, 0) WHERE item_code IN ('NC-002', 'AC-002');
UPDATE inventories SET is_available = (availability_status = 'Available' AND stock > 0) WHERE item_code IN ('NC-002', 'AC-002');

-- ---------- History / Audit Trail rows ----------
INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name, created_at)
SELECT IF(t.status IN ('pending','cancelled'), t.user_id, @ws),
       IF(t.status IN ('pending','cancelled'), 'student', 'working_scholar'),
       CASE t.status WHEN 'pending' THEN 'Submitted Request' WHEN 'active' THEN 'Released Item' WHEN 'returned' THEN 'Returned Item'
                     WHEN 'rejected' THEN 'Rejected Request' ELSE 'Cancelled Request' END,
       'Transaction', CONCAT('TXN-', LPAD(t.id, 5, '0')),
       CONCAT('[sample] ', i.name, ' - ', t.status),
       IF(t.status = 'returned', 'Return', 'Borrow Request'),
       u.full_name, i.name, COALESCE(t.returned_at, t.processed_at, t.requested_at)
FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
WHERE t.notes = 'SAMPLE DATA';

-- ---------- notifications ----------
INSERT INTO notifications (user_id, transaction_id, type, message)
SELECT t.user_id, t.id, 'alert', CONCAT('Your ', i.name, ' borrow request was rejected: ', t.reject_reason)
FROM transactions t JOIN inventories i ON i.id = t.inventory_id WHERE t.notes = 'SAMPLE DATA' AND t.status = 'rejected';
INSERT INTO notifications (user_id, transaction_id, type, message)
SELECT t.user_id, t.id, 'info', CONCAT('You borrowed ', i.name, '. Return it by ', DATE_FORMAT(t.expected_return_date, '%b %e, %Y %l:%i %p'), '.')
FROM transactions t JOIN inventories i ON i.id = t.inventory_id WHERE t.notes = 'SAMPLE DATA' AND t.status = 'active';
INSERT INTO notifications (user_id, transaction_id, type, message)
SELECT @ws, t.id, 'info', CONCAT(u.full_name, ' requested ', i.name, '.')
FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
WHERE t.notes = 'SAMPLE DATA' AND t.status = 'pending';

-- ---------- check ----------
SELECT status, COUNT(*) AS total FROM transactions WHERE notes = 'SAMPLE DATA' GROUP BY status;
