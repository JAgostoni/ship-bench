"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { articleSchema } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import TagSelect from '@/components/TagSelect';
import StatusToggle from '@/components/StatusToggle';
import dynamic from 'next/dynamic';

const ReactMDE = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface FormValues {
  title: string;
  content: string;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: { title: '', content: '', tags: [], status: 'DRAFT' },
  });

  const [loading, setLoading] = useState(true);
  const article = watch();

  useEffect(() => {
    async function fetchArticle() {
      const res = await fetch(`/api/articles/${params.id}`);
      if (!res.ok) {
        alert('Failed to load article');
        return;
      }
      const data = await res.json();
      setValue('title', data.title);
      setValue('content', data.content);
      setValue('tags', data.tags ?? []);
      setValue('status', data.status);
      setLoading(false);
    }
    fetchArticle();
  }, [params.id, setValue]);

  const onSubmit = async (data: FormValues) => {
    const res = await fetch(`/api/articles/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push(`/articles/${params.id}`);
    } else {
      const msg = await res.text();
      alert('Error: ' + msg);
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl mx-auto p-4">
      <div>
        <label className="block font-medium">Title</label>
        <input {...register('title')} className="mt-1 block w-full rounded border p-2" />
        {errors.title && <p className="text-red-600">{errors.title.message?.toString()}</p>}
      </div>
      <div>
        <label className="block font-medium">Content</label>
        <ReactMDE value={article.content} onChange={value => setValue('content', value || '')} />
        {errors.content && <p className="text-red-600">{errors.content.message?.toString()}</p>}
      </div>
      <div>
        <label className="block font-medium">Tags</label>
        <TagSelect selected={article.tags ?? []} onChange={tags => setValue('tags', tags)} />
      </div>
      <div className="flex items-center space-x-2">
        <label className="font-medium">Published</label>
        <StatusToggle status={article.status ?? 'DRAFT'} onChange={status => setValue('status', status)} />
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded border">Cancel</button>
      </div>
    </form>
  );
}
