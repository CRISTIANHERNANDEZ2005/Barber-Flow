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

const PodiumClientCard = ({ client, rank, getTierColor, getTierTextColor, formatCurrency }) => (
    <div className={`relative p-5 rounded-2xl shadow-lg border-2 ${
        rank === 1 ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' :
        rank === 2 ? 'border-slate-400 bg-slate-50 dark:bg-slate-950/40' :
        'border-yellow-700 bg-yellow-100 dark:bg-yellow-950/40'
    } transform transition-transform duration-300 ${rank === 1 ? 'scale-105' : ''}`}>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md ${
                rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-slate-500' : 'bg-yellow-800'
            }`}>
                {rank === 1 ? <Crown /> : rank}
            </div>
        </div>
        <div className="text-center mt-6">
            <h4 className={`font-bold text-xl ${getTierTextColor(client.client_tier)}`}>
                {client.first_name} {client.last_name || ""}
            </h4>
            <p className="text-sm text-muted-foreground font-medium mb-3">
                {client.phone}
            </p>
            <Badge
                className={`mb-3 bg-gradient-to-r ${getTierColor(client.client_tier)} text-white font-semibold px-3 py-1 shadow-sm`}
            >
                {client.client_tier}
            </Badge>
            <div className="text-3xl font-bold ${getTierTextColor(client.client_tier)} mb-1">
                {client.loyalty_score} <span className="text-sm">/100</span>
            </div>
            <p className={`text-sm font-semibold ${getTierTextColor(client.client_tier)}`}>
                {client.total_services} servicios • {formatCurrency(client.total_spent)}
            </p>
        </div>
    </div>
);

const ClientCard = ({ client, getTierColor, getTierTextColor, getTierIcon, formatCurrency }) => (
    <div className="p-4 rounded-xl border bg-card/60 hover:bg-card/90 transition-colors duration-200 shadow-sm hover:shadow-lg">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r ${getTierColor(client.client_tier)}`}>
                    #{client.loyalty_rank}
                </div>
                <div>
                    <h4 className="font-bold text-lg text-foreground">
                        {client.first_name} {client.last_name || ""}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        {client.phone}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getTierTextColor(client.client_tier)}`}>
                        {getTierIcon(client.client_tier)}
                    </div>
                    <Badge
                        variant="outline"
                        className={`font-semibold ${getTierTextColor(client.client_tier)}`}
                    >
                        {client.client_tier}
                    </Badge>
                </div>
                <div className="w-32 text-right">
                    <div className="flex items-center justify-end mb-1">
                        <span className={`font-bold text-xl ${getTierTextColor(client.client_tier)}`}>{client.loyalty_score}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full bg-gradient-to-r ${getTierColor(client.client_tier)}`}
                            style={{ width: `${client.loyalty_score}%` }}
                        />
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-semibold text-foreground">{client.total_services} servicios</div>
                    <div className="font-bold text-lg text-primary">{formatCurrency(client.total_spent)}</div>
                </div>
            </div>
        </div>
    </div>
);

const ClientStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientStat[]>([]);
  const [clientLoyalty, setClientLoyalty] = useState<ClientLoyalty[]>([]);
  const [clientPeriods, setClientPeriods] = useState<ClientPeriods[]>([]);
  const [clientRisks, setClientRisks] = useState<ClientRisk[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedTier, setSelectedTier] = useState("all");
  const [visibleClients, setVisibleClients] = useState(10);

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
        return "from-purple-600 to-pink-600";
      case "Fiel":
        return "from-blue-600 to-cyan-600";
      case "Regular":
        return "from-green-600 to-emerald-600";
      case "Ocasional":
        return "from-amber-600 to-orange-600";
      case "Inactivo":
        return "from-slate-500 to-gray-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const getTierBgColor = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800";
      case "Fiel":
        return "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800";
      case "Regular":
        return "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800";
      case "Ocasional":
        return "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800";
      case "Inactivo":
        return "bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-300 dark:border-slate-700";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/50 dark:to-slate-900/50 border-gray-300 dark:border-gray-700";
    }
  };

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "text-purple-900 dark:text-purple-100";
      case "Fiel":
        return "text-blue-900 dark:text-blue-100";
      case "Regular":
        return "text-green-900 dark:text-green-100";
      case "Ocasional":
        return "text-amber-900 dark:text-amber-100";
      case "Inactivo":
        return "text-slate-700 dark:text-slate-300";
      default:
        return "text-gray-700 dark:text-gray-300";
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
        return "border-red-500 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40";
      case "Riesgo Medio":
        return "border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-100 dark:from-yellow-950/40 dark:to-amber-900/40";
      case "Riesgo Bajo":
        return "border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40";
      case "Activo":
        return "border-green-500 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/40";
      default:
        return "border-gray-300 bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-950/40 dark:to-slate-900/40";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "Alto Riesgo":
        return "border-red-600 text-red-800 bg-red-100 dark:border-red-400 dark:text-red-200 dark:bg-red-900/30";
      case "Riesgo Medio":
        return "border-yellow-600 text-yellow-800 bg-yellow-100 dark:border-yellow-400 dark:text-yellow-200 dark:bg-yellow-900/30";
      case "Riesgo Bajo":
        return "border-orange-600 text-orange-800 bg-orange-100 dark:border-orange-400 dark:text-orange-200 dark:bg-orange-900/30";
      case "Activo":
        return "border-green-600 text-green-800 bg-green-100 dark:border-green-400 dark:text-green-200 dark:bg-green-900/30";
      default:
        return "border-gray-600 text-gray-800 bg-gray-100 dark:border-gray-400 dark:text-gray-200 dark:bg-gray-900/30";
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

            <div>
              {/* Podium for Top 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
                  {filteredClients.slice(1, 2).map(client => <PodiumClientCard key={client.id} client={client} rank={2} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
                  {filteredClients.slice(0, 1).map(client => <PodiumClientCard key={client.id} client={client} rank={1} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
                  {filteredClients.slice(2, 3).map(client => <PodiumClientCard key={client.id} client={client} rank={3} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
              </div>

              {/* List for the rest */}
              <div className="space-y-3">
                  {filteredClients.slice(3, visibleClients).map(client => (
                      <ClientCard
                          key={client.id}
                          client={client}
                          getTierColor={getTierColor}
                          getTierTextColor={getTierTextColor}
                          getTierIcon={getTierIcon}
                          formatCurrency={formatCurrency}
                      />
                  ))}
              </div>

              {visibleClients < filteredClients.length && (
                  <div className="text-center mt-6">
                      <Button onClick={() => setVisibleClients(prev => prev + 10)} variant="outline">
                          Ver más
                      </Button>
                  </div>
              )}
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
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-r ${getTierColor(client.tier)} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {client.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {client.services} servicios
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-green-700 dark:text-green-400 mb-1">
                        {formatCurrency(client.spending)}
                      </p>
                      <Badge
                        className={`bg-gradient-to-r ${getTierColor(client.tier)} text-white text-xs font-semibold px-2 py-1 shadow-sm`}
                      >
                        {client.tier}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Actividad por Períodos
              </h3>
              <div className="space-y-5">
                {clientPeriods
                  .filter((c) => c.services_this_month > 0)
                  .slice(0, 10)
                  .map((client) => (
                    <div
                      key={client.client_id}
                      className="p-4 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                          {client.first_name} {client.last_name || ""}
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Total: {formatCurrency(client.spent_this_month)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex flex-col items-center gap-1">
                            <p className="font-bold text-2xl text-blue-700 dark:text-blue-300">
                              {client.services_this_week}
                            </p>
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              Esta semana
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {formatCurrency(client.spent_this_week)}
                            </p>
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="flex flex-col items-center gap-1">
                            <p className="font-bold text-2xl text-green-700 dark:text-green-300">
                              {client.services_this_month}
                            </p>
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                              Este mes
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {formatCurrency(client.spent_this_month)}
                            </p>
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg border border-purple-200 dark:border-purple-700">
                          <div className="flex flex-col items-center gap-1">
                            <p className="font-bold text-2xl text-purple-700 dark:text-purple-300">
                              {client.services_this_year}
                            </p>
                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              Este año
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                              {formatCurrency(client.spent_this_year)}
                            </p>
                          </div>
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
            <div className="space-y-4">
              {clientRisks
                .filter((c) => c.risk_level !== "Activo")
                .map((client) => (
                  <div
                    key={client.client_id}
                    className={`p-5 rounded-xl border-2 ${getRiskColor(client.risk_level)} shadow-sm hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              client.risk_level === "Alto Riesgo"
                                ? "text-red-600 dark:text-red-400"
                                : client.risk_level === "Riesgo Medio"
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-orange-600 dark:text-orange-400"
                            }`}
                          />
                          <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            {client.client_name}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              📞
                            </span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {client.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              🕒
                            </span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              Hace {client.days_since_last_service} días
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              📊
                            </span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {client.total_services} servicios totales
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              ⏱️
                            </span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              Promedio: {client.avg_days_between_services} días
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge
                          className={`${getRiskBadgeColor(client.risk_level)} font-semibold px-3 py-1 text-sm`}
                        >
                          {client.risk_level}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-white/70 dark:bg-black/30 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          💡
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            Acción recomendada:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {client.recommended_action}
                          </p>
                        </div>
                      </div>
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
