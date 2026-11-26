import { APP_NAME } from "@board/shared";

// Public pages Google asks for on the OAuth consent screen (homepage and privacy policy).
// Kept as strings so `tsc` builds them with the code; the build does not copy .html files.

const mailto = (email?: string): string =>
  email ? `<a href="mailto:${email}">${email}</a>` : "the person who invited you";
const contact = (email: string | undefined, prefix: string): string => (email ? `${prefix}${mailto(email)}.` : "");

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | ${APP_NAME}</title>
    <style>
      body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
      a { color: #4338ca; }
      nav { margin-bottom: 1.5rem; }
    </style>
  </head>
  <body>
    <nav><a href="/about">About</a> · <a href="/privacy">Privacy policy</a></nav>
    ${body}
  </body>
</html>
`;
}

/** `contactEmail` comes from the CONTACT_EMAIL variable. Without it the pages show no contact line. */
export function aboutPage(contactEmail?: string): string {
  return layout(
    "About",
    `<h1>${APP_NAME}</h1>
    <p>${APP_NAME} is an internal tool for managing company projects. Work is organised into projects, boards, lists and cards, so a team can see who does what, by when, and how far along it is.</p>
    <p>Access is by invitation only. People sign in with their Google account, and only invited people can enter.</p>
    <p>Read the <a href="/privacy">privacy policy</a>.${contact(contactEmail, " Questions: ")}</p>`,
  );
}

export function privacyPage(contactEmail?: string): string {
  return layout(
    "Privacy policy",
    `<h1>Privacy policy</h1>
    <p>This policy explains what ${APP_NAME} does with your data when you sign in with Google.</p>

    <h2>What we collect</h2>
    <p>When you sign in, Google tells us your name, email address and profile picture. We use them only to identify you inside ${APP_NAME}. We do not ask for any other Google data.</p>
    <p>We also store the content you create in the app, such as projects, cards and comments.</p>

    <h2>How we use it</h2>
    <p>Your data is used to sign you in, show your name to the people you work with, and check which projects you may open. We do not show ads, we do not send email, and we do not sell your data or share it with other companies.</p>

    <h2>Where it is stored</h2>
    <p>Data is stored in a PostgreSQL database hosted by Supabase and served by a service hosted on Render.</p>

    <h2>Your choices</h2>
    <p>To see, correct or delete your data, contact ${mailto(contactEmail)}. You can also remove ${APP_NAME}'s access from your Google account settings.</p>

    <h2>Contact</h2>
    <p>${mailto(contactEmail)}</p>`,
  );
}
