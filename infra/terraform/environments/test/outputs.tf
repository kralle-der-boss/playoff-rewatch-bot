output "ecr_repository_url" { value = module.bot_service.ecr_repository_url }
output "ecs_cluster_name" { value = module.bot_service.ecs_cluster_name }
output "ecs_service_name" { value = module.bot_service.ecs_service_name }
output "log_group_name" { value = module.bot_service.log_group_name }
