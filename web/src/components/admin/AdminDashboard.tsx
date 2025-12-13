import { Link } from 'react-router-dom';
import { 
  Users, 
  Crown, 
  UserCheck, 
  Activity, 
  MessageSquare, 
  MessagesSquare,
  GraduationCap,
  Gamepad2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useAdminStats } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

function StatCard({ title, value, icon, color, description }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-brown-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{value}</p>
          {description && (
            <p className="text-xs text-brown-400 dark:text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useAdminStats();
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
            <p className="text-brown-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brown-800 dark:text-white mb-2">Error Loading Dashboard</h2>
            <p className="text-brown-600 dark:text-gray-400">{error.message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">
              Dashboard
            </h1>
            <p className="text-brown-600 dark:text-gray-400">
              Overview of HåfaGPT platform
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Users className="w-4 h-4" />
            Manage Users
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {/* User Stats */}
        <div>
          <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">
            Users
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={<Users className="w-5 h-5 text-blue-600" />}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              title="Premium Users"
              value={stats?.premium_users || 0}
              icon={<Crown className="w-5 h-5 text-amber-600" />}
              color="bg-amber-100 dark:bg-amber-900/30"
              description={`${stats?.total_users ? Math.round((stats.premium_users / stats.total_users) * 100) : 0}% of total`}
            />
            <StatCard
              title="Free Users"
              value={stats?.free_users || 0}
              icon={<UserCheck className="w-5 h-5 text-green-600" />}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              title="Active Today"
              value={stats?.active_today || 0}
              icon={<Activity className="w-5 h-5 text-purple-600" />}
              color="bg-purple-100 dark:bg-purple-900/30"
            />
          </div>
        </div>
        
        {/* Activity Stats */}
        <div>
          <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">
            Platform Activity
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Conversations"
              value={stats?.total_conversations?.toLocaleString() || 0}
              icon={<MessagesSquare className="w-5 h-5 text-coral-600 dark:text-ocean-400" />}
              color="bg-coral-100 dark:bg-ocean-900/30"
            />
            <StatCard
              title="Messages"
              value={stats?.total_messages?.toLocaleString() || 0}
              icon={<MessageSquare className="w-5 h-5 text-teal-600" />}
              color="bg-teal-100 dark:bg-teal-900/30"
            />
            <StatCard
              title="Quiz Attempts"
              value={stats?.total_quiz_attempts?.toLocaleString() || 0}
              icon={<GraduationCap className="w-5 h-5 text-indigo-600" />}
              color="bg-indigo-100 dark:bg-indigo-900/30"
            />
            <StatCard
              title="Games Played"
              value={stats?.total_game_plays?.toLocaleString() || 0}
              icon={<Gamepad2 className="w-5 h-5 text-pink-600" />}
              color="bg-pink-100 dark:bg-pink-900/30"
            />
          </div>
        </div>
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 transition-colors group"
            >
              <div className="p-3 bg-coral-100 dark:bg-ocean-900/30 rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">View All Users</h3>
                <p className="text-sm text-brown-500 dark:text-gray-400">Manage user accounts</p>
              </div>
            </Link>
            
            <Link
              to="/admin/users?filter=premium"
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 transition-colors group"
            >
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl group-hover:scale-105 transition-transform">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">Premium Users</h3>
                <p className="text-sm text-brown-500 dark:text-gray-400">{stats?.premium_users || 0} subscribers</p>
              </div>
            </Link>
            
            <Link
              to="/admin/settings"
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 transition-colors group"
            >
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-105 transition-transform">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">Settings</h3>
                <p className="text-sm text-brown-500 dark:text-gray-400">Promo & theme settings</p>
              </div>
            </Link>
            
            <Link
              to="/"
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-colors group"
            >
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">View App</h3>
                <p className="text-sm text-brown-500 dark:text-gray-400">Go to main application</p>
              </div>
            </Link>
          </div>
        </div>
        
        {/* Whitelisted Info */}
        {stats?.whitelisted_users && stats.whitelisted_users > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-purple-800 dark:text-purple-300">
                  {stats.whitelisted_users} Whitelisted User{stats.whitelisted_users > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Friends & Family with free premium access
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;

