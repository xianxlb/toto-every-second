import { useState, useEffect, useRef } from "react";

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(url);

      ws.addEventListener("open", () => {
        reconnectAttemptRef.current = 0;
        setSocket(ws);
      });

      ws.addEventListener("close", () => {
        setSocket(null);

        const baseDelay = 1000;
        const delay = Math.min(
          baseDelay * Math.pow(2, reconnectAttemptRef.current),
          30000
        );

        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectAttemptRef.current++;
          connect();
        }, delay);
      });
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url]);

  return socket;
}
