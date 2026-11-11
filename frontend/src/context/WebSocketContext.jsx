import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || 'localhost:8000';
    let wsUrl = `${protocol}//${host}/ws`;

    if (user?.id) {
      wsUrl += `?user_id=${user.id}`;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        // Heartbeat ping every 25s
        ws.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Handle incoming live notification
          if (data.event === 'NEW_NOTIFICATION') {
            const notif = data.notification;
            addToast(notif.title, notif.message, notif.type);
          } else if (data.event === 'QUEUE_UPDATED') {
            if (data.status === 'serving') {
              addToast(
                'Queue Update',
                `Now Serving Token: #${data.token_number}`,
                'info'
              );
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (ws.pingInterval) clearInterval(ws.pingInterval);
        // Try reconnecting in 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WS Connection error:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        if (wsRef.current.pingInterval) clearInterval(wsRef.current.pingInterval);
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, addToast }}>
      {children}

      {/* Floating Real-Time Notifications Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-sm transition-all transform duration-300 translate-y-0 ${
              toast.type === 'serving'
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                : toast.type === 'approaching'
                ? 'bg-amber-50 text-amber-900 border-amber-200 shadow-amber-500/10'
                : toast.type === 'cancellation'
                ? 'bg-rose-50 text-rose-900 border-rose-200 shadow-rose-500/10'
                : 'bg-white text-slate-800 border-slate-200 shadow-slate-500/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-xs tracking-wider uppercase mb-1">
                  {toast.title}
                </p>
                <p className="text-xs leading-relaxed opacity-95">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 text-base leading-none p-1"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
