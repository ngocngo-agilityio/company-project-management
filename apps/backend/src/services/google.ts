import fastifyOauth2, { type OAuth2Namespace, type ProviderConfiguration } from "@fastify/oauth2";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { API_ROUTES } from "@board/shared";
import { z } from "zod";

/** Give up on Google's userinfo answer after this long. */
const USERINFO_TIMEOUT_MS = 10_000;

/** What we keep from Google. `emailVerified` must be true before the email is trusted. */
export interface GoogleProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | undefined;
  avatarUrl: string | undefined;
}

/** The Google part of sign-in. Tests replace it with a fake so no request reaches Google. */
export interface GoogleAuth {
  /** Adds `GET /auth/google` (redirect to Google). */
  register(app: FastifyInstance): Promise<void>;
  /** Checks `state`, trades the code for a token and reads the profile. Throws on any failure. */
  fetchProfile(request: FastifyRequest, reply: FastifyReply): Promise<GoogleProfile>;
}

const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const userinfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().min(1),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Secure cookies for the OAuth state (needed when the API is served over https). */
  secureCookies: boolean;
}

export function createGoogleAuth(config: GoogleConfig): GoogleAuth {
  let oauth: OAuth2Namespace | undefined;

  return {
    async register(app) {
      await app.register(fastifyOauth2, {
        name: "googleOAuth2",
        scope: ["openid", "email", "profile"],
        credentials: {
          client: { id: config.clientId, secret: config.clientSecret },
          // The typings declare this constant on the plugin's interface, not on the imported function.
          auth: (fastifyOauth2 as unknown as { GOOGLE_CONFIGURATION: ProviderConfiguration }).GOOGLE_CONFIGURATION,
        },
        startRedirectPath: API_ROUTES.GOOGLE_SIGN_IN,
        callbackUri: config.redirectUri,
        pkce: "S256",
        cookie: { secure: config.secureCookies },
      });
      oauth = (app as unknown as { googleOAuth2: OAuth2Namespace }).googleOAuth2;
    },

    async fetchProfile(request, reply) {
      if (!oauth) throw new Error("Google sign-in is not registered");
      const { token } = await oauth.getAccessTokenFromAuthorizationCodeFlow(request, reply);
      const res = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Google userinfo answered ${res.status}`);
      const info = userinfoSchema.parse(await res.json());
      return {
        id: info.sub,
        email: info.email,
        emailVerified: info.email_verified,
        name: info.name,
        avatarUrl: info.picture,
      };
    },
  };
}
