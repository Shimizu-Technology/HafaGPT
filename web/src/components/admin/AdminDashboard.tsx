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
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  BookOpen,
  Trophy,
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarRange,
  HelpCircle
} from 'lucide-react';
import { useAdminStats } from '../../hooks/useAdminQuery';
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
  icon: React.ReactNode;
  color: string;
  description?: string;
  comparison?: StatComparison | null;
}

function StatCard({ title, value, icon, color, description, comparison }: StatCardProps) {
  const getComparisonContent = () => {
    if (!comparison) return null;
    
    const { change, change_percent } = comparison;
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    // Show percentage if available, otherwise show absolute change
    const displayValue = change_percent !== null 
      ? `${isPositive ? '+' : ''}${change_percent}%`
      : `${isPositive ? '+' : ''}${change}`;
    
    const colorClasses = isPositive 
      ? 'text-green-600 dark:text-green-400' 
      : isNegative 
        ? 'text-red-500 dark:text-red-400' 
        : 'text-gray-500 dark:text-gray-400';
    
    const bgClasses = isPositive 
      ? 'bg-green-100 dark:bg-green-900/30' 
      : isNegative 
        ? 'bg-red-100 dark:bg-red-900/30' 
        : 'bg-gray-100 dark:bg-gray-700';
    
    return { displayValue, colorClasses, bgClasses, isPositive, isNegative };
  };
  
  const comparisonData = getComparisonContent();
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">{title}</p>
            {/* Desktop: show badge next to title */}
            {comparisonData && (
              <span className={`hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${comparisonData.bgClasses} ${comparisonData.colorClasses}`}>
                {comparisonData.isPositive && <TrendingUp className="w-3 h-3" />}
                {comparisonData.isNegative && <TrendingDown className="w-3 h-3" />}
                {comparisonData.displayValue}
              </span>
            )}
          </div>
          <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">{value}</p>
          {description && (
            <p className="text-[10px] sm:text-xs text-brown-400 dark:text-gray-500 mt-0.5">{description}</p>
          )}
          {/* Mobile: show comparison as a small pill below the number */}
          {comparisonData && (
            <div className={`xl:hidden inline-flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${comparisonData.bgClasses} ${comparisonData.colorClasses}`}>
              {comparisonData.isPositive && <TrendingUp className="w-2.5 h-2.5" />}
              {comparisonData.isNegative && <TrendingDown className="w-2.5 h-2.5" />}
              <span>{comparisonData.displayValue}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg sm:rounded-xl flex-shrink-0 ${color}`}>
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
          <h2 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white mb-3">
            Users
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
              color="bg-blue-100 dark:bg-blue-900/30"
              comparison={stats?.new_users_this_week}
            />
            <StatCard
              title="Premium"
              value={stats?.premium_users || 0}
              icon={<Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
              color="bg-amber-100 dark:bg-amber-900/30"
              description={`${stats?.total_users ? Math.round((stats.premium_users / stats.total_users) * 100) : 0}% of total`}
            />
            <StatCard
              title="Free"
              value={stats?.free_users || 0}
              icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              title="Active Today"
              value={stats?.active_today || 0}
              icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
              color="bg-purple-100 dark:bg-purple-900/30"
              comparison={stats?.active_users_this_week}
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
              value={stats?.total_conversations?.toLocaleString() || 0}
              icon={<MessagesSquare className="w-4 h-4 sm:w-5 sm:h-5 text-coral-600 dark:text-ocean-400" />}
              color="bg-coral-100 dark:bg-ocean-900/30"
            />
            <StatCard
              title="Messages"
              value={stats?.total_messages?.toLocaleString() || 0}
              icon={<MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
              color="bg-teal-100 dark:bg-teal-900/30"
              comparison={stats?.messages_this_week}
            />
            <StatCard
              title="Quizzes"
              value={stats?.total_quiz_attempts?.toLocaleString() || 0}
              icon={<GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
              color="bg-indigo-100 dark:bg-indigo-900/30"
              comparison={stats?.quizzes_this_week}
            />
            <StatCard
              title="Games"
              value={stats?.total_game_plays?.toLocaleString() || 0}
              icon={<Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />}
              color="bg-pink-100 dark:bg-pink-900/30"
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">Avg Msgs/User</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_messages_per_user?.toFixed(1) || '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-400 dark:text-gray-500 mt-0.5">
                    {stats?.users_with_messages || 0} users messaged
                  </p>
                </div>
                <div className="p-2 rounded-lg sm:rounded-xl bg-teal-100 dark:bg-teal-900/30">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">Avg Quiz Score</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_quiz_score != null ? `${stats.avg_quiz_score.toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-400 dark:text-gray-500 mt-0.5">
                    {stats?.users_with_quizzes || 0} users quizzed
                  </p>
                </div>
                <div className="p-2 rounded-lg sm:rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">Avg Quizzes/User</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_quizzes_per_user?.toFixed(1) || '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-400 dark:text-gray-500 mt-0.5">
                    {stats?.total_quiz_attempts || 0} total attempts
                  </p>
                </div>
                <div className="p-2 rounded-lg sm:rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">Avg Games/User</p>
                  <p className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white">
                    {stats?.avg_games_per_user?.toFixed(1) || '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-400 dark:text-gray-500 mt-0.5">
                    {stats?.users_with_games || 0} users played
                  </p>
                </div>
                <div className="p-2 rounded-lg sm:rounded-xl bg-pink-100 dark:bg-pink-900/30">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
            <div className="space-y-4">
              {/* Chat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Chat</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.chat_adoption_pct?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats?.chat_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-1">
                  {stats?.users_with_messages || 0} of {stats?.total_users || 0} users
                </p>
              </div>
              
              {/* Games */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-pink-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Games</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.games_adoption_pct?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats?.games_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-1">
                  {stats?.users_with_games || 0} of {stats?.total_users || 0} users
                </p>
              </div>
              
              {/* Quizzes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Quizzes</span>
                  </div>
                  <span className="text-sm font-bold text-brown-800 dark:text-white">
                    {stats?.quizzes_adoption_pct?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats?.quizzes_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-1">
                  {stats?.users_with_quizzes || 0} of {stats?.total_users || 0} users
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
                    {stats?.learning_path_adoption_pct?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats?.learning_path_adoption_pct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-1">
                  {stats?.users_with_lessons || 0} of {stats?.total_users || 0} users
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Retention Metrics */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-semibold text-brown-800 dark:text-white">Retention</h3>
            <div className="relative group ml-auto">
              <HelpCircle className="w-4 h-4 text-brown-400 dark:text-gray-500 cursor-help" />
              <div className="absolute right-0 top-6 w-64 p-3 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-cream-200 dark:border-slate-600 text-xs text-brown-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
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
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.dau || 0}</p>
              <p className="text-[10px] text-brown-400 dark:text-gray-500">Active today</p>
            </div>
            
            {/* WAU */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Weekly Active Users - unique users in last 7 days">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">WAU</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.wau || 0}</p>
              <p className="text-[10px] text-brown-400 dark:text-gray-500">Last 7 days</p>
            </div>
            
            {/* MAU */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Monthly Active Users - unique users in last 30 days">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarRange className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">MAU</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.mau || 0}</p>
              <p className="text-[10px] text-brown-400 dark:text-gray-500">Last 30 days</p>
            </div>
            
            {/* DAU/MAU Ratio (Stickiness) */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3" title="Stickiness = DAU ÷ MAU. Higher means users come back more often. 10-20% is typical for apps.">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">Stickiness</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.dau_mau_ratio || 0}%</p>
              <p className="text-[10px] text-brown-400 dark:text-gray-500">DAU/MAU ratio</p>
            </div>
            
            {/* Returning Users */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3 col-span-2 xl:col-span-1" title="Percentage of users who have been active on more than one day (came back after first visit)">
              <div className="flex items-center gap-1.5 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-brown-600 dark:text-gray-400">Returning</span>
              </div>
              <p className="text-lg font-bold text-brown-800 dark:text-white">{stats?.returning_users_pct || 0}%</p>
              <p className="text-[10px] text-brown-400 dark:text-gray-500">Multi-day users</p>
            </div>
          </div>
        </div>
        
        {/* Top Users */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-brown-800 dark:text-white">Top Users</h3>
            </div>
            <p className="text-xs text-brown-500 dark:text-gray-400 mt-0.5">Most active by total engagement</p>
          </div>
          <div className="divide-y divide-cream-100 dark:divide-slate-700">
            {stats?.top_users && stats.top_users.length > 0 ? (
              stats.top_users.map((user, index) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {/* Rank */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                    index === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                    index === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                    'bg-cream-100 dark:bg-slate-700 text-brown-500 dark:text-gray-400'
                  }`}>
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
                    <p className="text-xs text-brown-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-brown-800 dark:text-white">
                      {user.total_activity.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-brown-400 dark:text-gray-500">
                      {user.messages}m · {user.quizzes}q · {user.games}g
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-brown-500 dark:text-gray-400">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No user activity yet</p>
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
              to="/admin/analytics"
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group"
            >
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-800 dark:text-white">Analytics</h3>
                <p className="text-sm text-brown-500 dark:text-gray-400">Usage trends & growth</p>
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

