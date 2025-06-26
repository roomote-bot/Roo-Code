# Roo Code Cloud

## Run Locally

### Configure Database

Install [Docker Desktop](https://docs.docker.com/desktop/) for your platform.

Once installed, you can pull down a Postgres Docker image and run it:

```sh
docker compose up
```

Postgres will be running locally on port 5432 username `postgres` and password `password`.

### Install Packages

First install [pnpm](https://pnpm.io) using [these instructions](https://pnpm.io/installation). If you're on MacOS the easiest option is to use Homebrew:

```sh
brew install pnpm
```

You can now install the required packages with:

```sh
pnpm install
```

Make sure your database is migrated:

```sh
pnpm db:migrate
```

If everything is working as expected you should be able to run any of the following without errors:

```sh
pnpm lint
pnpm check-types
pnpm test
```

### Start Development Server

Create an `.env.local` file and fill out the required secrets, including:

- `CLICKHOUSE_URL`
- `CLICKHOUSE_PASSWORD`
- `CLERK_SECRET_KEY`

You can now start the Next.js app with:

```sh
pnpm dev
```

Your server will be running at [localhost:3000](http://localhost:3000)
