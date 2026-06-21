'use client';

import React, { useState, useEffect } from 'react';
import { notificationApi } from '@/lib/api/notifications';
import { Notification, NotificationSeverity } from '@/lib/types/notifications';
import { Bell, AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Notification Error', err);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const intervalId = window.setInterval(loadNotifications, 60000);
    return () => {
      window.clearTimeout(timerId);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const getSeverityIcon = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <ShieldAlert className="text-red-500" size={18} />;
      case 'WARNING':
        return <AlertTriangle className="text-amber-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
      >
        <Bell size={20} className="text-slate-600 group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-96 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Notificações bCost
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[450px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-medium text-xs uppercase tracking-widest">
                  Tudo limpo por aqui.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-6 border-b border-slate-50 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/20' : ''}`}
                    onClick={() => handleRead(n.id)}
                  >
                    <div className="mt-1">{getSeverityIcon(n.severity)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4
                          className={`text-[11px] font-black uppercase tracking-tight ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[8px] font-bold text-slate-300 uppercase">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 self-start" />
                    )}
                  </div>
                ))
              )}
            </div>

            <button className="w-full p-4 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 hover:bg-blue-50 transition-colors">
              Ver Histórico Completo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
