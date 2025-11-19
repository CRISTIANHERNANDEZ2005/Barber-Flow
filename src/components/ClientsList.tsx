import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Phone,
  Calendar,
  Loader2,
  Pencil,
  Search,
  User,
  Users as UsersIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface ClientsListProps {
  clients: Client[];
  onUpdate: () => void;
  loading: boolean;
  onEdit: (client: Client) => void;
}

const ClientsList = ({ clients, onUpdate, loading, onEdit }: ClientsListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "asc" | "desc">("recent");
  const [clientWithServices, setClientWithServices] = useState<{client: Client, serviceCount: number} | null>(null);
  const [showServicesDialog, setShowServicesDialog] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);

      // Check if client has associated services
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("id")
        .eq("client_id", id);

      if (servicesError) throw servicesError;

      if (services && services.length > 0) {
        const client = clients.find(c => c.id === id);
        if (client) {
          setClientWithServices({client, serviceCount: services.length});
          setShowServicesDialog(true);
        }
        return;
      }

      // If no services, proceed with deletion
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Cliente eliminado exitosamente");
      onUpdate();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar cliente: " + errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteWithServices = async () => {
    if (!clientWithServices) return;
    
    try {
      // In a real application, you might want to implement cascading deletion
      // or transfer services to another client before deleting
      toast.error(
        `No se puede eliminar el cliente porque tiene ${clientWithServices.serviceCount} servicio(s) asociado(s). ` +
        "Por favor, elimine primero los servicios asociados o transfiera estos servicios a otro cliente."
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al procesar la solicitud: " + errorMessage);
    } finally {
      setShowServicesDialog(false);
      setClientWithServices(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFullName = (client: Client) => {
    return client.last_name
      ? `${client.first_name} ${client.last_name}`
      : client.first_name;
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

  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = getFullName(client).toLowerCase();
    return (
      fullName.includes(term) ||
      client.phone.includes(term)
    );
  });

  // Sort clients based on selected order
  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortOrder) {
      case "recent":
        // Most recent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "asc":
        // Alphabetical ascending
        return getFullName(a).localeCompare(getFullName(b));
      case "desc":
        // Alphabetical descending
        return getFullName(b).localeCompare(getFullName(a));
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-cyber-glow" />
          <span className="text-muted-foreground">Cargando clientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar cliente por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border/50 focus:border-cyber-glow"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={sortOrder === "recent" ? "default" : "outline"}
            onClick={() => setSortOrder("recent")}
            className={sortOrder === "recent" ? "bg-cyber-glow text-black hover:bg-cyber-glow/90" : ""}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Recientes
          </Button>
          
          <Button
            variant={sortOrder === "asc" ? "default" : "outline"}
            onClick={() => setSortOrder("asc")}
            className={sortOrder === "asc" ? "bg-cyber-glow text-black hover:bg-cyber-glow/90" : ""}
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            A-Z
          </Button>
          
          <Button
            variant={sortOrder === "desc" ? "default" : "outline"}
            onClick={() => setSortOrder("desc")}
            className={sortOrder === "desc" ? "bg-cyber-glow text-black hover:bg-cyber-glow/90" : ""}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Z-A
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          <span>
            {sortedClients.length} cliente{sortedClients.length !== 1 ? "s" : ""}
            {searchTerm && ` encontrado${sortedClients.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpiar búsqueda
          </Button>
        )}
      </div>

      {/* Clients Grid */}
      {sortedClients.length === 0 ? (
        <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Intenta con otros términos de búsqueda"
              : "Agrega tu primer cliente para comenzar"
            }
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedClients.map((client) => (
            <Card
              key={client.id}
              className="p-4 bg-card/50 backdrop-blur-xl border-border/50 hover:border-cyber-glow/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">
                    {getFullName(client)}
                  </h3>
                  {client.last_name && (
                    <p className="text-xs text-muted-foreground">
                      Nombre: {client.first_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                    className="h-8 w-8 p-0 hover:bg-cyber-glow/20 hover:text-cyber-glow"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-500"
                        disabled={deletingId === client.id}
                      >
                        {deletingId === client.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          Confirmar Eliminación
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>
                            ¿Está seguro que desea eliminar al cliente <strong>{getFullName(client)}</strong>?
                          </p>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Importante:</strong> Si este cliente tiene servicios registrados, 
                              no podrá ser eliminado directamente. En su lugar, se le mostrará un mensaje 
                              con las opciones disponibles para manejar los servicios asociados.
                            </p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border/50">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(client.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Proceder con Eliminación
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{formatPhone(client.phone)}</span>
                  <Badge variant="outline" className="text-xs">
                    Único
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Registrado: {formatDate(client.created_at)}</span>
                </div>

                {client.updated_at !== client.created_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Pencil className="h-3 w-3" />
                    <span>Actualizado: {formatDate(client.updated_at)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="bg-cyber-glow/10 text-cyber-glow border-cyber-glow/30"
                  >
                    Cliente Activo
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ID: {client.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Professional dialog for clients with services */}
      <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Acción Restringida
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              {clientWithServices && (
                <>
                  <p>
                    El cliente <strong>{getFullName(clientWithServices.client)}</strong> tiene {clientWithServices.serviceCount} servicio(s) asociado(s) en el sistema.
                  </p>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Política de Protección de Datos:</strong> No se permite la eliminación directa de clientes con registros activos para mantener la integridad del historial de servicios.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <h4 className="font-medium">Opciones disponibles:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Eye className="h-4 w-4 mt-0.5 text-cyber-glow flex-shrink-0" />
                        <span>Revisar y eliminar manualmente los servicios asociados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowUpDown className="h-4 w-4 mt-0.5 text-cyber-glow flex-shrink-0" />
                        <span>Transferir servicios a otro cliente antes de eliminar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-cyber-glow flex-shrink-0" />
                        <span>Marcar como cliente inactivo (recomendado)</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowServicesDialog(false)}
              className="border-border/50"
            >
              Entendido
            </Button>
            <Button
              onClick={confirmDeleteWithServices}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled
            >
              Eliminar (Bloqueado)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ClientsList;