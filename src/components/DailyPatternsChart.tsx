import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [period, setPeriod] = useState<"week" | "month" | "year">("year");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const currentYear = new Date().getFullYear();
  const targetYear = selectedYear || currentYear;
  const isCurrentYear = targetYear === currentYear;

  // Get available months with services for selected year
  const availableMonths = useMemo(() => {
    if (period !== "month") return [];

    const months = new Set<number>();
    services.forEach(service => {
      const serviceDate = new Date(service.created_at);
      if (serviceDate.getFullYear() === targetYear) {
        months.add(serviceDate.getMonth());
      }
    });

    return Array.from(months).sort((a, b) => a - b);
  }, [services, targetYear, period]);

  // Filter services based on period selection
  const filteredServices = useMemo(() => {
    if (period === "year") {
      return services.filter(s => new Date(s.created_at).getFullYear() === targetYear);
    }

    if (period === "month") {
      return services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate.getFullYear() === targetYear && serviceDate.getMonth() === selectedMonth;
      });
    }

    if (period === "week") {
      // Week view only available/relevant for current context usually, 
      // but if user selects it for past year, we might just show the year or disable it.
      // For now, let's keep the original logic which was relative to "today".
      // If we are looking at 2023, "last 7 days from today" is empty.
      // So we should probably force "year" if they try to select "week" in a past year?
      // Or better, just show the year data if they select week in past year.
      if (!isCurrentYear) {
        return services.filter(s => new Date(s.created_at).getFullYear() === targetYear);
      }

      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate >= weekAgo && serviceDate <= today;
      });
    }

    return services;
  }, [services, period, selectedMonth, targetYear, isCurrentYear]);

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
      const dayServices = filteredServices.filter((service) => {
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
      const hourServices = filteredServices.filter((service) => {
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
      const dayServices = filteredServices.filter((service) => {
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

    // Tendencia dinámica basada en el período seleccionado
    let trendDays = 30;

    if (period === "week" && isCurrentYear) {
      trendDays = 7;
    } else if (period === "month") {
      const daysInMonth = new Date(targetYear, selectedMonth + 1, 0).getDate();
      trendDays = daysInMonth;
    } else {
      trendDays = 365;
    }

    const trendData = Array.from({ length: trendDays }, (_, i) => {
      let date;
      if (period === "month") {
        date = new Date(targetYear, selectedMonth, i + 1);
      } else if (period === "week" && isCurrentYear) {
        date = new Date();
        date.setDate(date.getDate() - (6 - i));
      } else {
        // Year view: show last 365 days or all days of year?
        // If past year, show days of that year.
        // Simplified: just show last 365 days if current year, or whole year if past.
        // But for "trend", usually a line chart needs sequential dates.
        // Let's just use the targetYear.
        date = new Date(targetYear, 0, 1);
        date.setDate(date.getDate() + i);
      }

      date.setHours(0, 0, 0, 0);
      const compareDate = date.getTime();

      const dayServices = filteredServices.filter((service) => {
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
    });

    return {
      dayStats,
      hourlyStats,
      serviceTypesByDay,
      trendData,
    };
  }, [filteredServices, period, selectedMonth, targetYear, isCurrentYear]);

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
      {/* Period Filter Controls */}
      <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Período:</span>
            <div className="flex p-1 bg-muted/50 rounded-lg w-full sm:w-auto">
              {isCurrentYear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriod("week")}
                  className={`flex-1 sm:flex-none rounded-md transition-all duration-200 ${period === "week"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  7 Días
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPeriod("month")}
                className={`flex-1 sm:flex-none rounded-md transition-all duration-200 ${period === "month"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Mes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPeriod("year")}
                className={`flex-1 sm:flex-none rounded-md transition-all duration-200 ${period === "year"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Año
              </Button>
            </div>
          </div>

          {/* Month selector - show when month period is selected */}
          {period === "month" && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap md:hidden">Mes:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full md:w-48 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {new Date(targetYear, month).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Insights Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-3 md:p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            <div className="p-1.5 rounded-full bg-green-500/10">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mejor Día</p>
              <p className="font-bold text-green-600 text-sm md:text-base">{insights.bestDay.day}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {insights.bestDay.services} servicios
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            <div className="p-1.5 rounded-full bg-red-500/10">
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Día Lento</p>
              <p className="font-bold text-red-600 text-sm md:text-base">{insights.worstDay.day}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {insights.worstDay.services} servicios
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-500/10">
              <Activity className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Promedio</p>
              <p className="font-bold text-blue-600 text-sm md:text-base">
                {insights.avgServicesPerDay}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">serv/día</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            <div className="p-1.5 rounded-full bg-purple-500/10">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días Top</p>
              <p className="font-bold text-purple-600 text-sm md:text-base">
                {insights.busyDaysCount}/7
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">sobre prom.</p>
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
            Tendencia {period === 'week' ? 'Últimos 7 Días' : period === 'month' ? `Días de ${new Date(targetYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })} ${targetYear}` : 'Últimos 365 Días'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.trendData}>
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
      <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50 overflow-hidden">
        <h3 className="text-lg font-semibold mb-4">
          Resumen Detallado por Días
        </h3>
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <table className="w-full min-w-[600px]">
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
          Insights y Recomendaciones Personalizadas{selectedYear ? ` - ${selectedYear}` : ''}{period === 'month' ? ` (${new Date(targetYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })})` : ''}
        </h3>
        <BusinessInsights services={services} selectedYear={targetYear} selectedMonth={selectedMonth} period={period} />
      </div>
    </div>
  );
};

export default DailyPatternsChart;
