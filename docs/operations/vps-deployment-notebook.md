# Sổ Tay Vận Hành & Triển Khai VPS Feed.io (Deployment Notebook)

> **Thông tin máy chủ:**
> * **IP chính:** `103.77.208.215`
> * **Hostname:** `thuevpsgiare-1790763581`
> * **Hệ điều hành:** Ubuntu 24.04 LTS (x86_64)
> * **Phần cứng:** 2 Core Xeon Gold | 4 GB RAM (+ 4 GB Swap) | 35 GB NVMe
> * **Kiến trúc:** Cloudflare Tunnel Ingress (Zero Open Inbound Ports) + Pre-built Images (GHCR) + Neon DB

---

## Mục Lục
1. [Giai Đoạn 1: Tối Ưu Hệ Thống & RAM Swap](#1-giai-đoạn-1-tối-ưu-hệ-thống--ram-swap)
2. [Giai Đoạn 2: Thiết Lập Bảo Mật & Phân Quyền](#2-giai-đoạn-2-thiết-lập-bảo-mật--phân-quyền)
3. [Giai Đoạn 3: Cài Đặt Docker & Đăng Nhập GHCR](#3-giai-đoạn-3-cài-đặt-docker--đăng-nhập-ghcr)
4. [Giai Đoạn 4: Cấu Hình Môi Trường & Triển Khai Feed.io](#4-giai-đoạn-4-cấu-hình-môi-trường--triển-khai-feedio)
5. [Giai Đoạn 5: Khởi Tạo Tài Khoản Super Admin](#5-giai-đoạn-5-khởi-tạo-tài-khoản-super-admin)
6. [Sổ Tay Lệnh Vận Hành & Bảo Trì Hàng Ngày](#6-sổ-tay-lệnh-vận-hành--bảo-trì-hàng-ngày)

---

## 1. Giai Đoạn 1: Tối Ưu Hệ Thống & RAM Swap

Chạy trên Terminal VPS với quyền `root`:

```bash
# 1.1 Tối ưu SSH (Tắt reverse DNS để SSH không bị delay 20s)
echo "UseDNS no" >> /etc/ssh/sshd_config && systemctl restart ssh

# 1.2 Tạo 4GB Swap RAM (Bắt buộc để chống tràn RAM khi transcode video)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 1.3 Kiểm tra lại bộ nhớ
free -h

# 1.4 Cập nhật hệ thống
apt update && apt upgrade -y
apt install -y curl git ufw jq openssl ca-certificates fail2ban
```

---

## 2. Giai Đoạn 2: Thiết Lập Bảo Mật & Phân Quyền

```bash
# 2.1 Bật Firewall UFW (Khóa 100% cổng inbound, chỉ mở duy nhất SSH port 22)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH Port'
ufw --force enable
ufw status verbose

# 2.2 Bật Fail2ban (Tự động ban IP nếu dò sai mật khẩu SSH 5 lần)
systemctl enable --now fail2ban

# 2.3 Tạo User deployer quản trị (Không chạy mọi thứ bằng root)
adduser --gecos "" deployer
usermod -aG sudo deployer

# 2.4 Cấu trúc thư mục ứng dụng & dữ liệu chuẩn UID 1001 (khớp với Docker)
mkdir -p /opt/feedio
chown -R deployer:deployer /opt/feedio
chmod 755 /opt/feedio

mkdir -p /var/lib/feedio/{valkey,rabbitmq,garage_meta,garage_data,backups}
chown -R 1001:1001 /var/lib/feedio
chmod -R 770 /var/lib/feedio
chmod 700 /var/lib/feedio/backups
```

---

## 3. Giai Đoạn 3: Cài Đặt Docker & Đăng Nhập GHCR

```bash
# 3.1 Cài Docker Engine chính thức
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
usermod -aG docker deployer
newgrp docker

# 3.2 Kiểm tra phiên bản Docker Compose
docker compose version

# 3.3 Đăng nhập GitHub Container Registry (GHCR) để kéo image đã build sẵn
# (Tạo GitHub PAT tại: Settings -> Developer settings -> Personal access tokens -> Tokens (classic) -> tích read:packages)
echo "PASTE_YOUR_GITHUB_PAT_HERE" | docker login ghcr.io -u "PASTE_YOUR_GITHUB_USERNAME" --password-stdin
```

---

## 4. Giai Đoạn 4: Cấu Hình Môi Trường & Triển Khai Feed.io

```bash
# 4.1 Chuyển sang user deployer và clone mã nguồn
su - deployer
git clone https://github.com/khanhnkq/feed.io.git /opt/feedio
cd /opt/feedio

# 4.2 Sinh file biến môi trường sản xuất
bash scripts/ensure-prod-env.sh .env.production
chmod 600 .env.production

# 4.3 Chỉnh sửa cấu hình .env.production
nano .env.production
```

### Các thông số quan trọng cần cập nhật trong `.env.production`:

1. **Cloudflare Tunnel Token:**
   ```ini
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...
   ```
2. **Domain & Routing:**
   ```ini
   FEEDIO_DOMAIN=feedio.yourcompany.com
   FEEDIO_WEB_BASE_URL=https://feedio.yourcompany.com
   FEEDIO_CORS_ORIGINS=["https://feedio.yourcompany.com"]
   ```
3. **Database Neon DB (Không chạy Postgres cục bộ):**
   ```ini
   FEEDIO_DATABASE_URL=postgresql+psycopg://<user>:<password>@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Cloudflare R2 Storage (Tùy chọn nếu không lưu video trên VPS):**
   ```ini
   FEEDIO_GARAGE_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   FEEDIO_GARAGE_S3_ACCESS_KEY=<r2_access_key>
   FEEDIO_GARAGE_S3_SECRET_KEY=<r2_secret_key>
   FEEDIO_GARAGE_S3_BUCKET=feedio-media
   FEEDIO_GARAGE_S3_REGION=auto
   ```

---

## 5. Khởi Động Stack Ứng Dụng (Zero-Build)

```bash
cd /opt/feedio

# 5.1 Kéo các Docker images đã build sẵn về VPS (~20 giây)
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production pull

# 5.2 Chạy migration tạo bảng trên Neon DB
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production run --rm migrate

# 5.3 Khởi chạy toàn bộ hệ thống
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production up -d

# 5.4 Tạo tài khoản Super Admin đầu tiên
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production exec api \
  python -m feedio.entrypoints.cli create-admin --email "admin@yourcompany.com" --name "Super Admin"
```

Đăng nhập tại: `https://feedio.yourcompany.com/login`  
Trang quản trị: `https://feedio.yourcompany.com/app/admin`

---

## 6. Sổ Tay Lệnh Vận Hành & Bảo Trì Hàng Ngày

### 6.1 Kiểm tra trạng thái hệ thống
```bash
# Xem các container đang chạy
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production ps

# Xem tài nguyên RAM / CPU tiêu thụ thời gian thực
docker stats

# Kiểm tra dung lượng ổ cứng còn trống
df -h
free -h
```

### 6.2 Xem Logs theo thời gian thực (Troubleshooting)
```bash
# Xem log toàn bộ hệ thống
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production logs -f

# Xem log riêng Backend API
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production logs -f api

# Xem log riêng Celery Worker (xem FFmpeg transcode video)
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production logs -f worker

# Xem log riêng Web Frontend
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production logs -f web

# Xem log Cloudflare Tunnel
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production logs -f cloudflared
```

### 6.3 Quy trình cập nhật phiên bản mới (Zero-Downtime Rolling Update)
Khi có code mới trên nhánh `main`, GitHub Actions tự động build image. Trên VPS chỉ cần:
```bash
cd /opt/feedio
git pull origin main
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production pull
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production run --rm migrate
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production up -d --remove-orphans
```

### 6.4 Dọn dẹp ổ cứng (Tránh đầy 35GB NVMe)
```bash
# Xóa các image cũ, cache thừa không dùng tới
docker system prune -af --volumes=false
```

### 6.5 Khởi động lại toàn bộ hoặc từng service
```bash
# Khởi động lại riêng API
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production restart api

# Khởi động lại toàn bộ stack
docker compose -f infra/compose/compose.prod.yaml --env-file .env.production restart
```
