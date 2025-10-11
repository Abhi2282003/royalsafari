-- Add bus_type enum
CREATE TYPE bus_type AS ENUM ('SLEEPER', 'SEATING_SLEEPER');

-- Add bus_type column to buses table
ALTER TABLE buses ADD COLUMN bus_type bus_type NOT NULL DEFAULT 'SLEEPER';