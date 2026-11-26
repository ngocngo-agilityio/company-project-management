import { WEB_ROUTES } from "@board/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ME_QUERY_KEY } from "../constants";
import { clearReturnTo, writeSessionHint } from "../utils";
import { logout } from "./client";

/**
 * Sign out. Only when the server confirms does the person leave (a failed request means the session is
 * still valid, so /login would send them straight back). `replace` keeps the private page out of Back history.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      writeSessionHint(false);
      clearReturnTo();
      queryClient.setQueryData(ME_QUERY_KEY, null);
      void navigate(WEB_ROUTES.LOGIN, { replace: true });
      queryClient.clear(); // nothing private stays in memory
    },
  });
}
