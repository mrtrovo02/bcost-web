import { api } from '@/services/api';
import { Notification } from '../types/notifications';

export const notificationApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const companyId = localStorage.getItem('bcost_active_company');
    const { data } = await api.get(`/notifications/${companyId}`);
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  acknowledge: async (id: string): Promise<void> => {
    const userId = localStorage.getItem('bcost_user_id');
    await api.post(`/notifications/${id}/acknowledge`, { userId });
  },
};
