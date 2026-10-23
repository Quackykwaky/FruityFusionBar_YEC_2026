import { redirect } from 'next/navigation';
import { getAdminSessionFromCookies } from '@/lib/session';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Staff Dashboard • Fruity Fusion Bar',
  description: 'Manage student loyalty stamps and free drink rewards.',
};

export default async function AdminPage() {
  const session = await getAdminSessionFromCookies();

  if (!session) {
    redirect('/admin/login');
  }

  return <AdminDashboardClient />;
}
