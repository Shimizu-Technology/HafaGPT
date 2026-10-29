import { Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Activity, 
  MessageSquare, 
  GraduationCap,
  Gamepad2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Settings,
  BarChart3,
  Target,
  BookOpen,
  Trophy,
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarRange,
  HelpCircle,
  BookOpen as BookOpenIcon
} from 'lucide-react';
import { useAdminStats, useAdminActivity } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

interface StatComparison {
  current: number;
  previous: number;
  change: number;
  change_percent: number | null;
}

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  comparison?: StatComparison | null;
  comparisonLabel?: string;
}

function StatCard({ title, value, description, comparison, comparisonLabel = 'previous 7 days' }: StatCardProps) {
  const getComparisonContent = () => {
    if (!comparison) return null;
    
    const { change, previous } = comparison;
    const displayValue = `${change > 0 ? '+' : ''}${change} vs ${comparisonLabel}`;
    return { displayValue: previous === 0 && change === 0 ? `0 vs ${comparisonLabel}` : displayValue };
  };
  
  const comparisonData = getComparisonContent();
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-brown-600 dark:text-slate-300">{title}</p>
          <p className="text-2xl font-bold tabular-nums text-brown-800 dark:text-white">{value}</p>
          {description && (
            <p className="text-xs text-brown-600 dark:text-slate-300 mt-0.5">{description}</p>
          )}
          {comparisonData && (
            <p className="mt-1 text-xs font-medium tabular-nums text-brown-600 dark:text-slate-300">
              <span>{comparisonData.displayValue}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useAdminStats();
  const { data: activityData } = useAdminActivity(10);
  
  // Helper to format relative time
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };
  
  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-coral-500" />;
      case 'quiz':
        return <GraduationCap className="w-4 h-4 text-teal-500" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-teal-500" />;
      case 'lesson':
        return <BookOpenIcon className="w-4 h-4 text-emerald-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };
  
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
            className="pressable inline-flex min-h-11 items-center gap-2 px-4 py-2 bg-coral-700 dark:bg-ocean-700 text-white rounded-xl font-medium [@media(hover:hover)]:hover:opacity-90 transition-opacity"
          >
            <Users className="w-4 h-4" />
            Manage Users
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {/* User Stats */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white mb-3">
            Users
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              title="Total users"
              value={stats?.total_users ?? "—"}


              comparison={stats?.new_users_this_week}
              comparisonLabel="previous 7 days (new users)"
            />
            <StatCard
              title="Premium"
              value={stats?.premium_users ?? "—"}


              description={`${stats?.total_users ? Math.round((stats.premium_users / stats.total_users) * 100) : 0}% of total`}
            />
            <StatCard
              title="Free"
              value={stats?.free_users ?? "—"}


            />
            <StatCard
              title="Active this week"
              value={stats?.active_users_this_week?.current ?? "—"}


              comparison={stats?.active_users_this_week}
              comparisonLabel="previous 7 days"
            />
          </div>
        </div>
        
        {/* Activity Stats */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white mb-3">
            Platform Activity
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              title="Chats"
              value={stats?.total_conversations?.toLocaleString() ?? "—"}


            />
            <StatCard
              title="Messages"
              value={stats?.total_messages?.toLocaleString() ?? "—"}


              comparison={stats?.messages_this_week}
            />
            <StatCard
              title="Quizzes"
              value={stats?.total_quiz_attempts?.toLocaleString() ?? "—"}


              comparison={stats?.quizzes_this_week}
            />
            <StatCard
              title="Games"
              value={stats?.total_game_plays?.toLocaleString() ?? "—"}


              comparison={stats?.games_this_week}
            />
          </div>
        </div>
        
        {/* Engagement Metrics */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white mb-3">
            Engagement
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 ">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-600 dark:text-slate-300">Average messages per user</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_messages_per_user?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-xs sm:text-xs text-brown-600 dark:text-slate-300 mt-0.5">
                    {stats?.users_with_messages ?? "—"} users messaged
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 ">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-600 dark:text-slate-300">Average quiz score</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_quiz_score != null ? `${stats.avg_quiz_score.toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-xs sm:text-xs text-brown-600 dark:text-slate-300 mt-0.5">
                    {stats?.users_with_quizzes ?? "—"} users quizzed
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 ">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-600 dark:text-slate-300">Average quizzes per user</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_quizzes_per_user?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-xs sm:text-xs text-brown-600 dark:text-slate-300 mt-0.5">
                    {stats?.total_quiz_attempts ?? "—"} total attempts
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 ">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-600 dark:text-slate-300">Average games per user</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_games_per_user?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-xs sm:text-xs text-brown-600 dark:text-slate-300 mt-0.5">
                    {stats?.users_with_games ?? "—"} users played
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Feature Adoption */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white mb-3">
            Feature Adoption
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700 ">
            <div className="space-y-4">
              {/* Chat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Chat</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.chat_adoption_pct != null ? `${stats.chat_adoption_pct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 rounded-full transition-[width,background-color] duration-300"
                    style={{ width: `${Math.min(stats?.chat_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-brown-600 dark:text-slate-300 mt-1">
                  {stats?.users_with_messages ?? "—"} of {stats?.total_users ?? "—"} users
                </p>
              </div>
              
              {/* Games */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Games</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.games_adoption_pct != null ? `${stats.games_adoption_pct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 rounded-full transition-[width,background-color] duration-300"
                    style={{ width: `${Math.min(stats?.games_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-brown-600 dark:text-slate-300 mt-1">
                  {stats?.users_with_games ?? "—"} of {stats?.total_users ?? "—"} users
                </p>
              </div>
              
              {/* Quizzes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Quizzes</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.quizzes_adoption_pct != null ? `${stats.quizzes_adoption_pct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 rounded-full transition-[width,background-color] duration-300"
                    style={{ width: `${Math.min(stats?.quizzes_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-brown-600 dark:text-slate-300 mt-1">
                  {stats?.users_with_quizzes ?? "—"} of {stats?.total_users ?? "—"} users
                </p>
              </div>
              
              {/* Learning Path */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Learning Path</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.learning_path_adoption_pct != null ? `${stats.learning_path_adoption_pct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 rounded-full transition-[width,background-color] duration-300"
                    style={{ width: `${Math.min(stats?.learning_path_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-brown-600 dark:text-slate-300 mt-1">
                  {stats?.users_with_lessons ?? "—"} of {stats?.total_users ?? "—"} users
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Retention Metrics */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700 ">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-semibold text-brown-800 dark:text-white">Retention</h3>
            <div className="relative group ml-auto">
              <HelpCircle className="w-4 h-4 text-brown-600 dark:text-slate-300 cursor-help" />
              <div className="absolute right-0 top-6 w-64 p-3 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-cream-200 dark:border-slate-600 text-xs text-brown-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                <p className="font-semibold mb-2 text-brown-800 dark:text-white">What do these mean?</p>
                <ul className="space-y-1.5">
                  <li><span className="font-medium">DAU:</span> Daily Active Users</li>
                  <li><span className="font-medium">WAU:</span> Weekly Active Users</li>
                  <li><span className="font-medium">MAU:</span> Monthly Active Users</li>
                  <li><span className="font-medium">Stickiness:</span> DAU÷MAU (10-20% is typical, higher = more engaged)</li>
                  <li><span className="font-medium">Returning:</span> % of users who came back after day 1</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            {/* DAU */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Daily Active Users - unique users who engaged today">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">DAU</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.dau ?? "—"}</p>
              <p className="text-xs text-brown-600 dark:text-slate-300">Active today</p>
            </div>
            
            {/* WAU */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Weekly Active Users - unique users in last 7 days">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">WAU</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.wau ?? "—"}</p>
              <p className="text-xs text-brown-600 dark:text-slate-300">Last 7 days</p>
            </div>
            
            {/* MAU */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Monthly Active Users - unique users in last 30 days">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarRange className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">MAU</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.mau ?? "—"}</p>
              <p className="text-xs text-brown-600 dark:text-slate-300">Last 30 days</p>
            </div>
            
            {/* DAU/MAU Ratio (Stickiness) */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Stickiness = DAU ÷ MAU. Higher means users come back more often. 10-20% is typical for apps.">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-brown-600 dark:text-slate-300" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">Stickiness</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.dau_mau_ratio != null ? `${stats.dau_mau_ratio}%` : '—'}</p>
              <p className="text-xs text-brown-600 dark:text-slate-300">DAU/MAU ratio</p>
            </div>
            
            {/* Returning Users */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3 col-span-2 xl:col-span-1" title="Percentage of users who have been active on more than one day (came back after first visit)">
              <div className="flex items-center gap-1.5 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">Returning</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.returning_users_pct != null ? `${stats.returning_users_pct}%` : '—'}</p>
              <p className="text-xs text-brown-600 dark:text-slate-300">Multi-day users</p>
            </div>
          </div>
        </div>
        
        {/* Top Users */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700  overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brown-600 dark:text-slate-300" />
              <h3 className="text-base font-semibold text-brown-800 dark:text-white">Top Users</h3>
            </div>
            <p className="text-xs text-brown-600 dark:text-slate-300 mt-0.5">Most active by total engagement</p>
          </div>
          <div className="divide-y divide-cream-100 dark:divide-slate-700">
            {stats?.top_users && stats.top_users.length > 0 ? (
              stats.top_users.map((user, index) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center gap-3 px-4 py-3 [@media(hover:hover)]:hover:bg-cream-50 dark:[@media(hover:hover)]:hover:bg-slate-700/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-cream-100 text-xs font-bold text-brown-700 dark:bg-slate-700 dark:text-slate-200">
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.image_url ? (
                      <img 
                        src={user.image_url} 
                        alt={user.name} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-coral-600 dark:text-ocean-400">
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brown-800 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-brown-600 dark:text-slate-300 truncate">
                      {user.email}
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-brown-800 dark:text-white">
                      {user.total_activity.toLocaleString()}
                    </p>
                    <p className="text-xs text-brown-600 dark:text-slate-300">
                      {user.messages}m · {user.quizzes}q · {user.games}g
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-brown-600 dark:text-slate-300">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No user activity yet</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700  overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-coral-500" />
              <h3 className="text-base font-semibold text-brown-800 dark:text-white">Recent Activity</h3>
              <span className="ml-auto text-xs text-brown-600 dark:text-slate-300 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Live
              </span>
            </div>
          </div>
          <div className="divide-y divide-cream-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
            {activityData?.activities && activityData.activities.length > 0 ? (
              activityData.activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center gap-3 px-4 py-2.5 [@media(hover:hover)]:hover:bg-cream-50 dark:[@media(hover:hover)]:hover:bg-slate-700/50 transition-colors"
                >
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 dark:bg-slate-700 flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {activity.user_image ? (
                      <img 
                        src={activity.user_image} 
                        alt={activity.user_name} 
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center">
                        <span className="text-xs font-medium text-coral-600 dark:text-ocean-400">
                          {activity.user_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Activity info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brown-700 dark:text-gray-300">
                      <span className="font-medium text-brown-800 dark:text-white">{activity.user_name}</span>
                      {' '}{activity.description}
                      {activity.detail && (
                        <span className="ml-1 text-brown-600 dark:text-slate-300">({activity.detail})</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Time */}
                  <div className="flex-shrink-0 text-xs text-brown-600 dark:text-slate-300">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-brown-600 dark:text-slate-300">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
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
              className="pressable flex min-h-11 items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 [@media(hover:hover)]:hover:border-coral-300 dark:[@media(hover:hover)]:hover:border-ocean-500 transition-colors group"
            >
              <div className="flex-shrink-0">
                <Users className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">View All Users</h3>
                <p className="text-sm text-brown-600 dark:text-slate-300">Manage user accounts</p>
              </div>
            </Link>
            
            <Link
              to="/admin/analytics"
              className="pressable flex min-h-11 items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 [@media(hover:hover)]:hover:border-teal-300 dark:[@media(hover:hover)]:hover:border-teal-500 transition-colors group"
            >
              <div className="flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">Analytics</h3>
                <p className="text-sm text-brown-600 dark:text-slate-300">Usage trends & growth</p>
              </div>
            </Link>
            
            <Link
              to="/admin/settings"
              className="pressable flex min-h-11 items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 [@media(hover:hover)]:hover:border-teal-300 dark:[@media(hover:hover)]:hover:border-teal-500 transition-colors group"
            >
              <div className="flex-shrink-0">
                <Settings className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">Settings</h3>
                <p className="text-sm text-brown-600 dark:text-slate-300">Promo & theme settings</p>
              </div>
            </Link>
            
            <Link
              to="/"
              className="pressable flex min-h-11 items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 [@media(hover:hover)]:hover:border-teal-300 dark:[@media(hover:hover)]:hover:border-teal-500 transition-colors group"
            >
              <div className="flex-shrink-0">
                <Activity className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">View App</h3>
                <p className="text-sm text-brown-600 dark:text-slate-300">Go to main application</p>
              </div>
            </Link>
          </div>
        </div>
        
        {/* Whitelisted Info */}
        {stats && stats.whitelisted_users > 0 && (
          <div className="bg-cream-50 dark:bg-slate-800 rounded-xl p-4 border border-teal-200 dark:border-teal-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-teal-800 dark:text-teal-300">
                  {stats.whitelisted_users} Whitelisted User{stats.whitelisted_users > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-teal-600 dark:text-teal-400">
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

