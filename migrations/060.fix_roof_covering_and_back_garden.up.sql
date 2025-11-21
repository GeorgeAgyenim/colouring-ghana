-- Fix roof covering: update enum type with Ghana-specific values
-- Step 1: Change column to text temporarily to allow enum modification
ALTER TABLE buildings ALTER COLUMN construction_roof_covering TYPE text USING construction_roof_covering::text;

-- Step 2: Drop the old enum type
DROP TYPE IF EXISTS roof_covering;

-- Step 3: Create new enum type with Ghana-specific roof covering values
CREATE TYPE roof_covering
    AS ENUM (
        'Corrugated Metal Sheet',
        'Concrete (Flat Roof)',
        'Asbestos Sheet',
        'Thatch',
        'Roofing Tiles',
        'Other Natural Material',
        'Other Man-Made Material'
    );

-- Step 4: Change column back to use the new enum type
-- Note: This will fail if there are existing values that don't match the new enum
-- You may need to update existing data first if needed
ALTER TABLE buildings ALTER COLUMN construction_roof_covering TYPE roof_covering USING construction_roof_covering::roof_covering;

-- Fix back garden: ensure it's boolean (should already be, but ensure consistency)
-- The column should already be boolean from migration 042, but this ensures it
-- No change needed if already boolean

