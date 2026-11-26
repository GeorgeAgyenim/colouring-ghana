# Query engine configuration

Colouring Ghana's configuration for the query engine behind Analyse mode, a separate service
([GeorgeAgyenim/ccrp-query-engine](https://github.com/GeorgeAgyenim/ccrp-query-engine), GPL-3.0). The app
forwards `/api/query/*` to it.

- `catalogue.json`: the field catalogue, the building fields the engine may query, generated from
  `app/src/frontend/config/data-fields-config.ts` and the buildings table's column types. Do not edit it by
  hand.

## Regenerate the catalogue

Whenever the field definitions or the buildings table change. CI (`.github/workflows/query-engine.yml`)
fails until you do. With a clone of the engine at the commit that workflow pins (`ENGINE_COMMIT`), on its
Node.js version (`.nvmrc`), and a database built from this repository's migrations
(`migrations/tests/build-database.sh <name>`), from the engine's directory:

```sh
npm ci --omit=dev
QUERY_ENGINE_DATABASE_URL='postgres://<login>@<host>:5432/<name>' node src/cli.ts catalogue \
  --definitions <this repository>/app/src/frontend/config/data-fields-config.ts \
  --output <this repository>/query-engine/catalogue.json
```

## Run Analyse mode locally

1. Set up and start the engine against your database: the engine's
   [host setup guide](https://github.com/GeorgeAgyenim/ccrp-query-engine/blob/main/docs/host-setup.md), with
   `QUERY_ENGINE_CATALOGUE_FILE` set to this folder's `catalogue.json`.
2. Start the app with `ANALYSE_ENGINE_URL` set to the engine's address, for example
   `http://127.0.0.1:3100`.

| App setting | Meaning |
|---|---|
| `ANALYSE_MODE` | `on` or `off`. Not set: on in development, off in production |
| `ANALYSE_ENGINE_URL` | The engine's `http://` address. Not set: `/api/query/*` answers 503 |
