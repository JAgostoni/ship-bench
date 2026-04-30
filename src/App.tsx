import { createBrowserRouter, Outlet } from 'react-router-dom';
import AppShell from './components/AppShell';
import Home from './routes/Home';
import ArticleDetail from './routes/ArticleDetail';
import ArticleEdit from './routes/ArticleEdit';

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'articles/new', element: <ArticleEdit /> },
      { path: 'articles/:slug', element: <ArticleDetail /> },
      { path: 'articles/:slug/edit', element: <ArticleEdit /> },
    ],
  },
]);
