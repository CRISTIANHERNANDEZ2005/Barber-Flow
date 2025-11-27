import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Users
} from "lucide-react";

interface Service {
  id: string;
  client_id: string;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

interface MultiYearComparisonChartProps {
  services: Service[];
  selectedYears: number[];
}

const MultiYearComparisonChart = ({ services, selectedYears }: MultiYearComparisonChartProps) => {
  // Prepare data for monthly comparison across selected years
  const chartData = useMemo(() => {
    if (selectedYears.length < 2) return [];
    
    // Month names in Spanish
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    
    // Create data structure for all months
    const data = monthNames.map((month, index) => {
      const monthData: any = { 
        name: month,
        monthIndex: index
      };
      
      // For each selected year, calculate metrics for this month
      selectedYears.forEach(year => {
        const monthServices = services.filter(service => {
          const serviceDate = new Date(service.created_at);
          return serviceDate.getFullYear() === year && serviceDate.getMonth() === index;
        });
        
        monthData[`services_${year}`] = monthServices.length;
        monthData[`revenue_${year}`] = monthServices.reduce((sum, s) => sum + s.price, 0);
      });
      
      return monthData;
    });
    
    return data;
  }, [services, selectedYears]);
  
  // Calculate yearly totals for summary
  const yearlyTotals = useMemo(() => {
    return selectedYears.map(year => {
      const yearServices = services.filter(s => new Date(s.created_at).getFullYear() === year);
      const totalRevenue = yearServices.reduce((sum, s) => sum + s.price, 0);
      const totalServices = yearServices.length;
      
      return {
        year,
        revenue: totalRevenue,
        services: totalServices,
        avgTicket: totalServices > 0 ? totalRevenue / totalServices : 0
      };
    });
  }, [services, selectedYears]);
  
  // Get chart colors for years
  const getYearColor = (year: number, type: 'services' | 'revenue') => {
    const index = selectedYears.indexOf(year) % 5;
    const colors = {
      services: [
        "hsl(210, 100%, 60%)",  // Azul vibrante
        "hsl(280, 100%, 65%)",  // Púrpura
        "hsl(160, 100%, 50%)",  // Verde esmeralda
        "hsl(30, 100%, 60%)",   // Naranja
        "hsl(340, 100%, 60%)",  // Rosa
      ],
      revenue: [
        "hsl(190, 100%, 50%)",  // Cyan
        "hsl(260, 100%, 65%)",  // Violeta
        "hsl(120, 100%, 50%)",  // Verde lima
        "hsl(20, 100%, 55%)",   // Coral
        "hsl(50, 100%, 55%)",   // Amarillo
      ]
    };
    
    return colors[type][index];
  };
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg">
          <p className="font-bold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {selectedYears.map(year => {
              const serviceData = payload.find((p: any) => p.dataKey === `services_${year}`);
              const revenueData = payload.find((p: any) => p.dataKey === `revenue_${year}`);
              
              if (!serviceData && !revenueData) return null;
              
              return (
                <div key={year} className="flex items-center justify-between gap-4 py-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getYearColor(year, 'services') }}
                    />
                    <span className="text-sm text-muted-foreground">{year}:</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {serviceData ? serviceData.value : 0} servicios
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${revenueData ? revenueData.value.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  
  if (selectedYears.length < 2) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 mb-8 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Selecciona al menos 2 años para comparar</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Años Comparados</p>
              <p className="font-bold text-foreground">{selectedYears.join(', ')}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ingresos Totales</p>
              <p className="font-bold text-foreground">
                ${yearlyTotals.reduce((sum, y) => sum + y.revenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Servicios Totales</p>
              <p className="font-bold text-foreground">
                {yearlyTotals.reduce((sum, y) => sum + y.services, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Services Comparison Chart */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyber-glow" />
          Comparativa Mensual de Servicios
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedYears.map(year => (
              <Bar
                key={`services_${year}`}
                dataKey={`services_${year}`}
                name={`${year} (Servicios)`}
                fill={getYearColor(year, 'services')}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      
      {/* Revenue Comparison Chart */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Comparativa Mensual de Ingresos
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
            />
            <Legend />
            {selectedYears.map(year => (
              <Line
                key={`revenue_${year}`}
                dataKey={`revenue_${year}`}
                name={`${year} (Ingresos)`}
                stroke={getYearColor(year, 'revenue')}
                strokeWidth={3}
                dot={{ fill: getYearColor(year, 'revenue'), strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: getYearColor(year, 'revenue'), strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
      
      {/* Yearly Growth Summary */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
        <h3 className="text-xl font-bold text-foreground mb-4">Resumen Anual</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Año</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Servicios</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ingresos</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ticket Promedio</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Crecimiento</th>
              </tr>
            </thead>
            <tbody>
              {yearlyTotals.map((yearData, index) => {
                const previousYear = index > 0 ? yearlyTotals[index - 1] : null;
                const growthRate = previousYear 
                  ? ((yearData.revenue - previousYear.revenue) / previousYear.revenue) * 100 
                  : 0;
                
                return (
                  <tr key={yearData.year} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-3 px-4 font-medium">{yearData.year}</td>
                    <td className="py-3 px-4 text-right">{yearData.services}</td>
                    <td className="py-3 px-4 text-right">${yearData.revenue.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">${yearData.avgTicket.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MultiYearComparisonChart;