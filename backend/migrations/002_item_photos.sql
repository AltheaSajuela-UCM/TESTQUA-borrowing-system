    -- Fixes the item pictures after the redeploy: makes sure the image_path column exists and points
-- the 9 items (PM's list) at the photos in photo/AC_NC/. Stock and borrowing history are NOT touched.
-- Run in phpMyAdmin: click your database first, then the SQL tab. Safe to re-run.
ALTER TABLE inventories
    ADD COLUMN IF NOT EXISTS image_path VARCHAR(255) NULL AFTER description;

INSERT INTO inventories (item_code, name, category, description, image_path, stock, item_condition, availability_status, is_available) VALUES
    ('AC-001', 'Scientific Calculator', 'Academic',     'Scientific calculator for exams and coursework.', 'photo/AC_NC/AC-01-Calc.png',    5, 'Good', 'Available', 1),
    ('AC-002', 'Basic Calculator',      'Academic',     'Basic four-function calculator.',                 'photo/AC_NC/AC-02-BCalc.png',   5, 'Good', 'Available', 1),
    ('NC-001', 'Chess',                 'Non-Academic', 'Classic chess set.',                              'photo/AC_NC/NC-01-Chess.png',   2, 'Good', 'Available', 1),
    ('NC-002', 'Scrabble',              'Non-Academic', 'Scrabble word board game.',                       'photo/AC_NC/NC-02-Scrab.png',   2, 'Good', 'Available', 1),
    ('NC-003', 'Boggle',                'Non-Academic', 'Boggle word-finding game.',                       'photo/AC_NC/NC-03-Bog.jpg',     2, 'Good', 'Available', 1),
    ('NC-004', 'Sungka',                'Non-Academic', 'Traditional Filipino Sungka board.',              'photo/AC_NC/NC-04-Sung.jpg',    2, 'Good', 'Available', 1),
    ('NC-005', 'Snake and Ladder',      'Non-Academic', 'Snake and Ladder board game.',                    'photo/AC_NC/NC-05-SnL.png',     2, 'Good', 'Available', 1),
    ('NC-006', 'Word Factory',          'Non-Academic', 'Word Factory letter game.',                       'photo/AC_NC/NC-06-WF.png',      2, 'Good', 'Available', 1),
    ('NC-007', 'Pick-up Sticks',        'Non-Academic', 'Pick-up Sticks game.',                            'photo/AC_NC/NC-07-PStick.jpg',  2, 'Good', 'Available', 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name), description = VALUES(description), image_path = VALUES(image_path);

SELECT item_code, name, stock, image_path FROM inventories ORDER BY item_code;
