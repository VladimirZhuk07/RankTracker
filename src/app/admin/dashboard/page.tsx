import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    return (
        <AdminDashboardClient />
    );
}
