# Hướng dẫn từng bước sửa luồng Affiliate AFF-01 đến AFF-05

Tài liệu này dành cho người không biết code. Làm đúng thứ tự, không thay toàn bộ `netlify.toml` bằng bản trong ZIP cũ.

## A. Chuẩn bị an toàn

1. Mở GitHub repository đang kết nối với Netlify.
2. Bấm nút chọn branch đang ghi `main`.
3. Nhập tên branch mới:

   `fix-affiliate-login`

4. Chọn **Create branch: fix-affiliate-login from main**.
5. Kiểm tra góc trên repository đang hiển thị branch `fix-affiliate-login`.
6. Không chỉnh trực tiếp branch `main` trong quá trình này.

## B. Upload các file mới và file thay thế

Giải nén file patch. Trong GitHub, thực hiện từng file theo đúng đường dẫn.

### 1. Tạo trang đăng nhập Affiliate

1. Mở thư mục `app` trên GitHub.
2. Chọn **Add file → Upload files**.
3. Upload file patch:

   `app/affiliate-login.html`

4. Commit vào branch `fix-affiliate-login`.

### 2. Thay portal Affiliate

1. Mở file hiện tại:

   `app/affiliate.html`

2. Bấm biểu tượng thùng rác hoặc xóa nội dung cũ bằng Edit.
3. Upload/thay bằng file patch cùng tên:

   `app/affiliate.html`

4. File mới không còn mã demo `VCPC-DEMO-A7K` và không còn số liệu demo tĩnh.

### 3. Upload ba Netlify Functions mới

Mở thư mục:

`netlify/functions`

Upload ba file:

- `affiliate-status.js`
- `affiliate-current.js`
- `affiliate-complete-password.js`

### 4. Thay Function Admin duyệt Affiliate

Trong `netlify/functions`, thay file:

`admin-approve-affiliate.js`

bằng file cùng tên trong patch.

Không sửa hoặc đưa `SUPABASE_SERVICE_ROLE_KEY` vào file này. Secret key vẫn chỉ nằm trong Netlify Environment Variables.

### 5. Upload migration SQL mới lên GitHub

Mở:

`supabase/migrations`

Upload:

`202606250001_affiliate_auth_flow.sql`

Lưu ý: upload lên GitHub chưa tự chạy SQL. Phần D dưới đây sẽ chạy migration trong Supabase.

## C. Chỉnh hai file hiện tại, không thay toàn bộ

### 1. Sửa link Cổng Đối tác trong `affiliate.html`

1. Mở file ở thư mục gốc:

   `affiliate.html`

2. Bấm Edit.
3. Dùng `Command + F` trên Mac, tìm:

   `href="app/affiliate.html"`

4. Thay đúng phần đó bằng:

   `href="/app/affiliate-login.html"`

5. Không thay toàn bộ file vì wording trên GitHub có thể mới hơn ZIP gốc.
6. Commit thay đổi.

### 2. Thêm redirect vào `netlify.toml`

1. Mở file `netlify.toml` mới nhất trên GitHub.
2. Cuộn xuống cuối file.
3. Kiểm tra đã có route `/doitackinhdoanh/:slug`; giữ nguyên route đó.
4. Dán thêm cuối file:

```toml
[[redirects]]
  from = "/app/affiliate"
  to = "/app/affiliate-login.html"
  status = 302
  force = true

[[redirects]]
  from = "/app/affiliate/"
  to = "/app/affiliate-login.html"
  status = 302
  force = true
```

5. Không xóa các header, domain redirect hoặc cấu hình mới đã thêm trước đó.
6. Commit thay đổi.

### 3. Cập nhật `_redirects` nếu file này vẫn tồn tại

1. Mở `_redirects` ở thư mục gốc.
2. Tìm dòng cuối:

   `/*                                 /404.html                                404`

3. Chèn hai dòng sau ngay phía trên dòng 404:

```text
/app/affiliate                    /app/affiliate-login.html                 302!
/app/affiliate/                   /app/affiliate-login.html                 302!
```

4. Giữ nguyên dòng:

```text
/doitackinhdoanh/*                 /app/affiliate.html?slug=:splat         200
```

## D. Chạy migration trong Supabase

### 1. Sao lưu trước

1. Đăng nhập Supabase.
2. Chọn project VCPC.
3. Vào **Table Editor → affiliates**.
4. Chụp màn hình hoặc export dữ liệu hiện có nếu đã có Affiliate test.

### 2. Chạy SQL

1. Vào **SQL Editor**.
2. Chọn **New query**.
3. Mở file patch:

   `supabase/migrations/202606250001_affiliate_auth_flow.sql`

4. Copy toàn bộ nội dung và dán vào SQL Editor.
5. Bấm **Run**.
6. Kết quả phải không có lỗi màu đỏ.

Migration thêm ba cột:

- `must_change_password`
- `temporary_password_issued_at`
- `password_changed_at`

### 3. Kiểm tra cột

Vào **Table Editor → affiliates** và kiểm tra ba cột trên đã xuất hiện.

## E. Kiểm tra cấu hình domain Supabase

Vào:

**Authentication → URL Configuration**

Kiểm tra:

- Site URL: `https://vietcapitalpartner.com`
- Redirect URL có:
  - `https://vietcapitalpartner.com/app/auth-callback.html`
  - `https://vietcapitalpartner.com/app/reset-password.html`

Luồng Affiliate AFF-01 đến AFF-05 dùng email/mật khẩu tạm, nên không cần email callback riêng cho `affiliate-login.html`.

## F. Kiểm tra Netlify Environment Variables

Vào Netlify:

**Project configuration → Environment variables**

Phải có:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL=https://vietcapitalpartner.com`

Không dán service role key vào GitHub.

## G. Merge và deploy một lần

1. Trên GitHub, mở tab **Pull requests**.
2. Chọn **New pull request**.
3. Base: `main`.
4. Compare: `fix-affiliate-login`.
5. Kiểm tra danh sách file thay đổi.
6. Bấm **Create pull request**.
7. Bấm **Merge pull request**.
8. Netlify sẽ build một lần sau khi merge.
9. Trong Netlify → Deploys, đợi trạng thái **Published**.
10. Nếu cần, chọn **Clear cache and deploy site** một lần.

## H. Test AFF-01 đến AFF-05

Luôn test bằng Chrome ẩn danh và email test mới.

### AFF-01 — Đăng ký

1. Mở `https://vietcapitalpartner.com/affiliate.html` hoặc trang đối tác hiện tại.
2. Điền form đăng ký Affiliate.
3. Bấm gửi.
4. Supabase → Table Editor → `affiliate_applications`:
   - Có đúng một dòng.
   - `status = PENDING`.
5. Supabase → Authentication → Users:
   - Chưa có Auth user mới cho email này.
6. Bảng `affiliates`:
   - Chưa có affiliate row.

### AFF-02 — PENDING thử đăng nhập

1. Bấm **Cổng Đối tác**.
2. URL phải về:

   `https://vietcapitalpartner.com/app/affiliate-login.html`

3. Nhập email đang PENDING và một mật khẩu bất kỳ.
4. Phải hiện:

   `Hồ sơ đối tác của bạn đang chờ VCPC phê duyệt...`

5. Không được vào `/doitackinhdoanh/<slug>`.

### AFF-03 — Admin duyệt

1. Đăng nhập Admin.
2. Mở trang Affiliate Admin.
3. Bấm **Duyệt** hồ sơ PENDING.
4. Hệ thống hiển thị một lần:
   - Email đăng nhập.
   - Mật khẩu tạm.
   - Portal URL.
5. Lưu mật khẩu tạm ở nơi an toàn để test; không lưu vào Supabase table.
6. Supabase kiểm tra:
   - Authentication có user mới.
   - `platform_user_roles.role = affiliate`.
   - `affiliates.status = ACTIVE`.
   - Có `code`, `slug`.
   - `must_change_password = true`.

Nếu báo `EMAIL_ALREADY_USED_BY_NON_AFFILIATE_ACCOUNT`, email này đã thuộc một tài khoản khác. Dùng email Affiliate riêng; patch cố ý không đặt lại mật khẩu của tài khoản khách hàng/admin hiện có.

### AFF-04 — Đăng nhập bằng mật khẩu tạm

1. Mở cửa sổ ẩn danh mới.
2. Vào `/app/affiliate-login.html`.
3. Nhập email và mật khẩu tạm.
4. Không được vào Portal ngay.
5. Trang phải hiện hai ô:
   - Mật khẩu mới.
   - Xác nhận mật khẩu mới.
6. Thử mật khẩu yếu và hai mật khẩu không khớp; hệ thống phải báo lỗi.

### AFF-05 — Đổi mật khẩu

1. Nhập mật khẩu mạnh ít nhất 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
2. Xác nhận giống nhau.
3. Bấm **Đổi mật khẩu và vào Portal**.
4. URL phải vào:

   `/doitackinhdoanh/<slug>`

5. Supabase → `affiliates`:
   - `must_change_password = false`.
   - `password_changed_at` có giá trị.
6. Đăng xuất.
7. Thử mật khẩu tạm: phải thất bại.
8. Thử mật khẩu mới: phải vào đúng Portal.

## I. Test bảo mật slug

1. Đăng nhập Affiliate A.
2. Thay slug trên URL bằng slug của Affiliate B hoặc chuỗi bất kỳ.
3. Hệ thống không được hiển thị dữ liệu của B.
4. Patch sẽ chuyển A về portal slug đúng của A.

## J. Rollback nếu deploy lỗi

1. Netlify → Deploys.
2. Chọn deploy ổn định trước đó.
3. Chọn **Publish deploy** để rollback frontend/functions.
4. Ba cột SQL mới có thể giữ nguyên; code cũ sẽ bỏ qua chúng.
5. Không xóa Auth user thật nếu chưa xác định đúng user test.
