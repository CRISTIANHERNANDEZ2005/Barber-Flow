import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import PhoneInput from "./PhoneInput";
import { usePhoneValidation } from "@/hooks/use-phone-validation";
import { useRealtimeClients } from "@/hooks/use-realtime-clients";

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  client_id: string;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  service?: Service | null;
}

const ServiceForm = ({
  open,
  onOpenChange,
  onSuccess,
  service,
}: ServiceFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_phone: "",
    service_type: "",
    price: "",
    notes: "",
  });

  const { clients, loading: clientsLoading } = useRealtimeClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (service && clients.length > 0) {
      // Find the client for this service
      const client = clients.find((c) => c.id === service.client_id);
      if (client) {
        setSelectedClient(client);
        setClientSearchTerm(
          `${client.first_name} ${client.last_name || ""}`.trim(),
        );
      }

      setFormData({
        client_phone: client?.phone || "",
        service_type: service.service_type,
        price: service.price.toString(),
        notes: service.notes || "",
      });
    } else {
      setFormData({
        client_phone: "",
        service_type: "",
        price: "",
        notes: "",
      });
      setSelectedClient(null);
      setClientSearchTerm("");
    }
  }, [service, open, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !formData.service_type || !formData.price) {
      toast.error("Por favor selecciona un cliente, tipo de servicio y precio");
      return;
    }

    try {
      setLoading(true);

      const serviceData = {
        client_id: selectedClient.id,
        service_type: formData.service_type,
        price: parseFloat(formData.price),
        notes: formData.notes || null,
      };

      if (service) {
        // Update existing service
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", service.id);

        if (error) throw error;
        toast.success("Servicio actualizado exitosamente");
      } else {
        // Insert new service
        const { error } = await supabase.from("services").insert([serviceData]);

        if (error) throw error;
        toast.success("Servicio registrado exitosamente");
      }

      setFormData({
        client_phone: "",
        service_type: "",
        price: "",
        notes: "",
      });
      setSelectedClient(null);
      setClientSearchTerm("");
      setShowClientSuggestions(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setClientSearchTerm(searchTerm);
    setIsSearchingClients(true);
    setHighlightedIndex(-1);

    // Show suggestions when typing
    if (searchTerm.length > 0) {
      setShowClientSuggestions(true);

      // Clear selected client if search doesn't match
      if (selectedClient) {
        const clientName =
          `${selectedClient.first_name} ${selectedClient.last_name || ""}`.trim();
        if (
          !clientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !selectedClient.phone.includes(searchTerm)
        ) {
          setSelectedClient(null);
        }
      }
    } else {
      setShowClientSuggestions(false);
      setSelectedClient(null);
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      setIsSearchingClients(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearchTerm(
      `${client.first_name} ${client.last_name || ""}`.trim(),
    );
    setFormData({ ...formData, client_phone: client.phone });
    setShowClientSuggestions(false);
    setIsSearchingClients(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showClientSuggestions || filteredClients.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredClients.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredClients.length
        ) {
          selectClient(filteredClients[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowClientSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const formatPhone = (phone: string) => {
    // Format as (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const getFilteredClients = () => {
    if (!clientSearchTerm || clientSearchTerm.length < 1) return [];

    const searchTerm = clientSearchTerm.toLowerCase();
    return clients
      .filter((client) => {
        const fullName =
          `${client.first_name} ${client.last_name || ""}`.toLowerCase();
        const phone = client.phone.toLowerCase();

        return (
          fullName.includes(searchTerm) ||
          client.first_name.toLowerCase().includes(searchTerm) ||
          (client.last_name &&
            client.last_name.toLowerCase().includes(searchTerm)) ||
          phone.includes(searchTerm)
        );
      })
      .slice(0, 5); // Limit to 5 suggestions
  };

  const filteredClients = getFilteredClients();
  const hasSearchTerm = clientSearchTerm.length > 0;
  const noClientsFound = hasSearchTerm && filteredClients.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent">
            {service ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="client_search" className="text-foreground">
              Cliente *
              <span className="text-xs text-muted-foreground ml-2">
                (Busca por nombre o teléfono)
              </span>
              {clientsLoading && (
                <span className="text-xs text-blue-600 ml-2 animate-pulse">
                  • Actualizando lista...
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="client_search"
                type="text"
                value={clientSearchTerm}
                onChange={handleClientSearch}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (clientSearchTerm.length > 0) {
                    setShowClientSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow click events
                  setTimeout(() => {
                    setShowClientSuggestions(false);
                    setHighlightedIndex(-1);
                  }, 150);
                }}
                className="bg-input border-border/50 focus:border-cyber-glow pr-10"
                placeholder="Escribe el nombre o teléfono del cliente..."
                required
                autoComplete="off"
              />

              {/* Search icon */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isSearchingClients || clientsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Client suggestions dropdown */}
              {showClientSuggestions && hasSearchTerm && (
                <div className="absolute z-20 w-full mt-1 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {filteredClients.length > 0 ? (
                    <>
                      <div className="sticky top-0 p-2 bg-muted/80 backdrop-blur-sm border-b border-border/30 text-xs font-medium text-muted-foreground">
                        {filteredClients.length} cliente
                        {filteredClients.length !== 1 ? "s" : ""} encontrado
                        {filteredClients.length !== 1 ? "s" : ""}
                      </div>
                      {filteredClients.map((client, index) => (
                        <div
                          key={client.id}
                          className={`p-3 cursor-pointer border-b border-border/20 last:border-b-0 transition-all duration-200 hover:shadow-sm ${
                            highlightedIndex === index
                              ? "bg-cyan-100/80 dark:bg-cyan-900/40"
                              : "hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20"
                          }`}
                          onClick={() => selectClient(client)}
                          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-foreground">
                                {client.first_name} {client.last_name || ""}
                              </div>
                              <div className="text-sm text-muted-foreground font-mono">
                                📞 {formatPhone(client.phone)}
                              </div>
                            </div>
                            <div className="text-xs text-cyan-600 bg-cyan-100/50 dark:bg-cyan-900/30 px-2 py-1 rounded-full border border-cyan-200/50 dark:border-cyan-800/50">
                              Seleccionar
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : noClientsFound ? (
                    <div className="p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-foreground">
                            Cliente no encontrado
                          </p>
                          <p className="text-sm text-muted-foreground">
                            No hay clientes registrados que coincidan con "
                            <span className="font-mono bg-muted px-1 rounded">
                              {clientSearchTerm}
                            </span>
                            "
                          </p>
                          <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              💡 <strong>Sugerencia:</strong> Registra este
                              cliente en la pestaña "Clientes" primero
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    Cliente seleccionado
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    {selectedClient.first_name} {selectedClient.last_name || ""}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    📞 {formatPhone(selectedClient.phone)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearchTerm("");
                    setShowClientSuggestions(false);
                    setHighlightedIndex(-1);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {hasSearchTerm &&
              !selectedClient &&
              !showClientSuggestions &&
              noClientsFound && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Cliente no registrado
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No encontramos a "{clientSearchTerm}" en tu base de
                        clientes.
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-yellow-600">
                          💡 Ve a la pestaña "Clientes" para registrarlo
                          primero.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            // Navigate to clients tab - this could be enhanced with a callback prop
                            const clientsTab = document.querySelector(
                              '[value="clients"]',
                            ) as HTMLElement;
                            if (clientsTab) {
                              clientsTab.click();
                            }
                          }}
                          className="text-xs h-6 px-2 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
                        >
                          Registrar Cliente
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          <div>
            <Label htmlFor="service_type" className="text-foreground">
              Tipo de Corte *
            </Label>
            <Input
              id="service_type"
              value={formData.service_type}
              onChange={(e) =>
                setFormData({ ...formData, service_type: e.target.value })
              }
              className="bg-input border-border/50 focus:border-cyber-glow"
              placeholder="ej: Corte degradado, Fade, Clásico..."
              required
            />
          </div>

          <div>
            <Label htmlFor="price" className="text-foreground">
              Precio (USD) *
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="bg-input border-border/50 focus:border-cyber-glow"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-foreground">
              Notas adicionales
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="bg-input border-border/50 focus:border-cyber-glow min-h-[80px]"
              placeholder="Observaciones, preferencias del cliente..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border/50 hover:border-cyber-glow/50"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyber-glow to-cyber-secondary text-primary-foreground hover:opacity-90 shadow-[0_0_20px_hsl(var(--cyber-glow)/0.3)]"
              disabled={loading || !selectedClient}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Servicio"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
