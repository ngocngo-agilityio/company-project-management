# Google sign-in on the Render address (S1-PREP-03)

How to let a second Google account through the consent screen on the Render address, and what to do
if Google refuses. Done when a second personal Google account gets past consent on the Render
address, or the Testing-mode steps below are in use.

The backend does not read the `GOOGLE_*` variables yet (sign-in arrives in S1-AUTH-01), so this
check stops at Google redirecting back to the callback address.

## Result

| Date | Outcome                       | Notes |
| ---- | ----------------------------- | ----- |
| TBD  | Pending: fill in after step 4 |       |

## 1. Add the redirect URI

Google Cloud → **APIs & Services → Credentials** → the OAuth client → **Authorized redirect URIs**.
Add the **backend** address (the backend serves the callback) and keep the local one:

```text
https://company-project-management-mmqg.onrender.com/auth/google/callback
http://localhost:3000/auth/google/callback
```

The URI must match character for character: `https`, host, and the trailing path. Google can take a
few minutes to apply the change.

## 2. Set `GOOGLE_REDIRECT_URI` on Render

In the backend service, **Environment**, set `GOOGLE_REDIRECT_URI` to the Render URI from step 1.
Keep the local value in `.env`. Never paste the client secret into the repository or this file.

## 3. Publish the consent screen

**APIs & Services → OAuth consent screen** (in newer consoles **Google Auth Platform → Audience**):

- User type **External**.
- Scopes: only `openid`, `email`, `profile`.
- **Branding → App domain**: Google will not enable **Publish app** without a homepage and a privacy policy link.
  Use the public pages served by the backend (merge and deploy first, then open both in a browser):
  - Application home page: `https://company-project-management-mmqg.onrender.com/about`
  - Application privacy policy link: `https://company-project-management-mmqg.onrender.com/privacy`
  - Leave Terms of service empty.
- No logo. A logo triggers brand verification, which needs a domain you own, and `onrender.com` is shared, so it
  cannot be verified. Add the logo when the project has its own domain.
- **Branding → Authorized domains**: add the Render backend host (`company-project-management-mmqg.onrender.com`).
  Google requires it because the OAuth client's redirect URI uses that domain. Also fill App name, User support email
  and Developer contact email (required, or **Publish app** stays disabled).
- Click **Publish app** (Testing → In production). Basic scopes do not need Google's review.

## 4. Try a second account

Use a second personal Google account that is not the owner of the Google Cloud project. In a private
window open this address, with your client ID in place of `<client-id>`:

```text
https://accounts.google.com/o/oauth2/v2/auth?client_id=<client-id>&redirect_uri=https%3A%2F%2Fcompany-project-management-mmqg.onrender.com%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=openid%20email%20profile
```

- **Passes:** Google asks for consent (it may show an "unverified app" notice), then goes to
  `.../auth/google/callback?code=...`. A 404 page there is expected until S1-AUTH-01. Record "passed" in the Result table.
- **Refused:** note the exact Google error (for example `redirect_uri_mismatch` or `access_denied`) in the Result table, fix a
  mismatch by re-checking step 1, and otherwise use the fallback below.

## Fallback: Testing mode

If Google refuses, keep the consent screen in **Testing** and add each person by hand:

1. **OAuth consent screen → Audience → Test users → Add users**.
2. Enter the person's Google email. At most 100 test users.
3. Only listed test users can sign in. Anyone else gets `access_denied`.
4. In Testing mode a refresh token **expires after 7 days**, so people sign in again each week.

Supabase Auth (its callback lives on `supabase.co`) is the next fallback, only if Testing mode is not enough
(more than 100 people, or the 7-day expiry is too disruptive). It conflicts with "no Supabase Auth" in
[docs/plan.md](../plan.md), so change the Plan and the Technical Stack first.

## Watch out

- The redirect URI must match character for character, including the trailing path.
- Do not commit the client secret or put real email addresses of test users in the repository.
- Logo and branding: later, with a custom domain.
