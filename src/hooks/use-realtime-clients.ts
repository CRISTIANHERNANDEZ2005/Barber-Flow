import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

export const useRealtimeClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("first_name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setError(errorMessage);
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchClients();

    // Set up real-time subscription
    const channel = supabase
      .channel("realtime_clients")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              setClients((prev) => {
                const newClient = payload.new as Client;
                const exists = prev.some(client => client.id === newClient.id);
                if (exists) return prev;

                // Insert in alphabetical order
                const updated = [...prev, newClient].sort((a, b) =>
                  a.first_name.localeCompare(b.first_name)
                );
                return updated;
              });
              break;

            case "UPDATE":
              setClients((prev) => {
                const updatedClient = payload.new as Client;
                return prev.map((client) =>
                  client.id === updatedClient.id ? updatedClient : client
                ).sort((a, b) => a.first_name.localeCompare(b.first_name));
              });
              break;

            case "DELETE":
              setClients((prev) => {
                const deletedId = payload.old?.id;
                return prev.filter((client) => client.id !== deletedId);
              });
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Real-time subscription active for clients");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Real-time subscription error for clients");
          toast.error("Error en la conexión en tiempo real");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  const refreshClients = useCallback(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refreshClients,
  };
};
