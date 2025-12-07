import { useState } from 'react';
import { 
  BarChart3, TrendingUp, Users, Loader2, AlertCircle,
  MessageSquare, Gamepad2, GraduationCap, PieChart
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, 
  Pie, Cell
} from 'recharts';
import { useUsageTrends, useUserGrowth, useFeatureUsage } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

type Period = '7d' | '30d' | '90d';

const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>('30d');
  
  const { data: usageData, isLoading: usageLoading } = useUsageTrends(period);
  const { data: growthData, isLoading: growthLoading } = useUserGrowth(period);
  const { data: featureData, isLoading: featureLoading } = useFeatureUsage();
  
  const isLoading = usageLoading || growthLoading || featureLoading;
  
  // Prepare pie chart data for games
  const gamesPieData = featureData?.game_breakdown 
    ? Object.entries(featureData.game_breakdown).map(([name, value]) => ({ name, value }))
    : [];
  
  // Prepare pie chart data for quizzes  
  const quizzesPieData = featureData?.quiz_breakdown
    ? Object.entries(featureData.quiz_breakdown).map(([name, value]) => ({ name, value }))
    : [];
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-coral-500 dark:text-ocean-400" />
              Analytics
            </h1>
            <p className="text-brown-600 dark:text-gray-400">
              Platform usage and growth metrics
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-coral-500 dark:bg-ocean-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-brown-600 dark:text-gray-400 hover:bg-cream-100 dark:hover:bg-slate-700 border border-cream-200 dark:border-slate-700'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                  <span className="text-sm text-brown-500 dark:text-gray-400">Chat Messages</span>
                </div>
                <p className="text-2xl font-bold text-brown-800 dark:text-white">
                  {usageData?.totals?.chat?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-brown-400 dark:text-gray-500">Last {period}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Gamepad2 className="w-5 h-5 text-pink-500" />
                  <span className="text-sm text-brown-500 dark:text-gray-400">Games Played</span>
                </div>
                <p className="text-2xl font-bold text-brown-800 dark:text-white">
                  {usageData?.totals?.games?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-brown-400 dark:text-gray-500">Last {period}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm text-brown-500 dark:text-gray-400">Quizzes Taken</span>
                </div>
                <p className="text-2xl font-bold text-brown-800 dark:text-white">
                  {usageData?.totals?.quizzes?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-brown-400 dark:text-gray-500">Last {period}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-teal-500" />
                  <span className="text-sm text-brown-500 dark:text-gray-400">Total Users</span>
                </div>
                <p className="text-2xl font-bold text-brown-800 dark:text-white">
                  {growthData?.data?.[growthData.data.length - 1]?.total_users?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-brown-400 dark:text-gray-500">Current</p>
              </div>
            </div>
            
            {/* Usage Trends Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                Daily Usage Trends
              </h2>
              {usageData?.data && usageData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={usageData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="chat_count" name="Chat" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="game_count" name="Games" stroke="#ec4899" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="quiz_count" name="Quizzes" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No usage data available for this period
                </div>
              )}
            </div>
            
            {/* User Growth Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-500" />
                User Growth
              </h2>
              {growthData?.data && growthData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={growthData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="new_users" name="New Users" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No growth data available
                </div>
              )}
            </div>
            
            {/* Feature Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Games Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-pink-500" />
                  Games Breakdown
                </h2>
                {gamesPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={gamesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {gamesPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                    No game data yet
                  </div>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {gamesPieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-brown-600 dark:text-gray-400">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quizzes Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  Quizzes Breakdown
                </h2>
                {quizzesPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={quizzesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {quizzesPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                    No quiz data yet
                  </div>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {quizzesPieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-brown-600 dark:text-gray-400">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* All-Time Totals */}
            <div className="bg-gradient-to-r from-coral-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                All-Time Platform Totals
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-coral-600 dark:text-ocean-400">
                    {featureData?.chat_total?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">Chat Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-600">
                    {featureData?.games_total?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">Games Played</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">
                    {featureData?.quizzes_total?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">Quizzes Taken</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-teal-600">
                    {featureData?.conversations_total?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">Conversations</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminAnalytics;

