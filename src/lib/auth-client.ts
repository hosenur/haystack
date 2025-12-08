import { createClient } from "@openauthjs/openauth/client";

export const authClient = createClient({
  clientID: "haystack-web",
  issuer: "https://auth.hosenur.cloud",
});
