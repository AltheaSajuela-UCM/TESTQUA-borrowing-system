-- 004b_remove_other_accounts.sql   (OPTIONAL - run BEFORE 005_tester_transactions.sql)
-- KEEPS: the 9 testers (StuT01-03, SchT01-03, AdT01-03) and the 3 programmer accounts 20240001, 80000001, 90000001.
-- DELETES: every other account.
-- ALSO DELETES: all transactions that do not belong to the 9 testers, including the programmer accounts' own
-- transactions (plus their cancellation requests, cases, notifications and history rows), so only the testers' data remains.
-- Units held by the deleted transactions go back on the shelf and stock is recalculated.
--
-- !! Permanent. Step 0 only PREVIEWS the accounts that will be deleted - check it, then run the whole file.
-- Run in phpMyAdmin: click your database first, then the SQL tab.

-- ---------- 0. preview: these accounts will be deleted ----------
SELECT id, id_number, full_name, role FROM users
WHERE id_number NOT IN ('StuT01','StuT02','StuT03','SchT01','SchT02','SchT03','AdT01','AdT02','AdT03',
                        '20240001','80000001','90000001')
ORDER BY role, id_number;

DROP TABLE IF EXISTS tmp_testers;
DROP TABLE IF EXISTS tmp_doomed_users;
DROP TABLE IF EXISTS tmp_doomed_tx;

CREATE TABLE tmp_testers AS
SELECT id FROM users
WHERE id_number IN ('StuT01','StuT02','StuT03','SchT01','SchT02','SchT03','AdT01','AdT02','AdT03');

CREATE TABLE tmp_doomed_users AS
SELECT id FROM users
WHERE id_number NOT IN ('StuT01','StuT02','StuT03','SchT01','SchT02','SchT03','AdT01','AdT02','AdT03',
                        '20240001','80000001','90000001');

-- every transaction that is not purely a tester's (borrower, approver or receiver is someone else)
CREATE TABLE tmp_doomed_tx AS
SELECT id FROM transactions
WHERE user_id NOT IN (SELECT id FROM tmp_testers)
   OR (processed_by IS NOT NULL AND processed_by NOT IN (SELECT id FROM tmp_testers))
   OR (received_by  IS NOT NULL AND received_by  NOT IN (SELECT id FROM tmp_testers));

-- ---------- 1. dependants first (foreign keys) ----------
DELETE FROM password_resets WHERE user_id IN (SELECT id FROM tmp_doomed_users);

DELETE FROM notifications
WHERE user_id IN (SELECT id FROM tmp_doomed_users)
   OR transaction_id IN (SELECT id FROM tmp_doomed_tx);

DELETE a FROM audit_logs a
JOIN transactions t ON a.entity = 'Transaction' AND a.entity_id = CONCAT('TXN-', LPAD(t.id, 5, '0'))
WHERE t.id IN (SELECT id FROM tmp_doomed_tx);

DELETE FROM cancellation_requests
WHERE user_id IN (SELECT id FROM tmp_doomed_users)
   OR resolved_by IN (SELECT id FROM tmp_doomed_users)
   OR transaction_id IN (SELECT id FROM tmp_doomed_tx);

DELETE FROM accountability_cases
WHERE user_id IN (SELECT id FROM tmp_doomed_users)
   OR resolved_by IN (SELECT id FROM tmp_doomed_users)
   OR transaction_id IN (SELECT id FROM tmp_doomed_tx);

-- ---------- 2. free the units they were holding, then delete the transactions ----------
UPDATE item_units u
JOIN transactions t ON t.unit_id = u.id AND t.status IN ('pending','active')
SET u.status = 'available'
WHERE t.id IN (SELECT id FROM tmp_doomed_tx);

DELETE FROM transactions WHERE id IN (SELECT id FROM tmp_doomed_tx);

-- the programmer accounts were kept: clear any flag left over from their old cases
UPDATE users SET is_flagged = 0 WHERE id_number IN ('20240001','80000001','90000001');

-- ---------- 3. the other accounts ----------
DELETE FROM users WHERE id IN (SELECT id FROM tmp_doomed_users);

-- ---------- 4. stock = units on the shelf ----------
UPDATE inventories i
SET i.stock = (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available'),
    i.is_available = (i.availability_status = 'Available'
                      AND (SELECT COUNT(*) FROM item_units u WHERE u.inventory_id = i.id AND u.status = 'available') > 0);

DROP TABLE tmp_testers;
DROP TABLE tmp_doomed_users;
DROP TABLE tmp_doomed_tx;

-- ---------- check: 9 testers + the 3 programmer accounts ----------
SELECT id_number, full_name, role FROM users ORDER BY role, id_number;
