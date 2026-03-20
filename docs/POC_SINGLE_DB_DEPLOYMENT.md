# Plantu POC Single-DB Deployment

This guide deploys a vanilla POC stack:

- React Native app
- Node/Express backend
- Single MySQL instance

No replication, no Elasticsearch, no Kafka, no Redis.

## Architecture

- Backend EC2 (public): `Node API + PM2`
- DB EC2 (private preferred): `MySQL 8`
- App -> Backend public URL
- Backend -> DB private IP:3306

## 1. AWS Security Groups

### backend-sg

- Inbound `22` from your IP `/32`
- Inbound `4000` from test clients (your IP or temporary `0.0.0.0/0`)

### db-sg

- Inbound `22` from your IP `/32`
- Inbound `3306` from `backend-sg` only

Do not allow `3306` from `0.0.0.0/0`.

## 2. DB EC2 Setup

```bash
ssh -i ./plantu.pem ec2-user@<DB_PUBLIC_IP>

sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable --now docker

sudo curl -L https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

cd ~
git clone -b main https://github.com/asthana-siddharth/plantu.git
cd ~/plantu
sudo docker-compose -f docker-compose.poc.yml up -d
sudo docker-compose -f docker-compose.poc.yml ps
```

Get DB private IP:

```bash
hostname -I
```

## 3. Backend EC2 Setup

```bash
ssh -i ./plantu.pem ec2-user@<BACKEND_PUBLIC_IP>

sudo dnf update -y
sudo dnf install -y git nodejs npm
sudo npm install -g pm2

cd ~
git clone -b main https://github.com/asthana-siddharth/plantu.git
cd ~/plantu/backend
npm install
```

Create backend env:

```bash
cat > ~/plantu/backend/.env << 'EOF'
PORT=4000

DB_PRIMARY_HOST=<DB_PRIVATE_IP>
DB_PRIMARY_PORT=3306
DB_PRIMARY_USER=root
DB_PRIMARY_PASSWORD=root
DB_PRIMARY_NAME=plantu_db
DB_PRIMARY_POOL_SIZE=10
EOF
```

Start backend:

```bash
cd ~/plantu/backend
pm2 start src/server.js --name plantu-backend
pm2 save
pm2 startup systemd
```

Run the sudo command printed by `pm2 startup systemd`.

## 4. Verify

On backend EC2:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/health/dependencies
```

From your laptop:

```bash
curl http://<BACKEND_PUBLIC_IP>:4000/health
```

## 5. Mobile App Config

Set `src/config/constants.js`:

```js
export const API_BASE_URL_OVERRIDE = "http://<BACKEND_PUBLIC_IP>:4000";
```

Rebuild app after this change.
