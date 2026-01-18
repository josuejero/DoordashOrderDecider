SHELL := /bin/bash
DOCKER_COMPOSE ?= docker compose

-include .env

POSTGRES_USER ?= postgres
POSTGRES_DB ?= doordash_decider_dev
POSTGRES_PASSWORD ?= postgres

export POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD

.PHONY: dev:stack wait-for-postgres test:all

dev:stack: wait-for-postgres
	$(DOCKER_COMPOSE) run --profile tools --rm -T fastify-migrations npm run db:migrate
	$(DOCKER_COMPOSE) run --profile tools --rm -T fastify-migrations npm run db:seed
	$(DOCKER_COMPOSE) up --build --remove-orphans frontend backend decision-engine

wait-for-postgres:
	@$(DOCKER_COMPOSE) up -d postgres
	@printf "Waiting for Postgres to accept connections"
	@until $(DOCKER_COMPOSE) exec -T postgres pg_isready -U $(POSTGRES_USER) >/dev/null 2>&1; do \
		printf "."; \
		sleep 1; \
	done
	@printf "\nPostgres is ready\n"

test:all:
	npm run lint
	npm test
	cd decision-engine && ./gradlew test
