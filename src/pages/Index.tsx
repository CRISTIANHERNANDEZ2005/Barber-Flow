import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import StatsCard from "@/components/StatsCard";
import ServiceForm from "@/components/ServiceForm";
import ServicesList from "@/components/ServicesList";
import RevenueChart from "@/components/RevenueChart";

interface Service {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Error al cargar servicios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const todayServices = services.filter(
      s => new Date(s.created_at) >= todayStart
    );
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthServices = services.filter(
      s => new Date(s.created_at) >= thisMonth
    );

    return {
      totalServices: services.length,
      todayRevenue: todayServices.reduce((sum, s) => sum + Number(s.price), 0),
      monthRevenue: monthServices.reduce((sum, s) => sum + Number(s.price), 0),
      todayServices: todayServices.length,
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-glow/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent mb-2 tracking-tight">
            Barbería Pro
          </h1>
          <p className="text-muted-foreground text-lg">Sistema de Gestión Profesional</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Servicios Totales"
            value={stats.totalServices}
            subtitle="Registros históricos"
            icon="scissors"
          />
          <StatsCard
            title="Ingresos Hoy"
            value={`$${stats.todayRevenue.toFixed(2)}`}
            subtitle={`${stats.todayServices} servicios`}
            icon="dollar"
          />
          <StatsCard
            title="Ingresos Mes"
            value={`$${stats.monthRevenue.toFixed(2)}`}
            subtitle="Acumulado mensual"
            icon="trending"
          />
          <StatsCard
            title="Promedio/Servicio"
            value={`$${services.length > 0 ? (stats.monthRevenue / services.filter(s => new Date(s.created_at) >= new Date(new Date().setDate(1))).length || 0).toFixed(2) : '0.00'}`}
            subtitle="Este mes"
            icon="chart"
          />
        </div>

        {/* Chart Section */}
        <RevenueChart services={services} />

        {/* Services Section */}
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Servicios Recientes</h2>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-cyber-glow to-cyber-secondary text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--cyber-glow)/0.3)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </div>

          <ServicesList 
            services={services} 
            onUpdate={fetchServices}
            loading={loading}
          />
        </div>
      </div>

      <ServiceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchServices}
      />
    </div>
  );
};

export default Index;
