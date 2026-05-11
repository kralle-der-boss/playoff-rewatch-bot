# playoff-rewatch-bot

Spoiler-safe Telegram bot for NBA playoff rewatch communities.

## MVP capabilities

- Community isolation with **spaces** (create/join/switch)
- Daily spoiler-safe feeds:
  - `/today`
  - `/tomorrow`
- Per-game interaction scoped to active space:
  - `/game <id>`
  - `/vote <id> <up|down|fire>` (or inline buttons)
  - `/activity <id>`
  - `/comment <id> <text>`
- Game cards intentionally hide scores/results and show counters only:
  - votes (👍/👎/🔥)
  - comments (💬)

## Space commands

- `/space_create <name>` create a new space and become owner
- `/space_join <JOIN_CODE>` join a space by code
- `/spaces` list your spaces and active one
- `/space_use <slug|id>` switch active space

## Local development

```bash
git clone https://github.com/kralle-der-boss/playoff-rewatch-bot.git
cd playoff-rewatch-bot
npm install
cp .env.example .env
# set TELEGRAM_BOT_TOKEN
npm run refresh:window
npm start
```

## Scheduler-friendly automation

- Refresh one day:
  ```bash
  npm run refresh
  # or: node src/scripts/refreshGames.js 2026-05-10
  ```
- Refresh today + tomorrow window:
  ```bash
  npm run refresh:window
  # or: node src/scripts/refreshWindow.js 2026-05-10
  ```

Cron example:

```cron
0 8 * * * cd /path/to/playoff-rewatch-bot && /usr/bin/env bash -lc 'npm run refresh:window >> refresh.log 2>&1'
```

## Infrastructure (Terraform)

Terraform is structured for test/prod with remote-state-ready backend:

- `infra/terraform/environments/test`
- `infra/terraform/environments/prod`
- shared module: `infra/terraform/modules/bot_service`

Each environment uses S3 backend + DynamoDB lock pattern via `backend.hcl`.

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` → test + lint
- `.github/workflows/terraform-plan.yml` → fmt/validate/plan (OIDC)
- `.github/workflows/terraform-apply.yml` → build image, push to ECR, and deploy to ECS

Deploy behavior:

- pushes to `main` automatically deploy `prod`
- manual `terraform-apply` runs can deploy `test` or `prod`
- each deploy uses an immutable image tag based on the commit SHA
- manual rollback is done by rerunning `terraform-apply` with an existing `image_tag`

No long-lived AWS keys are stored in this repository.

## Required configuration by repo admin

Set GitHub environment vars/secrets per env (`test`, `prod`):

- Vars: `AWS_REGION`, `SERVICE_NAME`, `TF_STATE_BUCKET`, `TF_LOCK_TABLE`
- Optional vars: `DESIRED_COUNT`
- Secrets: `AWS_ROLE_ARN`, `TELEGRAM_BOT_TOKEN`

See `docs/deployment-runbook.md` for bootstrap and rollback.

## Test

```bash
npm run lint
npm test
```
