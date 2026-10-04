# Production Deployment Guide: Cloud Virtual Machine (AWS / GCP / DigitalOcean)

This guide details deploying the **SVCE Smart No-Dues ERP** to a Cloud Virtual Machine (e.g., AWS EC2, GCP Compute Engine, DigitalOcean Droplet) using Docker Compose and automated Let's Encrypt TLS certificates.

---

## 1. Cloud Architecture Overview

```
                                [ Cloudflare / Route 53 DNS ]
                                               │
                                               ▼
                              [ Cloud VM (Ubuntu 22.04 LTS) ]
                             ┌───────────────────────────────┐
                             │  UFW / Security Group: 80,443 │
                             └───────────────┬───────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │    Nginx Reverse Proxy        │
                             │  - TLS 1.3 / HSTS / Gzip      │
                             │  - Rate Limiting / IP Headers │
                             └───────┬───────────────┬───────┘
                                     │               │
                  /api, /health, /ready              │ (Static / SPA)
                                     ▼               ▼
                       ┌───────────────────┐ ┌───────────────┐
                       │  Backend Express  │ │ Frontend Vite │
                       │  (Non-Root node)  │ │ (PWA static)  │
                       └─────────┬─────────┘ └───────────────┘
                                 │
                   (Internal isolated network)
                                 ▼
                       ┌───────────────────┐
                       │  MySQL 8 Database │
                       │ (Persistent Vol)  │
                       └───────────────────┘
```

---

## 2. Cloud VM Provisioning

- **Instance Type**: 2 vCPU, 4GB to 8GB RAM (AWS `t3.medium` / GCP `e2-standard-2`).
- **Storage**: 50 GB gp3 SSD.
- **Inbound Security Group / Firewall Rules**:
  - `SSH` (Port 22) -> Restricted to admin static IP.
  - `HTTP` (Port 80) -> Anywhere (`0.0.0.0/0`).
  - `HTTPS` (Port 443) -> Anywhere (`0.0.0.0/0`).
  - *Ensure Port 3306 (MySQL) is strictly blocked from the public internet.*

---

## 3. DNS Configuration

Point your public domain DNS records to your Cloud VM Elastic / Static IP:
- `A` record: `nodues.svce.ac.in` -> `<CLOUD_VM_PUBLIC_IP>`

---

## 4. Host Setup & Docker Installation

```bash
# SSH into your VM
ssh -i key.pem ubuntu@<CLOUD_VM_IP>

# Update packages and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git certbot

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
```

---

## 5. Automated Let's Encrypt TLS Provisioning

```bash
# Run Certbot standalone to acquire certificate
sudo certbot certonly --standalone \
  -d nodues.svce.ac.in \
  --agree-tos \
  --email admin@svce.ac.in \
  --non-interactive

# Create deploy/certs directory and link certbot keys
mkdir -p /opt/svce_nodues/deploy/certs
sudo ln -sf /etc/letsencrypt/live/nodues.svce.ac.in/fullchain.pem /opt/svce_nodues/deploy/certs/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/nodues.svce.ac.in/privkey.pem /opt/svce_nodues/deploy/certs/privkey.pem
```

### Automatic TLS Renewal via Certbot Webroot
The Nginx configuration mounts `/.well-known/acme-challenge/` to `/var/www/certbot`. Configure renewal in cron:
```bash
sudo crontab -e
# Auto-renew twice a month and reload Nginx
0 3 1,15 * * /usr/bin/certbot renew --webroot -w /var/www/certbot --post-hook "docker compose -f /opt/svce_nodues/docker-compose.prod.yml exec reverse-proxy nginx -s reload"
```

---

## 6. Deployment & Service Startup

```bash
cd /opt/svce_nodues
cp .env.prod.example .env.prod
nano .env.prod # Populate secrets generated via openssl rand -base64 32

# Launch with production compose
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## 7. Verification & Monitoring

```bash
# Test HTTPS redirect
curl -I http://nodues.svce.ac.in
# HTTP/1.1 301 Moved Permanently -> https://nodues.svce.ac.in

# Test HSTS & Security Headers
curl -I https://nodues.svce.ac.in
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Check Health and DB Readiness
curl -s https://nodues.svce.ac.in/health | jq .
curl -s https://nodues.svce.ac.in/ready | jq .
```
