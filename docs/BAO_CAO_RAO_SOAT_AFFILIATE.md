# Báo cáo rà soát Affiliate VCPC — AFF-01 đến AFF-05

## Phạm vi đã kiểm tra

Nguồn 1: ZIP gốc `ChatGPT-VCPC_V1_UAT.zip`.

Nguồn 2: các trang public đang được phục vụ từ site Netlify liên kết với domain mới.

Không thể đọc chính xác file private trên GitHub hoặc file server-side chưa được publish như `netlify.toml`, migration và source Netlify Functions chỉ từ website public. Muốn diff 100% với GitHub mới nhất, cần cung cấp URL repository public hoặc tải ZIP mới nhất từ GitHub.

## Kết quả chính

### Thành phần đã có trong ZIP gốc

- Form đăng ký Affiliate tại `affiliate.html`.
- Function đăng ký `netlify/functions/affiliate-register.js` tạo hồ sơ `PENDING` và không tạo Auth user.
- Admin page gọi `admin-approve-affiliate`.
- Function Admin duyệt đã tạo Auth user, affiliate code, slug và mật khẩu tạm.
- Các bảng `affiliate_applications`, `affiliates`, `affiliate_referrals`, `affiliate_commissions` và RLS đã tồn tại.
- Route `/doitackinhdoanh/:slug` đã rewrite vào `app/affiliate.html`.

### Khoảng trống cần sửa

1. Chưa có trang đăng nhập riêng cho Affiliate.
2. Link “Cổng Đối tác” trỏ thẳng vào portal thay vì trang đăng nhập.
3. Portal HTML chứa sẵn mã và số liệu demo; không nên để dữ liệu mẫu trong HTML production.
4. Portal dùng generic auth guard nên có thể chuyển người dùng về login Dashboard thay vì login Affiliate.
5. Cờ `must_change_password` chỉ nằm trong `user_metadata`; đây không phải nơi phù hợp để làm cờ nghiệp vụ server-controlled.
6. Function duyệt cũ có thể đặt lại mật khẩu của một Auth user đã tồn tại cùng email, kể cả tài khoản khách hàng không phải Affiliate.
7. Chưa có Function riêng để kiểm tra PENDING/NOT_REGISTERED, đọc Affiliate hiện tại và hoàn tất đổi mật khẩu lần đầu.
8. Chưa bảo vệ đầy đủ việc Affiliate A nhập slug của Affiliate B ở lớp giao diện portal.

## File trong gói patch

### Tạo mới

- `app/affiliate-login.html`
- `netlify/functions/affiliate-status.js`
- `netlify/functions/affiliate-current.js`
- `netlify/functions/affiliate-complete-password.js`
- `supabase/migrations/202606250001_affiliate_auth_flow.sql`

### Thay thế

- `app/affiliate.html`
- `netlify/functions/admin-approve-affiliate.js`

### Chỉnh một phần, không thay cả file

- `affiliate.html`: đổi link Cổng Đối tác sang `/app/affiliate-login.html`.
- `netlify.toml`: chỉ thêm redirect mới vào cuối file mới nhất.
- `_redirects`: chỉ thêm hai dòng redirect trước rule 404.

## File không cần sửa trong patch này

- `assets/app-config.js`
- `assets/mock-backend.js`
- `assets/guards.js`
- `assets/app-core.js`
- `netlify/functions/affiliate-register.js`
- migration gốc `202606240001_vcpc_uat.sql`

Các file trên đã có đủ adapter và nghiệp vụ nền để patch hoạt động. Không nên thay chúng bằng bản ZIP cũ nếu GitHub mới nhất đã có thay đổi khác.

## Kiểm tra kỹ thuật đã thực hiện

Patch được chèn vào bản ZIP gốc và chạy:

```bash
npm run check
```

Kết quả:

- Static check: đạt.
- Business checks: đạt.
- Build `dist`: đạt.

Việc kiểm tra thực tế với Supabase UAT vẫn phải thực hiện sau khi chạy migration và deploy Functions.
