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
   - optional: `DESIRED_COUNT`
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
1. Merge app or infra changes to `main`.
2. GitHub Actions runs **terraform-apply** automatically for `prod`.
3. The workflow builds a container image tagged with the commit SHA, pushes it to ECR, and applies Terraform with that exact `image_tag`.
4. GitHub environment protection (reviewers) still gates the deploy if enabled.

## Manual deploy and rollback
1. Open **terraform-apply** in GitHub Actions.
2. Select `test` or `prod`.
3. Leave `image_tag` empty to build and deploy the selected ref.
4. Set `image_tag` to a previously pushed SHA tag to redeploy an older image without rebuilding.

## Rollback basics
- Infra rollback: checkout previous commit and re-run `terraform-apply`.
- App rollback: rerun `terraform-apply` with a previously shipped `image_tag`.
- Emergency stop: set `DESIRED_COUNT=0` and apply.
