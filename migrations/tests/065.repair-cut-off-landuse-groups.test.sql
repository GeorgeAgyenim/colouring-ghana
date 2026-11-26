--
-- Tests migration 065: repair land-use groups cut off mid-label, and its down.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
-- Run with migrations/tests/run.sh; the database is built from every migration below 065.
--
-- A test asserts by raising an exception. Expected values are written out by hand. Buildings 1-4
-- copy the three cut-off patterns found on the local database on 26 November 2026: a full label
-- without its closing bracket. Only that defect is repaired; any other value outside the list is
-- left as it is and listed (ADR-0013: never merged into an allowed value).
--

-- A schema ahead of public in the search path, as a "$user" schema would be: the migrations must
-- still create and find their objects in public.
CREATE SCHEMA search_path_decoy;
SET search_path = search_path_decoy, public;

-- On a database with nothing to repair, 065 changes nothing and keeps no record table.
\ir ../065.repair-cut-off-landuse-groups.up.sql

DO $$
BEGIN
    IF to_regclass('public.landuse_group_repairs') IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: 065 kept an empty landuse_group_repairs table';
    END IF;
END $$;

INSERT INTO buildings (building_id, current_landuse_group, current_landuse_order) VALUES
    (1, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies',
              'Education & Training (school, university, TVET, apprenticeship centre)'], 'Mixed Use'),
    (2, ARRAY['Compound Housing',
              'Education & Training (school, university, TVET, apprenticeship centre'], 'Mixed Use'),
    (3, ARRAY['Education & Training (school, university, TVET, apprenticeship centre)',
              'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies'], 'Mixed Use'),
    (4, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units',
              'Warehouse / Distribution Centre',
              'Light industry (workshops, small-scale manufacturing)'], 'Mixed Use'),
    -- not a label missing its closing bracket (two labels start with it): not repaired
    (5, ARRAY['Utility'], 'Transportation and Infrastructure'),
    -- not a label missing its closing bracket (no label starts with it): not repaired
    (6, ARRAY['Shop'], 'Commercial'),
    -- repairing would list the same group twice: not repaired
    (7, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies',
              'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)'], 'Commercial'),
    -- already correct
    (8, ARRAY['Flats / apartments'], 'Residential'),
    (9, NULL, NULL),
    -- one repairable value beside one that is not: the repairable one is repaired
    (10, ARRAY['Compound Housing', 'Utility',
               'Education & Training (school, university, TVET, apprenticeship centre'], 'Mixed Use'),
    (11, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units'], 'Commercial'),
    -- exactly one label starts with these, but neither is a label missing only its closing bracket:
    -- completing them would be a guess, so they are not repaired
    (12, ARRAY['Hotel'], 'Commercial'),
    (13, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultanc'], 'Commercial'),
    -- repaired, but its stored order does not match its labels: the order is left for a person
    (14, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units'], 'Residential');

CREATE TEMP TABLE expected_after (building_id integer PRIMARY KEY, landuse_group text[], landuse_order text);
INSERT INTO expected_after VALUES
    (1, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)',
              'Education & Training (school, university, TVET, apprenticeship centre)'], 'Mixed Use'),
    (2, ARRAY['Compound Housing',
              'Education & Training (school, university, TVET, apprenticeship centre)'], 'Mixed Use'),
    (3, ARRAY['Education & Training (school, university, TVET, apprenticeship centre)',
              'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)'], 'Mixed Use'),
    (4, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units)',
              'Warehouse / Distribution Centre',
              'Light industry (workshops, small-scale manufacturing)'], 'Mixed Use'),
    (5, ARRAY['Utility'], 'Transportation and Infrastructure'),
    (6, ARRAY['Shop'], 'Commercial'),
    (7, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies',
              'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)'], 'Commercial'),
    (8, ARRAY['Flats / apartments'], 'Residential'),
    (9, NULL, NULL),
    (10, ARRAY['Compound Housing', 'Utility',
               'Education & Training (school, university, TVET, apprenticeship centre)'], 'Mixed Use'),
    (11, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units)'], 'Commercial'),
    (12, ARRAY['Hotel'], 'Commercial'),
    (13, ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultanc'], 'Commercial'),
    (14, ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units)'], 'Residential');

CREATE TEMP TABLE before_repair AS
SELECT building_id, current_landuse_group, current_landuse_order FROM buildings;

-- 065 refuses anyone but the owner of buildings, even a role that could otherwise make every change
-- it makes. The role is created inside a transaction; 065's refusal rolls it back with everything
-- else, so nothing is left on the server.
BEGIN;
CREATE ROLE migration_test_not_owner_065;
GRANT SELECT, UPDATE ON buildings TO migration_test_not_owner_065;
GRANT CREATE ON SCHEMA public TO migration_test_not_owner_065;
GRANT USAGE ON SCHEMA reference_tables TO migration_test_not_owner_065;
GRANT SELECT ON ALL TABLES IN SCHEMA reference_tables TO migration_test_not_owner_065;
SET ROLE migration_test_not_owner_065;
\echo 'Expected next: a warning that a transaction is in progress, then ERROR: Run 065 as the owner'
\set ON_ERROR_STOP off
\ir ../065.repair-cut-off-landuse-groups.up.sql
\set ON_ERROR_STOP on
RESET ROLE;

-- Had 065 run for that role, its COMMIT would have kept the role: remove it before failing below.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_test_not_owner_065') THEN
        EXECUTE 'DROP OWNED BY migration_test_not_owner_065';
        EXECUTE 'DROP ROLE migration_test_not_owner_065';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM before_repair o JOIN buildings b USING (building_id)
        WHERE b.current_landuse_group IS DISTINCT FROM o.current_landuse_group
    ) OR to_regclass('public.landuse_group_repairs') IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: 065 changed data when run by a role that does not own buildings';
    END IF;
END $$;

\ir ../065.repair-cut-off-landuse-groups.up.sql

-- Each label missing only its closing bracket is completed; nothing else changes, and land-use
-- order is left as it was.
DO $$
DECLARE
    wrong text;
BEGIN
    SELECT string_agg(e.building_id::text, ', ' ORDER BY e.building_id) INTO wrong
    FROM expected_after e
    JOIN buildings b USING (building_id)
    WHERE b.current_landuse_group IS DISTINCT FROM e.landuse_group
       OR b.current_landuse_order IS DISTINCT FROM e.landuse_order;
    IF wrong IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: land use after the repair is wrong for building(s) %', wrong;
    END IF;
END $$;

-- The repair records what it changed: exactly the repaired buildings, with their old values.
DO $$
BEGIN
    IF (SELECT array_agg(building_id ORDER BY building_id) FROM landuse_group_repairs)
        IS DISTINCT FROM ARRAY[1, 2, 3, 4, 10, 11, 14] THEN
        RAISE EXCEPTION 'FAIL: landuse_group_repairs should list buildings 1, 2, 3, 4, 10, 11 and 14';
    END IF;
    IF EXISTS (
        SELECT 1 FROM landuse_group_repairs r JOIN before_repair o USING (building_id)
        WHERE r.value_before IS DISTINCT FROM o.current_landuse_group
    ) THEN
        RAISE EXCEPTION 'FAIL: landuse_group_repairs does not hold the values from before the repair';
    END IF;
END $$;

-- Building 11 is cut off again by a direct write (possible only while 066 is not applied).
UPDATE buildings SET current_landuse_group = ARRAY['Education & Training (school, university, TVET, apprenticeship centre'] WHERE building_id = 11;

-- Running the repair again changes nothing, and keeps the recorded old values so the down can
-- still restore them: building 11 already has a record, so it is listed, not repaired again.
\ir ../065.repair-cut-off-landuse-groups.up.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM expected_after e JOIN buildings b USING (building_id)
        WHERE e.building_id <> 11 AND b.current_landuse_group IS DISTINCT FROM e.landuse_group
    ) OR (SELECT current_landuse_group FROM buildings WHERE building_id = 11)
        IS DISTINCT FROM ARRAY['Education & Training (school, university, TVET, apprenticeship centre']
    OR EXISTS (
        SELECT 1 FROM landuse_group_repairs r JOIN before_repair o USING (building_id)
        WHERE r.value_before IS DISTINCT FROM o.current_landuse_group
    ) OR (SELECT count(*) FROM landuse_group_repairs) <> 7 THEN
        RAISE EXCEPTION 'FAIL: running the repair a second time changed something';
    END IF;
END $$;

-- A contributor edits building 2 after the repair.
UPDATE buildings SET current_landuse_group = ARRAY['Flats / apartments'], current_landuse_order = 'Residential'
WHERE building_id = 2;

\ir ../065.repair-cut-off-landuse-groups.down.sql

-- The down puts back the values from before the repair, except where the building has changed
-- since (building 2's contributor edit, building 11's second cut): those are kept as they are.
-- The record table is removed.
DO $$
DECLARE
    wrong text;
BEGIN
    SELECT string_agg(o.building_id::text, ', ' ORDER BY o.building_id) INTO wrong
    FROM before_repair o
    JOIN buildings b USING (building_id)
    WHERE o.building_id NOT IN (2, 11)
      AND (b.current_landuse_group IS DISTINCT FROM o.current_landuse_group
           OR b.current_landuse_order IS DISTINCT FROM o.current_landuse_order);
    IF wrong IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: the down did not restore building(s) %', wrong;
    END IF;
    IF (SELECT current_landuse_group FROM buildings WHERE building_id = 2) IS DISTINCT FROM ARRAY['Flats / apartments'] THEN
        RAISE EXCEPTION 'FAIL: the down overwrote a contributor edit made after the repair';
    END IF;
    IF (SELECT current_landuse_group FROM buildings WHERE building_id = 11) IS DISTINCT FROM ARRAY['Education & Training (school, university, TVET, apprenticeship centre'] THEN
        RAISE EXCEPTION 'FAIL: the down overwrote a change made after the repair';
    END IF;
    IF to_regclass('public.landuse_group_repairs') IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: the down left landuse_group_repairs in place';
    END IF;
END $$;
