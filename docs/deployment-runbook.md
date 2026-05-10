# Deployment Runbook

## Architecture (MVP)
- Telegram bot container on AWS ECS Fargate
- ECR repository for images
- CloudWatch logs
- Terraform remote state in S3 + DynamoDB lock table
- GitHub Actions for plan/apply via OIDC

## What Till must configure (once)
1. Create AWS OIDC trust for GitHub Actions.
2. Create IAM role for CI and store as `AWS_ROLE_ARN` secret in GitHub environments (`test`, `prod`).
3. Create S3 bucket for Terraform state and DynamoDB lock table.
4. In GitHub environment variables set:
   - `AWS_REGION`
   - `SERVICE_NAME`
   - `TF_STATE_BUCKET`
   - `TF_LOCK_TABLE`
   - optional: `IMAGE_TAG`, `DESIRED_COUNT`
5. In GitHub environment secrets set:
   - `AWS_ROLE_ARN`
   - `TELEGRAM_BOT_TOKEN`

## Bootstrap test environment
```bash
cd infra/terraform/environments/test
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
# fill values
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

## Bootstrap prod environment
```bash
cd infra/terraform/environments/prod
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
# fill values
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

## CI apply flow
1. Merge infra/app changes to `main`.
2. Run **terraform-apply** workflow manually.
3. Select `test` or `prod` environment.
4. GitHub environment protection (reviewers) gates apply if enabled.

## Rollback basics
- Infra rollback: checkout previous commit and re-run `terraform-apply`.
- App rollback: redeploy previous `IMAGE_TAG` and re-run apply.
- Emergency stop: set `DESIRED_COUNT=0` and apply.
