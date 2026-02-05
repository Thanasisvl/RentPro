.PHONY: demo-up demo-down demo-reset logs ps test-ui test-backend

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

