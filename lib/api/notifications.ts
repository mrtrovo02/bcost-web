import { api } from '@/services/api';
import { Notification } from '../types/notifications';

export const notificationApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const { data } = await api.get('/notifications');
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/ack`);
  },

  acknowledge: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/ack`);
  },
};
