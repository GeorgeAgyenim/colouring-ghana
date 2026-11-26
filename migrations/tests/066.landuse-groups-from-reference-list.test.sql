--
-- Tests migration 066: land-use groups must come from the reference list, whoever writes them.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
-- Run with migrations/tests/run.sh; the database is built from every migration below 066.
--
-- A test asserts by raising an exception. The cut-off labels below are the ones found on the
-- local database on 26 November 2026: each is a full label without its closing bracket.
--

-- A schema ahead of public in the search path, as a "$user" schema would be: the migrations must
-- still create and find their objects in public.
CREATE SCHEMA search_path_decoy;
SET search_path = search_path_decoy, public;

INSERT INTO buildings (building_id, current_landuse_group, current_landuse_order) VALUES
    (1, ARRAY['Flats / apartments'], 'Residential'),
    (2, NULL, NULL),
    -- already holds an unlisted value when the guard arrives (one 065 could not repair)
    (3, ARRAY['Utility'], 'Transportation and Infrastructure');

-- The cause, reproduced: without 066 the database stores a cut-off label written directly.
UPDATE buildings
SET current_landuse_group = ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies']
WHERE building_id = 2;
DO $$
BEGIN
    IF (SELECT current_landuse_group FROM buildings WHERE building_id = 2) IS DISTINCT FROM
        ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies'] THEN
        RAISE EXCEPTION 'FAIL: expected the database without 066 to store the cut-off label';
    END IF;
END $$;
UPDATE buildings SET current_landuse_group = NULL WHERE building_id = 2;

\ir ../066.landuse-groups-from-reference-list.up.sql

-- A direct database write of a cut-off label is refused (this is how the 18 cut-off values got in:
-- loaded straight into the table, never through the app, which checks the list).
DO $$
BEGIN
    BEGIN
        UPDATE buildings
        SET current_landuse_group = ARRAY[
            'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies',
            'Education & Training (school, university, TVET, apprenticeship centre)'
        ]
        WHERE building_id = 1;
    EXCEPTION WHEN check_violation THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL: an update with a cut-off land-use group was accepted';
END $$;

-- A new building row with a cut-off label is refused.
DO $$
BEGIN
    BEGIN
        INSERT INTO buildings (building_id, current_landuse_group, current_landuse_order)
        VALUES (10, ARRAY['Compound Housing', 'Education & Training (school, university, TVET, apprenticeship centre'], 'Mixed Use');
    EXCEPTION WHEN check_violation THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL: an insert with a cut-off land-use group was accepted';
END $$;

-- Original land use is checked against the same list, as the app does.
DO $$
BEGIN
    BEGIN
        UPDATE buildings
        SET typology_original_use = ARRAY['Retail Shop / Kiosk (shops/market stalls/small trading units']
        WHERE building_id = 2;
    EXCEPTION WHEN check_violation THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL: an original land use with a cut-off label was accepted';
END $$;

-- An empty (NULL) entry in the list is refused too, as the app refuses it.
DO $$
BEGIN
    BEGIN
        UPDATE buildings SET current_landuse_group = ARRAY['Compound Housing', NULL] WHERE building_id = 2;
    EXCEPTION WHEN check_violation THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL: a land-use group list with a NULL entry was accepted';
END $$;

-- Listed labels are still accepted, on update and on insert.
UPDATE buildings
SET current_landuse_group = ARRAY[
        'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)',
        'Education & Training (school, university, TVET, apprenticeship centre)'
    ],
    current_landuse_order = 'Mixed Use'
WHERE building_id = 1;
INSERT INTO buildings (building_id, current_landuse_group, current_landuse_order)
VALUES (11, ARRAY['Compound Housing'], 'Residential');

DO $$
BEGIN
    IF (SELECT current_landuse_group[1] FROM buildings WHERE building_id = 1)
        IS DISTINCT FROM 'Offices, Financial & Professional Services (business/banks/corporate offices/consultancies)'
       OR NOT EXISTS (SELECT 1 FROM buildings WHERE building_id = 11) THEN
        RAISE EXCEPTION 'FAIL: listed land-use groups were not stored';
    END IF;
END $$;

-- A building already holding an unlisted value can still have its other details edited.
UPDATE buildings SET location_name = 'Edited after the guard' WHERE building_id = 3;
-- including by a writer that sets every column of the row, land use unchanged
UPDATE buildings
SET current_landuse_group = current_landuse_group,
    typology_original_use = typology_original_use,
    location_name = 'Edited after the guard'
WHERE building_id = 3;
DO $$
BEGIN
    IF (SELECT location_name FROM buildings WHERE building_id = 3) IS DISTINCT FROM 'Edited after the guard' THEN
        RAISE EXCEPTION 'FAIL: editing another detail of a building with a legacy unlisted value failed';
    END IF;
END $$;

-- A writer with no access to the reference list can still save listed labels and is still refused a
-- cut one: the check reads the list with its owner's rights. The role exists only inside this
-- transaction, which is rolled back, so nothing is left on the server.
BEGIN;
CREATE ROLE migration_test_writer_066;
GRANT SELECT, UPDATE ON buildings TO migration_test_writer_066;
SET LOCAL ROLE migration_test_writer_066;
UPDATE buildings SET current_landuse_group = ARRAY['Compound Housing'] WHERE building_id = 11;
DO $$
BEGIN
    BEGIN
        UPDATE buildings SET current_landuse_group = ARRAY['Hotel / Guesthouse / Lodg'] WHERE building_id = 11;
    EXCEPTION WHEN check_violation THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL: a writer without access to the reference list saved a cut-off label';
END $$;
ROLLBACK;

-- The down migration removes the guard: a direct write is no longer checked.
\ir ../066.landuse-groups-from-reference-list.down.sql

UPDATE buildings
SET current_landuse_group = ARRAY['Offices, Financial & Professional Services (business/banks/corporate offices/consultancies']
WHERE building_id = 2;
DO $$
BEGIN
    IF to_regproc('buildings_check_landuse_groups_listed') IS NOT NULL
       OR to_regproc('buildings_assert_landuse_groups_listed') IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: the down migration left a guard function in place';
    END IF;
END $$;
