import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, checkSupabaseHealth } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastError: string | null;
}

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

export const useRealtimeClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    connectionAttempts: 0,
    lastError: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef(true);
  const lastToastRef = useRef<string | null>(null);

  // Calculate retry delay with exponential backoff
  const getRetryDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, attempt),
      MAX_RETRY_DELAY,
    );
    return delay + Math.random() * 1000; // Add jitter
  }, []);

  const showConnectionToast = useCallback(
    (message: string, type: "error" | "success" | "info") => {
      // Avoid duplicate toasts
      if (lastToastRef.current === message) return;
      lastToastRef.current = message;

      switch (type) {
        case "error":
          toast.error(message);
          break;
        case "success":
          toast.success(message);
          break;
        case "info":
          toast.info(message);
          break;
      }

      // Clear the last toast reference after 3 seconds
      setTimeout(() => {
        if (lastToastRef.current === message) {
          lastToastRef.current = null;
        }
      }, 3000);
    },
    [],
  );

  const fetchClients = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Check connection health first
      const isHealthy = await checkSupabaseHealth();
      if (!isHealthy) {
        throw new Error("Conexión con el servidor no disponible");
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("first_name");

      if (error) throw error;

      if (isComponentMountedRef.current) {
        setClients((data as Client[]) || []);
        return true;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      if (isComponentMountedRef.current) {
        setError(errorMessage);
        console.error("Error fetching clients:", error);
      }
      return false;
    } finally {
      if (isComponentMountedRef.current) {
        setLoading(false);
      }
    }
    return false;
  }, []);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const setupRealtimeSubscription = useCallback(
    async (attemptCount = 0) => {
      if (!isComponentMountedRef.current) return;

      // Clean up existing channel
      cleanupChannel();

      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Update connection state
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: attemptCount > 0,
        connectionAttempts: attemptCount,
      }));

      if (attemptCount > 0) {
        showConnectionToast(
          `Reintentando conexión... (${attemptCount}/${MAX_RETRY_ATTEMPTS})`,
          "info",
        );
      }

      try {
        // Create new channel with unique name
        const channelName = `realtime_clients_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const channel = supabase
          .channel(channelName, {
            config: {
              presence: { key: "clients" },
              broadcast: { self: true },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "clients",
            },
            (payload) => {
              if (!isComponentMountedRef.current) return;

              try {
                switch (payload.eventType) {
                  case "INSERT":
                    setClients((prev) => {
                      const newClient = payload.new as Client;
                      const exists = prev.some(
                        (client) => client.id === newClient.id,
                      );
                      if (exists) return prev;

                      const updated = [...prev, newClient].sort((a, b) =>
                        a.first_name.localeCompare(b.first_name),
                      );
                      return updated;
                    });
                    break;

                  case "UPDATE":
                    setClients((prev) => {
                      const updatedClient = payload.new as Client;
                      return prev
                        .map((client) =>
                          client.id === updatedClient.id
                            ? updatedClient
                            : client,
                        )
                        .sort((a, b) =>
                          a.first_name.localeCompare(b.first_name),
                        );
                    });
                    break;

                  case "DELETE":
                    setClients((prev) => {
                      const deletedId = payload.old?.id;
                      return prev.filter((client) => client.id !== deletedId);
                    });
                    break;
                }
              } catch (err) {
                console.error("Error processing realtime payload:", err);
              }
            },
          )
          .subscribe((status) => {
            if (!isComponentMountedRef.current) return;

            switch (status) {
              case "SUBSCRIBED":
                console.log("✅ Real-time subscription active for clients");
                setConnectionState({
                  isConnected: true,
                  isReconnecting: false,
                  connectionAttempts: 0,
                  lastError: null,
                });

                if (attemptCount > 0) {
                  showConnectionToast(
                    "Conexión en tiempo real restablecida",
                    "success",
                  );
                }
                break;

              case "CHANNEL_ERROR":
                console.error("❌ Real-time subscription error for clients");
                setConnectionState((prev) => ({
                  ...prev,
                  isConnected: false,
                  lastError: "Error de canal",
                }));

                if (attemptCount < MAX_RETRY_ATTEMPTS) {
                  const retryDelay = getRetryDelay(attemptCount);
                  console.log(
                    `🔄 Retrying connection in ${retryDelay}ms (attempt ${attemptCount + 1}/${MAX_RETRY_ATTEMPTS})`,
                  );

                  retryTimeoutRef.current = setTimeout(() => {
                    setupRealtimeSubscription(attemptCount + 1);
                  }, retryDelay);
                } else {
                  showConnectionToast(
                    "Error en la conexión en tiempo real. Usando modo offline.",
                    "error",
                  );
                  setConnectionState((prev) => ({
                    ...prev,
                    isReconnecting: false,
                  }));
                }
                break;

              case "TIMED_OUT":
                console.warn("⏱️ Real-time connection timed out");
                setConnectionState((prev) => ({
                  ...prev,
                  isConnected: false,
                  lastError: "Timeout de conexión",
                }));

                if (attemptCount < MAX_RETRY_ATTEMPTS) {
                  const retryDelay = getRetryDelay(attemptCount);
                  retryTimeoutRef.current = setTimeout(() => {
                    setupRealtimeSubscription(attemptCount + 1);
                  }, retryDelay);
                }
                break;

              case "CLOSED":
                console.warn("🔌 Real-time connection closed");
                setConnectionState((prev) => ({
                  ...prev,
                  isConnected: false,
                  lastError: "Conexión cerrada",
                }));
                break;
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error("Error setting up realtime subscription:", error);
        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          lastError: "Error de configuración",
        }));

        if (attemptCount < MAX_RETRY_ATTEMPTS) {
          const retryDelay = getRetryDelay(attemptCount);
          retryTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription(attemptCount + 1);
          }, retryDelay);
        }
      }
    },
    [getRetryDelay, showConnectionToast, cleanupChannel],
  );

  const refreshClients = useCallback(async () => {
    setLoading(true);
    const success = await fetchClients();

    if (!success && !connectionState.isConnected) {
      // If manual refresh fails and we're not connected, try to reconnect
      setupRealtimeSubscription(0);
    }
  }, [fetchClients, connectionState.isConnected, setupRealtimeSubscription]);

  // Retry connection manually
  const retryConnection = useCallback(() => {
    if (connectionState.isReconnecting) return;
    setupRealtimeSubscription(0);
  }, [connectionState.isReconnecting, setupRealtimeSubscription]);

  // Main effect
  useEffect(() => {
    isComponentMountedRef.current = true;

    // Initial data fetch
    fetchClients().then((success) => {
      if (success) {
        // Only set up realtime if initial fetch succeeds
        setupRealtimeSubscription(0);
      }
    });

    // Cleanup function
    return () => {
      isComponentMountedRef.current = false;
      cleanupChannel();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [fetchClients, setupRealtimeSubscription, cleanupChannel]);

  // Connection health check effect
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      if (!connectionState.isConnected && !connectionState.isReconnecting) {
        const isHealthy = await checkSupabaseHealth();
        if (
          isHealthy &&
          connectionState.connectionAttempts < MAX_RETRY_ATTEMPTS
        ) {
          console.log("🔄 Server is healthy, attempting to reconnect...");
          setupRealtimeSubscription(connectionState.connectionAttempts);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [connectionState, setupRealtimeSubscription]);

  return {
    clients,
    loading,
    error,
    connectionState,
    refreshClients,
    retryConnection,
  };
};
