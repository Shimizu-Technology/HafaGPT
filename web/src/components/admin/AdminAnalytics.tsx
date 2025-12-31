import { useState } from 'react';
import { 
  BarChart3, TrendingUp, Users, Loader2,
  MessageSquare, Gamepad2, GraduationCap, PieChart,
  BookOpen, Clock, Target, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, 
  Pie, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';
import { useUsageTrends, useUserGrowth, useFeatureUsage, useAdvancedAnalytics } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

type Period = '7d' | '30d' | '90d';

const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FUNNEL_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>('30d');
  
  const { data: usageData, isLoading: usageLoading } = useUsageTrends(period);
  const { data: growthData, isLoading: growthLoading } = useUserGrowth(period);
  const { data: featureData, isLoading: featureLoading } = useFeatureUsage();
  const { data: advancedData, isLoading: advancedLoading } = useAdvancedAnalytics(period);
  
  const isLoading = usageLoading || growthLoading || featureLoading || advancedLoading;
  
  // Prepare funnel data
  const funnelData = advancedData?.user_funnel ? [
    { name: 'Any Activity', value: advancedData.user_funnel.total_users, fill: FUNNEL_COLORS[0] },
    { name: 'Chatted', value: advancedData.user_funnel.chatted, fill: FUNNEL_COLORS[1] },
    { name: 'Played Game', value: advancedData.user_funnel.played_game, fill: FUNNEL_COLORS[2] },
    { name: 'Took Quiz', value: advancedData.user_funnel.took_quiz, fill: FUNNEL_COLORS[3] },
    { name: 'Returned', value: advancedData.user_funnel.returned, fill: FUNNEL_COLORS[4] },
  ] : [];
  
  // Get heatmap color based on intensity
  const getHeatmapColor = (value: number, max: number) => {
    if (max === 0) return 'bg-cream-100 dark:bg-slate-700';
    const intensity = value / max;
    if (intensity === 0) return 'bg-cream-100 dark:bg-slate-700';
    if (intensity < 0.25) return 'bg-teal-100 dark:bg-teal-900/30';
    if (intensity < 0.5) return 'bg-teal-300 dark:bg-teal-700/50';
    if (intensity < 0.75) return 'bg-teal-500 dark:bg-teal-600';
    return 'bg-teal-700 dark:bg-teal-500';
  };
  
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
            
            {/* Quiz Pass Rates */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Quiz Pass Rates
              </h2>
              {advancedData?.quiz_pass_rates && advancedData.quiz_pass_rates.length > 0 ? (
                <div className="space-y-3">
                  {advancedData.quiz_pass_rates.map((quiz) => (
                    <div key={quiz.category} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-brown-700 dark:text-gray-300 truncate">
                            {quiz.category}
                          </span>
                          <span className="text-sm font-bold text-brown-800 dark:text-white">
                            {quiz.avg_score}%
                          </span>
                        </div>
                        <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              quiz.avg_score >= 70 ? 'bg-emerald-500' : 
                              quiz.avg_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${quiz.avg_score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-0.5">
                          {quiz.attempts} attempts · {quiz.pass_rate}% pass rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No quiz data yet
                </div>
              )}
            </div>
            
            {/* Learning Path Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-500" />
                Learning Path Progress
              </h2>
              {advancedData?.learning_path_progress && advancedData.learning_path_progress.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {advancedData.learning_path_progress.map((topic) => (
                    <div 
                      key={topic.topic_id} 
                      className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-brown-700 dark:text-gray-300 truncate mb-2">
                        {topic.topic_name}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-cream-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${topic.completion_rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-brown-800 dark:text-white">
                          {topic.completion_rate}%
                        </span>
                      </div>
                      <p className="text-[10px] text-brown-400 dark:text-gray-500 mt-1">
                        {topic.completed}/{topic.started} completed
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No learning path data yet
                </div>
              )}
            </div>
            
            {/* Peak Hours Heatmap */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Peak Activity Hours
                <span className="text-xs font-normal text-brown-400 dark:text-gray-500 ml-2">
                  Last {period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days'}
                </span>
              </h2>
              {advancedData?.peak_hours ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Hour labels */}
                    <div className="flex mb-1 ml-12">
                      {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
                        <div key={hour} className="flex-1 text-[10px] text-brown-400 dark:text-gray-500">
                          {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour-12}pm` : `${hour}am`}
                        </div>
                      ))}
                    </div>
                    {/* Heatmap grid */}
                    {advancedData.peak_hours.map((dayData, dayIndex) => (
                      <div key={dayIndex} className="flex items-center gap-1 mb-1">
                        <span className="w-10 text-xs text-brown-500 dark:text-gray-400 text-right pr-2">
                          {DAYS[dayIndex]}
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {dayData.map((count, hourIndex) => (
                            <div
                              key={hourIndex}
                              className={`flex-1 h-5 rounded-sm ${getHeatmapColor(count, advancedData.peak_hours_max)} transition-colors`}
                              title={`${DAYS[dayIndex]} ${hourIndex}:00 - ${count} activities`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* Legend */}
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <span className="text-[10px] text-brown-400 dark:text-gray-500">Less</span>
                      <div className="w-4 h-4 rounded bg-cream-100 dark:bg-slate-700" />
                      <div className="w-4 h-4 rounded bg-teal-100 dark:bg-teal-900/30" />
                      <div className="w-4 h-4 rounded bg-teal-300 dark:bg-teal-700/50" />
                      <div className="w-4 h-4 rounded bg-teal-500 dark:bg-teal-600" />
                      <div className="w-4 h-4 rounded bg-teal-700 dark:bg-teal-500" />
                      <span className="text-[10px] text-brown-400 dark:text-gray-500">More</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No activity data yet
                </div>
              )}
            </div>
            
            {/* User Funnel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-purple-500" />
                User Journey Funnel
              </h2>
              {funnelData.length > 0 && funnelData[0].value > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Funnel visualization */}
                  <div className="flex-1 w-full">
                    <div className="space-y-2">
                      {funnelData.map((stage, index) => {
                        const widthPercent = (stage.value / funnelData[0].value) * 100;
                        const conversionRate = index > 0 
                          ? ((stage.value / funnelData[0].value) * 100).toFixed(0)
                          : '100';
                        return (
                          <div key={stage.name} className="relative">
                            <div 
                              className="h-10 rounded-lg flex items-center justify-between px-4 transition-all"
                              style={{ 
                                width: `${Math.max(widthPercent, 20)}%`,
                                backgroundColor: stage.fill,
                                marginLeft: `${(100 - Math.max(widthPercent, 20)) / 2}%`
                              }}
                            >
                              <span className="text-sm font-medium text-white truncate">
                                {stage.name}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {stage.value}
                              </span>
                            </div>
                            {index > 0 && (
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 text-xs text-brown-500 dark:text-gray-400">
                                {conversionRate}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="lg:w-48 space-y-3">
                    <div className="text-center lg:text-left">
                      <p className="text-2xl font-bold text-purple-600">
                        {funnelData[0].value > 0 
                          ? ((funnelData[4].value / funnelData[0].value) * 100).toFixed(0) 
                          : 0}%
                      </p>
                      <p className="text-xs text-brown-500 dark:text-gray-400">Return Rate</p>
                    </div>
                    <div className="text-center lg:text-left">
                      <p className="text-2xl font-bold text-teal-600">
                        {funnelData[0].value > 0 
                          ? ((funnelData[2].value / funnelData[0].value) * 100).toFixed(0) 
                          : 0}%
                      </p>
                      <p className="text-xs text-brown-500 dark:text-gray-400">Game Adoption</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-brown-500 dark:text-gray-400">
                  No user funnel data yet
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminAnalytics;

