# Local POC: 2 Docker Containers

This setup runs the POC locally with exactly 2 containers:

- `plantu-poc-mysql`
- `plantu-poc-backend`

## Prerequisite

Install and start Docker Desktop for Mac.

Validate:

```bash
docker --version
docker compose version
```

## Start

From repo root:

```bash
docker compose -f docker-compose.local-poc.yml up -d --build
```

## Check status

```bash
docker compose -f docker-compose.local-poc.yml ps
```

## Health checks

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/health/dependencies
```

## Logs

```bash
docker compose -f docker-compose.local-poc.yml logs -f backend
docker compose -f docker-compose.local-poc.yml logs -f mysql
```

## Stop

```bash
docker compose -f docker-compose.local-poc.yml down
```

## Reset (delete DB data)

```bash
docker compose -f docker-compose.local-poc.yml down -v
```

## Notes

- Backend is available at `http://127.0.0.1:4000`
- MySQL is exposed on host port `3307` for optional direct access.
- Backend uses MySQL service name `mysql` on the internal Docker network.
