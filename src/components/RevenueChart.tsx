import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Service {
  id: string;
  price: number;
  created_at: string;
}

interface RevenueChartProps {
  services: Service[];
  selectedYears?: number[];
}

type Period = "week" | "month" | "year";
type ChartType = "bar" | "pie";

const RevenueChart = ({ services, selectedYears = [] }: RevenueChartProps) => {
  const [period, setPeriod] = useState<Period>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const currentYear = new Date().getFullYear();
  // Check if we are viewing ONLY the current year
  const isOnlyCurrentYear = selectedYears.length === 1 && selectedYears[0] === currentYear;
  const isMultiYear = selectedYears.length > 1;

  // Auto-switch to year view for past years or multi-year selection
  useEffect(() => {
    if (!isOnlyCurrentYear && period !== "year") {
      setPeriod("year");
    }
  }, [selectedYears, isOnlyCurrentYear, period]);

  const CHART_COLORS = [
    "hsl(210, 100%, 60%)",  // Azul vibrante
    "hsl(280, 100%, 65%)",  // Púrpura
    "hsl(160, 100%, 50%)",  // Verde esmeralda
    "hsl(30, 100%, 60%)",   // Naranja
    "hsl(340, 100%, 60%)",  // Rosa
    "hsl(190, 100%, 50%)",  // Cyan
    "hsl(50, 100%, 55%)",   // Amarillo
    "hsl(120, 100%, 50%)",  // Verde lima
    "hsl(260, 100%, 65%)",  // Violeta
    "hsl(20, 100%, 55%)",   // Coral
    "hsl(170, 100%, 45%)",  // Turquesa
    "hsl(310, 100%, 60%)",  // Magenta
  ];

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // No mostrar etiquetas muy pequeñas

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-sm drop-shadow-lg"
        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const getChartData = () => {
    let days: any[] = [];
    let format: Intl.DateTimeFormatOptions = {};

    switch (period) {
      case "week":
        // Only show for current year
        days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });
        format = { weekday: "short", day: "numeric" };
        break;

      case "month":
        // Only show for current year
        days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });
        format = { day: "numeric", month: "short" };
        break;

      case "year":
        if (isMultiYear) {
          // Show one bar per year
          return selectedYears.sort((a, b) => a - b).map(year => {
            const yearServices = services.filter(s => new Date(s.created_at).getFullYear() === year);
            const revenue = yearServices.reduce((sum, s) => sum + Number(s.price), 0);
            return {
              name: year.toString(),
              ingresos: revenue,
              servicios: yearServices.length
            };
          });
        } else {
          // Show all 12 months of the selected year
          const targetYear = selectedYears[0] || currentYear;
          days = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(targetYear, i, 1);
            date.setHours(0, 0, 0, 0);
            return date;
          });
          format = { month: "short" };
        }
        break;
    }

    return days.map((date) => {
      const nextPeriod = new Date(date);
      if (period === "year") {
        nextPeriod.setMonth(nextPeriod.getMonth() + 1);
      } else {
        nextPeriod.setDate(nextPeriod.getDate() + 1);
      }

      const periodServices = services.filter((s) => {
        const serviceDate = new Date(s.created_at);
        return serviceDate >= date && serviceDate < nextPeriod;
      });

      const revenue = periodServices.reduce((sum, s) => sum + Number(s.price), 0);

      return {
        name: date.toLocaleDateString("es-ES", format),
        ingresos: revenue,
        servicios: periodServices.length,
      };
    });
  };

  const chartData = getChartData();
  const pieChartData = chartData.filter(item => item.ingresos > 0); // Filtrar datos sin ingresos
  const totalRevenue = pieChartData.reduce((sum, item) => sum + item.ingresos, 0);

  const getPeriodTitle = () => {
    if (isMultiYear) return `Anual (${selectedYears.join(", ")})`;

    const yearSuffix = selectedYears.length > 0 ? ` (${selectedYears[0]})` : '';

    switch (period) {
      case "week":
        return `Últimos 7 Días${yearSuffix}`;
      case "month":
        return `Últimos 30 Días${yearSuffix}`;
      case "year":
        return `12 Meses${yearSuffix}`;
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 mb-8 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Ingresos {getPeriodTitle()}</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
              className={chartType === "bar" ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary" : ""}
            >
              Barras
            </Button>
            <Button
              variant={chartType === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("pie")}
              className={chartType === "pie" ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary" : ""}
            >
              Circular
            </Button>
          </div>
          {isOnlyCurrentYear && (
            <div className="flex gap-2">
              <Button
                variant={period === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("week")}
                className={period === "week" ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary" : ""}
              >
                Semana
              </Button>
              <Button
                variant={period === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("month")}
                className={period === "month" ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary" : ""}
              >
                Mes
              </Button>
              <Button
                variant={period === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("year")}
                className={period === "year" ? "bg-gradient-to-r from-cyber-glow to-cyber-secondary" : ""}
              >
                Año
              </Button>
            </div>
          )}
          {!isOnlyCurrentYear && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-cyber-glow to-cyber-secondary cursor-default"
              >
                {isMultiYear ? "Comparativa Anual" : "Vista Anual"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        {chartType === "bar" ? (
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
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--cyber-glow))" }}
            />
            <Bar
              dataKey="ingresos"
              fill="url(#colorGradient)"
              radius={[8, 8, 0, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--cyber-glow))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--cyber-secondary))" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </BarChart>
        ) : (
          <div className="flex flex-col items-center">
            {pieChartData.length > 0 ? (
              <>
                <div className="mb-4 text-center">
                  <p className="text-sm text-muted-foreground">Total del Período</p>
                  <p className="text-3xl font-bold text-foreground bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>
                <PieChart width={380} height={320}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="ingresos"
                    paddingAngle={2}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                        style={{
                          filter: "drop-shadow(0 0 8px rgba(0,0,0,0.3))",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      backdropFilter: "blur(12px)",
                      padding: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    }}
                    itemStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: "600",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{
                      color: "hsl(var(--foreground))",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                    formatter={(value, entry: any) => {
                      const percentage = ((entry.payload.ingresos / totalRevenue) * 100).toFixed(1);
                      return `${value} (${percentage}%)`;
                    }}
                  />
                </PieChart>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No hay datos para mostrar en este período</p>
              </div>
            )}
          </div>
        )}
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
