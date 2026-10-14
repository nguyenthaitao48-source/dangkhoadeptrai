# KHOASMM.COM - HỆ THỐNG DỊCH VỤ MẠNG XÃ HỘI CHUYÊN NGHIỆP

Website cung cấp dịch vụ Mạng Xã Hội (SMM Panel) được thiết kế hiện đại, đầy đủ tính năng tương tự **BaoStar.net**, tối ưu hoàn toàn cho tên miền **khoasmm.com** của bạn!

---

## 🌟 TÍNH NĂNG NỔI BẬT ĐÃ HOÀN THIỆN

1. **Giao diện & Trải nghiệm chuẩn BaoStar**:
   - Tông màu mặc định **Vàng Kem (Warm Cream)** sang trọng, hỗ trợ chuyển đổi **Dark Mode (Chế độ ban đêm)** cực đẹp.
   - Thanh điều hướng đầy đủ các nền tảng: **TikTok, Facebook, Facebook VIP, Instagram, YouTube, Telegram, Twitter (X), Threads, Shopee, Google, Lazada**.
   - Bảng chọn Server/Gói chi tiết với huy hiệu: *new Nhanh, Nên dùng-Rất nhanh, Ổn định, Giá rẻ...*
   - Khung ghi chú máy chủ sinh động với các hàng màu pastel chuẩn BaoStar: *Link hợp lệ, Tài nguyên, Thời gian bắt đầu, Chính sách bảo hành, Hỗ trợ, Chống đè đơn, Tỉ lệ tụt*.

2. **Hệ thống Đặt Hàng & Tính Tiền Tự Động**:
   - Tự động nhân đơn giá theo số lượng tức thì.
   - Áp dụng chiết khấu cấp bậc (Ví dụ: Cấp **Cao cấp** được giảm 5%).
   - Tự động trừ tiền trong ví, ghi nhận vào **Nhật ký đơn hàng** và lưu trữ trên trình duyệt.

3. **Nạp Tiền Tự Động 24/7 (VietQR Banking & MoMo)**:
   - Tạo mã QR chuyển khoản ngân hàng động (VietQR) quét mã là nhận diện ngay số tài khoản, số tiền và cú pháp nạp `KHOASMM <username>`.
   - Có nút **"Xác nhận nạp thử"** để bạn bấm thử nghiệm cộng tiền ngay lập tức vào số dư ví.

4. **Quản Lý Đơn Hàng (Nhật ký đơn hàng)**:
   - Lọc đơn theo trạng thái: *Tất cả, Đang chạy, Đã hoàn thành, Chờ xử lý, Đã hủy*.
   - Tìm kiếm nhanh theo mã đơn (KHOA-XXXXXX) hoặc link bài viết.

5. **Kết Nối API Chuẩn SMM v2**:
   - Tích hợp sẵn endpoint `/api/v2` để liên kết với các website con, website đại lý hoặc bot tự động.

6. **Các Tiện Ích Nổi Bật Khác**:
   - Thanh nút liên hệ nổi bên phải: Cài đặt giao diện, Gia hạn nhanh, Telegram, Zalo, Facebook Fanpage.
   - Khung "Thông tin tài khoản" hiển thị chuẩn theo ảnh bạn gửi:
     - Tên: **Luong Dang Khoa**
     - Cấp bậc: **Cao cấp**
     - Số tiền hiện tại: **1,310 đ**
     - Tổng nạp: **133,059,931 đ**
     - Email: **khoaprono1@gmail.com**
     - Thanh tiến độ VIP: **[100%]**

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY TRÊN MÁY TÍNH CỦA BẠN

### Cách 1: Chạy trực tiếp với Node.js
Mở Terminal hoặc Command Prompt tại thư mục dự án và gõ:
```bash
node server.js
```
Sau đó mở trình duyệt truy cập:
👉 **http://localhost:3000**

### Cách 2: Mở trực tiếp không cần server
Bạn có thể nhấp đúp chuột trực tiếp vào file `index.html` trong thư mục để xem ngay trên trình duyệt (Chrome, Edge, Cốc Cốc...).

---

## 🌐 HƯỚNG DẪN TRỎ TÊN MIỀN `khoasmm.com` VỀ WEBSITE

Trong trang quản lý tên miền **khoasmm.com** (như trong ảnh bạn đã chụp), bạn vào mục **Cài đặt DNS** và thêm 2 bản ghi sau:

| Loại (Type) | Tên bản ghi (Host) | Giá trị (Value / Points to) |
|---|---|---|
| **A** | `@` | *IP máy chủ Hosting / VPS của bạn* |
| **CNAME** | `www` | `khoasmm.com` |

*Ghi chú: Nếu bạn dùng Hosting cPanel / DirectAdmin, chỉ cần nén toàn bộ thư mục này thành file `.zip` rồi tải lên thư mục `public_html` là website sẽ chạy ngay lập tức!*

---

## ⚙️ CÁCH CẤU HÌNH THÔNG TIN CÁ NHÂN & NGÂN HÀNG

Tất cả cấu hình được đặt rất rõ ràng trong file [`js/data.js`](file:///c:/WEb%20site%20d%E1%BB%8Bch%20v%E1%BB%A5%20mxh/js/data.js):

1. **Đổi thông tin ngân hàng nhận tiền:**
   Mở `js/data.js` tìm biến `BANK_CONFIG`:
   ```javascript
   const BANK_CONFIG = {
     bankName: "MBBank (Quân Đội)",
     bankCode: "MB",
     accountNumber: "0987654321", // Thay số tài khoản của bạn vào đây
     accountName: "LUONG DANG KHOA", // Thay tên chủ thẻ
     syntaxPrefix: "KHOASMM",
     ...
   };
   ```

2. **Thêm / Sửa giá các dịch vụ:**
   Trong biến `SERVICES_DATA` ở file `js/data.js`, bạn có thể tự do điều chỉnh giá từng gói, tên máy chủ, số lượng tối thiểu và tối đa theo ý muốn!
