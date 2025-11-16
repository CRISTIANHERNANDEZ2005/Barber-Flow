import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Trophy,
  AlertTriangle,
  Star,
  Search,
  Crown,
  Activity,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ClientStat {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  client_since: string;
  total_services: number;
  total_spent: number;
  avg_service_price: number;
  last_service_date: string | null;
  first_service_date: string | null;
  service_span_days: number;
  services_per_month: number;
}

interface ClientLoyalty extends ClientStat {
  loyalty_score: number;
  client_tier: string;
  loyalty_rank: number;
}

interface ClientPeriods {
  client_id: string;
  first_name: string;
  last_name: string | null;
  services_this_week: number;
  spent_this_week: number;
  services_this_month: number;
  spent_this_month: number;
  services_this_year: number;
  spent_this_year: number;
  services_last_30_days: number;
  spent_last_30_days: number;
  services_last_90_days: number;
  spent_last_90_days: number;
}

interface ClientRisk {
  client_id: string;
  client_name: string;
  phone: string;
  risk_level: string;
  days_since_last_service: number;
  total_services: number;
  avg_days_between_services: number;
  recommended_action: string;
}

const ClientStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientStat[]>([]);
  const [clientLoyalty, setClientLoyalty] = useState<ClientLoyalty[]>([]);
  const [clientPeriods, setClientPeriods] = useState<ClientPeriods[]>([]);
  const [clientRisks, setClientRisks] = useState<ClientRisk[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedTier, setSelectedTier] = useState("all");

  useEffect(() => {
    loadClientStatistics();
  }, []);

  const loadClientStatistics = async () => {
    try {
      setLoading(true);

      // Load client statistics with direct SQL queries
      const [clientsResponse, servicesResponse] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("services").select("*, client:clients(*)"),
      ]);

      if (clientsResponse.error) throw clientsResponse.error;
      if (servicesResponse.error) throw servicesResponse.error;

      const clients = clientsResponse.data || [];
      const services = servicesResponse.data || [];

      // Calculate client statistics manually
      const calculatedStats = clients.map((client) => {
        const clientServices = services.filter(
          (s) => s.client_id === client.id,
        );
        const totalSpent = clientServices.reduce((sum, s) => sum + s.price, 0);
        const lastService =
          clientServices.length > 0
            ? clientServices.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )[0]
            : null;
        const firstService =
          clientServices.length > 0
            ? clientServices.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              )[0]
            : null;

        const serviceSpanDays =
          firstService && lastService && clientServices.length > 1
            ? Math.floor(
                (new Date(lastService.created_at).getTime() -
                  new Date(firstService.created_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

        const servicesPerMonth =
          serviceSpanDays > 0 && clientServices.length > 1
            ? clientServices.length / (serviceSpanDays / 30)
            : 0;

        return {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          client_since: client.created_at,
          total_services: clientServices.length,
          total_spent: totalSpent,
          avg_service_price:
            clientServices.length > 0 ? totalSpent / clientServices.length : 0,
          last_service_date: lastService?.created_at || null,
          first_service_date: firstService?.created_at || null,
          service_span_days: serviceSpanDays,
          services_per_month: servicesPerMonth,
        };
      });

      // Calculate loyalty scores and tiers
      const loyaltyData = calculatedStats.map((client) => {
        const daysSinceLastService = client.last_service_date
          ? Math.floor(
              (Date.now() - new Date(client.last_service_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 999;

        // RFM Scoring
        const recencyScore =
          daysSinceLastService <= 30
            ? 40
            : daysSinceLastService <= 90
              ? 25
              : daysSinceLastService <= 180
                ? 15
                : 5;

        const frequencyScore =
          client.total_services >= 20
            ? 35
            : client.total_services >= 10
              ? 25
              : client.total_services >= 5
                ? 15
                : client.total_services >= 2
                  ? 8
                  : 2;

        const monetaryScore =
          client.total_spent >= 500
            ? 25
            : client.total_spent >= 200
              ? 18
              : client.total_spent >= 100
                ? 12
                : client.total_spent >= 50
                  ? 6
                  : 2;

        const loyaltyScore =
          client.total_services === 0
            ? 0
            : recencyScore + frequencyScore + monetaryScore;

        const clientTier =
          client.total_services === 0
            ? "Sin Servicios"
            : loyaltyScore >= 80
              ? "VIP"
              : loyaltyScore >= 60
                ? "Fiel"
                : loyaltyScore >= 40
                  ? "Regular"
                  : loyaltyScore >= 20
                    ? "Ocasional"
                    : "Inactivo";

        return {
          ...client,
          loyalty_score: loyaltyScore,
          client_tier: clientTier,
          loyalty_rank: 0, // Will be set after sorting
        };
      });

      // Set rankings
      const rankedLoyalty = loyaltyData
        .sort((a, b) => b.loyalty_score - a.loyalty_score)
        .map((client, index) => ({ ...client, loyalty_rank: index + 1 }));

      // Calculate period data
      const now = new Date();
      const periodData = clients.map((client) => {
        const clientServices = services.filter(
          (s) => s.client_id === client.id,
        );

        const thisWeekStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay(),
        );
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        return {
          client_id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          services_this_week: clientServices.filter(
            (s) => new Date(s.created_at) >= thisWeekStart,
          ).length,
          spent_this_week: clientServices
            .filter((s) => new Date(s.created_at) >= thisWeekStart)
            .reduce((sum, s) => sum + s.price, 0),
          services_this_month: clientServices.filter(
            (s) => new Date(s.created_at) >= thisMonthStart,
          ).length,
          spent_this_month: clientServices
            .filter((s) => new Date(s.created_at) >= thisMonthStart)
            .reduce((sum, s) => sum + s.price, 0),
          services_this_year: clientServices.filter(
            (s) => new Date(s.created_at) >= thisYearStart,
          ).length,
          spent_this_year: clientServices
            .filter((s) => new Date(s.created_at) >= thisYearStart)
            .reduce((sum, s) => sum + s.price, 0),
          services_last_30_days: clientServices.filter(
            (s) => new Date(s.created_at) >= last30Days,
          ).length,
          spent_last_30_days: clientServices
            .filter((s) => new Date(s.created_at) >= last30Days)
            .reduce((sum, s) => sum + s.price, 0),
          services_last_90_days: clientServices.filter(
            (s) => new Date(s.created_at) >= last90Days,
          ).length,
          spent_last_90_days: clientServices
            .filter((s) => new Date(s.created_at) >= last90Days)
            .reduce((sum, s) => sum + s.price, 0),
        };
      });

      // Calculate risk analysis
      const riskData = calculatedStats.map((client) => {
        const daysSinceLastService = client.last_service_date
          ? Math.floor(
              (Date.now() - new Date(client.last_service_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 999;

        const riskLevel =
          client.total_services === 0
            ? "Sin Servicios"
            : daysSinceLastService > 180
              ? "Alto Riesgo"
              : daysSinceLastService > 90
                ? "Riesgo Medio"
                : daysSinceLastService > 45
                  ? "Riesgo Bajo"
                  : "Activo";

        const recommendedAction =
          client.total_services === 0
            ? "Contactar para primer servicio"
            : daysSinceLastService > 180
              ? "Campaña de reactivación urgente"
              : daysSinceLastService > 90
                ? "Oferta especial de regreso"
                : daysSinceLastService > 45
                  ? "Recordatorio amigable"
                  : "Mantener satisfacción actual";

        return {
          client_id: client.id,
          client_name: `${client.first_name} ${client.last_name || ""}`.trim(),
          phone: client.phone,
          risk_level: riskLevel,
          days_since_last_service: daysSinceLastService,
          total_services: client.total_services,
          avg_days_between_services:
            client.service_span_days > 0 && client.total_services > 1
              ? client.service_span_days / client.total_services
              : 0,
          recommended_action: recommendedAction,
        };
      });

      setClientStats(calculatedStats);
      setClientLoyalty(rankedLoyalty);
      setClientPeriods(periodData);
      setClientRisks(riskData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar estadísticas: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const summaryStats = useMemo(() => {
    const totalClients = clientStats.length;
    const activeClients = clientStats.filter(
      (c) => c.total_services > 0,
    ).length;
    const totalRevenue = clientStats.reduce((sum, c) => sum + c.total_spent, 0);
    const avgSpendingPerClient =
      totalClients > 0 ? totalRevenue / activeClients : 0;

    const loyaltyTiers = clientLoyalty.reduce(
      (acc, client) => {
        acc[client.client_tier] = (acc[client.client_tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const riskLevels = clientRisks.reduce(
      (acc, client) => {
        acc[client.risk_level] = (acc[client.risk_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      totalRevenue,
      avgSpendingPerClient,
      loyaltyTiers,
      riskLevels,
    };
  }, [clientStats, clientLoyalty, clientRisks]);

  const filteredClients = useMemo(() => {
    let filtered = clientLoyalty;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.first_name.toLowerCase().includes(term) ||
          (client.last_name && client.last_name.toLowerCase().includes(term)) ||
          client.phone.includes(term),
      );
    }

    if (selectedTier !== "all") {
      filtered = filtered.filter(
        (client) => client.client_tier === selectedTier,
      );
    }

    return filtered;
  }, [clientLoyalty, searchTerm, selectedTier]);

  const chartData = useMemo(() => {
    // Loyalty tiers distribution
    const tierData = Object.entries(summaryStats.loyaltyTiers).map(
      ([tier, count]) => ({
        name: tier,
        value: count,
        percentage: ((count / summaryStats.totalClients) * 100).toFixed(1),
      }),
    );

    // Top clients by spending
    const topClients = [...clientLoyalty]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10)
      .map((client) => ({
        name: `${client.first_name} ${client.last_name || ""}`.trim(),
        spending: client.total_spent,
        services: client.total_services,
        tier: client.client_tier,
      }));

    // Service frequency analysis
    const frequencyData = clientLoyalty
      .filter((c) => c.total_services > 0)
      .reduce(
        (acc, client) => {
          const frequency = Math.floor(client.services_per_month);
          const range =
            frequency === 0
              ? "0"
              : frequency === 1
                ? "1"
                : frequency <= 3
                  ? "2-3"
                  : frequency <= 5
                    ? "4-5"
                    : "5+";
          acc[range] = (acc[range] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    const frequencyChartData = Object.entries(frequencyData).map(
      ([range, count]) => ({
        range: `${range} servicios/mes`,
        clients: count,
      }),
    );

    return {
      tierData,
      topClients,
      frequencyChartData,
    };
  }, [clientLoyalty, summaryStats]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "from-purple-500 to-pink-500";
      case "Fiel":
        return "from-blue-500 to-cyan-500";
      case "Regular":
        return "from-green-500 to-emerald-500";
      case "Ocasional":
        return "from-yellow-500 to-orange-500";
      case "Inactivo":
        return "from-gray-400 to-gray-500";
      default:
        return "from-gray-300 to-gray-400";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "VIP":
        return <Crown className="h-4 w-4" />;
      case "Fiel":
        return <Star className="h-4 w-4" />;
      case "Regular":
        return <Users className="h-4 w-4" />;
      case "Ocasional":
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Alto Riesgo":
        return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "Riesgo Medio":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "Riesgo Bajo":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "Activo":
        return "border-green-500 bg-green-50 dark:bg-green-950/20";
      default:
        return "border-gray-300 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#6b7280"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-cyber-glow" />
          <span className="text-muted-foreground">
            Cargando estadísticas de clientes...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryStats.totalClients}
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryStats.activeClients} activos
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summaryStats.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summaryStats.avgSpendingPerClient)} promedio
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Clientes VIP</p>
              <p className="text-2xl font-bold text-purple-600">
                {summaryStats.loyaltyTiers.VIP || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryStats.loyaltyTiers.Fiel || 0} fieles
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">En Riesgo</p>
              <p className="text-2xl font-bold text-red-600">
                {(summaryStats.riskLevels["Alto Riesgo"] || 0) +
                  (summaryStats.riskLevels["Riesgo Medio"] || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Necesitan atención
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="loyalty" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-xl">
          <TabsTrigger value="loyalty">Fidelidad</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="risk">Análisis de Riesgo</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        {/* Loyalty Analysis Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking de Fidelidad de Clientes
              </h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Fiel">Fiel</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Ocasional">Ocasional</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredClients.slice(0, 20).map((client, index) => (
                <div
                  key={client.id}
                  className={`p-4 rounded-lg border bg-gradient-to-r ${getTierColor(client.client_tier)}/10 border-current/20`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          #{client.loyalty_rank}
                        </Badge>
                        {getTierIcon(client.client_tier)}
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {client.first_name} {client.last_name || ""}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          📞 {client.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`bg-gradient-to-r ${getTierColor(client.client_tier)} text-white`}
                        >
                          {client.client_tier}
                        </Badge>
                        <span className="font-bold text-lg">
                          {client.loyalty_score}/100
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {client.total_services} servicios •{" "}
                        {formatCurrency(client.total_spent)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Performance Analysis Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top 10 Mejores Clientes
              </h3>
              <div className="space-y-3">
                {chartData.topClients.map((client, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.services} servicios
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(client.spending)}
                      </p>
                      <Badge
                        className={`bg-gradient-to-r ${getTierColor(client.tier)} text-white text-xs`}
                      >
                        {client.tier}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Actividad por Períodos
              </h3>
              <div className="space-y-4">
                {clientPeriods
                  .filter((c) => c.services_this_month > 0)
                  .slice(0, 10)
                  .map((client) => (
                    <div key={client.client_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {client.first_name} {client.last_name || ""}
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <p className="font-semibold text-blue-600">
                            {client.services_this_week}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Esta semana
                          </p>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                          <p className="font-semibold text-green-600">
                            {client.services_this_month}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Este mes
                          </p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                          <p className="font-semibold text-purple-600">
                            {client.services_this_year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Este año
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Análisis de Riesgo de Clientes
            </h3>
            <div className="space-y-3">
              {clientRisks
                .filter((c) => c.risk_level !== "Activo")
                .map((client) => (
                  <div
                    key={client.client_id}
                    className={`p-4 rounded-lg border ${getRiskColor(client.risk_level)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{client.client_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          📞 {client.phone}
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Último servicio:</strong> Hace{" "}
                          {client.days_since_last_service} días
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`mb-2 ${
                            client.risk_level === "Alto Riesgo"
                              ? "border-red-500 text-red-600"
                              : client.risk_level === "Riesgo Medio"
                                ? "border-yellow-500 text-yellow-600"
                                : "border-orange-500 text-orange-600"
                          }`}
                        >
                          {client.risk_level}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {client.total_services} servicios totales
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-white/50 dark:bg-black/20 rounded">
                      <p className="text-sm">
                        <strong>Acción recomendada:</strong>{" "}
                        {client.recommended_action}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Distribución por Nivel de Fidelidad
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.tierData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.tierData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Frecuencia de Servicios
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.frequencyChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="range"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="clients" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientStatistics;
