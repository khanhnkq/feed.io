# Hướng Dẫn Tích Hợp Các Server Mail Miễn Phí Cho Feedi (External Free SMTP Guide)

Tài liệu này hướng dẫn cách cấu hình và tích hợp các dịch vụ gửi email giao dịch (Transactional Email) bên ngoài **hoàn toàn miễn phí** cho **Feedi** (như kích hoạt tài khoản, đặt lại mật khẩu, gửi lời mời tham gia Workspace, thông báo review và cảnh báo hết hạn gói lưu trữ).

Feedi sử dụng chuẩn giao thức SMTP bất đồng bộ (`aiosmtplib`), hỗ trợ đầy đủ xác thực (Username/Password), STARTTLS (cổng 587) và SSL/TLS trực tiếp (cổng 465). Bạn **không cần cài đặt thêm bất kỳ SDK nào**, chỉ cần cập nhật biến môi trường trong file `.env`.

---

## 1. Bảng So Sánh Các Dịch Vụ Mail Server Miễn Phí Tốt Nhất

| Nhà cung cấp | Giới hạn Free Tier | Cổng & Giao thức | Ưu điểm nổi bật | Phù hợp nhất cho |
| :--- | :--- | :--- | :--- | :--- |
| **Resend** *(Khuyên dùng #1)* | **3.000 emails/tháng** (100 emails/ngày) | Port **465** (TLS) hoặc **587** (STARTTLS) | Tỷ lệ vào Inbox cực cao, giao diện hiện đại, setup DNS DKIM/SPF trong 2 phút. | Dự án cá nhân, agency vừa & nhỏ, studio có tên miền riêng. |
| **Brevo** *(Sendinblue - Khuyên dùng #2)* | **300 emails/ngày** (~**9.000 emails/tháng**) | Port **587** (STARTTLS) | Hạn mức ngày hào phóng nhất, không bắt buộc add thẻ visa, gửi ổn định. | Team có nhu cầu gửi nhiều email mời thành viên/khách hàng mỗi ngày. |
| **Gmail SMTP** *(Khuyên dùng #3)* | **500 emails/ngày** (Personal) / **2.000/ngày** (Workspace) | Port **587** (STARTTLS) hoặc **465** (TLS) | Dùng ngay tài khoản Gmail hiện có, **không cần đăng ký dịch vụ mới**. | Test nhanh, demo sản phẩm, nội bộ agency dùng Google Workspace. |
| **SendGrid** | **100 emails/ngày** (~3.000/tháng) | Port **587** (STARTTLS) | Nền tảng lâu đời của Twilio, độ uy tín IP cao. | Các hệ thống đã có tài khoản Twilio/SendGrid. |
| **Mailersend** | **3.000 emails/tháng** | Port **587** (STARTTLS) | Giao diện quản lý dễ dùng, thống kê deliverability chi tiết. | Backup hoặc giải pháp thay thế. |

---

## 2. Hướng Dẫn Cấu Hình Từng Dịch Vụ

### 2.1. Cấu hình Resend (Miễn phí 3.000 emails/tháng)
1. Đăng ký tài khoản miễn phí tại [resend.com](https://resend.com).
2. Thêm domain của bạn tại mục **Domains** và cập nhật các bản ghi DNS (DKIM, SPF, MX) theo hướng dẫn của Resend.
   *(Lưu ý: Nếu chưa có domain riêng để test, bạn có thể dùng địa chỉ gửi `onboarding@resend.dev` để gửi đến chính email đăng ký tài khoản Resend).*
3. Vào **API Keys** -> Tạo một API Key mới (ví dụ: `feedi-smtp`), sao chép key có dạng `re_123456789...`.
4. Cập nhật file `.env`:
```env
FEEDIO_SMTP_HOST=smtp.resend.com
FEEDIO_SMTP_PORT=465
FEEDIO_SMTP_USER=resend
FEEDIO_SMTP_PASS=re_your_actual_api_key_here
FEEDIO_SMTP_USE_TLS=true
FEEDIO_SMTP_START_TLS=false
FEEDIO_SMTP_SENDER="Feedi <notifications@yourdomain.com>"
```

---

### 2.2. Cấu hình Brevo / Sendinblue (Miễn phí 300 emails/ngày = 9.000 emails/tháng)
1. Đăng ký tài khoản tại [brevo.com](https://www.brevo.com).
2. Vào **Account Profile (Góc trên phải)** -> Chọn **SMTP & API**.
3. Tại tab **SMTP**, sao chép thông tin:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** Email đăng ký tài khoản Brevo của bạn.
4. Bấm **Generate a new master SMTP key** -> Đặt tên (ví dụ: `feedi-prod`) và sao chép Master Key sinh ra.
5. Cập nhật file `.env`:
```env
FEEDIO_SMTP_HOST=smtp-relay.brevo.com
FEEDIO_SMTP_PORT=587
FEEDIO_SMTP_USER=your_email@domain.com
FEEDIO_SMTP_PASS=xsmtpsib-your_master_key_here
FEEDIO_SMTP_START_TLS=true
FEEDIO_SMTP_USE_TLS=false
FEEDIO_SMTP_SENDER="Feedi <your_verified_email@domain.com>"
```

---

### 2.3. Cấu hình Gmail SMTP (Miễn phí 500 emails/ngày - Dùng ngay không cần đăng ký tài khoản mới)
1. Đăng nhập vào tài khoản Google của bạn tại [myaccount.google.com](https://myaccount.google.com).
2. Vào mục **Bảo mật (Security)**:
   - Đảm bảo đã bật **Xác minh 2 bước (2-Step Verification)**.
   - Tìm mục **Mật khẩu ứng dụng (App Passwords)** (hoặc tìm kiếm "App Passwords" trên thanh tìm kiếm của Google Account).
3. Đặt tên ứng dụng là `Feedi` -> Nhấn **Tạo (Generate)**.
4. Google sẽ cấp cho bạn một mật khẩu gồm 16 ký tự (ví dụ: `abcd efgh ijkl mnop`).
5. Cập nhật file `.env`:
```env
FEEDIO_SMTP_HOST=smtp.gmail.com
FEEDIO_SMTP_PORT=587
FEEDIO_SMTP_USER=your_email@gmail.com
FEEDIO_SMTP_PASS=abcdefghijklmnop
FEEDIO_SMTP_START_TLS=true
FEEDIO_SMTP_USE_TLS=false
FEEDIO_SMTP_SENDER="Feedi Studio <your_email@gmail.com>"
```

---

### 2.4. Cấu hình SendGrid (Miễn phí 100 emails/ngày vĩnh viễn)
1. Đăng ký tài khoản tại [sendgrid.com](https://sendgrid.com).
2. Vào **Settings** -> **API Keys** -> Tạo API Key với quyền **Full Access** hoặc **Mail Send**.
3. Cập nhật file `.env`:
```env
FEEDIO_SMTP_HOST=smtp.sendgrid.net
FEEDIO_SMTP_PORT=587
FEEDIO_SMTP_USER=apikey
FEEDIO_SMTP_PASS=SG.your_sendgrid_api_key_here
FEEDIO_SMTP_START_TLS=true
FEEDIO_SMTP_USE_TLS=false
FEEDIO_SMTP_SENDER="Feedi <verified_sender@domain.com>"
```

---

### 2.5. Cấu hình Mailpit (Local Development - Mặc định)
Khi chạy Feedi ở chế độ local development, hệ thống sử dụng Mailpit chạy trong Docker container, bắt toàn bộ email mà không gửi ra Internet:
```env
FEEDIO_SMTP_HOST=localhost
FEEDIO_SMTP_PORT=1025
FEEDIO_SMTP_USER=
FEEDIO_SMTP_PASS=
FEEDIO_SMTP_START_TLS=false
FEEDIO_SMTP_USE_TLS=false
FEEDIO_SMTP_SENDER="Feedi <no-reply@feedi.local>"
```
*Truy cập giao diện đọc email Mailpit tại: [http://localhost:8025](http://localhost:8025)*.

---

## 3. Kiểm Tra Kết Nối & Test Gửi Mail Ngay Lập Tức

Feedi tích hợp sẵn công cụ chẩn đoán SMTP tự động. Sau khi bạn điền cấu hình vào `.env`, hãy chạy lệnh sau từ thư mục gốc dự án:

```bash
# Gửi thử 1 email kiểm tra đến địa chỉ của bạn
make test-email recipient=your_email@example.com
```

Hoặc chạy trực tiếp bằng Python:
```bash
python scripts/test_email_delivery.py your_email@example.com
```

### Kết quả hiển thị thành công mẫu:
```text
=================================================================
 Feedi SMTP Configuration Diagnostic
=================================================================
  SMTP Host     : smtp.resend.com
  SMTP Port     : 465
  Encryption    : Direct TLS / SSL (use_tls=True)
  Sender (From) : Feedi <notifications@yourdomain.com>
  Username      : resend
  Password      : re...3f (18 chars)
  Recipient (To): your_email@example.com
=================================================================
--> Connecting to SMTP server and dispatching test message...

[OK] SUCCESS: Test email successfully sent to <your_email@example.com> in 312ms!
```

---

## 4. Xử Lý Các Lỗi Thường Gặp (Troubleshooting)

1. **`535 Authentication Credentials Invalid` / `Username and Password not accepted`**:
   - **Gmail:** Bạn đang nhập mật khẩu tài khoản Gmail thông thường thay vì **16 ký tự App Password**. Google cấm đăng nhập SMTP bằng mật khẩu chính.
   - **Resend:** Username bắt buộc là `resend`, mật khẩu là API Key bắt đầu bằng `re_`.
   - **SendGrid:** Username bắt buộc là `apikey`, mật khẩu là API Key bắt đầu bằng `SG.`.

2. **`550 From address not verified` / `Sender rejected`**:
   - Nhà cung cấp (như Resend, Brevo, SendGrid) yêu cầu địa chỉ trong `FEEDIO_SMTP_SENDER` phải thuộc domain đã được xác minh DNS (DKIM/SPF) trên trang quản trị của họ.

3. **`Connection refused` hoặc `Timeout` khi kết nối cổng 587/465**:
   - Một số nhà mạng hoặc nhà cung cấp VPS giá rẻ (như DigitalOcean, Linode) mặc định chặn cổng ra `25/587` để chống spam. Nếu cổng `587` bị timeout, hãy đổi sang cổng **`465`** với `FEEDIO_SMTP_USE_TLS=true` (cổng SSL thường không bị chặn).
