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
  Area,
  AreaChart,
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
  Medal,
  FilterX,
  ArrowUp,
  ArrowDown,
  Award,
  Zap,
  ChevronRight,
  BarChart3,
  TrendingUpIcon,
  UserCheck,
  UserX,
  AlertCircle,
  Phone,
  CalendarDays,
  FileText,
  Mail,
  MessageSquare,
  Bell,
  RefreshCw,
  ChevronDown,
  Info,
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
  phone: string;
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

// Componente para mostrar cuando no hay resultados
const NoResultsFound = ({ searchTerm, selectedTier, resetFilters }) => {
  const getFilterDescription = () => {
    if (searchTerm && selectedTier !== "all") {
      return `para "${searchTerm}" en la categoría "${selectedTier}"`;
    } else if (searchTerm) {
      return `para "${searchTerm}"`;
    } else if (selectedTier !== "all") {
      return `en la categoría "${selectedTier}"`;
    }
    return "";
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <FilterX className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No se encontraron clientes
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        No hay clientes que coincidan con tu búsqueda {getFilterDescription()}.
      </p>
      <Button onClick={resetFilters} variant="outline" className="mb-2">
        Limpiar filtros
      </Button>
    </div>
  );
};

// Componente rediseñado para el podio con mejor contraste y legibilidad
const PodiumClientCard = ({ client, rank, getTierColor, getTierTextColor, formatCurrency }) => {
  // Definir estilos específicos para cada posición
  const getPodiumStyles = (rank) => {
    switch (rank) {
      case 1:
        return {
          container: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/60 border-amber-400 shadow-amber-200/50",
          badge: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
          scoreText: "text-amber-900 dark:text-amber-100",
          iconBg: "bg-amber-500",
          medalIcon: <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        };
      case 2:
        return {
          container: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/40 dark:to-slate-700/60 border-slate-400 shadow-slate-200/50",
          badge: "bg-gradient-to-r from-slate-500 to-slate-600 text-white",
          scoreText: "text-slate-900 dark:text-slate-100",
          iconBg: "bg-slate-500",
          medalIcon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        };
      case 3:
        return {
          container: "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/60 border-orange-400 shadow-orange-200/50",
          badge: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
          scoreText: "text-orange-900 dark:text-orange-100",
          iconBg: "bg-orange-600",
          medalIcon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        };
      default:
        return {
          container: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/40 dark:to-gray-700/60 border-gray-400 shadow-gray-200/50",
          badge: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
          scoreText: "text-gray-900 dark:text-gray-100",
          iconBg: "bg-gray-500",
          medalIcon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        };
    }
  };

  const styles = getPodiumStyles(rank);

  return (
    <div className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border-2 ${styles.container} transform transition-all duration-300 hover:scale-105 ${rank === 1 ? 'ring-2 ring-amber-400/50 ring-offset-2' : ''}`}>
      <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${styles.iconBg} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg`}>
          {styles.medalIcon}
        </div>
      </div>
      
      <div className="text-center mt-6 sm:mt-8">
        <h4 className={`font-bold text-lg sm:text-xl ${styles.scoreText} mb-1`}>
          {client.first_name} {client.last_name || ""}
        </h4>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium mb-3">
          {client.phone}
        </p>
        
        <div className="mb-4">
          <Badge className={`${styles.badge} font-semibold px-3 py-1.5 text-sm shadow-md`}>
            {client.client_tier}
          </Badge>
        </div>
        
        <div className={`text-3xl sm:text-4xl font-bold ${styles.scoreText} mb-2`}>
          {client.loyalty_score}
          <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 ml-1">/100</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{client.total_services}</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">servicios</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">{formatCurrency(client.total_spent)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientCard = ({ client, getTierColor, getTierTextColor, getTierIcon, formatCurrency }) => (
    <div className="p-3 sm:p-4 rounded-xl border bg-card/60 hover:bg-card/90 transition-colors duration-200 shadow-sm hover:shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base bg-gradient-to-r ${getTierColor(client.client_tier)}`}>
                    #{client.loyalty_rank}
                </div>
                <div>
                    <h4 className="font-bold text-base sm:text-lg text-foreground">
                        {client.first_name} {client.last_name || ""}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {client.phone}
                    </p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${getTierTextColor(client.client_tier)}`}>
                        {getTierIcon(client.client_tier)}
                    </div>
                    <Badge
                        variant="outline"
                        className={`font-semibold text-xs sm:text-sm ${getTierTextColor(client.client_tier)}`}
                    >
                        {client.client_tier}
                    </Badge>
                </div>
                <div className="w-full sm:w-32 text-right">
                    <div className="flex items-center justify-end mb-1">
                        <span className={`font-bold text-lg sm:text-xl ${getTierTextColor(client.client_tier)}`}>{client.loyalty_score}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
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
                    <div className="font-semibold text-sm sm:text-base text-foreground">{client.total_services} servicios</div>
                    <div className="font-bold text-sm sm:text-lg text-primary">{formatCurrency(client.total_spent)}</div>
                </div>
            </div>
        </div>
    </div>
);

// Nuevo componente para tarjeta de cliente top mejorada
const TopClientCard = ({ client, index, getTierColor, formatCurrency }) => {
  // Determinar el color de fondo según la posición
  const getCardStyle = (index) => {
    if (index === 0) return "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800";
    if (index === 1) return "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-800";
    if (index === 2) return "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800";
    return "bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/20 dark:to-gray-900/20 border-gray-200 dark:border-gray-700";
  };

  // Determinar el icono según la posición
  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-500" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return <Award className="w-5 h-5 text-gray-500" />;
  };

  // Determinar el color del número de ranking
  const getRankColor = (index) => {
    if (index === 0) return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
    if (index === 1) return "bg-gradient-to-r from-slate-400 to-slate-600 text-white";
    if (index === 2) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
    return "bg-gradient-to-r from-gray-400 to-gray-600 text-white";
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border-2 ${getCardStyle(index)} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${getRankColor(index)} flex items-center justify-center font-bold text-lg shadow-lg`}>
            {index + 1}
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {client.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {client.services} servicios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {getRankIcon(index)}
          <Badge className={`bg-gradient-to-r ${getTierColor(client.tier)} text-white text-xs font-semibold px-2 py-1 shadow-sm`}>
            {client.tier}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ingresos totales</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(client.spending)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Top performer</span>
          </div>
        </div>
      </div>
      
      {/* Barra de progreso visual */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
            style={{ width: `${Math.min(100, (client.spending / 1000) * 10)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Componente completamente rediseñado para tarjeta de actividad por períodos mejorada
const ActivityCard = ({ client, formatCurrency }) => {
  // Calcular la tendencia comparando esta semana con la semana anterior
  const weekTrend = client.services_this_week > 0 ? "up" : "neutral";
  const monthTrend = client.services_this_month > 5 ? "up" : "neutral";
  
  // Calcular el porcentaje de cambio entre períodos
  const weekChangePercent = client.services_this_week > 0 ? 
    Math.round((client.services_this_week / Math.max(1, client.services_last_30_days)) * 100) : 0;
  const monthChangePercent = client.services_this_month > 0 ? 
    Math.round((client.services_this_month / Math.max(1, client.services_last_90_days)) * 100) : 0;
  
  // Función para obtener el color según el valor
  const getValueColor = (value, period) => {
    if (period === "week") {
      if (value > 5) return "text-green-600 dark:text-green-400";
      if (value > 0) return "text-blue-600 dark:text-blue-400";
      return "text-gray-500 dark:text-gray-400";
    }
    if (period === "month") {
      if (value > 10) return "text-green-600 dark:text-green-400";
      if (value > 5) return "text-blue-600 dark:text-blue-400";
      return "text-gray-500 dark:text-gray-400";
    }
    if (period === "year") {
      if (value > 50) return "text-green-600 dark:text-green-400";
      if (value > 20) return "text-blue-600 dark:text-blue-400";
      return "text-gray-500 dark:text-gray-400";
    }
    return "text-gray-500 dark:text-gray-400";
  };

  // Función para obtener el icono de tendencia
  const getTrendIcon = (trend) => {
    if (trend === "up") return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  // Preparar datos para el gráfico de área
  const chartData = [
    { name: 'Semana', value: client.services_this_week, spent: client.spent_this_week },
    { name: 'Mes', value: client.services_this_month, spent: client.spent_this_month },
    { name: 'Año', value: client.services_this_year, spent: client.spent_this_year },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 border border-slate-700 dark:border-slate-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Efecto decorativo superior */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
      
      <div className="p-5">
        {/* Encabezado con información del cliente */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-bold text-lg text-white mb-1">
              {client.first_name} {client.last_name || ""}
            </h4>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-300">Teléfono:</div>
              <div className="text-xs font-mono bg-slate-700 px-2 py-1 rounded">
                {client.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300 mb-1">Total este mes</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(client.spent_this_month)}
            </p>
          </div>
        </div>
        
        {/* Gráfico de área mejorado */}
        <div className="mb-6 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                stroke="#64748b"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                  border: '1px solid #4a5568',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [
                  value, 
                  name === 'value' ? 'Servicios' : 'Ingresos'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                fill="url(#colorGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Tarjetas de estadísticas rediseñadas con fondo oscuro */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600 relative overflow-hidden">
            {/* Efecto decorativo */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/20 rounded-full -mr-8 -mt-8"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-300">Esta semana</p>
                <div className="flex items-center">
                  {getTrendIcon(weekTrend)}
                  {weekChangePercent > 0 && (
                    <span className="text-xs font-medium text-blue-400 ml-1">
                      +{weekChangePercent}%
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-2xl font-bold ${getValueColor(client.services_this_week, "week")}`}>
                {client.services_this_week}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-blue-400">
                  {formatCurrency(client.spent_this_week)}
                </p>
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600 relative overflow-hidden">
            {/* Efecto decorativo */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-600/20 rounded-full -mr-8 -mt-8"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-300">Este mes</p>
                <div className="flex items-center">
                  {getTrendIcon(monthTrend)}
                  {monthChangePercent > 0 && (
                    <span className="text-xs font-medium text-green-400 ml-1">
                      +{monthChangePercent}%
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-2xl font-bold ${getValueColor(client.services_this_month, "month")}`}>
                {client.services_this_month}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-green-400">
                  {formatCurrency(client.spent_this_month)}
                </p>
                <TrendingUpIcon className="w-4 h-4 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600 relative overflow-hidden">
            {/* Efecto decorativo */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-600/20 rounded-full -mr-8 -mt-8"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-purple-300">Este año</p>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <p className={`text-2xl font-bold ${getValueColor(client.services_this_year, "year")}`}>
                {client.services_this_year}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-purple-400">
                  {formatCurrency(client.spent_this_year)}
                </p>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Indicador de rendimiento con fondo mejorado */}
        <div className="mt-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Rendimiento</p>
                <p className="text-xs text-slate-400">Últimos 90 días</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">
                {client.services_last_90_days}
              </p>
              <p className="text-xs text-slate-400">servicios</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${Math.min(100, (client.services_last_90_days / 30) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente completamente rediseñado para tarjeta de riesgo con diseño profesional
const RiskCard = ({ client, getRiskIcon, getRiskColor, getRiskBadgeColor, formatCurrency }) => {
  // Determinar el nivel de riesgo numérico para la barra de progreso
  const getRiskPercentage = (riskLevel) => {
    switch (riskLevel) {
      case "Alto Riesgo": return 90;
      case "Riesgo Medio": return 60;
      case "Riesgo Bajo": return 30;
      case "Sin Servicios": return 50;
      case "Activo": return 10;
      default: return 0;
    }
  };

  // Determinar el color de la barra de progreso
  const getRiskProgressColor = (riskLevel) => {
    switch (riskLevel) {
      case "Alto Riesgo": return "bg-gradient-to-r from-red-500 to-red-600";
      case "Riesgo Medio": return "bg-gradient-to-r from-yellow-500 to-yellow-600";
      case "Riesgo Bajo": return "bg-gradient-to-r from-orange-500 to-orange-600";
      case "Sin Servicios": return "bg-gradient-to-r from-indigo-500 to-blue-500";
      case "Activo": return "bg-gradient-to-r from-green-500 to-green-600";
      default: return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  // Determinar el texto de urgencia
  const getUrgencyText = (riskLevel) => {
    switch (riskLevel) {
      case "Alto Riesgo": return "Acción inmediata requerida";
      case "Riesgo Medio": return "Atención necesaria pronto";
      case "Riesgo Bajo": return "Monitoreo recomendado";
      case "Sin Servicios": return "Cliente nuevo - Primer contacto pendiente";
      case "Activo": return "Cliente en buen estado";
      default: return "Requiere evaluación";
    }
  };

  // Determinar el color del texto de urgencia
  const getUrgencyColor = (riskLevel) => {
    switch (riskLevel) {
      case "Alto Riesgo": return "text-red-700 dark:text-red-300";
      case "Riesgo Medio": return "text-yellow-700 dark:text-yellow-300";
      case "Riesgo Bajo": return "text-orange-700 dark:text-orange-300";
      case "Sin Servicios": return "text-indigo-700 dark:text-indigo-300";
      case "Activo": return "text-green-700 dark:text-green-300";
      default: return "text-gray-700 dark:text-gray-300";
    }
  };

  // Determinar las acciones específicas para cada nivel de riesgo
  const getActionButtons = (riskLevel, client) => {
    switch (riskLevel) {
      case "Alto Riesgo":
        return (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Llamar ahora
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Enviar oferta
            </Button>
          </div>
        );
      case "Riesgo Medio":
        return (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Enviar mensaje
            </Button>
            <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-950/30 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Agendar
            </Button>
          </div>
        );
      case "Riesgo Bajo":
        return (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Recordatorio
            </Button>
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/30 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Ver detalles
            </Button>
          </div>
        );
      case "Sin Servicios":
        return (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Contactar cliente
            </Button>
            <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Agendar primer servicio
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Actualizar información
            </Button>
          </div>
        );
    }
  };

  // Obtener el color de fondo para las tarjetas internas según el nivel de riesgo
  const getInnerCardBgColor = (riskLevel) => {
    switch (riskLevel) {
      case "Alto Riesgo": return "bg-red-50/80 dark:bg-red-950/40 border-red-200/70 dark:border-red-800/50";
      case "Riesgo Medio": return "bg-yellow-50/80 dark:bg-yellow-950/40 border-yellow-200/70 dark:border-yellow-800/50";
      case "Riesgo Bajo": return "bg-orange-50/80 dark:bg-orange-950/40 border-orange-200/70 dark:border-orange-800/50";
      case "Sin Servicios": return "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-800/50";
      case "Activo": return "bg-green-50/80 dark:bg-green-950/40 border-green-200/70 dark:border-green-800/50";
      default: return "bg-gray-50/80 dark:bg-gray-950/40 border-gray-200/70 dark:border-gray-800/50";
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 ${getRiskColor(client.risk_level)} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      {/* Barra de progreso superior que indica el nivel de riesgo */}
      <div className="h-1 w-full">
        <div 
          className={`h-full ${getRiskProgressColor(client.risk_level)}`}
          style={{ width: `${getRiskPercentage(client.risk_level)}%` }}
        ></div>
      </div>
      
      <div className="p-5">
        {/* Encabezado con información del cliente y nivel de riesgo */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${getRiskBadgeColor(client.risk_level)} flex items-center justify-center`}>
              {getRiskIcon(client.risk_level)}
            </div>
            <div>
              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {client.client_name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-3 h-3 text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {client.phone}
                </p>
              </div>
            </div>
          </div>
          <Badge
            className={`${getRiskBadgeColor(client.risk_level)} font-semibold px-3 py-1 text-xs shadow-md`}
          >
            {client.risk_level}
          </Badge>
        </div>
        
        {/* Indicador de urgencia */}
        <div className={`text-sm font-medium ${getUrgencyColor(client.risk_level)} mb-4 flex items-center gap-1`}>
          <AlertCircle className="w-4 h-4" />
          {getUrgencyText(client.risk_level)}
        </div>
        
        {/* Métricas clave en tarjetas con fondo mejorado */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`rounded-lg p-3 border ${getInnerCardBgColor(client.risk_level)}`}>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Último servicio</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {client.risk_level === "Sin Servicios" ? "N/A" : client.days_since_last_service}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {client.risk_level === "Sin Servicios" ? "Sin historial" : "días atrás"}
            </p>
          </div>
          
          <div className={`rounded-lg p-3 border ${getInnerCardBgColor(client.risk_level)}`}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Servicios totales</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {client.total_services}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">en total</p>
          </div>
          
          <div className={`rounded-lg p-3 border ${getInnerCardBgColor(client.risk_level)}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Promedio</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {client.risk_level === "Sin Servicios" ? "N/A" : client.avg_days_between_services.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {client.risk_level === "Sin Servicios" ? "Sin datos" : "días entre servicios"}
            </p>
          </div>
        </div>
        
        {/* Acción recomendada con diseño mejorado */}
        <div className={`rounded-lg p-4 border mb-4 ${getInnerCardBgColor(client.risk_level)}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full ${getRiskBadgeColor(client.risk_level)} flex items-center justify-center flex-shrink-0`}>
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Acción recomendada:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {client.recommended_action}
              </p>
            </div>
          </div>
        </div>
        
        {/* Botones de acción específicos para cada nivel de riesgo */}
        {getActionButtons(client.risk_level, client)}
      </div>
    </div>
  );
};

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

      // Set rankings - Sort clients with services by loyalty score, then clients without services by registration date
      const rankedLoyalty = loyaltyData
        .sort((a, b) => {
          // If both have services, sort by loyalty score (descending)
          if (a.total_services > 0 && b.total_services > 0) {
            return b.loyalty_score - a.loyalty_score;
          }
          // If only one has services, prioritize that one
          if (a.total_services > 0) return -1;
          if (b.total_services > 0) return 1;
          // If both have no services, sort by registration date (newest first)
          return new Date(b.client_since).getTime() - new Date(a.client_since).getTime();
        })
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
          phone: client.phone,
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

  // Función para limpiar filtros
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedTier("all");
    setVisibleClients(10);
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || selectedTier !== "all";

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
      case "Sin Servicios":
        return "from-indigo-500 to-blue-500";
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
      case "Sin Servicios":
        return "bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-indigo-200 dark:border-indigo-800";
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
      case "Sin Servicios":
        return "text-indigo-900 dark:text-indigo-100";
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
      case "Sin Servicios":
        return <Target className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Alto Riesgo":
        return "border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40";
      case "Riesgo Medio":
        return "border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/40 dark:to-amber-900/40";
      case "Riesgo Bajo":
        return "border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40";
      case "Sin Servicios":
        return "border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950/40 dark:to-blue-900/40";
      case "Activo":
        return "border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/40";
      default:
        return "border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950/40 dark:to-slate-900/40";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "Alto Riesgo":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
      case "Riesgo Medio":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
      case "Riesgo Bajo":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
      case "Sin Servicios":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200";
      case "Activo":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "Alto Riesgo":
        return <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "Riesgo Medio":
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case "Riesgo Bajo":
        return <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case "Sin Servicios":
        return <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case "Activo":
        return <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {summaryStats.totalClients}
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryStats.activeClients} activos
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Ingresos Totales</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(summaryStats.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summaryStats.avgSpendingPerClient)} promedio
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Clientes VIP</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">
                {summaryStats.loyaltyTiers.VIP || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryStats.loyaltyTiers.Fiel || 0} fieles
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">En Riesgo</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-card/50 backdrop-blur-xl h-auto p-1">
          <TabsTrigger value="loyalty" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Fidelidad</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Rendimiento</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Análisis de Riesgo</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Gráficos</TabsTrigger>
        </TabsList>

        {/* Loyalty Analysis Tab */}
        <TabsContent value="loyalty" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking de Fidelidad de Clientes
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Fiel">Fiel</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Ocasional">Ocasional</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                    <SelectItem value="Sin Servicios">Sin Servicios</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button onClick={resetFilters} variant="outline" className="w-full sm:w-auto">
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            <div>
              {/* Verificar si hay clientes filtrados */}
              {filteredClients.length === 0 ? (
                <NoResultsFound 
                  searchTerm={searchTerm} 
                  selectedTier={selectedTier} 
                  resetFilters={resetFilters} 
                />
              ) : (
                <>
                  {/* Mostrar podio solo cuando no hay filtros activos */}
                  {!hasActiveFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8 items-end">
                      {filteredClients.slice(1, 2).map(client => <PodiumClientCard key={client.id} client={client} rank={2} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
                      {filteredClients.slice(0, 1).map(client => <PodiumClientCard key={client.id} client={client} rank={1} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
                      {filteredClients.slice(2, 3).map(client => <PodiumClientCard key={client.id} client={client} rank={3} getTierColor={getTierColor} getTierTextColor={getTierTextColor} formatCurrency={formatCurrency} />)}
                    </div>
                  )}

                  {/* Lista de clientes - siempre mostrar ClientCard para resultados filtrados */}
                  <div className="space-y-3">
                    {filteredClients.slice(hasActiveFilters ? 0 : 3, visibleClients).map(client => (
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
                      <Button onClick={() => setVisibleClients(prev => prev + 10)} variant="outline" className="w-full sm:w-auto">
                        Ver más
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Performance Analysis Tab - Mejorado */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Top 10 Mejores Clientes
                </h3>
                <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium">
                  Por ingresos
                </Badge>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                {chartData.topClients.map((client, index) => (
                  <TopClientCard
                    key={index}
                    client={client}
                    index={index}
                    getTierColor={getTierColor}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Actividad por Períodos
                </h3>
                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium">
                  Últimos 30 días
                </Badge>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                {clientPeriods
                  .filter((c) => c.services_this_month > 0)
                  .slice(0, 10)
                  .map((client) => (
                    <ActivityCard
                      key={client.client_id}
                      client={client}
                      formatCurrency={formatCurrency}
                    />
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis Tab - Completamente rediseñado */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Análisis de Riesgo de Clientes
              </h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-medium">
                  {clientRisks.filter((c) => c.risk_level === "Alto Riesgo").length} en alto riesgo
                </Badge>
                <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium">
                  {clientRisks.filter((c) => c.risk_level === "Riesgo Medio").length} en riesgo medio
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clientRisks
                .filter((c) => c.risk_level !== "Activo")
                .sort((a, b) => {
                  // Ordenar por nivel de riesgo (Alto > Medio > Bajo)
                  const riskOrder = { "Alto Riesgo": 0, "Riesgo Medio": 1, "Riesgo Bajo": 2 };
                  return riskOrder[a.risk_level] - riskOrder[b.risk_level];
                })
                .map((client) => (
                  <RiskCard
                    key={client.client_id}
                    client={client}
                    getRiskIcon={getRiskIcon}
                    getRiskColor={getRiskColor}
                    getRiskBadgeColor={getRiskBadgeColor}
                    formatCurrency={formatCurrency}
                  />
                ))}
            </div>
            
            {clientRisks.filter((c) => c.risk_level !== "Activo").length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <UserCheck className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ¡Excelente noticia!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Todos tus clientes están en buen estado y no requieren atención especial de riesgo.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                Distribución por Nivel de Fidelidad
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.tierData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => window.innerWidth >= 640 ? `${name} (${percentage}%)` : percentage > 5 ? `${name}` : ''}
                      outerRadius={window.innerWidth >= 640 ? 80 : 60}
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
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                Frecuencia de Servicios
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.frequencyChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="range"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={window.innerWidth >= 640 ? 12 : 10}
                      angle={window.innerWidth < 640 ? -45 : 0}
                      textAnchor={window.innerWidth < 640 ? "end" : "middle"}
                      height={window.innerWidth < 640 ? 70 : 30}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={window.innerWidth >= 640 ? 12 : 10} />
                    <Tooltip />
                    <Bar dataKey="clients" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientStatistics;