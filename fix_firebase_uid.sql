-- Fix firebase_uid column to allow NULL values
USE salek;

-- Make firebase_uid nullable
ALTER TABLE users MODIFY COLUMN firebase_uid VARCHAR(255) NULL;

-- Remove the unique constraint on firebase_uid
ALTER TABLE users DROP INDEX idx_firebase_uid;

-- Add unique constraint only on phone_number
ALTER TABLE users ADD UNIQUE KEY unique_phone_number (phone_number);
