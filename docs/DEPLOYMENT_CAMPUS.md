# Production Deployment Guide: SVCE Campus On-Premises Server

This guide provides step-by-step instructions for deploying the **SVCE Smart No-Dues ERP** onto a campus physical server or hypervisor (Ubuntu Server 22.04 LTS / Debian 12) hosted on the SVCE college intranet / DMZ.

---

## 1. System Requirements & Hardware Sizing

| Metric | Minimum | Recommended (Peak Load) |
| :--- | :--- | :--- |
| **CPU** | 4 Cores (x86_64) | 8 Cores (Intel Xeon / AMD EPYC) |
| **RAM** | 8 GB | 16 GB - 32 GB |
| **Storage** | 100 GB SSD (RAID-1/10) | 250 GB NVMe SSD |
| **Network** | 1 Gbps NIC | 10 Gbps Redundant NICs |
| **OS** | Ubuntu Server 22.04 LTS | Ubuntu Server 24.04 LTS |

---

## 2. Server Provisioning & OS Hardening

### A. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw fail2ban unattended-upgrades
```

### B. Configure Host Firewall (UFW)
Open only required ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Administration'
sudo ufw allow 80/tcp comment 'HTTP ACME / Redirect'
sudo ufw allow 443/tcp comment 'HTTPS Secure ERP'
sudo ufw enable
sudo ufw status verbose
```

### C. Install Docker & Docker Compose
```bash
# Add Docker official GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on boot and grant deployer group access
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## 3. Clone Repository & Setup Secrets

### A. Clone Codebase
```bash
sudo mkdir -p /opt/svce_nodues
sudo chown -R $USER:$USER /opt/svce_nodues
cd /opt/svce_nodues
git clone <GIT_REPOSITORY_URL> .
```

### B. Generate Cryptographic Production Secrets
Never reuse passwords. Generate cryptographically strong random keys:
```bash
openssl rand -base64 32 # JWT_SECRET
openssl rand -base64 32 # CERT_HMAC_KEY
openssl rand -base64 32 # SESSION_SECRET
openssl rand -base64 32 # BACKUP_ENCRYPTION_KEY
openssl rand -base64 24 # DB_PASSWORD
openssl rand -base64 24 # MYSQL_ROOT_PASSWORD
```

### C. Create `.env.prod`
```bash
cp .env.prod.example .env.prod
nano .env.prod # Paste generated keys and domain details
chmod 600 .env.prod
```

---

## 4. Institutional TLS Certificate Installation

Place the campus-issued institutional certificate and private key:
```bash
mkdir -p deploy/certs
# Copy SVCE Wildcard or Domain Certificate
cp /path/to/svce_wildcard_cert.pem deploy/certs/fullchain.pem
cp /path/to/svce_private_key.key deploy/certs/privkey.pem
chmod 600 deploy/certs/privkey.pem
chmod 644 deploy/certs/fullchain.pem
```
*(If testing on intranet before cert issuance, run `node deploy/generate_dev_certs.js` for self-signed certificates).*

---

## 5. Build and Launch Containers

```bash
# Build and launch production stack in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Verify all containers are running and healthy
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Verification and Health Checks

```bash
# 1. Check container health status
curl -k https://localhost/health

# 2. Check deep database readiness and pool stats
curl -k https://localhost/ready

# 3. View live server logs
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 7. Automated Backups & Systemd Service

Configure daily encrypted backups via system cron:
```bash
sudo crontab -e
# Add the following line:
0 2 * * * cd /opt/svce_nodues && /usr/bin/docker exec svce_nodues_prod_backend node src/scripts/backup.js >> /var/log/svce_backup.log 2>&1
```
