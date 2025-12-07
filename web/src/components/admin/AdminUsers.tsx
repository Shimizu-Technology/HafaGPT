import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Crown, Shield, Loader2, AlertCircle, Ban, Eye,
  ChevronLeft, ChevronRight, X, MoreVertical, UserMinus, Star
} from 'lucide-react';
import { useAdminUsers, useUpdateUser, AdminUser } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

interface UserActionsMenuProps {
  user: AdminUser;
  onClose: () => void;
  onUpdate: (userId: string, data: { is_premium?: boolean; is_whitelisted?: boolean }) => void;
  onViewDetails: (userId: string) => void;
  isUpdating: boolean;
}

function UserActionsMenu({ user, onClose, onUpdate, onViewDetails, isUpdating }: UserActionsMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-cream-200 dark:border-slate-700 py-2 z-50">
      {/* View Details */}
      <button
        onClick={() => onViewDetails(user.user_id)}
        className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-coral-50 dark:hover:bg-ocean-900/20 text-coral-600 dark:text-ocean-400 transition-colors"
      >
        <Eye className="w-4 h-4" />
        <span>View Details</span>
      </button>
      
      <div className="border-t border-cream-200 dark:border-slate-700 my-2" />
      
      {user.is_premium ? (
        <button
          onClick={() => onUpdate(user.user_id, { is_premium: false, is_whitelisted: false })}
          disabled={isUpdating}
          className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
        >
          <UserMinus className="w-4 h-4" />
          <span>Revoke Premium</span>
        </button>
      ) : (
        <button
          onClick={() => onUpdate(user.user_id, { is_premium: true })}
          disabled={isUpdating}
          className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors"
        >
          <Crown className="w-4 h-4" />
          <span>Grant Premium</span>
        </button>
      )}
      
      {user.is_whitelisted ? (
        <button
          onClick={() => onUpdate(user.user_id, { is_whitelisted: false, is_premium: false })}
          disabled={isUpdating}
          className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Remove from Whitelist</span>
        </button>
      ) : (
        <button
          onClick={() => onUpdate(user.user_id, { is_whitelisted: true })}
          disabled={isUpdating}
          className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-colors"
        >
          <Star className="w-4 h-4" />
          <span>Add to Whitelist (F&F)</span>
        </button>
      )}
      
      <div className="border-t border-cream-200 dark:border-slate-700 my-2" />
      <button onClick={onClose} className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-cream-50 dark:hover:bg-slate-700 text-brown-600 dark:text-gray-400 transition-colors">
        <X className="w-4 h-4" />
        <span>Cancel</span>
      </button>
    </div>
  );
}

function UserRow({ user, activeMenu, setActiveMenu, handleUpdate, onViewDetails, isUpdating }: {
  user: AdminUser;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  handleUpdate: (userId: string, data: { is_premium?: boolean; is_whitelisted?: boolean }) => void;
  onViewDetails: (userId: string) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => onViewDetails(user.user_id)}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {user.image_url ? (
            <img src={user.image_url} alt={user.first_name || 'User'} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center">
              <span className="text-coral-600 dark:text-ocean-400 font-semibold">
                {(user.first_name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-brown-800 dark:text-white">{user.first_name} {user.last_name}</p>
            <p className="text-sm text-brown-500 dark:text-gray-400">{user.email || 'No email'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {user.is_banned && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
              <Ban className="w-3 h-3" /> Banned
            </span>
          )}
          {user.role === 'admin' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
          {user.is_premium ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">Free</span>
          )}
          {user.is_whitelisted && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
              <Star className="w-3 h-3" /> F&F
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-brown-600 dark:text-gray-400">
          <p>{user.total_messages} messages</p>
          <p>{user.total_quizzes} quizzes · {user.total_games} games</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm text-brown-600 dark:text-gray-400">
          {user.created_at ? new Date(parseInt(user.created_at)).toLocaleDateString() : 'Unknown'}
        </p>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="relative inline-block">
          <button
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === user.user_id ? null : user.user_id); }}
            className="p-2 hover:bg-cream-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-brown-600 dark:text-gray-400" />
          </button>
          {activeMenu === user.user_id && (
            <UserActionsMenu user={user} onClose={() => setActiveMenu(null)} onUpdate={handleUpdate} onViewDetails={onViewDetails} isUpdating={isUpdating} />
          )}
        </div>
      </td>
    </tr>
  );
}

function MobileUserCard({ user, activeMenu, setActiveMenu, handleUpdate, onViewDetails, isUpdating }: {
  user: AdminUser;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  handleUpdate: (userId: string, data: { is_premium?: boolean; is_whitelisted?: boolean }) => void;
  onViewDetails: (userId: string) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="p-4 cursor-pointer hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => onViewDetails(user.user_id)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {user.image_url ? (
            <img src={user.image_url} alt={user.first_name || 'User'} className="w-10 h-10 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-coral-600 dark:text-ocean-400 font-semibold">
                {(user.first_name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-brown-800 dark:text-white truncate">{user.first_name} {user.last_name}</p>
            <p className="text-sm text-brown-500 dark:text-gray-400 truncate">{user.email || 'No email'}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === user.user_id ? null : user.user_id); }}
            className="p-2 hover:bg-cream-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-brown-600 dark:text-gray-400" />
          </button>
          {activeMenu === user.user_id && (
            <UserActionsMenu user={user} onClose={() => setActiveMenu(null)} onUpdate={handleUpdate} onViewDetails={onViewDetails} isUpdating={isUpdating} />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {user.is_banned && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
            <Ban className="w-3 h-3" /> Banned
          </span>
        )}
        {user.role === 'admin' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )}
        {user.is_premium ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
            <Crown className="w-3 h-3" /> Premium
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">Free</span>
        )}
        {user.is_whitelisted && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
            <Star className="w-3 h-3" /> F&F
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs text-brown-500 dark:text-gray-400">
        <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg py-1.5">
          <span className="font-semibold text-brown-700 dark:text-gray-300">{user.total_messages}</span> msgs
        </div>
        <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg py-1.5">
          <span className="font-semibold text-brown-700 dark:text-gray-300">{user.total_quizzes}</span> quiz
        </div>
        <div className="bg-cream-50 dark:bg-slate-700/50 rounded-lg py-1.5">
          <span className="font-semibold text-brown-700 dark:text-gray-300">{user.total_games}</span> games
        </div>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const { data, isLoading, error } = useAdminUsers(page, 20, debouncedSearch);
  const updateUser = useUpdateUser();
  
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  useEffect(() => {
    if (debouncedSearch) setSearchParams({ search: debouncedSearch });
    else setSearchParams({});
  }, [debouncedSearch, setSearchParams]);
  
  const handleUpdate = async (userId: string, data: { is_premium?: boolean; is_whitelisted?: boolean }) => {
    try { await updateUser.mutateAsync({ userId, data }); setActiveMenu(null); }
    catch (error) { console.error('Failed to update user:', error); }
  };
  
  const handleViewDetails = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };
  
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) { document.addEventListener('click', handleClickOutside); return () => document.removeEventListener('click', handleClickOutside); }
  }, [activeMenu]);
  
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brown-800 dark:text-white mb-2">Error Loading Users</h2>
            <p className="text-brown-600 dark:text-gray-400">{error.message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">Users</h1>
          <p className="text-brown-600 dark:text-gray-400">{data?.total || 0} total users</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-400 dark:text-gray-500" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-cream-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 dark:focus:ring-ocean-500 text-brown-800 dark:text-white placeholder:text-brown-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400" /></div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cream-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brown-600 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brown-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brown-600 dark:text-gray-400 uppercase tracking-wider">Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brown-600 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-brown-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200 dark:divide-slate-700">
                    {data?.users.map((user) => (
                      <UserRow key={user.user_id} user={user} activeMenu={activeMenu} setActiveMenu={setActiveMenu} handleUpdate={handleUpdate} onViewDetails={handleViewDetails} isUpdating={updateUser.isPending} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-cream-200 dark:divide-slate-700">
                {data?.users.map((user) => (
                  <MobileUserCard key={user.user_id} user={user} activeMenu={activeMenu} setActiveMenu={setActiveMenu} handleUpdate={handleUpdate} onViewDetails={handleViewDetails} isUpdating={updateUser.isPending} />
                ))}
              </div>
              {data?.users.length === 0 && <div className="py-12 text-center"><p className="text-brown-600 dark:text-gray-400">No users found</p></div>}
            </>
          )}
        </div>
        
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-brown-600 dark:text-gray-400">Page {data.page} of {data.total_pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-cream-200 dark:border-slate-700 hover:bg-cream-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-5 h-5 text-brown-600 dark:text-gray-400" />
              </button>
              <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages} className="p-2 rounded-lg border border-cream-200 dark:border-slate-700 hover:bg-cream-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-5 h-5 text-brown-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
        
        {updateUser.isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-coral-500 dark:text-ocean-400" />
              <span className="text-brown-800 dark:text-white">Updating user...</span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminUsers;

