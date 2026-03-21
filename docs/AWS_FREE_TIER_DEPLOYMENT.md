# AWS Free Tier Deployment Guide (Plantu)

This guide deploys your backend to a single EC2 instance using AWS Free Tier-friendly settings.

## 1. What I Need From You

Please keep these ready:

- AWS region (recommended: `ap-south-1` if closest to users)
- A created EC2 key pair (`.pem`)
- A GitHub token (only if repo is private)
- A public domain (optional, can start with EC2 public IP)
- Decision on HTTPS now vs later

## 2. Recommended Free Tier Topology

Use one EC2 `t2.micro`/`t3.micro` instance:

- Node backend process on host (PM2)
- MySQL primary + MySQL secondary + Elasticsearch in Docker

Note:

- This is for development/demo workloads, not production scale.
- Elasticsearch on micro instances can be memory-sensitive.

## 3. Create EC2 Instance

- AMI: Ubuntu 22.04 LTS
- Instance type: `t2.micro` or `t3.micro`
- Storage: minimum 20 GB gp3
- Security Group inbound:
  - `22` (SSH) from your IP only
  - `4000` (backend API) from app/test clients
  - `80` and `443` only if setting up Nginx + SSL

## 4. SSH Into EC2

```bash
ssh -i /path/to/key.pem ubuntu@<EC2_PUBLIC_IP>
```

## 5. Install Runtime Dependencies

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# Node 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker

# PM2 for backend process management
sudo npm install -g pm2
```

## 6. Pull Code

```bash
git clone https://github.com/asthana-siddharth/plantu.git
cd plantu
```

If repo is private, use a GitHub PAT with proper scopes.

## 7. Start Data Stack (MySQL + Elasticsearch)

```bash
docker compose up -d
```

Check health:

```bash
docker compose ps
```

## 8. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` for EC2 host networking:

```env
PORT=4000

DB_PRIMARY_HOST=127.0.0.1
DB_PRIMARY_PORT=3307
DB_PRIMARY_USER=root
DB_PRIMARY_PASSWORD=root
DB_PRIMARY_NAME=plantu_db
DB_PRIMARY_POOL_SIZE=10

DB_SECONDARY_HOST=127.0.0.1
DB_SECONDARY_PORT=3308
DB_SECONDARY_USER=root
DB_SECONDARY_PASSWORD=root
DB_SECONDARY_NAME=plantu_db
DB_SECONDARY_POOL_SIZE=10

ELASTIC_NODE=http://127.0.0.1:9200
ELASTIC_ORDER_INDEX=orders
```

Important:

- Docker Compose in this repo sets MySQL root password to `root`.
- Keep these values in sync with `docker-compose.yml`.

## 9. Install and Run Backend With PM2

```bash
cd ~/plantu/backend
npm install
pm2 start src/server.js --name plantu-backend
pm2 save
pm2 startup systemd
```

Run the printed `sudo` command from `pm2 startup systemd` output.

## 10. Verify Deployment

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/health/dependencies
curl http://<EC2_PUBLIC_IP>:4000/health
```

Expected for dependencies endpoint:

- `success: true`
- `mysqlPrimary.ok: true`
- `mysqlSecondary.ok: true`
- `elasticsearch.ok: true`

## 11. Point Mobile App To AWS Backend

Set `src/config/constants.js`:

```js
export const API_BASE_URL_OVERRIDE = "http://<EC2_PUBLIC_IP>:4000";
```

Then rebuild app:

```bash
cd ~/plantu
npx react-native run-android
```

For production release, prefer a domain + HTTPS instead of raw IP.

## 12. Optional: Nginx + HTTPS (Recommended)

Use this when you are ready for SSL and cleaner URL.

- Install Nginx + Certbot
- Route `https://api.yourdomain.com` to `http://127.0.0.1:4000`
- Update app override URL to your HTTPS domain

## 13. Cost Guardrails

- Use one EC2 only (avoid accidental multi-instance costs)
- Keep EBS small and remove unused snapshots
- Avoid managed OpenSearch/RDS initially if strict free-tier budget
- Set AWS Billing alarms immediately

## 14. Common Issues

- `docker: command not found`: Docker not installed or group not applied (re-login)
- `npm run start` fails at repo root: backend starts only from `backend/`
- `health/dependencies` returns `503`: one dependency is down; check `docker compose ps` and `docker compose logs`
- Mobile app cannot connect: verify EC2 security group allows inbound `4000`

## 15. Next Step (When You Confirm)

I can generate ready files for production hardening:

- Nginx reverse proxy config
- Systemd unit file for backend (as alternative to PM2)
- Deployment script (`deploy/aws/deploy.sh`) for one-command updates
- CI deploy workflow (GitHub Actions) without exposing secrets in code
