# Roo Code Cloud Monorepo

### Web

To start the web app you first need to start the `postgres` and `clickhouse` docker services:

```sh
pnpm db:up
```

This will automatically sync your database to the latest version of the schema. If you need to reset your database at any point, you can run:

```sh
pnpm db:reset
```

Then you can start the app in dev mode:

```sh
pnpm --filter @roo-code-cloud/web dev
```

The app will be available at [localhost:3000](http://localhost:3000/).

### Roomote

TBD
