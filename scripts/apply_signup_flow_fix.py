from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Use one exact production callback URL. The selected service and plan remain in
# Supabase user_metadata, so query parameters are unnecessary and may fail an
# exact Supabase redirect allow-list check.
replace_once(
    "assets/mock-backend.js",
    """      var callbackUrl=new URL('/app/auth-callback.html',location.origin);
      if(selected.has_plan){
        callbackUrl.searchParams.set('service',selected.service_code);
        callbackUrl.searchParams.set('plan',selected.plan_code);
        callbackUrl.searchParams.set('term',String(selected.billing_term_months));
      }
""",
    """      var callbackBase=String(C.APP_URL||location.origin).replace(/\\/+$/,'');
      var callbackUrl=new URL('/app/auth-callback.html',callbackBase);
""",
    "canonical signup callback",
)

# Make every landing-page package link explicit and consistent.
replace_once(
    "bizhealth.html",
    'href="app/signup.html?plan=BIZHEALTH_STANDARD"',
    'href="app/signup.html?service=BIZHEALTH&amp;plan=BIZHEALTH_STANDARD&amp;term=1"',
    "BizHealth Standard link",
)
replace_once(
    "bizhealth.html",
    'href="app/signup.html?plan=BIZHEALTH_PREMIUM"',
    'href="app/signup.html?service=BIZHEALTH&amp;plan=BIZHEALTH_PREMIUM&amp;term=1"',
    "BizHealth Premium link",
)
replace_once(
    "biz-os.html",
    'data-en="Sign up for BizOS Starter" data-vi="Đăng ký BizOS Starter" href="app/signup.html"',
    'data-en="Sign up for BizOS Starter" data-vi="Đăng ký BizOS Starter" href="app/signup.html?service=BIZOS&amp;plan=OS_LITE&amp;term=3"',
    "BizOS Starter link",
)
replace_once(
    "biz-os.html",
    'data-en="Request proposal" data-vi="Đăng ký BizOS Growth" href="#contact"',
    'data-en="Sign up for BizOS Growth" data-vi="Đăng ký BizOS Growth" href="app/signup.html?service=BIZOS&amp;plan=OS_STANDARD&amp;term=6"',
    "BizOS Growth link",
)
replace_once(
    "biz-os.html",
    'data-en="Sign up for BizOS Scale" data-vi="Đăng ký BizOS Scale" href="app/signup.html"',
    'data-en="Sign up for BizOS Scale" data-vi="Đăng ký BizOS Scale" href="app/signup.html?service=BIZOS&amp;plan=OS_PARTNER&amp;term=12"',
    "BizOS Scale link",
)

# Surface likely Supabase configuration failures instead of one generic error.
replace_once(
    "app/signup.html",
    """            } else if (
              errorText.indexOf(
                'rate'
              ) !== -1
            ) {
""",
    """            } else if (
              errorText.indexOf('redirect') !== -1 ||
              errorText.indexOf('not allowed') !== -1
            ) {
              showMessage(
                'error',
                'Liên kết xác thực email chưa được cấu hình đúng. Vui lòng thử lại sau hoặc liên hệ VCPC.'
              );
            } else if (
              errorText.indexOf('smtp') !== -1 ||
              errorText.indexOf('sending confirmation') !== -1 ||
              errorText.indexOf('send email') !== -1
            ) {
              showMessage(
                'error',
                'Hệ thống chưa gửi được email xác thực. Vui lòng thử lại sau hoặc liên hệ VCPC.'
              );
            } else if (
              errorText.indexOf(
                'rate'
              ) !== -1 ||
              errorText.indexOf('too many') !== -1
            ) {
""",
    "signup error mapping",
)

print("Signup flow fixes applied.")
