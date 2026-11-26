--
-- Repairs land-use groups cut off mid-label.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
-- Decisions: ADR-0013 (non-conforming values), ADR-0018 (local, docs/decisions/)
--
-- On 26 November 2026 the local database held 18 current_landuse_group values that were labels
-- from reference_tables.buildings_landuse_group without their closing bracket (Offices x11,
-- Education x5, Retail x2). They had been loaded straight into the table, not through the app.
--
-- Rule: a value that is not an allowed label is replaced by the allowed label it equals once its
-- closing bracket is added back, the defect found. Any other value outside the list is left as it
-- is and listed in the output, never completed by a guess (ADR-0013). A building whose repair
-- would hold the same group twice is not changed and is listed too. Values are replaced in place,
-- so the order of a building's groups is kept. current_landuse_order is not changed; a repaired
-- building whose stored order does not match the order its labels give is listed for a person.
--
-- Every change is recorded in landuse_group_repairs (value before and after), which 065's down
-- uses to undo it; when nothing needs repairing, no such table is kept. The output gives the
-- counts before and after: keep it with the ticket.
--
-- Run as the owner of the buildings table, with psql -v ON_ERROR_STOP=1, before 066. Edits to
-- buildings wait while it runs (under half a second for 21,200 buildings); reading is not blocked. If
-- another session holds a conflicting lock for 10 s, it stops and changes nothing; run it again.
-- Running it twice is safe.
--
BEGIN;

SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS public.landuse_group_repairs (
    building_id integer PRIMARY KEY,
    value_before text[] NOT NULL,
    value_after text[] NOT NULL,
    repaired_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.landuse_group_repairs IS
    'Land-use groups repaired by migration 065 (cut off mid-label), with the value before and after. '
    'Ticket docs/tickets/query-engine/issues/17-cut-off-land-use-values.md. Removed by 065 down.';

DO $$
DECLARE
    unlisted_before integer;
    buildings_before integer;
    unlisted_after integer;
    unlisted_original_use integer;
    repaired_values integer;
    repaired_buildings integer;
    repaired_ids integer[];
    item record;
BEGIN
    IF NOT pg_has_role((SELECT relowner FROM pg_class WHERE oid = 'public.buildings'::regclass), 'USAGE') THEN
        RAISE EXCEPTION 'Run 065 as the owner of the buildings table (it repairs contributor data)';
    END IF;

    -- No edit can land between reading a building's value and replacing it.
    LOCK TABLE public.buildings IN SHARE ROW EXCLUSIVE MODE;

    -- Every land-use group value: whether it is an allowed label, the allowed label it equals with
    -- its closing bracket added back (if any), and how many allowed labels start with it (for the
    -- listing only).
    CREATE TEMP TABLE repair_065_values ON COMMIT DROP AS
    SELECT
        b.building_id,
        e.position,
        e.value,
        EXISTS (
            SELECT 1 FROM reference_tables.buildings_landuse_group g WHERE g.description = e.value
        ) AS listed,
        (
            SELECT g.description FROM reference_tables.buildings_landuse_group g
            WHERE g.description = e.value || ')'
        ) AS full_label,
        (
            SELECT count(*) FROM reference_tables.buildings_landuse_group g
            WHERE starts_with(g.description, e.value)
        ) AS labels_starting_with
    FROM public.buildings b
    CROSS JOIN LATERAL unnest(b.current_landuse_group) WITH ORDINALITY AS e(value, position);

    SELECT count(*), count(DISTINCT building_id) INTO unlisted_before, buildings_before
    FROM repair_065_values WHERE NOT listed;
    RAISE NOTICE 'Before: % land-use group value(s) not in the allowed list, on % building(s)',
        unlisted_before, buildings_before;

    -- The repaired value of every building with at least one value to complete, and whether that
    -- repaired value would list a group twice.
    CREATE TEMP TABLE repair_065_plan ON COMMIT DROP AS
    SELECT
        p.*,
        cardinality(p.value_after) <> (
            SELECT count(*) FROM (SELECT DISTINCT x FROM unnest(p.value_after) AS x) d
        ) AS duplicates
    FROM (
        SELECT
            v.building_id,
            b.current_landuse_group AS value_before,
            array_agg(
                CASE WHEN NOT v.listed AND v.full_label IS NOT NULL THEN v.full_label ELSE v.value END
                ORDER BY v.position
            ) AS value_after,
            count(*) FILTER (WHERE NOT v.listed AND v.full_label IS NOT NULL) AS completed_values
        FROM repair_065_values v
        JOIN public.buildings b USING (building_id)
        GROUP BY v.building_id, b.current_landuse_group
        HAVING bool_or(NOT v.listed AND v.full_label IS NOT NULL)
    ) p;

    -- Record, then repair, only the buildings not already recorded by an earlier run.
    WITH recorded AS (
        INSERT INTO public.landuse_group_repairs (building_id, value_before, value_after)
        SELECT building_id, value_before, value_after FROM repair_065_plan WHERE NOT duplicates
        ON CONFLICT (building_id) DO NOTHING
        RETURNING building_id, value_after
    ), repaired AS (
        UPDATE public.buildings b
        SET current_landuse_group = r.value_after
        FROM recorded r
        WHERE b.building_id = r.building_id
        RETURNING b.building_id
    )
    SELECT coalesce(array_agg(building_id), '{}') INTO repaired_ids FROM repaired;

    SELECT count(*), coalesce(sum(completed_values), 0) INTO repaired_buildings, repaired_values
    FROM repair_065_plan WHERE building_id = ANY (repaired_ids);

    FOR item IN
        SELECT v.building_id,
            format('value %L: not an allowed label missing its closing bracket (%s allowed label(s) start with it)',
                v.value, v.labels_starting_with) AS reason
        FROM repair_065_values v
        WHERE NOT v.listed AND v.full_label IS NULL
        UNION ALL
        SELECT building_id, 'repairing it would list the same group twice'
        FROM repair_065_plan WHERE duplicates
        UNION ALL
        SELECT building_id, 'already recorded by an earlier run of 065, whose record is kept for the down'
        FROM repair_065_plan WHERE NOT duplicates AND building_id <> ALL (repaired_ids)
        ORDER BY 1
    LOOP
        RAISE NOTICE 'Not repaired: building %, %', item.building_id, item.reason;
    END LOOP;

    -- The order the app would derive from the repaired labels (one order, or Mixed Use for several;
    -- app/src/api/dataAccess/landUse.ts getLandUseOrderFromGroup), where it differs from the stored one.
    FOR item IN
        SELECT * FROM (
            SELECT b.building_id, b.current_landuse_order AS stored,
                CASE WHEN count(DISTINCT o.description) > 1 THEN 'Mixed Use' ELSE min(o.description) END AS derived
            FROM public.buildings b
            CROSS JOIN LATERAL unnest(b.current_landuse_group) AS value
            JOIN reference_tables.buildings_landuse_group g ON g.description = value
            JOIN reference_tables.buildings_landuse_order o ON o.landuse_id = g.parent_order_id
            WHERE b.building_id = ANY (repaired_ids)
            GROUP BY b.building_id, b.current_landuse_order
        ) orders
        WHERE stored IS DISTINCT FROM derived
        ORDER BY building_id
    LOOP
        RAISE NOTICE 'Order to check: building % stores %, its repaired labels give % (not changed)',
            item.building_id, quote_nullable(item.stored), quote_nullable(item.derived);
    END LOOP;

    SELECT count(*) INTO unlisted_after
    FROM public.buildings b
    CROSS JOIN LATERAL unnest(b.current_landuse_group) AS value
    WHERE NOT EXISTS (
        SELECT 1 FROM reference_tables.buildings_landuse_group g WHERE g.description = value
    );

    -- Self-check: every value that left the unlisted count was completed by this run.
    IF unlisted_before - unlisted_after <> repaired_values THEN
        RAISE EXCEPTION 'Repair 065 stopped: % unlisted value(s) before, % after, but % completed',
            unlisted_before, unlisted_after, repaired_values;
    END IF;

    RAISE NOTICE 'Repaired: % value(s) on % building(s)', repaired_values, repaired_buildings;
    RAISE NOTICE 'After: % land-use group value(s) not in the allowed list', unlisted_after;

    -- Original land use uses the same list; 065 does not repair it, but reports it.
    SELECT count(*) INTO unlisted_original_use
    FROM public.buildings b
    CROSS JOIN LATERAL unnest(b.typology_original_use) AS value
    WHERE NOT EXISTS (
        SELECT 1 FROM reference_tables.buildings_landuse_group g WHERE g.description = value
    );
    RAISE NOTICE 'typology_original_use: % value(s) not in the allowed list (not repaired by 065)',
        unlisted_original_use;

    IF NOT EXISTS (SELECT 1 FROM public.landuse_group_repairs) THEN
        DROP TABLE public.landuse_group_repairs;
        RAISE NOTICE 'Nothing repaired, so no landuse_group_repairs table is kept';
    END IF;
END
$$;

COMMIT;
