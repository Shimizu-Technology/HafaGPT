import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { 
  Volume2, 
  Check, 
  X, 
  RefreshCw, 
  Search,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Clock,
  Music,
  Filter
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';

interface AudioWord {
  chamorro: string;
  english: string;
  tier: string;
  category: string;
  status: 'approved' | 'needs_review' | 'needs_fix';
  url: string;
  phonetic_used: string;
  generated_at: string;
  needs_regeneration: boolean;
}

interface AudioStats {
  total: number;
  approved: number;
  needs_review: number;
  needs_fix: number;
  by_tier: {
    '1': number;
    '2': number;
    'flashcards': number;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AdminAudioReview() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [phoneticHint, setPhoneticHint] = useState('');
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'elevenlabs'>('elevenlabs');

  // Fetch audio words
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audio', statusFilter, tierFilter, search],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (statusFilter) params.append('status_filter', statusFilter);
      if (tierFilter) params.append('tier_filter', tierFilter);
      if (search) params.append('search', search);
      
      const response = await fetch(
        `${API_URL}/api/admin/audio?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch audio words');
      return response.json();
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ word, status, phonetic_hint }: { word: string; status: string; phonetic_hint?: string }) => {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/api/admin/audio/${encodeURIComponent(word)}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status, phonetic_hint })
        }
      );
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audio'] });
    }
  });

  // Regenerate audio mutation
  const regenerateMutation = useMutation({
    mutationFn: async ({ word, phonetic_hint, provider }: { word: string; phonetic_hint?: string; provider?: string }) => {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/api/admin/audio/${encodeURIComponent(word)}/regenerate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phonetic_hint, provider })
        }
      );
      if (!response.ok) throw new Error('Failed to regenerate audio');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audio'] });
      setEditingWord(null);
      setPhoneticHint('');
    }
  });

  const playAudio = (word: AudioWord) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (playingWord === word.chamorro) {
      setPlayingWord(null);
      return;
    }

    // Add cache-busting parameter to ensure we get the latest audio from S3
    const cacheBuster = Date.now();
    const audioUrl = word.url.includes('?') 
      ? `${word.url}&t=${cacheBuster}` 
      : `${word.url}?t=${cacheBuster}`;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => setPlayingWord(word.chamorro);
    audio.onended = () => setPlayingWord(null);
    audio.onerror = () => setPlayingWord(null);
    
    audio.play().catch(() => setPlayingWord(null));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'needs_fix':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'needs_fix':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case '1': return 'Games';
      case '2': return 'Dictionary';
      case 'flashcards': return 'Flashcards';
      default: return tier;
    }
  };

  const words: AudioWord[] = data?.words || [];
  const stats: AudioStats = data?.stats || { total: 0, approved: 0, needs_review: 0, needs_fix: 0, by_tier: { '1': 0, '2': 0, 'flashcards': 0 } };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audio Review</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and manage pre-generated TTS audio</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Words</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Music className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Needs Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.needs_review}</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Needs Fix</p>
                <p className="text-2xl font-bold text-red-600">{stats.needs_fix}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search words..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral-500"
            >
              <option value="">All Status</option>
              <option value="needs_review">Needs Review</option>
              <option value="approved">Approved</option>
              <option value="needs_fix">Needs Fix</option>
            </select>
            
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral-500"
            >
              <option value="">All Tiers</option>
              <option value="1">Games</option>
              <option value="2">Dictionary</option>
              <option value="flashcards">Flashcards</option>
            </select>
          </div>
        </div>

        {/* Words List */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-500">Loading audio words...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-500">Error loading audio words</p>
          </div>
        ) : words.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <Volume2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No words found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map((word) => (
              <div 
                key={word.chamorro} 
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Word Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{word.chamorro}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getStatusBadge(word.status)}`}>
                        {getStatusIcon(word.status)}
                        <span className="hidden sm:inline">{word.status.replace('_', ' ')}</span>
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {getTierLabel(word.tier)}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{word.english}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Phonetic: {word.phonetic_used}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Play button */}
                    <button
                      onClick={() => playAudio(word)}
                      disabled={!word.url}
                      className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        playingWord === word.chamorro 
                          ? 'bg-coral-600 text-white' 
                          : 'bg-coral-500 text-white hover:bg-coral-600'
                      }`}
                      title="Play audio"
                    >
                      {playingWord === word.chamorro ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    
                    {/* Approve button */}
                    <button
                      onClick={() => updateStatusMutation.mutate({ word: word.chamorro, status: 'approved' })}
                      disabled={updateStatusMutation.isPending || word.status === 'approved'}
                      className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 ${
                        word.status === 'approved' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    
                    {/* Needs Fix button */}
                    <button
                      onClick={() => updateStatusMutation.mutate({ word: word.chamorro, status: 'needs_fix' })}
                      disabled={updateStatusMutation.isPending || word.status === 'needs_fix'}
                      className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 ${
                        word.status === 'needs_fix' 
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30' 
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                      title="Needs Fix"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    {/* Regenerate button */}
                    <button
                      onClick={() => {
                        if (editingWord === word.chamorro) {
                          regenerateMutation.mutate({ word: word.chamorro, phonetic_hint: phoneticHint || undefined, provider: ttsProvider });
                        } else {
                          setEditingWord(word.chamorro);
                          setPhoneticHint(word.phonetic_used);
                        }
                      }}
                      disabled={regenerateMutation.isPending}
                      className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 ${
                        editingWord === word.chamorro 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                      title={editingWord === word.chamorro ? 'Confirm regenerate' : 'Regenerate'}
                    >
                      <RefreshCw className={`w-5 h-5 ${regenerateMutation.isPending && editingWord === word.chamorro ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {/* Phonetic hint input when editing */}
                {editingWord === word.chamorro && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                      {/* TTS Provider selector */}
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TTS Provider:</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTtsProvider('elevenlabs')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              ttsProvider === 'elevenlabs'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            ElevenLabs ✨
                          </button>
                          <button
                            onClick={() => setTtsProvider('openai')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              ttsProvider === 'openai'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            OpenAI
                          </button>
                        </div>
                      </div>
                      
                      {/* Phonetic input */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="text"
                          placeholder={ttsProvider === 'elevenlabs' 
                            ? "Phonetic hint (e.g., 'Haw-fa Ah-dye')" 
                            : "Phonetic hint (e.g., 'Hawfa Adaee')"
                          }
                          value={phoneticHint}
                          onChange={(e) => setPhoneticHint(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => regenerateMutation.mutate({ word: word.chamorro, phonetic_hint: phoneticHint || undefined, provider: ttsProvider })}
                            disabled={regenerateMutation.isPending}
                            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                            Regenerate
                          </button>
                          <button
                            onClick={() => {
                              setEditingWord(null);
                              setPhoneticHint('');
                            }}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {ttsProvider === 'elevenlabs' 
                        ? "ElevenLabs has better pronunciation. Use simple phonetic spelling like 'Haw-fa Ah-dye'."
                        : "OpenAI TTS. Phonetic hint will be used directly without conversion."
                      }
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        {words.length > 0 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
            Showing {words.length} of {stats.total} words
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
