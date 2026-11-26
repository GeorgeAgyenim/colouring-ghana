--
-- Land-use groups must come from the reference list, whoever writes them.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
-- Decisions: ADR-0013, ADR-0018 (local, docs/decisions/)
--
-- The app's edit path already refuses a land-use group that is not in
-- reference_tables.buildings_landuse_group (app/src/api/services/domainLogic/landUse.ts). The
-- database did not: current_landuse_order has a foreign key, but the group columns are text
-- arrays, which a foreign key cannot cover. On 26 November 2026, 18 group values cut off mid-label
-- were found that had been loaded straight into the table, bypassing the app. This trigger applies
-- the app's list check to every writer: an import script, a SQL session, or the app itself. (The
-- app's other rule, no group listed twice, stays in the app.)
--
-- It checks current_landuse_group and typology_original_use (the app checks both against the same
-- list). On an update it checks a column only when its value changes, so a building still holding
-- a value that 065 did not repair can have its other details edited.
--
-- The trigger function runs with the rights of the buildings table's owner (SECURITY DEFINER,
-- fixed search_path), so a writer needs no read access to the reference list. Only that owner may
-- use the function: it is not executable by others and, as a trigger function, cannot be called.
--
-- Apply after 065 and remove before 065's down: that down restores the cut-off values, which this
-- trigger refuses. Run as the owner of the buildings table, with psql -v ON_ERROR_STOP=1. Creating
-- the trigger waits for, and briefly holds, a lock that pauses edits (not reads); if another
-- session holds a conflicting lock for 10 s, it stops and changes nothing; run it again.
--
BEGIN;

SET LOCAL lock_timeout = '10s';

DO $$
BEGIN
    IF NOT pg_has_role((SELECT relowner FROM pg_class WHERE oid = 'public.buildings'::regclass), 'USAGE') THEN
        RAISE EXCEPTION 'Run 066 as the owner of the buildings table';
    END IF;
END
$$;

-- Refuses (check_violation) a list of land-use groups holding a value that is not an allowed label.
CREATE OR REPLACE FUNCTION public.buildings_assert_landuse_groups_listed(for_building integer, in_column text, groups text[])
RETURNS void
LANGUAGE plpgsql STABLE AS $$
DECLARE
    unlisted text;
BEGIN
    SELECT value INTO unlisted
    FROM unnest(groups) AS value
    WHERE NOT EXISTS (  -- also true for a NULL entry
        SELECT 1 FROM reference_tables.buildings_landuse_group g WHERE g.description = value
    )
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION '% on building %: % is not a land use group in reference_tables.buildings_landuse_group',
            in_column, for_building, quote_nullable(unlisted)
            USING ERRCODE = 'check_violation';
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.buildings_check_landuse_groups_listed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.current_landuse_group IS DISTINCT FROM OLD.current_landuse_group THEN
        PERFORM public.buildings_assert_landuse_groups_listed(
            NEW.building_id, 'current_landuse_group', NEW.current_landuse_group);
    END IF;
    IF TG_OP = 'INSERT' OR NEW.typology_original_use IS DISTINCT FROM OLD.typology_original_use THEN
        PERFORM public.buildings_assert_landuse_groups_listed(
            NEW.building_id, 'typology_original_use', NEW.typology_original_use);
    END IF;
    RETURN NEW;
END
$$;

-- The functions belong to the table's owner even if a superuser runs this, so the trigger never
-- runs with more rights than that owner; and nobody else may attach the trigger function elsewhere.
DO $$
DECLARE
    table_owner text := (SELECT relowner::regrole::text FROM pg_class WHERE oid = 'public.buildings'::regclass);
BEGIN
    EXECUTE format('ALTER FUNCTION public.buildings_assert_landuse_groups_listed(integer, text, text[]) OWNER TO %s', table_owner);
    EXECUTE format('ALTER FUNCTION public.buildings_check_landuse_groups_listed() OWNER TO %s', table_owner);
END
$$;
REVOKE EXECUTE ON FUNCTION public.buildings_check_landuse_groups_listed() FROM PUBLIC;

CREATE OR REPLACE TRIGGER buildings_landuse_groups_listed
    BEFORE INSERT OR UPDATE OF current_landuse_group, typology_original_use ON public.buildings
    FOR EACH ROW EXECUTE FUNCTION public.buildings_check_landuse_groups_listed();

COMMIT;
