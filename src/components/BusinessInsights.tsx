import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";

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

interface BusinessInsightsProps {
  services: Service[];
  selectedYear?: number;
  selectedMonth?: number;
  period?: "week" | "month" | "year";
}

const BusinessInsights = ({ services, selectedYear, selectedMonth, period = "year" }: BusinessInsightsProps) => {
  const insights = useMemo(() => {
    if (services.length === 0) {
      return {
        recommendations: [],
        warnings: [],
        opportunities: [],
        performance: null,
      };
    }

    const now = new Date();
    const currentYear = selectedYear || now.getFullYear();

    // 1. Filter services for the SELECTED period
    let relevantServices: Service[] = [];
    let startDate: Date;
    let endDate: Date;
    let daysInPeriod: number;

    if (period === "week") {
      // Last 7 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      daysInPeriod = 7;

      relevantServices = services.filter(service => {
        const date = new Date(service.created_at);
        return date >= startDate && date <= endDate;
      });
    } else if (period === "month") {
      // Selected month
      const month = selectedMonth !== undefined ? selectedMonth : now.getMonth();
      startDate = new Date(currentYear, month, 1);
      endDate = new Date(currentYear, month + 1, 0); // Last day of month
      daysInPeriod = endDate.getDate();

      relevantServices = services.filter(service => {
        const date = new Date(service.created_at);
        return date >= startDate && date <= endDate; // Simple range check handles year/month implicitly
      });
    } else {
      // Selected year (default)
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);

      // For current year, we only count days passed so far for averages
      if (currentYear === now.getFullYear()) {
        daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        daysInPeriod = 365; // Simplified
      }

      relevantServices = services.filter(service => {
        const date = new Date(service.created_at);
        return date.getFullYear() === currentYear;
      });
    }

    if (relevantServices.length === 0) {
      return {
        recommendations: [],
        warnings: [],
        opportunities: [],
        performance: null,
      };
    }

    // 2. Calculate Metrics for the SELECTED period
    const totalRevenue = relevantServices.reduce((sum, s) => sum + s.price, 0);
    const dailyAverageRevenue = totalRevenue / daysInPeriod;
    const avgPrice = totalRevenue / relevantServices.length;

    // Análisis por día de la semana
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayStats = dayNames.map((day, index) => {
      const dayServices = relevantServices.filter((service) => {
        const date = new Date(service.created_at);
        return date.getDay() === index;
      });
      return {
        day,
        count: dayServices.length,
        revenue: dayServices.reduce((sum, s) => sum + s.price, 0),
      };
    });

    // Análisis de servicios
    const serviceTypeStats = relevantServices.reduce(
      (acc, service) => {
        acc[service.service_type] = (acc[service.service_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostPopularService = Object.entries(serviceTypeStats).sort(([, a], [, b]) => b - a)[0];
    const leastPopularService = Object.entries(serviceTypeStats).sort(([, a], [, b]) => a - b)[0];

    // Precios
    const prices = relevantServices.map((s) => s.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Días más y menos productivos
    const bestDay = dayStats.reduce((max, day) => (day.count > max.count ? day : max));
    const worstDay = dayStats.reduce((min, day) => (day.count < min.count ? day : min));

    // Análisis de clientes (Fidelidad en este periodo)
    const uniqueClients = new Set(relevantServices.map((s) => s.client_id)).size;

    // Para fidelidad real, necesitamos ver si estos clientes han venido ANTES de este periodo
    // O si han venido múltiples veces DENTRO de este periodo.
    // Simplificación: Clientes recurrentes DENTRO del periodo seleccionado.
    const clientVisitsInPeriod = relevantServices.reduce(
      (acc, service) => {
        acc[service.client_id] = (acc[service.client_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const repeatClientsInPeriod = Object.values(clientVisitsInPeriod).filter(count => count > 1).length;
    const loyaltyRate = uniqueClients > 0 ? (repeatClientsInPeriod / uniqueClients) * 100 : 0;

    // Generar recomendaciones
    const recommendations = [];
    const warnings = [];
    const opportunities = [];

    // Recomendaciones basadas en días
    if (bestDay.count > worstDay.count * 2) {
      recommendations.push({
        type: "schedule",
        priority: "high",
        title: "Optimizar horarios",
        description: `${bestDay.day} es tu día más fuerte (${bestDay.count} servicios). Considera ampliar horarios.`,
        icon: Clock,
      });
    }

    if (worstDay.count < (relevantServices.length / daysInPeriod) * 0.5 && relevantServices.length > 10) {
      opportunities.push({
        type: "marketing",
        priority: "medium",
        title: `Impulsar el ${worstDay.day}`,
        description: `${worstDay.day} tiene baja actividad. Crea una promoción especial para este día.`,
        icon: Target,
      });
    }

    // Recomendaciones basadas en servicios
    if (mostPopularService && mostPopularService[1] > relevantServices.length * 0.4) {
      opportunities.push({
        type: "service",
        priority: "medium",
        title: "Potenciar Estrella",
        description: `${mostPopularService[0]} es el 40%+ de tus ventas. ¿Puedes ofrecer una versión premium?`,
        icon: Users,
      });
    }

    // Recomendaciones de precios
    if (maxPrice - minPrice > avgPrice && prices.length > 10) {
      opportunities.push({
        type: "pricing",
        priority: "medium",
        title: "Estandarizar Precios",
        description: `Gran variación de precios ($${minPrice} - $${maxPrice}). Simplificar podría atraer más clientes.`,
        icon: DollarSign,
      });
    }

    // Alertas de tendencia (Comparar con periodo anterior si es posible, o usar métricas simples)
    // Si el promedio diario es muy bajo comparado con lo "esperado" (ej. un umbral fijo o heurística)
    if (dailyAverageRevenue < 20 && relevantServices.length > 0) { // Ejemplo arbitrario
      warnings.push({
        type: "trend",
        priority: "high",
        title: "Ingresos Bajos",
        description: "El promedio diario de ingresos es bajo en este periodo. Revisa tu estrategia de precios.",
        icon: TrendingDown
      })
    }

    return {
      recommendations,
      warnings,
      opportunities,
      performance: {
        bestDay: bestDay.day,
        worstDay: worstDay.day,
        avgPrice: avgPrice.toFixed(2),
        loyaltyRate: loyaltyRate.toFixed(1),
        uniqueClients,
        mostPopularService: mostPopularService?.[0] || "N/A",
        totalRevenue: totalRevenue, // Changed from weekly/monthly specific
        dailyAverage: dailyAverageRevenue.toFixed(2),
        periodLabel: period === 'week' ? 'últimos 7 días' : period === 'month' ? 'este mes' : 'este año'
      },
    };
  }, [services, selectedYear, selectedMonth, period]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/30 bg-red-500/10";
      case "medium":
        return "border-yellow-500/30 bg-yellow-500/10";
      case "low":
        return "border-blue-500/30 bg-blue-500/10";
      default:
        return "border-border/30 bg-card/50";
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-foreground";
    }
  };

  if (services.length === 0) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
        <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Sin datos para analizar</h3>
        <p className="text-muted-foreground">
          Agrega algunos servicios para ver insights y recomendaciones
          personalizadas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      {insights.performance && (
        <Card className="p-6 bg-gradient-to-br from-cyber-glow/5 to-cyber-secondary/5 border-cyber-glow/20">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyber-glow" />
            Resumen de Rendimiento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyber-glow">
                {insights.performance.bestDay}
              </p>
              <p className="text-xs text-muted-foreground">Mejor día</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                ${insights.performance.avgPrice}
              </p>
              <p className="text-xs text-muted-foreground">Precio promedio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {insights.performance.loyaltyRate}%
              </p>
              <p className="text-xs text-muted-foreground">Clientes fieles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                ${insights.performance.totalRevenue}
              </p>
              <p className="text-xs text-muted-foreground">Ingresos ({insights.performance.periodLabel})</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Recomendaciones Prioritarias
          </h3>
          <div className="space-y-3">
            {insights.recommendations.map((rec, index) => (
              <Alert key={index} className={getPriorityColor(rec.priority)}>
                <rec.icon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`font-medium ${getPriorityTextColor(rec.priority)}`}
                      >
                        {rec.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        rec.priority === "high" ? "destructive" : "secondary"
                      }
                    >
                      {rec.priority === "high" ? "Urgente" : "Importante"}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Opportunities */}
      {insights.opportunities.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Oportunidades de Crecimiento
          </h3>
          <div className="space-y-3">
            {insights.opportunities.map((opp, index) => (
              <Alert key={index} className={getPriorityColor(opp.priority)}>
                <opp.icon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`font-medium ${getPriorityTextColor(opp.priority)}`}
                      >
                        {opp.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {opp.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-500/30 text-green-600"
                    >
                      Oportunidad
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Warnings */}
      {insights.warnings.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Puntos de Atención
          </h3>
          <div className="space-y-3">
            {insights.warnings.map((warning, index) => (
              <Alert key={index} className={getPriorityColor(warning.priority)}>
                <warning.icon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`font-medium ${getPriorityTextColor(warning.priority)}`}
                      >
                        {warning.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {warning.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-orange-500/30 text-orange-600"
                    >
                      Advertencia
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BusinessInsights;
