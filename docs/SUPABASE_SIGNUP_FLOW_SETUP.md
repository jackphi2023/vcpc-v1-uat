# Supabase setup — VCPC customer signup flow

## 1. Authentication settings

In **Supabase Dashboard → Authentication → Providers → Email**:

- Enable Email provider.
- Enable **Confirm email**.
- Do not enable automatic sign-in before email confirmation.
- Keep secure password rules appropriate for production.

Expected behavior after `POST /auth/v1/signup`:

- A new unconfirmed user is created.
- No access token/session is returned before confirmation.
- Supabase sends the confirmation email.
- The confirmation link redirects to `/app/auth-callback.html`.

## 2. URL configuration

In **Authentication → URL Configuration**:

- Site URL: `https://vietcapitalpartner.com`
- Add Redirect URLs:
  - `https://vietcapitalpartner.com/app/auth-callback.html`
  - `https://www.vietcapitalpartner.com/app/auth-callback.html`
  - `https://vcpc-v1-uat.netlify.app/app/auth-callback.html`

Do not use a double slash such as `//app/auth-callback.html`.

## 3. Custom SMTP — Mat Bao

In **Authentication → SMTP Settings**, enable Custom SMTP and enter the exact SMTP information supplied by Mat Bao for the mailbox:

- Sender email: `partner@vietcapitalpartners.com`
- Sender name: `Viet Capital Partners & Consulting`
- SMTP host: use the host shown in the Mat Bao mail control panel
- Port: use Mat Bao's documented TLS/SSL port
- Username: normally the full mailbox `partner@vietcapitalpartners.com`
- Password: mailbox/app password from Mat Bao

Do not put the SMTP password, Supabase service-role key, or any mail credential in GitHub/front-end JavaScript.

Send a test email from Supabase after saving. If the test fails, inspect:

- Supabase Authentication logs
- SMTP authentication/relay error
- SPF, DKIM and DMARC records for `vietcapitalpartners.com`
- Mat Bao outbound-mail restrictions and mailbox password

## 4. Email template

In **Authentication → Email Templates → Confirm signup**:

- From address is controlled by Custom SMTP.
- Confirmation button/link must use Supabase's `{{ .ConfirmationURL }}` variable.
- The redirect target is provided by the signup request and must be allowed in Redirect URLs.

Do not hard-code an access token into the template.

## 5. Required database behavior

`vcpc_complete_signup` must only be called by an authenticated, email-confirmed user from the onboarding submit action.

The function should be idempotent:

- Reusing the same authenticated user must not create duplicate organizations/memberships/engagements.
- Validate the service/plan/term combination server-side.
- Create or return the user's organization.
- Create or return the matching draft engagement.
- Return `organization_id` and `engagement_id`.
- Use `auth.uid()`; never trust a user ID supplied by the browser.

The email callback must not call this function. It only creates the authenticated browser session and redirects to onboarding.

## 6. Diagnostics added by this branch

Browser diagnostics are retained locally for the latest 30 events:

- `vcpc.signup.diagnostics.v1`
- `vcpc.auth.diagnostics.v1`
- `vcpc.onboarding.diagnostics.v1`

They are also written to the browser console. These logs do not contain the user's password or SMTP credentials.

For server-side email delivery failures, Supabase Authentication logs remain the source of truth because the browser cannot see the internal SMTP response after Supabase accepts the request.

## 7. UAT cases

1. Select every BizHealth/BizOS plan and verify signup displays the same plan.
2. Submit missing fields and verify the exact field error.
3. Submit an invalid email.
4. Submit mismatched passwords.
5. Submit an existing email and verify the login instruction.
6. Confirm no login is possible before email confirmation.
7. Open the confirmation link and verify direct redirect to onboarding without a login page.
8. Verify the selected service remains preselected.
9. Close onboarding before submit, sign in again, and verify no partial organization form data was saved.
10. Submit onboarding and verify only one organization/member/engagement is created.
11. Repeat callback/onboarding URLs and verify no duplicate records.
12. Test production domain, `www`, and Netlify UAT separately.
