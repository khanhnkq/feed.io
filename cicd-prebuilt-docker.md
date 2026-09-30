# CI/CD Pre-built Docker Images for VPS Deployment

## Goal
Tự động hóa build Docker image (`backend` & `web`) qua GitHub Actions và đẩy lên GitHub Container Registry (GHCR), giúp VPS 2 Core / 4GB RAM chỉ cần kéo (pull) image về chạy, loại bỏ hoàn toàn việc build nặng trên VPS.

## Tasks
- [x] Task 1: Tạo workflow GitHub Actions `.github/workflows/docker-publish.yml` để build và push 2 image (`backend` và `web`) lên GHCR với tag `latest` và `git SHA` → Verify: Kiểm tra cú pháp YAML và logic build-push hợp lệ với cả 2 Dockerfile hiện tại.
- [x] Task 2: Cập nhật [compose.prod.yaml](file:///Users/nguyenkimquockhanh/Desktop/feed.io/infra/compose/compose.prod.yaml) để sử dụng `image: ghcr.io/...` cho các service `web`, `api`, `worker`, `migrate`, `garage-init` thay cho khối `build:` trực tiếp, đồng thời tối ưu memory limits cho VPS 4GB → Verify: Chạy `docker compose -f infra/compose/compose.prod.yaml config` không báo lỗi cú pháp.
- [x] Task 3: Cập nhật template môi trường [.env.example](file:///Users/nguyenkimquockhanh/Desktop/feed.io/.env.example) và [scripts/ensure-prod-env.sh](file:///Users/nguyenkimquockhanh/Desktop/feed.io/scripts/ensure-prod-env.sh) để thêm biến cấu hình tên image (`FEEDIO_IMAGE_TAG`, `FEEDIO_IMAGE_REGISTRY`) linh hoạt → Verify: Chạy thử script kiểm tra biến sinh ra đầy đủ.
- [x] Task 4: Cập nhật tài liệu hướng dẫn triển khai [docs/PRODUCTION_DEPLOYMENT_GUIDE.md](file:///Users/nguyenkimquockhanh/Desktop/feed.io/docs/PRODUCTION_DEPLOYMENT_GUIDE.md) với các lệnh đăng nhập GHCR và triển khai zero-build trên VPS (`docker compose pull && up -d`) → Verify: File tài liệu có hướng dẫn rõ ràng từng bước.
- [x] Task 5: Kiểm tra xác thực tính hợp lệ của YAML, Docker Compose config và script môi trường → Verify: `docker compose config` exit 0, YAML parse thành công.

## Done When
- [x] GitHub Actions workflow sẵn sàng tự động build khi push vào `main`.
- [x] `compose.prod.yaml` chuyển sang mô hình pull image, không còn tiêu tốn CPU/RAM build trên VPS.
- [x] Tài liệu và script triển khai được cập nhật đồng bộ.
