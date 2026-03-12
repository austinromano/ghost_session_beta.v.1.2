import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function getPageTitle(pathname: string): string {
  if (pathname === '/projects') return 'Projects';
  if (pathname.startsWith('/projects/')) return 'Project';
  if (pathname === '/settings') return 'Settings';
  return 'Ghost Session';
}

export default function AppShell() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
