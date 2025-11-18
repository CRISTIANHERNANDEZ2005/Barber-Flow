import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
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

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  connectionState: ConnectionState;
  lastUpdated: number;
}

type ClientsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CLIENTS"; payload: Client[] }
  | { type: "ADD_CLIENT"; payload: Client }
  | { type: "UPDATE_CLIENT"; payload: Client }
  | { type: "DELETE_CLIENT"; payload: string }
  | { type: "SET_CONNECTION_STATE"; payload: Partial<ConnectionState> }
  | { type: "OPTIMISTIC_ADD_CLIENT"; payload: Client }
  | { type: "OPTIMISTIC_UPDATE_CLIENT"; payload: Client }
  | { type: "OPTIMISTIC_DELETE_CLIENT"; payload: string }
  | { type: "REVERT_OPTIMISTIC"; payload: Client[] };

const initialState: ClientsState = {
  clients: [],
  loading: true,
  error: null,
  connectionState: {
    isConnected: false,
    isReconnecting: false,
    connectionAttempts: 0,
    lastError: null,
  },
  lastUpdated: 0,
};

function clientsReducer(
  state: ClientsState,
  action: ClientsAction,
): ClientsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_CLIENTS":
      return {
        ...state,
        clients: action.payload,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      };

    case "ADD_CLIENT":
      return {
        ...state,
        clients: [...state.clients, action.payload],
        lastUpdated: Date.now(),
      };

    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.payload.id ? action.payload : client,
        ),
        lastUpdated: Date.now(),
      };

    case "DELETE_CLIENT":
      return {
        ...state,
        clients: state.clients.filter((client) => client.id !== action.payload),
        lastUpdated: Date.now(),
      };

    case "SET_CONNECTION_STATE":
      return {
        ...state,
        connectionState: { ...state.connectionState, ...action.payload },
      };

    case "OPTIMISTIC_ADD_CLIENT": {
      // Add client optimistically (with temporary ID if needed)
      const optimisticClient = {
        ...action.payload,
        id: action.payload.id || `temp_${Date.now()}`,
      };
      return {
        ...state,
        clients: [...state.clients, optimisticClient],
        lastUpdated: Date.now(),
      };
    }

    case "OPTIMISTIC_UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.payload.id ? action.payload : client,
        ),
        lastUpdated: Date.now(),
      };

    case "OPTIMISTIC_DELETE_CLIENT":
      return {
        ...state,
        clients: state.clients.filter((client) => client.id !== action.payload),
        lastUpdated: Date.now(),
      };

    case "REVERT_OPTIMISTIC":
      return {
        ...state,
        clients: action.payload,
        lastUpdated: Date.now(),
      };

    default:
      return state;
  }
}

interface ClientsContextType {
  // State
  clients: Client[];
  loading: boolean;
  error: string | null;
  connectionState: ConnectionState;
  lastUpdated: number;

  // Actions
  refreshClients: () => Promise<void>;
  retryConnection: () => void;
  addClientOptimistic: (
    client: Omit<Client, "id" | "created_at" | "updated_at">,
  ) => Promise<Client | null>;
  updateClientOptimistic: (
    id: string,
    updates: Partial<Client>,
  ) => Promise<boolean>;
  deleteClientOptimistic: (id: string) => Promise<boolean>;

  // Utilities
  findClientByPhone: (phone: string) => Client | null;
  findClientById: (id: string) => Client | null;
  getClientFullName: (client: Client) => string;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

interface ClientsProviderProps {
  children: ReactNode;
}

export const ClientsProvider: React.FC<ClientsProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(clientsReducer, initialState);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef(true);
  const lastToastRef = useRef<string | null>(null);
  const backupClientsRef = useRef<Client[]>([]);

  const showConnectionToast = useCallback(
    (message: string, type: "error" | "success" | "info") => {
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

      setTimeout(() => {
        if (lastToastRef.current === message) {
          lastToastRef.current = null;
        }
      }, 3000);
    },
    [],
  );

  const getRetryDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, attempt),
      MAX_RETRY_DELAY,
    );
    return delay + Math.random() * 1000;
  }, []);

  const fetchClients = useCallback(async (): Promise<Client[]> => {
    try {
      dispatch({ type: "SET_ERROR", payload: null });

      const isHealthy = await checkSupabaseHealth();
      if (!isHealthy) {
        throw new Error("Conexión con el servidor no disponible");
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clients = (data as Client[]) || [];
      dispatch({ type: "SET_CLIENTS", payload: clients });
      backupClientsRef.current = clients;
      return clients;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      console.error("Error fetching clients:", error);
      return backupClientsRef.current;
    }
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

      cleanupChannel();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: {
          isReconnecting: attemptCount > 0,
          connectionAttempts: attemptCount,
        },
      });

      if (attemptCount > 0) {
        showConnectionToast(
          `Reintentando conexión... (${attemptCount}/${MAX_RETRY_ATTEMPTS})`,
          "info",
        );
      }

      try {
        const channelName = `clients_realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
                  case "INSERT": {
                    const newClient = payload.new as Client;
                    dispatch({ type: "ADD_CLIENT", payload: newClient });
                    console.log(
                      "✅ Client added via realtime:",
                      newClient.first_name,
                    );
                    break;
                  }

                  case "UPDATE": {
                    const updatedClient = payload.new as Client;
                    dispatch({ type: "UPDATE_CLIENT", payload: updatedClient });
                    console.log(
                      "✅ Client updated via realtime:",
                      updatedClient.first_name,
                    );
                    break;
                  }

                  case "DELETE": {
                    const deletedId = payload.old?.id;
                    if (deletedId) {
                      dispatch({ type: "DELETE_CLIENT", payload: deletedId });
                      console.log("✅ Client deleted via realtime:", deletedId);
                    }
                    break;
                  }
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
                console.log("✅ Clients realtime subscription active");
                dispatch({
                  type: "SET_CONNECTION_STATE",
                  payload: {
                    isConnected: true,
                    isReconnecting: false,
                    connectionAttempts: 0,
                    lastError: null,
                  },
                });

                if (attemptCount > 0) {
                  showConnectionToast(
                    "Conexión de clientes restablecida",
                    "success",
                  );
                }
                break;

              case "CHANNEL_ERROR":
                console.error("❌ Clients realtime subscription error");
                dispatch({
                  type: "SET_CONNECTION_STATE",
                  payload: {
                    isConnected: false,
                    lastError: "Error de canal",
                  },
                });

                if (attemptCount < MAX_RETRY_ATTEMPTS) {
                  const retryDelay = getRetryDelay(attemptCount);
                  retryTimeoutRef.current = setTimeout(() => {
                    setupRealtimeSubscription(attemptCount + 1);
                  }, retryDelay);
                } else {
                  showConnectionToast(
                    "Error en conexión de clientes. Usando modo offline.",
                    "error",
                  );
                  dispatch({
                    type: "SET_CONNECTION_STATE",
                    payload: { isReconnecting: false },
                  });
                }
                break;

              case "TIMED_OUT":
                console.warn("⏱️ Clients realtime connection timed out");
                dispatch({
                  type: "SET_CONNECTION_STATE",
                  payload: {
                    isConnected: false,
                    lastError: "Timeout de conexión",
                  },
                });

                if (attemptCount < MAX_RETRY_ATTEMPTS) {
                  const retryDelay = getRetryDelay(attemptCount);
                  retryTimeoutRef.current = setTimeout(() => {
                    setupRealtimeSubscription(attemptCount + 1);
                  }, retryDelay);
                }
                break;

              case "CLOSED":
                console.warn("🔌 Clients realtime connection closed");
                dispatch({
                  type: "SET_CONNECTION_STATE",
                  payload: {
                    isConnected: false,
                    lastError: "Conexión cerrada",
                  },
                });
                break;
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error("Error setting up clients realtime subscription:", error);
        dispatch({
          type: "SET_CONNECTION_STATE",
          payload: {
            isConnected: false,
            lastError: "Error de configuración",
          },
        });

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

  // Actions
  const refreshClients = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    await fetchClients();
    dispatch({ type: "SET_LOADING", payload: false });
  }, [fetchClients]);

  const retryConnection = useCallback(() => {
    if (state.connectionState.isReconnecting) return;
    setupRealtimeSubscription(0);
  }, [state.connectionState.isReconnecting, setupRealtimeSubscription]);

  const addClientOptimistic = useCallback(
    async (
      clientData: Omit<Client, "id" | "created_at" | "updated_at">,
    ): Promise<Client | null> => {
      const tempId = `temp_${Date.now()}`;
      const tempClient: Client = {
        ...clientData,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      dispatch({ type: "OPTIMISTIC_ADD_CLIENT", payload: tempClient });

      try {
        const { data, error } = await supabase
          .from("clients")
          .insert([clientData])
          .select()
          .single();

        if (error) throw error;

        // Replace optimistic client with real one
        const realClient = data as Client;
        dispatch({ type: "DELETE_CLIENT", payload: tempId });
        dispatch({ type: "ADD_CLIENT", payload: realClient });

        return realClient;
      } catch (error) {
        // Revert optimistic update
        dispatch({ type: "DELETE_CLIENT", payload: tempId });
        console.error("Error adding client:", error);
        return null;
      }
    },
    [],
  );

  const updateClientOptimistic = useCallback(
    async (id: string, updates: Partial<Client>): Promise<boolean> => {
      const currentClient = state.clients.find((c) => c.id === id);
      if (!currentClient) return false;

      const updatedClient = { ...currentClient, ...updates };

      // Optimistic update
      dispatch({ type: "OPTIMISTIC_UPDATE_CLIENT", payload: updatedClient });

      try {
        const { error } = await supabase
          .from("clients")
          .update(updates)
          .eq("id", id);

        if (error) throw error;
        return true;
      } catch (error) {
        // Revert optimistic update
        dispatch({ type: "UPDATE_CLIENT", payload: currentClient });
        console.error("Error updating client:", error);
        return false;
      }
    },
    [state.clients],
  );

  const deleteClientOptimistic = useCallback(
    async (id: string): Promise<boolean> => {
      const clientToDelete = state.clients.find((c) => c.id === id);
      if (!clientToDelete) return false;

      // Optimistic update
      dispatch({ type: "OPTIMISTIC_DELETE_CLIENT", payload: id });

      try {
        const { error } = await supabase.from("clients").delete().eq("id", id);

        if (error) throw error;
        return true;
      } catch (error) {
        // Revert optimistic update
        dispatch({ type: "ADD_CLIENT", payload: clientToDelete });
        console.error("Error deleting client:", error);
        return false;
      }
    },
    [state.clients],
  );

  // Utilities
  const findClientByPhone = useCallback(
    (phone: string): Client | null => {
      return state.clients.find((client) => client.phone === phone) || null;
    },
    [state.clients],
  );

  const findClientById = useCallback(
    (id: string): Client | null => {
      return state.clients.find((client) => client.id === id) || null;
    },
    [state.clients],
  );

  const getClientFullName = useCallback((client: Client): string => {
    return `${client.first_name} ${client.last_name || ""}`.trim();
  }, []);

  // Main effect
  useEffect(() => {
    isComponentMountedRef.current = true;

    fetchClients().then((clients) => {
      if (
        clients.length > 0 ||
        state.connectionState.connectionAttempts === 0
      ) {
        setupRealtimeSubscription(0);
      }
    });

    return () => {
      isComponentMountedRef.current = false;
      cleanupChannel();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [fetchClients, setupRealtimeSubscription, cleanupChannel]);

  // Health check effect
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      if (
        !state.connectionState.isConnected &&
        !state.connectionState.isReconnecting
      ) {
        const isHealthy = await checkSupabaseHealth();
        if (
          isHealthy &&
          state.connectionState.connectionAttempts < MAX_RETRY_ATTEMPTS
        ) {
          console.log(
            "🔄 Server is healthy, attempting to reconnect clients...",
          );
          setupRealtimeSubscription(state.connectionState.connectionAttempts);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [
    state.connectionState,
    setupRealtimeSubscription,
    state.connectionState.connectionAttempts,
  ]);

  const contextValue: ClientsContextType = {
    // State
    clients: state.clients,
    loading: state.loading,
    error: state.error,
    connectionState: state.connectionState,
    lastUpdated: state.lastUpdated,

    // Actions
    refreshClients,
    retryConnection,
    addClientOptimistic,
    updateClientOptimistic,
    deleteClientOptimistic,

    // Utilities
    findClientByPhone,
    findClientById,
    getClientFullName,
  };

  return (
    <ClientsContext.Provider value={contextValue}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = (): ClientsContextType => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error("useClients must be used within a ClientsProvider");
  }
  return context;
};

export type { Client, ConnectionState };