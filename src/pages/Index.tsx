import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  BarChart3,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import ServiceForm from "@/components/ServiceForm";
import ServicesList from "@/components/ServicesList";
import RevenueChart from "@/components/RevenueChart";
import SearchFilters from "@/components/SearchFilters";
import DailyPatternsChart from "@/components/DailyPatternsChart";
import ClientForm from "@/components/ClientForm";
import ClientsList from "@/components/ClientsList";
import ClientStatistics from "@/components/ClientStatistics";
import { useClients } from "@/context/ClientsContext";
import ConnectionStatus from "@/components/connection/ConnectionStatus";

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
  client?: Client;
}

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);
  const {
    clients,
    loading: clientsLoading,
    refreshClients,
    connectionState,
    retryConnection,
  } = useClients();
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchServices();

    // Set up real-time subscription for services only (clients handled by hook)
    const servicesChannel = supabase
      .channel("services_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
        },
        () => {
          fetchServices();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
    };
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          client:clients(*)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar servicios: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));

    // Filter services by selected year
    const yearServices = services.filter((s) => {
      const serviceYear = new Date(s.created_at).getFullYear();
      return serviceYear === selectedYear;
    });

    const todayServices = yearServices.filter(
      (s) => new Date(s.created_at) >= todayStart,
    );

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthServices = yearServices.filter(
      (s) => new Date(s.created_at) >= thisMonth,
    );

    return {
      totalServices: yearServices.length,
      todayRevenue: todayServices.reduce((sum, s) => sum + Number(s.price), 0),
      monthRevenue: monthServices.reduce((sum, s) => sum + Number(s.price), 0),
      todayServices: todayServices.length,
      yearRevenue: yearServices.reduce((sum, s) => sum + Number(s.price), 0),
    };
  };

  const filteredServices = useMemo(() => {
    let filtered = services;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.client?.first_name.toLowerCase().includes(term) ||
          service.client?.last_name?.toLowerCase().includes(term) ||
          service.client?.phone.includes(term) ||
          service.service_type.toLowerCase().includes(term),
      );
    }

    // Filter by date
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const filterDateStart = new Date(filterDate.setHours(0, 0, 0, 0));
      const filterDateEnd = new Date(filterDate.setHours(23, 59, 59, 999));

      filtered = filtered.filter((service) => {
        const serviceDate = new Date(service.created_at);
        return serviceDate >= filterDateStart && serviceDate <= filterDateEnd;
      });
    }

    return filtered;
  }, [services, searchTerm, dateFilter]);

  const stats = calculateStats();

  // Get available years from services
  const availableYears = useMemo(() => {
    const years = new Set(services.map(s => new Date(s.created_at).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [services]);

  // Filter services by selected year for charts
  const filteredServicesByYear = useMemo(() => {
    return services.filter((s) => {
      const serviceYear = new Date(s.created_at).getFullYear();
      return serviceYear === selectedYear;
    });
  }, [services, selectedYear]);

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsServiceFormOpen(true);
  };

  const handleServiceFormClose = (open: boolean) => {
    setIsServiceFormOpen(open);
    if (!open) {
      setEditingService(null);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientFormOpen(true);
  };

  const handleClientFormClose = (open: boolean) => {
    setIsClientFormOpen(open);
    if (!open) {
      setEditingClient(null);
    }
  };

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
          <p className="text-muted-foreground text-lg">
            Sistema de Gestión Profesional
          </p>

          {/* Connection Status */}
          <div className="mt-4 flex justify-center">
            <ConnectionStatus
              connectionState={connectionState}
              onRetry={retryConnection}
              compact={true}
            />
          </div>
        </header>

        {/* Main Tabs Navigation */}
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="mb-8 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-4xl md:mx-auto md:grid-cols-4 bg-card/50 backdrop-blur-xl border border-border/50 p-1.5 gap-1">
              <TabsTrigger
                value="dashboard"
                className="flex-shrink-0 min-w-[140px] md:min-w-0 px-6 py-3 md:px-4 md:py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-glow data-[state=active]:to-cyber-secondary data-[state=active]:text-primary-foreground transition-all duration-200 hover:scale-105"
              >
                <BarChart3 className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="font-medium">Estadísticas</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="flex-shrink-0 min-w-[140px] md:min-w-0 px-6 py-3 md:px-4 md:py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-glow data-[state=active]:to-cyber-secondary data-[state=active]:text-primary-foreground transition-all duration-200 hover:scale-105"
              >
                <TrendingUp className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="font-medium">Patrones</span>
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex-shrink-0 min-w-[140px] md:min-w-0 px-6 py-3 md:px-4 md:py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-glow data-[state=active]:to-cyber-secondary data-[state=active]:text-primary-foreground transition-all duration-200 hover:scale-105"
              >
                <Users className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="font-medium">Clientes</span>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="flex-shrink-0 min-w-[140px] md:min-w-0 px-6 py-3 md:px-4 md:py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-glow data-[state=active]:to-cyber-secondary data-[state=active]:text-primary-foreground transition-all duration-200 hover:scale-105"
              >
                <ClipboardList className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="font-medium">Servicios</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard/Statistics Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Year Filter Selector */}
            {availableYears.length > 0 && (
              <div className="flex justify-center items-center gap-4 mb-6">
                <span className="text-sm font-medium text-muted-foreground">Año:</span>
                <div className="flex gap-2 flex-wrap justify-center">
                  {availableYears.map((year) => (
                    <Button
                      key={year}
                      variant={selectedYear === year ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedYear(year)}
                      className={
                        selectedYear === year
                          ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary"
                          : ""
                      }
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Servicios Totales"
                value={stats.totalServices}
                subtitle={`En ${selectedYear}`}
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
                title="Ingresos Año"
                value={`$${stats.yearRevenue.toFixed(2)}`}
                subtitle={`Total ${selectedYear}`}
                icon="chart"
              />
            </div>

            {/* Chart Section */}
            <RevenueChart services={filteredServicesByYear} selectedYear={selectedYear} />
          </TabsContent>

          {/* Daily Patterns Analysis Tab */}
          <TabsContent value="patterns">
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Análisis de Patrones Diarios
                </h2>
                <p className="text-muted-foreground">
                  Descubre qué días y horas son más productivos para tu barbería
                </p>
              </div>

              {/* Year Filter Selector for Patterns */}
              {availableYears.length > 0 && (
                <div className="flex justify-center items-center gap-4 mb-6">
                  <span className="text-sm font-medium text-muted-foreground">Año:</span>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {availableYears.map((year) => (
                      <Button
                        key={year}
                        variant={selectedYear === year ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedYear(year)}
                        className={
                          selectedYear === year
                            ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary"
                            : ""
                        }
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <DailyPatternsChart services={filteredServicesByYear} selectedYear={selectedYear} />
            </div>
          </TabsContent>

          {/* Clients Management Tab */}
          <TabsContent value="clients">
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Gestión de Clientes
                </h2>
                <Button
                  onClick={() => {
                    setEditingClient(null);
                    setIsClientFormOpen(true);
                  }}
                  className="bg-gradient-to-r from-cyber-glow to-cyber-secondary text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--cyber-glow)/0.3)]"
                  disabled={
                    !connectionState.isConnected &&
                    connectionState.isReconnecting
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Cliente
                </Button>
              </div>

              {/* Client Management Subtabs */}
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6 bg-muted/50">
                  <TabsTrigger
                    value="list"
                    className="data-[state=active]:bg-cyber-glow/20"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Lista de Clientes
                  </TabsTrigger>
                  <TabsTrigger
                    value="stats"
                    className="data-[state=active]:bg-cyber-glow/20"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Estadísticas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                  <ClientsList
                    clients={clients}
                    onUpdate={refreshClients}
                    loading={clientsLoading}
                    onEdit={handleEditClient}
                  />
                </TabsContent>

                <TabsContent value="stats">
                  <ClientStatistics />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Services Management Tab */}
          <TabsContent value="services">
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Gestión de Servicios
                  </h2>
                </div>
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setIsServiceFormOpen(true);
                  }}
                  className="bg-gradient-to-r from-cyber-glow to-cyber-secondary text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--cyber-glow)/0.3)]"
                  disabled={
                    !connectionState.isConnected &&
                    connectionState.isReconnecting
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Servicio
                </Button>
              </div>

              <SearchFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateFilter={dateFilter}
                onDateChange={setDateFilter}
                totalResults={filteredServices.length}
              />

              <ServicesList
                services={filteredServices}
                onUpdate={fetchServices}
                loading={loading}
                onEdit={handleEditService}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ServiceForm
        open={isServiceFormOpen}
        onOpenChange={handleServiceFormClose}
        onSuccess={() => {
          fetchServices();
          // No need to fetch clients here as real-time subscription handles it
        }}
        service={editingService}
      />

      <ClientForm
        open={isClientFormOpen}
        onOpenChange={handleClientFormClose}
        onSuccess={() => {
          // Real-time updates handled by useRealtimeClients hook
        }}
        client={editingClient}
      />
    </div>
  );
};

export default Index;
