// Deprecated: Use useClients hook from ClientsContext instead
// This file is kept for backward compatibility and will redirect to the context

import { useClients } from "@/context/ClientsContext";

export const useRealtimeClients = () => {
  console.warn(
    "useRealtimeClients is deprecated. Use useClients from ClientsContext instead.",
  );

  return useClients();
};
