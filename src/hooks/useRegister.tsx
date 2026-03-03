import { useMutation } from "@tanstack/react-query";
import { registerUser, RegisterUserData } from "@/lib/Api";

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: RegisterUserData) => registerUser(data),
    onSuccess: () => {
      // Redirect to login page after successful registration
      window.location.href = '/login';
    },
    onError: (error: any) => {
      // Error handling is managed by the component
      console.error('Registration error:', error);
    }
  });
};
