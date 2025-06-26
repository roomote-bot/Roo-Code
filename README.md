# Roo Code Cloud Monorepo

This guide assumes:
- Your platform is MacOS.
- You have Docker Desktop installed.
- You have node.js & pnpm installed via [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com/).

### Encrypted Env

The various apps within the monorepo rely on the encrypted variables in `.env.*`. You need a set of private keys to decrypt these files. Ask in Slack for these keys and place them in a file called `.env.keys` at the root of the repository. It will look something like:

```
DOTENV_PRIVATE_KEY_TEST=...
DOTENV_PRIVATE_KEY_DEVELOPMENT=...
DOTENV_PRIVATE_KEY_PREVIEW=...
DOTENV_PRIVATE_KEY_PRODUCTION=...
```

You can verify that decryption is working by running the following:
```
pnpm install
pnpm --filter @roo-code-cloud/env test
```

### Postgres, ClickHouse, Redis

Next you should start the Docker database containers by running:

```sh
pnpm db:up
```

This will automatically sync your postgres schema to the latest version. If you need to reset your database at any point, you can run:

```sh
pnpm db:reset
```

We don't currently have ClickHouse migrations automated, so if you encounter any errors that look related to ClickHouse schema drift you'll have to manually apply the missing migrations, or completely reset the database with:

```sh
pnpm db:down
rm -rf .docker/data/clickhouse
pnpm db:up
```

To connect to these services via the Docker hostnames specified in `docker-compose.yml` you should update your `/etc/hosts` file to alias `postgres`, `clickhouse` and `redis`:

```
# /etc/hosts

127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost

# Roo Code Cloud
127.0.0.1 postgres redis clickhouse
```

### Web

You should now be able to start the Roo Code Cloud web app:

```sh
pnpm --filter @roo-code-cloud/web dev
```

The app will be available at [localhost:3000](http://localhost:3000/).

### Roomote

Documentation for running the various roomote services is still a [WIP](https://www.notion.so/Roomote-Local-Setup-21cfd1401b0a80fc9e8ac37e7c4cfc05).
