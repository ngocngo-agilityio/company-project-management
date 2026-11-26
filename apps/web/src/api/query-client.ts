import { QueryCache, QueryClient } from "@tanstack/react-query";
import { UnauthorizedError } from "./client";

/**
 * The app's query client. When any query fails with 401 the cached data belongs to nobody any more:
 * drop it all, then let the caller send the person to sign-in.
 */
export function createQueryClient(onUnauthorized: () => void): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (!(error instanceof UnauthorizedError)) return;
        onUnauthorized();
        client.clear();
      },
    }),
  });
  return client;
}
