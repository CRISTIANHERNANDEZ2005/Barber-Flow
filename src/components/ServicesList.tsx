import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Phone, Calendar, Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface Service {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

interface ServicesListProps {
  services: Service[];
  onUpdate: () => void;
  loading: boolean;
}

const ServicesList = ({ services, onUpdate, loading }: ServicesListProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const { error } = await supabase.from("services").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Servicio eliminado");
      onUpdate();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyber-glow" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay servicios registrados todavía</p>
        <p className="text-sm mt-2">Comienza agregando tu primer servicio</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {services.map((service) => (
          <Card
            key={service.id}
            className="bg-secondary/50 backdrop-blur-sm border-border/50 p-4 hover:border-cyber-glow/50 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-lg group-hover:text-cyber-glow transition-colors">
                      {service.client_name}
                    </h3>
                    <p className="text-cyber-glow font-semibold">{service.service_type}</p>
                  </div>
                  <span className="text-2xl font-bold text-cyber-glow">
                    ${Number(service.price).toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                  {service.client_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{service.client_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(service.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {service.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-cyber-glow/30 pl-3">
                    {service.notes}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(service.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro del servicio será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-border/50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServicesList;
