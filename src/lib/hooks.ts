import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArticles, getArticle, createArticle, updateArticle } from '@/lib/articles';

export function useArticles() {
  return useQuery<any>({ queryKey: ['articles'], queryFn: getArticles });
}

export function useArticle(id: string) {
  return useQuery<any>({ queryKey: ['article', id], queryFn: () => getArticle(id), enabled: !!id });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createArticle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['articles'] }),
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => updateArticle(id, data),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['article', id] }),
  });
}
