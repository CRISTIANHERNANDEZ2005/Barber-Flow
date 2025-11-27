import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import MultiYearComparisonChart from "@/components/MultiYearComparisonChart";
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
import { YearSelector } from "@/components/YearSelector";

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
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [isCompareMode, setIsCompareMode] = useState(false);
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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const isCurrentYearSelected = selectedYears.includes(currentYear);
    const isSingleYearSelected = selectedYears.length === 1;
    const isMultiYearComparison = selectedYears.length > 1;

    // Services within selected years (period context)
    const periodServices = services.filter((s) => {
      const serviceYear = new Date(s.created_at).getFullYear();
      return selectedYears.includes(serviceYear);
    });

    const totalServices = periodServices.length;
    const totalRevenue = periodServices.reduce((sum, s) => sum + Number(s.price), 0);
    const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Unique days with activity to compute realistic daily averages
    const uniqueDayKeys = new Set(
      periodServices.map((s) => new Date(new Date(s.created_at).setHours(0, 0, 0, 0)).toISOString()),
    );
    const uniqueDaysCount = uniqueDayKeys.size || 1;

    const avgDailyRevenue = totalRevenue / uniqueDaysCount;
    const avgDailyServices = totalServices / uniqueDaysCount;

    // Client metrics - all within selected period
    const uniqueClients = new Set(periodServices.map((s) => s.client_id)).size;
    const visitsByClient: Record<string, number> = periodServices.reduce((acc, s) => {
      acc[s.client_id] = (acc[s.client_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const repeatClients = Object.values(visitsByClient).filter((count) => count > 1).length;
    const loyaltyRate = uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0;

    // Top service type in selected period
    const serviceTypeCounts: Record<string, number> = periodServices.reduce((acc, s) => {
      acc[s.service_type] = (acc[s.service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topEntry = Object.entries(serviceTypeCounts).sort(([, a], [, b]) => b - a)[0];
    const topServiceType = topEntry?.[0] || "N/A";
    const topServiceCount = topEntry?.[1] || 0;

    // Comparison metrics per year (for multi-year analysis)
    const yearlyBreakdown = selectedYears.map(year => {
      const yearServices = periodServices.filter(s => new Date(s.created_at).getFullYear() === year);
      const yearRevenue = yearServices.reduce((sum, s) => sum + Number(s.price), 0);
      const yearClients = new Set(yearServices.map(s => s.client_id)).size;
      return {
        year,
        services: yearServices.length,
        revenue: yearRevenue,
        avgTicket: yearServices.length > 0 ? yearRevenue / yearServices.length : 0,
        clients: yearClients,
      };
    });

    // Growth calculation for comparison mode
    let growthRate = 0;
    if (isMultiYearComparison && yearlyBreakdown.length >= 2) {
      const sortedYears = [...yearlyBreakdown].sort((a, b) => a.year - b.year);
      const oldestYear = sortedYears[0];
      const newestYear = sortedYears[sortedYears.length - 1];
      if (oldestYear.revenue > 0) {
        growthRate = ((newestYear.revenue - oldestYear.revenue) / oldestYear.revenue) * 100;
      }
    }

    // Today & Month metrics - ONLY from current year, even in comparison mode
    let todayRevenue = 0;
    let todayServices = 0;
    let monthRevenue = 0;
    let monthServicesCount = 0;

    if (isCurrentYearSelected) {
      // Filter services strictly for TODAY in CURRENT YEAR only
      const todayServicesList = services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate.getFullYear() === currentYear && serviceDate >= todayStart;
      });
      todayServices = todayServicesList.length;
      todayRevenue = todayServicesList.reduce((sum, s) => sum + Number(s.price), 0);

      // Filter services strictly for THIS MONTH in CURRENT YEAR only
      const thisMonthStart = new Date(currentYear, currentMonth, 1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const monthList = services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate >= thisMonthStart && serviceDate.getFullYear() === currentYear;
      });
      monthServicesCount = monthList.length;
      monthRevenue = monthList.reduce((sum, s) => sum + Number(s.price), 0);
    }

    // Best performing year in comparison
    const bestYear = yearlyBreakdown.length > 0 
      ? yearlyBreakdown.reduce((best, current) => current.revenue > best.revenue ? current : best)
      : null;

    return {
      // Period totals
      totalServices,
      totalRevenue,
      avgTicket,
      uniqueClients,
      // Derived period metrics
      avgDailyRevenue,
      avgDailyServices,
      topServiceType,
      topServiceCount,
      loyaltyRate,
      // Context flags
      isCurrentYearSelected,
      isSingleYearSelected,
      isMultiYearComparison,
      // Current-year scoped metrics (only from current year)
      todayRevenue,
      monthRevenue,
      todayServices,
      monthServicesCount,
      // Comparison metrics
      yearlyBreakdown,
      growthRate,
      bestYear,
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

  // Filter services by selected years for charts
  const filteredServicesByYear = useMemo(() => {
    return services.filter((s) => {
      const serviceYear = new Date(s.created_at).getFullYear();
      return selectedYears.includes(serviceYear);
    });
  }, [services, selectedYears]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      // If in compare mode, toggle the year
      if (isCompareMode) {
        if (prev.includes(year)) {
          // Don't allow deselecting the last year if it's the only one
          if (prev.length === 1) return prev;
          return prev.filter(y => y !== year);
        } else {
          return [...prev, year].sort((a, b) => b - a);
        }
      } else {
        // If NOT in compare mode, clicking a year switches to that year exclusively
        // Unless it's already selected and the only one, then do nothing
        if (prev.length === 1 && prev[0] === year) return prev;
        return [year];
      }
    });
  };

  const toggleAllYears = () => {
    if (selectedYears.length === availableYears.length) {
      // If all selected, select only current year (or first available)
      setSelectedYears([availableYears[0]]);
    } else {
      // Select all
      setSelectedYears([...availableYears]);
    }
  };

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
              <div className="flex justify-center mb-6">
                <YearSelector
                  selectedYears={selectedYears}
                  availableYears={availableYears}
                  onYearChange={toggleYear}
                  onToggleAll={toggleAllYears}
                  isCompareMode={isCompareMode}
                  onCompareModeChange={(checked) => {
                    setIsCompareMode(checked);
                    if (checked && selectedYears.length > 1) {
                      // Keep selection
                    } else if (!checked && selectedYears.length > 1) {
                      // Switch to single select (most recent)
                      setSelectedYears([selectedYears[0]]);
                    }
                  }}
                />
              </div>
            )}

            {/* Stats Grid - Core Period Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Servicios Totales"
                value={stats.totalServices}
                subtitle={
                  stats.isMultiYearComparison
                    ? `Comparando ${selectedYears.length} años`
                    : selectedYears.length === availableYears.length
                      ? "Histórico Total"
                      : `Año ${selectedYears.join(", ")}`
                }
                icon="scissors"
              />
              <StatsCard
                title="Ingresos Totales"
                value={`$${stats.totalRevenue.toFixed(2)}`}
                subtitle={
                  stats.isMultiYearComparison
                    ? stats.growthRate !== 0
                      ? `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate.toFixed(1)}% vs inicio`
                      : "Sin crecimiento"
                    : `Periodo ${selectedYears.join(", ")}`
                }
                icon="chart"
              />
              <StatsCard
                title="Ticket Promedio"
                value={`$${stats.avgTicket.toFixed(2)}`}
                subtitle={
                  stats.isMultiYearComparison && stats.bestYear
                    ? `Mejor: ${stats.bestYear.year} ($${stats.bestYear.avgTicket.toFixed(2)})`
                    : "Por servicio"
                }
                icon="trending"
              />
              <StatsCard
                title="Clientes Únicos"
                value={stats.uniqueClients}
                subtitle={
                  stats.isMultiYearComparison && stats.bestYear
                    ? `Mejor año: ${stats.bestYear.year} (${stats.bestYear.clients})`
                    : "En el periodo"
                }
                icon="dollar"
              />
            </div>

            {/* Stats Grid - Contextual Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.isCurrentYearSelected && !stats.isMultiYearComparison ? (
                <>
                  {/* Current year single view - show today/month metrics */}
                  <StatsCard
                    title="Ingresos Hoy"
                    value={`$${stats.todayRevenue.toFixed(2)}`}
                    subtitle={`${stats.todayServices} servicio${stats.todayServices !== 1 ? 's' : ''}`}
                    icon="dollar"
                  />
                  <StatsCard
                    title="Servicios Hoy"
                    value={stats.todayServices}
                    subtitle={new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    icon="scissors"
                  />
                  <StatsCard
                    title="Ingresos Mes Actual"
                    value={`$${stats.monthRevenue.toFixed(2)}`}
                    subtitle={`${stats.monthServicesCount} servicio${stats.monthServicesCount !== 1 ? 's' : ''}`}
                    icon="trending"
                  />
                  <StatsCard
                    title="Servicios Mes"
                    value={stats.monthServicesCount}
                    subtitle={new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    icon="chart"
                  />
                </>
              ) : stats.isCurrentYearSelected && stats.isMultiYearComparison ? (
                <>
                  {/* Multi-year comparison with current year - show today/month + comparison */}
                  <StatsCard
                    title="Hoy (Año Actual)"
                    value={`$${stats.todayRevenue.toFixed(2)}`}
                    subtitle={`${stats.todayServices} servicio${stats.todayServices !== 1 ? 's' : ''} hoy`}
                    icon="dollar"
                  />
                  <StatsCard
                    title="Mes Actual"
                    value={`$${stats.monthRevenue.toFixed(2)}`}
                    subtitle={`${stats.monthServicesCount} servicios este mes`}
                    icon="trending"
                  />
                  <StatsCard
                    title="Promedio Diario"
                    value={`$${stats.avgDailyRevenue.toFixed(2)}`}
                    subtitle={`${stats.avgDailyServices.toFixed(1)} servicios/día activo`}
                    icon="scissors"
                  />
                  <StatsCard
                    title="Mejor Año"
                    value={stats.bestYear?.year.toString() || 'N/A'}
                    subtitle={stats.bestYear ? `$${stats.bestYear.revenue.toFixed(2)} ingresos` : 'Sin datos'}
                    icon="chart"
                  />
                </>
              ) : (
                <>
                  {/* Past years or multi-year without current - show analytical metrics */}
                  <StatsCard
                    title="Promedio Diario (Ingresos)"
                    value={`$${stats.avgDailyRevenue.toFixed(2)}`}
                    subtitle="En días con actividad"
                    icon="dollar"
                  />
                  <StatsCard
                    title="Promedio Diario (Servicios)"
                    value={stats.avgDailyServices.toFixed(1)}
                    subtitle="Servicios por día activo"
                    icon="trending"
                  />
                  <StatsCard
                    title="Servicio Top"
                    value={stats.topServiceType}
                    subtitle={`${stats.topServiceCount} servicio${stats.topServiceCount !== 1 ? 's' : ''} realizado${stats.topServiceCount !== 1 ? 's' : ''}`}
                    icon="scissors"
                  />
                  <StatsCard
                    title="Tasa de Fidelidad"
                    value={`${stats.loyaltyRate.toFixed(1)}%`}
                    subtitle={`${stats.uniqueClients} cliente${stats.uniqueClients !== 1 ? 's' : ''} único${stats.uniqueClients !== 1 ? 's' : ''}`}
                    icon="chart"
                  />
                </>
              )}
            </div>

            {/* Chart Section */}
            {stats.isMultiYearComparison ? (
              <MultiYearComparisonChart services={filteredServicesByYear} selectedYears={selectedYears} />
            ) : (
              <RevenueChart services={filteredServicesByYear} selectedYears={selectedYears} />
            )}
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
                <div className="flex justify-center mb-6">
                  <YearSelector
                    selectedYears={selectedYears}
                    availableYears={availableYears}
                    onYearChange={toggleYear}
                    onToggleAll={toggleAllYears}
                    isCompareMode={isCompareMode}
                    onCompareModeChange={(checked) => {
                      setIsCompareMode(checked);
                      if (!checked && selectedYears.length > 1) {
                        setSelectedYears([selectedYears[0]]);
                      }
                    }}
                  />
                </div>
              )}

              <DailyPatternsChart services={filteredServicesByYear} selectedYears={selectedYears} />
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
        </Tabs >
      </div >

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
    </div >
  );
};

export default Index;
