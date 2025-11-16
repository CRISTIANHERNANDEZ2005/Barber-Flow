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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: Client | null;
}

const ClientForm = ({
  open,
  onOpenChange,
  onSuccess,
  client,
}: ClientFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name,
        last_name: client.last_name || "",
        phone: client.phone,
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
      });
    }
  }, [client, open]);

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length === 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error("El teléfono debe tener exactamente 10 dígitos");
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, "");

    try {
      setLoading(true);

      // Check if phone already exists (excluding current client if editing)
      let phoneQuery = supabase
        .from("clients")
        .select("id")
        .eq("phone", cleanPhone);

      if (client) {
        phoneQuery = phoneQuery.neq("id", client.id);
      }

      const { data: existingPhone, error: phoneError } = await phoneQuery;

      if (phoneError) throw phoneError;

      if (existingPhone && existingPhone.length > 0) {
        toast.error("Este número de teléfono ya está registrado");
        return;
      }

      const clientData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        phone: cleanPhone,
      };

      if (client) {
        // Update existing client
        const { error } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", client.id);

        if (error) throw error;
        toast.success("Cliente actualizado exitosamente");
      } else {
        // Insert new client
        const { error } = await supabase.from("clients").insert([clientData]);

        if (error) throw error;
        toast.success("Cliente registrado exitosamente");
      }

      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
      });

      // Call success callback first for immediate UI update
      onSuccess();

      // Small delay to ensure real-time updates propagate
      setTimeout(() => {
        onOpenChange(false);
      }, 100);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits and limit to 10 characters
    const numbersOnly = input.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phone: numbersOnly });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent">
            {client ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="first_name" className="text-foreground">
              Nombre *
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              className="bg-input border-border/50 focus:border-cyber-glow"
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div>
            <Label htmlFor="last_name" className="text-foreground">
              Apellido (Opcional)
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              className="bg-input border-border/50 focus:border-cyber-glow"
              placeholder="Apellido del cliente"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-foreground">
              Teléfono *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              className="bg-input border-border/50 focus:border-cyber-glow"
              placeholder="1234567890"
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Solo números, exactamente 10 dígitos
            </p>
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
                "Guardar Cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
