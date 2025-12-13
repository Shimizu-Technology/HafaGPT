import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Crown, Star, Shield, Ban, Loader2, AlertCircle,
  MessageSquare, Gamepad2, GraduationCap, Calendar, Clock,
  CheckCircle, XCircle, UserX, UserCheck, RotateCcw, Sliders, Activity
} from 'lucide-react';
import { useAdminUser, useUpdateUser, useResetOnboarding, useUpdateUserPreferences } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

export function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useAdminUser(userId || '');
  const updateUser = useUpdateUser();
  const resetOnboarding = useResetOnboarding();
  const updatePreferences = useUpdateUserPreferences();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('');
  const [selectedLearningGoal, setSelectedLearningGoal] = useState<string>('');
  
  const handleAction = async (action: string) => {
    if (!userId) return;
    
    let data: { is_premium?: boolean; is_whitelisted?: boolean; is_banned?: boolean } = {};
    
    switch (action) {
      case 'grant_premium':
        data = { is_premium: true };
        break;
      case 'revoke_premium':
        data = { is_premium: false, is_whitelisted: false };
        break;
      case 'whitelist':
        data = { is_whitelisted: true };
        break;
      case 'unwhitelist':
        data = { is_whitelisted: false, is_premium: false };
        break;
      case 'ban':
        data = { is_banned: true };
        break;
      case 'unban':
        data = { is_banned: false };
        break;
      case 'reset_onboarding':
        // Handle separately
        try {
          await resetOnboarding.mutateAsync(userId);
          setShowConfirm(null);
        } catch (error) {
          console.error('Failed to reset onboarding:', error);
        }
        return;
    }
    
    try {
      await updateUser.mutateAsync({ userId, data });
      setShowConfirm(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };
  
  const handleSavePreferences = async () => {
    if (!userId) return;
    try {
      await updatePreferences.mutateAsync({
        userId,
        data: {
          skill_level: selectedSkillLevel,
          learning_goal: selectedLearningGoal,
          onboarding_completed: true,
        }
      });
      setEditingPreferences(false);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };
  
  const startEditingPreferences = () => {
    setSelectedSkillLevel(user?.skill_level || 'beginner');
    setSelectedLearningGoal(user?.learning_goal || 'all');
    setEditingPreferences(true);
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400" />
        </div>
      </AdminLayout>
    );
  }
  
  if (error || !user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brown-800 dark:text-white mb-2">User Not Found</h2>
            <p className="text-brown-600 dark:text-gray-400 mb-4">{error?.message || 'Unable to load user'}</p>
            <button onClick={() => navigate('/admin/users')} className="text-coral-500 dark:text-ocean-400 hover:underline">
              ← Back to Users
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  const formatDate = (timestamp: string | null, isISOString = false) => {
    if (!timestamp) return 'Never';
    try {
      const date = isISOString ? new Date(timestamp) : new Date(parseInt(timestamp));
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };
  
  const getRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return null; // Fall back to full date
    } catch {
      return null;
    }
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        
        {/* User Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {user.image_url ? (
              <img src={user.image_url} alt={user.first_name || 'User'} className="w-20 h-20 rounded-full" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-coral-600 dark:text-ocean-400">
                  {(user.first_name || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-brown-800 dark:text-white">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-brown-600 dark:text-gray-400">{user.email || 'No email'}</p>
              <p className="text-sm text-brown-500 dark:text-gray-500 font-mono">{user.user_id}</p>
              
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {user.is_banned && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                    <Ban className="w-4 h-4" /> Banned
                  </span>
                )}
                {user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
                    <Shield className="w-4 h-4" /> Admin
                  </span>
                )}
                {user.is_whitelisted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4" /> Friends & Family
                  </span>
                ) : user.is_premium ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" /> Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
                    Free Tier
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <span className="text-sm text-brown-500 dark:text-gray-400">Messages</span>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">{user.total_messages}</p>
            <p className="text-xs text-brown-400 dark:text-gray-500">Today: {user.today_chat || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Gamepad2 className="w-5 h-5 text-pink-500" />
              <span className="text-sm text-brown-500 dark:text-gray-400">Games</span>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">{user.total_games}</p>
            <p className="text-xs text-brown-400 dark:text-gray-500">Today: {user.today_games || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              <span className="text-sm text-brown-500 dark:text-gray-400">Quizzes</span>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">{user.total_quizzes}</p>
            <p className="text-xs text-brown-400 dark:text-gray-500">Today: {user.today_quizzes || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-teal-500" />
              <span className="text-sm text-brown-500 dark:text-gray-400">Conversations</span>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">{user.total_conversations}</p>
          </div>
        </div>
        
        {/* Account Details */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">Account Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-brown-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-brown-500 dark:text-gray-400">Joined</p>
                <p className="font-medium text-brown-800 dark:text-white">{formatDate(user.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-brown-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-brown-500 dark:text-gray-400">Last Sign In</p>
                <p className="font-medium text-brown-800 dark:text-white">{formatDate(user.last_sign_in)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-brown-500 dark:text-gray-400">Last Activity</p>
                <p className="font-medium text-brown-800 dark:text-white">
                  {user.last_activity ? (
                    <>
                      {getRelativeTime(user.last_activity) || formatDate(user.last_activity, true)}
                      {getRelativeTime(user.last_activity) && (
                        <span className="text-xs text-brown-400 dark:text-gray-500 ml-1">
                          ({formatDate(user.last_activity, true)})
                        </span>
                      )}
                    </>
                  ) : (
                    'Never'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-brown-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-brown-500 dark:text-gray-400">Plan</p>
                <p className="font-medium text-brown-800 dark:text-white">{user.plan_name || (user.is_premium ? 'Premium' : 'Free')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user.subscription_status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-brown-400 dark:text-gray-500" />
              )}
              <div>
                <p className="text-sm text-brown-500 dark:text-gray-400">Subscription Status</p>
                <p className="font-medium text-brown-800 dark:text-white capitalize">
                  {user.subscription_status || (user.is_whitelisted ? 'Whitelisted' : 'None')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Learning Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brown-800 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Learning Preferences
            </h2>
            {!editingPreferences && (
              <button
                onClick={startEditingPreferences}
                className="text-sm text-coral-500 dark:text-ocean-400 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          
          {editingPreferences ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-700 dark:text-gray-300 mb-2">
                  Skill Level
                </label>
                <select
                  value={selectedSkillLevel}
                  onChange={(e) => setSelectedSkillLevel(e.target.value)}
                  className="w-full p-2 rounded-lg border border-cream-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-brown-800 dark:text-white"
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">🌿 Intermediate</option>
                  <option value="advanced">🌳 Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 dark:text-gray-300 mb-2">
                  Learning Goal
                </label>
                <select
                  value={selectedLearningGoal}
                  onChange={(e) => setSelectedLearningGoal(e.target.value)}
                  className="w-full p-2 rounded-lg border border-cream-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-brown-800 dark:text-white"
                >
                  <option value="conversation">💬 Daily Conversation</option>
                  <option value="culture">🌴 Culture & Heritage</option>
                  <option value="family">👨‍👩‍👧‍👦 Teach My Family</option>
                  <option value="travel">✈️ Travel to Guam</option>
                  <option value="all">✨ Everything!</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPreferences(false)}
                  className="flex-1 px-4 py-2 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-lg hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  disabled={updatePreferences.isPending}
                  className="flex-1 px-4 py-2 bg-coral-500 dark:bg-ocean-500 text-white rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  {updatePreferences.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-cream-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-brown-500 dark:text-gray-400 mb-1">Skill Level</p>
                <p className="font-medium text-brown-800 dark:text-white">
                  {user?.skill_level === 'beginner' && '🌱 Beginner'}
                  {user?.skill_level === 'intermediate' && '🌿 Intermediate'}
                  {user?.skill_level === 'advanced' && '🌳 Advanced'}
                  {!user?.skill_level && '—'}
                </p>
              </div>
              <div className="p-3 bg-cream-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-brown-500 dark:text-gray-400 mb-1">Learning Goal</p>
                <p className="font-medium text-brown-800 dark:text-white">
                  {user?.learning_goal === 'conversation' && '💬 Conversation'}
                  {user?.learning_goal === 'culture' && '🌴 Culture'}
                  {user?.learning_goal === 'family' && '👨‍👩‍👧‍👦 Family'}
                  {user?.learning_goal === 'travel' && '✈️ Travel'}
                  {user?.learning_goal === 'all' && '✨ Everything'}
                  {!user?.learning_goal && '—'}
                </p>
              </div>
              <div className="p-3 bg-cream-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-brown-500 dark:text-gray-400 mb-1">Onboarding</p>
                <p className="font-medium text-brown-800 dark:text-white">
                  {user?.onboarding_completed ? (
                    <span className="text-green-600 dark:text-green-400">✓ Completed</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Not completed</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-cream-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Premium Actions */}
            {user.is_premium && !user.is_whitelisted ? (
              <button
                onClick={() => setShowConfirm('revoke_premium')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                Revoke Premium
              </button>
            ) : !user.is_premium ? (
              <button
                onClick={() => setShowConfirm('grant_premium')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Crown className="w-5 h-5" />
                Grant Premium
              </button>
            ) : null}
            
            {/* Whitelist Actions */}
            {user.is_whitelisted ? (
              <button
                onClick={() => setShowConfirm('unwhitelist')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                Remove from Whitelist
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm('whitelist')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <Star className="w-5 h-5" />
                Add to Whitelist (F&F)
              </button>
            )}
            
            {/* Ban Actions */}
            {user.is_banned ? (
              <button
                onClick={() => setShowConfirm('unban')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <UserCheck className="w-5 h-5" />
                Unban User
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm('ban')}
                disabled={updateUser.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <UserX className="w-5 h-5" />
                Ban User
              </button>
            )}
            
            {/* Reset Onboarding */}
            <button
              onClick={() => setShowConfirm('reset_onboarding')}
              disabled={resetOnboarding.isPending}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Onboarding
            </button>
          </div>
        </div>
        
        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-2">
                Confirm Action
              </h3>
              <p className="text-brown-600 dark:text-gray-400 mb-6">
                {showConfirm === 'grant_premium' && 'Grant premium access to this user?'}
                {showConfirm === 'revoke_premium' && 'Revoke premium access from this user? This will also remove whitelist status.'}
                {showConfirm === 'whitelist' && 'Add this user to the Friends & Family whitelist? They will get permanent free premium access.'}
                {showConfirm === 'unwhitelist' && 'Remove this user from the whitelist? They will lose premium access.'}
                {showConfirm === 'ban' && 'Ban this user? They will not be able to use the app.'}
                {showConfirm === 'unban' && 'Unban this user? They will be able to use the app again.'}
                {showConfirm === 'reset_onboarding' && 'Reset this user\'s onboarding? They will see the skill level selection modal on their next login.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-lg hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(showConfirm)}
                  disabled={updateUser.isPending}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    showConfirm.includes('ban') || showConfirm.includes('revoke') || showConfirm.includes('unwhitelist')
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-coral-500 dark:bg-ocean-500 hover:opacity-90 text-white'
                  }`}
                >
                  {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Update loading overlay */}
        {(updateUser.isPending || resetOnboarding.isPending || updatePreferences.isPending) && !showConfirm && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-coral-500 dark:text-ocean-400" />
              <span className="text-brown-800 dark:text-white">Updating...</span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminUserDetail;

