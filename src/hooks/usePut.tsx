// hooks/usePut.ts
import { putData } from '@/lib/Api';
import { useMutation } from '@tanstack/react-query';

export const usePut = (options = {}) => {
  return useMutation({
    mutationFn: ({ url, data }: { url: string; data: any }) => putData({ url, data }),
    ...options,
  });
};
