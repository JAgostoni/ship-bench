import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArticles, getArticle, createArticle, updateArticle } from '@/lib/articles';

export function useArticles() {
  return useQuery(['articles'], getArticles);
}

export function useArticle(id: string) {
  return useQuery(['article', id], () => getArticle(id), { enabled: !!id });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation(createArticle, {
    onSuccess: () => queryClient.invalidateQueries(['articles']),
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation(({ id, data }: { id: string; data: any }) => updateArticle(id, data), {
    onSuccess: (_, { id }) => queryClient.invalidateQueries(['article', id]),
  });
}
