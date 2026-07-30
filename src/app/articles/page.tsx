"use client";
import ArticleCard from '@/components/ArticleCard';
import SearchBox from '@/components/SearchBox';
import { useState, useEffect } from 'react';
import type { Article } from '@prisma/client';

export default function ArticlesPage() {
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [displayed, setDisplayed] = useState<Article[]>([]);
  const [query, setQuery] = useState<string>('');
  useEffect(() => {
    // Load articles on client mount
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        setAllArticles(data);
        setDisplayed(data);
      });
  }, []);
  const handleResults = (articles: Article[]) => {
    setDisplayed(articles.length ? articles : allArticles);
  };
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Articles</h1>
      <SearchBox onResults={handleResults} onQueryChange={setQuery} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map(article => (
          <ArticleCard key={article.id} article={article} query={query} />
        ))}
      </div>
    </main>
  );
}
