import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface AdminStats {
  total_users: number;
  premium_users: number;
  free_users: number;
  whitelisted_users: number;
  active_today: number;
  total_conversations: number;
  total_messages: number;
  total_quiz_attempts: number;
  total_game_plays: number;
}

export interface AdminUser {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  is_premium: boolean;
  is_whitelisted: boolean;
  is_banned: boolean;
  role: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  created_at: string | null;
  last_sign_in: string | null;
  total_conversations: number;
  total_messages: number;
  total_quizzes: number;
  total_games: number;
  today_chat: number;
  today_games: number;
  today_quizzes: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserUpdateRequest {
  is_premium?: boolean;
  is_whitelisted?: boolean;
  is_banned?: boolean;
  role?: string;
  plan_name?: string;
}

export interface UserUpdateResponse {
  success: boolean;
  user: AdminUser;
  message: string;
}

// Hooks
export function useAdminStats() {
  const { getToken } = useAuth();
  
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch admin stats');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useAdminUsers(page: number = 1, perPage: number = 20, search?: string) {
  const { getToken } = useAuth();
  
  return useQuery<AdminUsersResponse>({
    queryKey: ['admin', 'users', page, perPage, search],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch users');
      }
      
      return response.json();
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useAdminUser(userId: string) {
  const { getToken } = useAuth();
  
  return useQuery<AdminUser>({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch user');
      }
      
      return response.json();
    },
    enabled: !!userId,
  });
}

export function useUpdateUser() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation<UserUpdateResponse, Error, { userId: string; data: UserUpdateRequest }>({
    mutationFn: async ({ userId, data }) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] });
    },
  });
}

