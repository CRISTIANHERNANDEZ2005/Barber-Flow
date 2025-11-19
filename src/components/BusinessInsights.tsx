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

    // Filter services based on selected period, year, and month
    const filteredServices = services.filter((service) => {
      const serviceDate = new Date(service.created_at);
      
      // If no year selected, use all services
      if (!selectedYear) return true;
      
      // If year doesn't match, exclude service
      if (serviceDate.getFullYear() !== selectedYear) return false;
      
      // If period is month and month doesn't match, exclude service
      if (period === "month" && selectedMonth !== undefined && serviceDate.getMonth() !== selectedMonth) {
        return false;
      }
      
      return true;
    });

    if (filteredServices.length === 0) {
      return {
        recommendations: [],
        warnings: [],
        opportunities: [],
        performance: null,
      };
    }

    const now = new Date();
    const currentYear = selectedYear || now.getFullYear();
    
    // For period-based filtering (same logic as DailyPatternsChart)
    let relevantServices = filteredServices;
    
    if (period === "week") {
      // Last 7 days from today (only for selected year)
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      relevantServices = filteredServices.filter(service => {
        const serviceDate = new Date(service.created_at);
        return serviceDate >= weekAgo && serviceDate <= now;
      });
    } else if (period === "month") {
      // All services in the selected month and year
      relevantServices = filteredServices;
    } else {
      // All services in the selected year
      relevantServices = filteredServices;
    }

    const last30Days = relevantServices.filter((service) => {
      const serviceDate = new Date(service.created_at);
      const daysDiff =
        (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    const last7Days = relevantServices.filter((service) => {
      const serviceDate = new Date(service.created_at);
      const daysDiff =
        (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

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

    const mostPopularService = Object.entries(serviceTypeStats).sort(
      ([, a], [, b]) => b - a,
    )[0];

    const leastPopularService = Object.entries(serviceTypeStats).sort(
      ([, a], [, b]) => a - b,
    )[0];

    // Análisis de precios
    const prices = relevantServices.map((s) => s.price);
    const avgPrice =
      prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Días más y menos productivos
    const bestDay = dayStats.reduce((max, day) =>
      day.count > max.count ? day : max,
    );
    const worstDay = dayStats.reduce((min, day) =>
      day.count < min.count ? day : min,
    );

    // Análisis de tendencias
    const weeklyRevenue = last7Days.reduce((sum, s) => sum + s.price, 0);
    const monthlyRevenue = last30Days.reduce((sum, s) => sum + s.price, 0);
    const dailyAverage = last7Days.length > 0 ? weeklyRevenue / 7 : 0;
    const monthlyAverage = last30Days.length > 0 ? monthlyRevenue / 30 : 0;

    // Análisis de clientes
    const uniqueClients = new Set(relevantServices.map((s) => s.client_id)).size;
    const repeatClients = relevantServices.reduce(
      (acc, service) => {
        if (service.client) {
          const clientName =
            `${service.client.first_name} ${service.client.last_name || ""}`.trim();
          acc[clientName] = (acc[clientName] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const loyalClients = Object.entries(repeatClients).filter(
      ([, count]) => count > 1,
    ).length;

    const loyaltyRate = (loyalClients / uniqueClients) * 100;

    // Generar recomendaciones
    const recommendations = [];
    const warnings = [];
    const opportunities = [];

    // Recomendaciones basadas en días
    if (bestDay.count > worstDay.count * 2) {
      let recommendationText = `${bestDay.day} es tu día más productivo (${bestDay.count} servicios).`;
      
      if (period === "month") {
        recommendationText += ` En ${new Date(selectedYear || now.getFullYear(), selectedMonth).toLocaleDateString('es-ES', { month: 'long' })} ${selectedYear || now.getFullYear()}.`;
      } else if (period === "week") {
        recommendationText += " En los últimos 7 días. ";
      } else {
        recommendationText += ` En ${selectedYear || now.getFullYear()}.`;
      }
      
      recommendationText += " Considera abrir más temprano o cerrar más tarde este día.";
      
      recommendations.push({
        type: "schedule",
        priority: "high",
        title: "Optimizar horarios",
        description: recommendationText,
        icon: Clock,
      });
    }

    if (worstDay.count < 3 && relevantServices.length > 20) {
      opportunities.push({
        type: "marketing",
        priority: "medium",
        title: `Promoción para ${worstDay.day}`,
        description: `${worstDay.day} es tu día más lento. Considera ofertas especiales para atraer más clientes.`,
        icon: Target,
      });
    }

    // Recomendaciones basadas en servicios
    if (mostPopularService && mostPopularService[1] > relevantServices.length * 0.4) {
      opportunities.push({
        type: "service",
        priority: "medium",
        title: "Especialización",
        description: `${mostPopularService[0]} es muy popular (${mostPopularService[1]} veces). Considera especializarte más en este servicio.`,
        icon: Users,
      });
    }

    if (leastPopularService && leastPopularService[1] < relevantServices.length * 0.1) {
      warnings.push({
        type: "service",
        priority: "low",
        title: "Servicio poco demandado",
        description: `${leastPopularService[0]} tiene poca demanda. Evalúa si mantenerlo o promocionarlo mejor.`,
        icon: AlertTriangle,
      });
    }

    // Recomendaciones basadas en precios
    if (maxPrice - minPrice > avgPrice) {
      opportunities.push({
        type: "pricing",
        priority: "medium",
        title: "Oportunidad de precios",
        description: `Hay gran variación en tus precios ($${minPrice} - $${maxPrice}). Considera estandarizar o crear paquetes.`,
        icon: DollarSign,
      });
    }

    // Recomendaciones basadas en fidelidad
    if (loyaltyRate < 30) {
      recommendations.push({
        type: "loyalty",
        priority: "high",
        title: "Programa de fidelidad",
        description: `Solo ${loyaltyRate.toFixed(1)}% de tus clientes repiten. Implementa un programa de fidelidad.`,
        icon: Users,
      });
    } else if (loyaltyRate > 60) {
      opportunities.push({
        type: "loyalty",
        priority: "low",
        title: "Excelente fidelidad",
        description: `${loyaltyRate.toFixed(1)}% de tus clientes son fieles. ¡Sigue así! Considera pedirles referencias.`,
        icon: TrendingUp,
      });
    }

    // Análisis de tendencias recientes
    if (last7Days.length < last30Days.length / 4) {
      warnings.push({
        type: "trend",
        priority: "high",
        title: "Disminución reciente",
        description:
          "Has tenido menos servicios en la última semana. Revisa tu estrategia de marketing.",
        icon: TrendingDown,
      });
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
        weeklyRevenue,
        monthlyRevenue,
        dailyAverage: dailyAverage.toFixed(2),
      },
    };
  }, [services]);

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
                ${insights.performance.dailyAverage}
              </p>
              <p className="text-xs text-muted-foreground">Promedio diario</p>
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
