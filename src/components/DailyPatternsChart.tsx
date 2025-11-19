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
  LineChart,
  Line,
  Legend,
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
  selectedYears?: number[];
}

const DailyPatternsChart = ({ services, selectedYears = [] }: DailyPatternsChartProps) => {
  const [period, setPeriod] = useState<"week" | "month" | "year">("year");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const currentYear = new Date().getFullYear();
  const isMultiYear = selectedYears.length > 1;
  // Use the most recent selected year as the primary context for month/trend views
  const primaryYear = selectedYears.length > 0 ? Math.max(...selectedYears) : currentYear;

  // Auto-switch to year view if multi-year is selected OR if single past year is selected and current view is week
  useEffect(() => {
    const isPastYear = !isMultiYear && selectedYears.length > 0 && !selectedYears.includes(currentYear);
    if ((isMultiYear || isPastYear) && period === "week") {
      setPeriod("year");
    }
  }, [isMultiYear, period, selectedYears, currentYear]);

  // Get available months with services for selected years
  const availableMonths = useMemo(() => {
    if (period !== "month") return [];

    const months = new Set<number>();
    services.forEach(service => {
      const serviceDate = new Date(service.created_at);
      if (selectedYears.includes(serviceDate.getFullYear())) {
        months.add(serviceDate.getMonth());
      }
    });

    return Array.from(months).sort((a, b) => a - b);
  }, [services, selectedYears, period]);

  // Filter services based on period selection
  const filteredServices = useMemo(() => {
    if (period === "year") {
      return services.filter(s => selectedYears.includes(new Date(s.created_at).getFullYear()));
    }

    if (period === "month") {
      return services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return selectedYears.includes(serviceDate.getFullYear()) && serviceDate.getMonth() === selectedMonth;
      });
    }

    if (period === "week") {
      // For week view, we default to the last 7 days relative to TODAY
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate >= weekAgo && serviceDate <= today && selectedYears.includes(serviceDate.getFullYear());
      });
    }

    return services;
  }, [services, period, selectedMonth, selectedYears]);

  const chartData = useMemo(() => {
    // Análisis por día de la semana (Aggregated for general stats)
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
    }).filter((stat) => stat.services > 0);

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

    // Tendencia dinámica
    let trendDays = 30;
    if (period === "week") {
      trendDays = 7;
    } else if (period === "month") {
      const daysInMonth = new Date(primaryYear, selectedMonth + 1, 0).getDate();
      trendDays = daysInMonth;
    } else {
      trendDays = 365; // Approximate for year view logic
    }

    // Generate base dates for the X-axis (normalized to a single "timeline")
    // For multi-year, we use the primary year's dates as the "x-axis" reference
    const trendData = Array.from({ length: period === 'year' ? 12 : trendDays }, (_, i) => {
      let dateLabel = "";
      let sortKey = 0;

      if (period === "year") {
        // Monthly buckets for Year View
        const d = new Date(primaryYear, i, 1);
        dateLabel = d.toLocaleDateString('es-ES', { month: 'short' });
        sortKey = i;
      } else if (period === "month") {
        // Daily buckets for Month View
        const d = new Date(primaryYear, selectedMonth, i + 1);
        dateLabel = d.getDate().toString();
        sortKey = i + 1;
      } else {
        // Week view (only single year)
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        dateLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        sortKey = d.getTime();
      }

      // Base object with label
      const dataPoint: any = {
        name: dateLabel,
        sortKey,
      };

      // Populate data for each selected year
      selectedYears.forEach(year => {
        let yearServices = [];

        if (period === "year") {
          yearServices = services.filter(s => {
            const d = new Date(s.created_at);
            return d.getFullYear() === year && d.getMonth() === i;
          });
        } else if (period === "month") {
          yearServices = services.filter(s => {
            const d = new Date(s.created_at);
            return d.getFullYear() === year && d.getMonth() === selectedMonth && d.getDate() === (i + 1);
          });
        } else {
          // Week view is single year only, handled below or disabled for multi-year
          yearServices = services.filter(s => {
            // Logic for week view matches specific dates, not just "day of week" across years usually
            // But if we wanted to compare "Last 7 days of 2023 vs 2024" it's complex.
            // For now, week view is disabled in multi-year.
            // So this block only runs for single year.
            const d = new Date(s.created_at);
            // Re-calculate target date for this index
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - (6 - i));
            return d.getFullYear() === year && d.getMonth() === targetDate.getMonth() && d.getDate() === targetDate.getDate();
          });
        }

        dataPoint[year] = yearServices.length;
        // Optional: Add revenue per year if needed
        // dataPoint[`revenue_${year}`] = yearServices.reduce((sum, s) => sum + s.price, 0);
      });

      // For single year legacy support (or if we want a 'total' line), we can keep 'services' key
      // But for multi-line, we rely on dynamic keys.
      // Let's add a 'total' for the aggregate view if needed, or just use the first year for single selection.
      if (!isMultiYear) {
        dataPoint.services = dataPoint[selectedYears[0]];
      }

      return dataPoint;
    });

    return {
      dayStats,
      hourlyStats,
      serviceTypesByDay,
      trendData,
    };
  }, [filteredServices, period, selectedMonth, selectedYears, primaryYear, isMultiYear, services]);

  const insights = useMemo(() => {
    const { dayStats } = chartData;

    if (dayStats.length === 0) return {
      bestDay: { day: "N/A", services: 0 },
      worstDay: { day: "N/A", services: 0 },
      avgServicesPerDay: "0",
      busyDaysCount: 0,
      slowDaysCount: 0,
    };

    const bestDay = dayStats.reduce((max, day) =>
      day.services > max.services ? day : max,
      dayStats[0]
    );

    const worstDay = dayStats.reduce((min, day) =>
      day.services < min.services ? day : min,
      dayStats[0]
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

  const CHART_COLORS = [
    "#8b5cf6", // Violet (Primary)
    "#00f5ff", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
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
      name: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.dataKey === "services" ? "Servicios" : `Año ${entry.dataKey}`}:
              </span>
              <span className="font-bold text-foreground">
                {entry.value}
              </span>
            </div>
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
              {!isMultiYear && selectedYears.includes(currentYear) && (
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
                    {new Date(primaryYear, month).toLocaleDateString('es-ES', { month: 'long' })}
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

        {/* Tendencia Comparativa */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            {isMultiYear ? "Comparativa de Tendencia" : `Tendencia ${period === 'week' ? 'Últimos 7 Días' : period === 'month' ? `Días de ${new Date(primaryYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })}` : 'Anual'}`}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {isMultiYear ? (
                // Render a line for each selected year
                selectedYears.map((year, index) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    name={year.toString()}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2 }}
                  />
                ))
              ) : (
                // Single year line
                <Line
                  type="monotone"
                  dataKey="services"
                  name="Servicios"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: "#8b5cf6", strokeWidth: 2 }}
                />
              )}
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
          Insights y Recomendaciones Personalizadas{selectedYears.length > 0 ? ` - ${selectedYears.join(", ")}` : ''}{period === 'month' ? ` (${new Date(primaryYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })})` : ''}
        </h3>
        <BusinessInsights services={services} selectedYears={selectedYears} selectedMonth={selectedMonth} period={period} />
      </div>
    </div>
  );
};

export default DailyPatternsChart;
