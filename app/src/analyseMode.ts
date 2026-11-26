/*
 * Implements spec user story 77 (FR-14.1); see ADR-0019, ADR-0017.
 * Ticket: docs/tickets/query-engine/issues/18-connect-colouring-ghana-to-engine.md
 *
 * The feature flag for Analyse mode, the query engine's part of the site. Until Analyse mode has
 * been evaluated, it is on in development and off in production. The setting ANALYSE_MODE, "on"
 * or "off", overrides that default in either.
 */

/** Whether Analyse mode is on. Throws when ANALYSE_MODE has any other value, so a typo cannot pass silently. */
export function analyseModeOn(env: NodeJS.ProcessEnv): boolean {
    const setting = env.ANALYSE_MODE;
    if (setting === undefined) {
        return env.NODE_ENV !== 'production';
    }
    if (setting === 'on' || setting === 'off') {
        return setting === 'on';
    }
    throw new Error('ANALYSE_MODE must be "on" or "off", or not set');
}
