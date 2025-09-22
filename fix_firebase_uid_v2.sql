-- Fix firebase_uid column to allow NULL values
USE salek;

-- Make firebase_uid nullable
ALTER TABLE users MODIFY COLUMN firebase_uid VARCHAR(255) NULL;

-- Remove the unique constraint on firebase_uid
ALTER TABLE users DROP INDEX idx_firebase_uid;

-- Check for duplicate phone numbers first
SELECT phone_number, COUNT(*) as count FROM users GROUP BY phone_number HAVING count > 1;

-- Remove duplicates (keep the latest one)
DELETE u1 FROM users u1
INNER JOIN users u2 
WHERE u1.id < u2.id AND u1.phone_number = u2.phone_number;

-- Add unique constraint only on phone_number
ALTER TABLE users ADD UNIQUE KEY unique_phone_number (phone_number);
