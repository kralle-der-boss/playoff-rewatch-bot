terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

module "bot_service" {
  source             = "../../modules/bot_service"
  name               = var.name
  region             = var.aws_region
  telegram_bot_token = var.telegram_bot_token
  image_tag          = var.image_tag
  desired_count      = var.desired_count
}
