import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ServiceForm = ({ open, onOpenChange, onSuccess }: ServiceFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    service_type: "",
    price: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name || !formData.service_type || !formData.price) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("services").insert([
        {
          client_name: formData.client_name,
          client_phone: formData.client_phone || null,
          service_type: formData.service_type,
          price: parseFloat(formData.price),
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      toast.success("Servicio registrado exitosamente");
      setFormData({
        client_name: "",
        client_phone: "",
        service_type: "",
        price: "",
        notes: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent">
            Nuevo Servicio
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="client_name" className="text-foreground">
              Nombre del Cliente *
            </Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="bg-input border-border/50 focus:border-cyber-glow"
              required
            />
          </div>

          <div>
            <Label htmlFor="client_phone" className="text-foreground">
              Teléfono
            </Label>
            <Input
              id="client_phone"
              type="tel"
              value={formData.client_phone}
              onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
              className="bg-input border-border/50 focus:border-cyber-glow"
            />
          </div>

          <div>
            <Label htmlFor="service_type" className="text-foreground">
              Tipo de Corte *
            </Label>
            <Input
              id="service_type"
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              disabled={loading}
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
