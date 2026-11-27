# Deployment

The release workflow builds and signs an immutable GHCR image with
`seheon99/build-and-deploy/build@v1.5.0`. Its `image` job output is passed
to a separate `deploy@v1.5.0` job. Pull requests only build; they do not
publish, sign, or connect to the server.

The deployment directory is `/srv/apps/joobjoob`, with `compose.yaml` and
the server-only `.env`. Install the Compose file from the reviewed release
commit before the first deployment and whenever its configuration changes:

```sh
install -d -m 750 /srv/apps/joobjoob
install -m 644 compose.yaml /srv/apps/joobjoob/compose.yaml
```

Run these commands on the server from a checkout of the reviewed commit.
Keep environment files and credentials on the server; never commit them.
The SSH deployment user must be able to write the deployment directory and
environment file and run Docker. Keep GHCR authentication on the server
if the images are private. The existing `public-traefik-net` must remain;
routing is managed outside this repository.

## Retry and rollback

If the build succeeds and deployment fails, use **Re-run failed jobs**
in the original Actions run. The successful build is not repeated, and
deployment reuses its immutable image output. Re-running all jobs rebuilds.
For a rollback, re-run the deploy job of the desired previous successful
run after checking that its Compose version is compatible.

The deploy action validates a candidate environment with `docker compose
config --quiet` before replacing `.env`. Configuration failure preserves
the previous environment file. Pull/start failure happens after replacement;
the job fails with the candidate digest still recorded, so retry that job.
Only the selected service is updated with `--no-deps --no-build`.

## Preserve existing data during migration

The server already has a separate `/srv/apps/joobjoob/compose.yaml` with
project name `joobjoob`. This repository keeps that name, service names,
private network, PostgreSQL 18 mount at `/var/lib/postgresql`, and mail
configuration. The three existing named volumes are now explicitly external:

- `joobjoob_joobjoob-database-data`
- `joobjoob_joobjoob-mail-data`
- `joobjoob_joobjoob-mail-etc`

Before replacing the server Compose file:

1. Back up the current Compose and environment files securely. Take and
   verify a PostgreSQL backup using your existing backup process.
2. Inspect the running database and mail container mounts and use
   `docker volume inspect` to verify that all three names above match the
   existing volumes. If any name differs, stop and correct the explicit
   `name` in the reviewed Compose file. Do not create empty replacement
   volumes. External declarations deliberately fail if a volume is absent.
3. Preserve the existing server `.env`, `api/.env`, and `database/.env`
   in place. `.env` must retain both `JOOBJOOB_WEB_IMAGE_DIGEST` and
   `JOOBJOOB_API_IMAGE_DIGEST`. Do not copy secrets into the repository.
4. Install the reviewed Compose file, then validate without changing
   running containers:

   ```sh
   docker compose --project-directory /srv/apps/joobjoob --env-file /srv/apps/joobjoob/.env -f /srv/apps/joobjoob/compose.yaml config --quiet
   ```

5. Release Web/API normally and check their health and existing records.
   Their deployment uses `--no-deps`, so the database and mail containers
   are not recreated. On failure, restore the backed-up Compose file and
   retry with the previous image digest; keep all volumes and environment
   files in place.

Never run `down -v`, `volume rm`, or `volume prune` during this migration.
If migrating from an older shared project instead, first inspect its
actual mount names and update the external volume names before cutover.
Both release workflows retain the shared `joobjoob-deploy` concurrency
group with cancellation disabled, serializing updates to the same `.env`.
Compose changes trigger both release workflows.
