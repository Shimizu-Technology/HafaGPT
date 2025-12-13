import { useState, useEffect } from 'react';
import { 
  Settings, 
  Gift, 
  Calendar, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Palette
} from 'lucide-react';
import { useAdminSettings, useUpdateAdminSettings } from '../../hooks/useAdminQuery';
import { AdminLayout } from './AdminLayout';

export function AdminSettings() {
  const { data, isLoading, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  
  // Local state for form
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [theme, setTheme] = useState('default');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load settings into form when data arrives
  useEffect(() => {
    if (data?.settings) {
      setPromoEnabled(data.settings.promo_enabled?.value === 'true');
      setPromoEndDate(data.settings.promo_end_date?.value || '2026-01-06');
      setPromoTitle(data.settings.promo_title?.value || '');
      setTheme(data.settings.theme?.value || 'default');
    }
  }, [data]);
  
  // Track changes
  useEffect(() => {
    if (!data?.settings) return;
    
    const originalEnabled = data.settings.promo_enabled?.value === 'true';
    const originalEndDate = data.settings.promo_end_date?.value || '';
    const originalTitle = data.settings.promo_title?.value || '';
    const originalTheme = data.settings.theme?.value || 'default';
    
    const changed = 
      promoEnabled !== originalEnabled ||
      promoEndDate !== originalEndDate ||
      promoTitle !== originalTitle ||
      theme !== originalTheme;
    
    setHasChanges(changed);
  }, [promoEnabled, promoEndDate, promoTitle, theme, data]);
  
  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        promo_enabled: promoEnabled.toString(),
        promo_end_date: promoEndDate,
        promo_title: promoTitle,
        theme: theme,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
            <p className="text-brown-600 dark:text-gray-400">Loading settings...</p>
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
            <h2 className="text-xl font-bold text-brown-800 dark:text-white mb-2">Error Loading Settings</h2>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-coral-500 dark:text-ocean-400" />
              Settings
            </h1>
            <p className="text-brown-600 dark:text-gray-400 mt-1">
              Configure site-wide settings
            </p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
              hasChanges 
                ? 'bg-coral-500 dark:bg-ocean-500 text-white hover:bg-coral-600 dark:hover:bg-ocean-600 shadow-lg'
                : 'bg-cream-200 dark:bg-slate-700 text-brown-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
        
        {/* Success Toast */}
        {saveSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-300 font-medium">Settings saved successfully!</p>
          </div>
        )}
        
        {/* Promo Settings Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-cream-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-200 dark:border-slate-700 bg-gradient-to-r from-red-50 to-green-50 dark:from-red-900/20 dark:to-green-900/20">
            <h2 className="text-lg font-bold text-brown-800 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-red-500" />
              Holiday Promo Settings
            </h2>
            <p className="text-sm text-brown-500 dark:text-gray-400 mt-1">
              Control the holiday promotional period for unlimited access
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Promo Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-cream-50 dark:bg-slate-700/50 rounded-xl">
              <div>
                <label className="font-medium text-brown-800 dark:text-white">
                  Enable Promotional Period
                </label>
                <p className="text-sm text-brown-500 dark:text-gray-400 mt-0.5">
                  When enabled, all users get unlimited access
                </p>
              </div>
              <button
                onClick={() => setPromoEnabled(!promoEnabled)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                  promoEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={promoEnabled}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                    promoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Promo End Date */}
            <div>
              <label className="block font-medium text-brown-800 dark:text-white mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Promo End Date
                </div>
              </label>
              <input
                type="date"
                value={promoEndDate}
                onChange={(e) => setPromoEndDate(e.target.value)}
                className="w-full sm:w-64 px-4 py-2.5 bg-cream-50 dark:bg-slate-900 border border-cream-300 dark:border-slate-600 rounded-xl text-brown-800 dark:text-white focus:ring-2 focus:ring-coral-500 dark:focus:ring-ocean-500 focus:border-transparent"
              />
              <p className="text-sm text-brown-500 dark:text-gray-400 mt-1.5">
                Promo will end at midnight Guam time (ChST) on this date
              </p>
            </div>
            
            {/* Promo Title */}
            <div>
              <label className="block font-medium text-brown-800 dark:text-white mb-2">
                Banner Title
              </label>
              <input
                type="text"
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="Felis Påsgua! Holiday Gift: Unlimited Access!"
                className="w-full px-4 py-2.5 bg-cream-50 dark:bg-slate-900 border border-cream-300 dark:border-slate-600 rounded-xl text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-coral-500 dark:focus:ring-ocean-500 focus:border-transparent"
              />
            </div>
            
            {/* Preview - Theme-aware */}
            {promoEnabled && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-brown-600 dark:text-gray-400 mb-2">
                  Banner Preview ({theme === 'default' ? 'Default' : theme === 'christmas' ? 'Christmas' : theme === 'newyear' ? 'New Year' : 'Chamorro'} Theme)
                </label>
                <div className={`relative overflow-hidden rounded-xl p-4 text-white text-center ${
                  theme === 'christmas' 
                    ? 'bg-gradient-to-r from-red-600 to-green-600' 
                    : theme === 'newyear'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500'
                    : theme === 'chamorro'
                    ? 'bg-gradient-to-r from-blue-600 to-red-500'
                    : 'bg-gradient-to-r from-coral-500 to-teal-500'
                }`}>
                  {theme === 'christmas' && (
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-1 left-4 text-xl">❄</div>
                      <div className="absolute top-2 right-8 text-lg">❄</div>
                    </div>
                  )}
                  {theme === 'newyear' && (
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-1 left-4 text-xl">✨</div>
                      <div className="absolute top-2 right-8 text-lg">🎊</div>
                    </div>
                  )}
                  <div className="relative flex items-center justify-center gap-3">
                    <span className="text-xl">
                      {theme === 'christmas' ? '🎄' : theme === 'newyear' ? '🎆' : theme === 'chamorro' ? '🇬🇺' : '🎉'}
                    </span>
                    <div>
                      <p className="font-bold">{promoTitle || 'Special Promo: Unlimited Access!'}</p>
                      <p className="text-white/90 text-xs">
                        Enjoy unlimited learning through {promoEndDate ? new Date(promoEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'the promo period'}!
                      </p>
                    </div>
                    <span className="text-xl">
                      {theme === 'christmas' ? '🎁' : theme === 'newyear' ? '🥳' : theme === 'chamorro' ? '🌺' : '🎊'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Theme Settings Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-cream-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-brown-800 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Theme Settings
            </h2>
            <p className="text-sm text-brown-500 dark:text-gray-400 mt-1">
              Choose a seasonal theme for the app
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'default', label: 'Default', emoji: '🌺', color: 'from-coral-500 to-coral-600' },
                { id: 'christmas', label: 'Christmas', emoji: '🎄', color: 'from-red-500 to-green-500' },
                { id: 'newyear', label: 'New Year', emoji: '🎆', color: 'from-purple-500 to-pink-500' },
                { id: 'chamorro', label: 'Chamorro', emoji: '🇬🇺', color: 'from-blue-500 to-red-500' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === t.id
                      ? 'border-coral-500 dark:border-ocean-400 bg-coral-50 dark:bg-ocean-900/20'
                      : 'border-cream-200 dark:border-slate-700 hover:border-cream-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${t.color} mb-2`} />
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{t.emoji}</span>
                    <span className="text-sm font-medium text-brown-800 dark:text-white">{t.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-brown-400 dark:text-gray-500 mt-3 text-center">
              Theme affects snowfall, logos, and promo banner styling
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
