COMPOSE_FILE=docker-compose.split-poc.yml

.PHONY: up down restart ps logs logs-app logs-admin logs-web health clean

up:
	docker-compose -f $(COMPOSE_FILE) up -d --build

down:
	docker-compose -f $(COMPOSE_FILE) down

restart: down up

ps:
	docker-compose -f $(COMPOSE_FILE) ps

logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-app:
	docker-compose -f $(COMPOSE_FILE) logs -f app-backend

logs-admin:
	docker-compose -f $(COMPOSE_FILE) logs -f admin-backend

logs-web:
	docker-compose -f $(COMPOSE_FILE) logs -f admin-web

health:
	@echo "App API:" && curl -s http://127.0.0.1:4000/health && echo
	@echo "Admin API:" && curl -s http://127.0.0.1:5001/health && echo
	@echo "Admin Web HTTP:" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5174 && echo

clean:
	docker-compose -f $(COMPOSE_FILE) down -v
