import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Calendar, TrendingUp, TrendingDown, Activity } from "lucide-react";
import BusinessInsights from "./BusinessInsights";

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

interface DailyPatternsChartProps {
  services: Service[];
  selectedYear?: number;
}

const DailyPatternsChart = ({ services, selectedYear }: DailyPatternsChartProps) => {
  const chartData = useMemo(() => {
    // Análisis por día de la semana
    const dayNames = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    const dayStats = dayNames.map((day, index) => {
      const dayServices = services.filter((service) => {
        const date = new Date(service.created_at);
        return date.getDay() === index;
      });

      const revenue = dayServices.reduce(
        (sum, service) => sum + service.price,
        0,
      );

      return {
        day,
        services: dayServices.length,
        revenue: revenue,
        avgRevenue: dayServices.length > 0 ? revenue / dayServices.length : 0,
      };
    });

    // Análisis por horas del día
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
      const hourServices = services.filter((service) => {
        const date = new Date(service.created_at);
        return date.getHours() === hour;
      });

      return {
        hour: `${hour}:00`,
        services: hourServices.length,
        revenue: hourServices.reduce((sum, service) => sum + service.price, 0),
      };
    }).filter((stat) => stat.services > 0); // Solo mostrar horas con servicios

    // Análisis de servicios más populares por día
    const serviceTypesByDay = dayNames.map((day, dayIndex) => {
      const dayServices = services.filter((service) => {
        const date = new Date(service.created_at);
        return date.getDay() === dayIndex;
      });

      const serviceTypes = dayServices.reduce(
        (acc, service) => {
          acc[service.service_type] = (acc[service.service_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topService = Object.entries(serviceTypes).sort(
        ([, a], [, b]) => b - a,
      )[0];

      return {
        day,
        totalServices: dayServices.length,
        topService: topService ? topService[0] : "N/A",
        topServiceCount: topService ? topService[1] : 0,
      };
    });

    // Últimos 30 días para tendencia (optimizado para usar índices)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Normalizar a medianoche
      const compareDate = date.getTime();

      const dayServices = services.filter((service) => {
        const serviceDate = new Date(service.created_at);
        serviceDate.setHours(0, 0, 0, 0);
        return serviceDate.getTime() === compareDate;
      });

      return {
        date: date.toISOString().split("T")[0],
        day: date.getDate(),
        services: dayServices.length,
        revenue: dayServices.reduce((sum, service) => sum + service.price, 0),
      };
    }).reverse();

    return {
      dayStats,
      hourlyStats,
      serviceTypesByDay,
      last30Days,
    };
  }, [services]);

  const insights = useMemo(() => {
    const { dayStats } = chartData;

    const bestDay = dayStats.reduce((max, day) =>
      day.services > max.services ? day : max,
    );

    const worstDay = dayStats.reduce((min, day) =>
      day.services < min.services ? day : min,
    );

    const totalServices = dayStats.reduce((sum, day) => sum + day.services, 0);
    const avgServicesPerDay = totalServices / 7;

    const busyDays = dayStats.filter((day) => day.services > avgServicesPerDay);
    const slowDays = dayStats.filter((day) => day.services < avgServicesPerDay);

    return {
      bestDay,
      worstDay,
      avgServicesPerDay: avgServicesPerDay.toFixed(1),
      busyDaysCount: busyDays.length,
      slowDaysCount: slowDays.length,
    };
  }, [chartData]);

  const COLORS = [
    "#00f5ff", // cyber-glow
    "#8b5cf6", // cyber-secondary
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#f97316", // orange
  ];

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      dataKey: string;
      value: number;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === "services"
                ? "Servicios"
                : entry.dataKey === "revenue"
                  ? "Ingresos"
                  : entry.dataKey === "avgRevenue"
                    ? "Promedio"
                    : entry.dataKey}
              :{" "}
              {entry.dataKey.includes("revenue") ||
              entry.dataKey.includes("Revenue")
                ? `$${entry.value.toFixed(2)}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Mejor Día</p>
              <p className="font-bold text-green-600">{insights.bestDay.day}</p>
              <p className="text-xs text-muted-foreground">
                {insights.bestDay.services} servicios
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Día Más Lento</p>
              <p className="font-bold text-red-600">{insights.worstDay.day}</p>
              <p className="text-xs text-muted-foreground">
                {insights.worstDay.services} servicios
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Promedio Diario</p>
              <p className="font-bold text-blue-600">
                {insights.avgServicesPerDay}
              </p>
              <p className="text-xs text-muted-foreground">servicios/día</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Días Ocupados</p>
              <p className="font-bold text-purple-600">
                {insights.busyDaysCount}/7
              </p>
              <p className="text-xs text-muted-foreground">sobre promedio</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servicios por Día de la Semana */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyber-glow" />
            Servicios por Día de la Semana
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.dayStats}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="services"
                fill="url(#serviceGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient
                  id="serviceGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Ingresos por Día */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Ingresos por Día de la Semana
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.dayStats}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="revenue"
                fill="url(#revenueGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Patrón Horario y Tendencia de 30 días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servicios por Hora del Día */}
        {chartData.hourlyStats.length > 0 && (
          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Actividad por Hora del Día
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData.hourlyStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="hour"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="services"
                  stroke="#00f5ff"
                  strokeWidth={3}
                  dot={{ fill: "#00f5ff", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#00f5ff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Tendencia Últimos 30 Días */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Tendencia Últimos 30 Días
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.last30Days}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="services"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: "#8b5cf6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabla de Resumen por Días */}
      <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
        <h3 className="text-lg font-semibold mb-4">
          Resumen Detallado por Días
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                  Día
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                  Servicios
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                  Ingresos
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                  Promedio
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                  Servicio Más Popular
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.dayStats.map((day, index) => (
                <tr key={day.day} className="border-b border-border/20">
                  <td className="py-3 px-2 font-medium">{day.day}</td>
                  <td className="py-3 px-2 text-center">{day.services}</td>
                  <td className="py-3 px-2 text-center">
                    ${day.revenue.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    ${day.avgRevenue.toFixed(2)}
                  </td>
                  <td className="py-3 px-2">
                    {chartData.serviceTypesByDay[index]?.topService || "N/A"}
                    {chartData.serviceTypesByDay[index]?.topServiceCount >
                      0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({chartData.serviceTypesByDay[index].topServiceCount})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge
                      variant={
                        day.services >= parseFloat(insights.avgServicesPerDay)
                          ? "default"
                          : "secondary"
                      }
                      className={
                        day.services >= parseFloat(insights.avgServicesPerDay)
                          ? "bg-green-500/20 text-green-600 border-green-500/30"
                          : ""
                      }
                    >
                      {day.services >= parseFloat(insights.avgServicesPerDay)
                        ? "Alto"
                        : "Bajo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Business Insights Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-cyber-glow" />
          Insights y Recomendaciones Personalizadas{selectedYear ? ` - ${selectedYear}` : ''}
        </h3>
        <BusinessInsights services={services} selectedYear={selectedYear} />
      </div>
    </div>
  );
};

export default DailyPatternsChart;
