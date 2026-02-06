.PHONY: demo-up demo-down demo-reset logs ps test-ui test-backend migrate revision revision-auto

demo-up:
	docker compose up --build

demo-down:
	docker compose down

demo-reset:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

test-ui:
	docker compose --profile test run --rm frontend-tests

test-backend:
	docker compose --profile test run --rm backend-tests

# Apply latest migrations to the configured DB (Docker Compose env/.env).
migrate:
	docker compose run --rm backend alembic -c alembic.ini upgrade head

# Create a new migration file from model changes.
# Usage:
#   make revision MSG="add_x"
revision:
ifndef MSG
	$(error MSG is required. Example: make revision MSG="add_x")
endif
	docker compose run --rm backend alembic -c alembic.ini revision -m "$(MSG)"

# Create a new migration file using --autogenerate.
# Usage:
#   make revision-auto MSG="add_x"
revision-auto:
ifndef MSG
	$(error MSG is required. Example: make revision-auto MSG="add_x")
endif
	docker compose run --rm backend alembic -c alembic.ini revision --autogenerate -m "$(MSG)"

