# ENV Vars

Add a new encrypted variable:

```sh
npx dotenvx set FLY_ACCESS_TOKEN fm2_... -f .env.production
```

View an existing encrypted variable:

```sh
npx dotenvx get FLY_ACCESS_TOKEN -f .env.production
```

These secrets can also be set on Fly.io containers:

```sh
fly secrets set FLY_ACCESS_TOKEN=fm2_... -a roomote-worker
```
