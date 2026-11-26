import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "../client";
import { createQueryClient } from "../query-client";

describe("createQueryClient", () => {
  it("on a 401 tells the caller and drops every cached answer", async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    client.setQueryData(["private"], { secret: 1 });

    await client
      .fetchQuery({
        queryKey: ["other"],
        queryFn: () => Promise.reject(new UnauthorizedError()),
        retry: false,
      })
      .catch(() => undefined);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(client.getQueryData(["private"])).toBeUndefined();
  });

  it("keeps the cache on any other error", async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    client.setQueryData(["keep"], 1);

    await client
      .fetchQuery({ queryKey: ["other"], queryFn: () => Promise.reject(new Error("boom")), retry: false })
      .catch(() => undefined);

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(client.getQueryData(["keep"])).toBe(1);
  });
});
