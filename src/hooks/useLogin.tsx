// hooks/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/lib/Api";

export const useLogin = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // Save tokens
      if (data.access) {
        localStorage.setItem("access", data.access);
      }
      if (data.refresh) {
        localStorage.setItem("refresh", data.refresh);
      }

      // Reload the page to refresh AuthContext state
      window.location.reload();
    },
    onError: (error: any) => {
      // Error handling is managed by the component
    }
  });
};
