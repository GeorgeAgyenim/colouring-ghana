--
-- Undoes 065.repair-cut-off-landuse-groups.up.sql.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
--
-- Puts back the land-use groups recorded in landuse_group_repairs, then removes that table. A
-- building whose land use has changed since the repair (a contributor edit) keeps its current
-- value and is listed in the output.
--
-- Run 066's down first: this restores the cut-off values, which 066's check refuses. Run as the
-- owner of the buildings table, with psql -v ON_ERROR_STOP=1.
--
BEGIN;

SET LOCAL lock_timeout = '10s';

DO $$
DECLARE
    restored integer;
    item record;
BEGIN
    IF to_regclass('public.landuse_group_repairs') IS NULL THEN
        RAISE NOTICE 'Nothing to undo: landuse_group_repairs does not exist';
        RETURN;
    END IF;

    IF NOT pg_has_role((SELECT relowner FROM pg_class WHERE oid = 'public.buildings'::regclass), 'USAGE') THEN
        RAISE EXCEPTION 'Run 065 down as the owner of the buildings table (it changes contributor data)';
    END IF;

    -- No edit can land between comparing a building's value and restoring it.
    LOCK TABLE public.buildings IN SHARE ROW EXCLUSIVE MODE;

    FOR item IN
        SELECT r.building_id
        FROM public.landuse_group_repairs r
        JOIN public.buildings b USING (building_id)
        WHERE b.current_landuse_group IS DISTINCT FROM r.value_after
        ORDER BY r.building_id
    LOOP
        RAISE NOTICE 'Not restored: building % has changed since the repair; its current land use is kept',
            item.building_id;
    END LOOP;

    UPDATE public.buildings b
    SET current_landuse_group = r.value_before
    FROM public.landuse_group_repairs r
    WHERE b.building_id = r.building_id
      AND b.current_landuse_group = r.value_after;
    GET DIAGNOSTICS restored = ROW_COUNT;

    RAISE NOTICE 'Restored the land use from before the repair on % building(s)', restored;
END
$$;

DROP TABLE IF EXISTS public.landuse_group_repairs;

COMMIT;
