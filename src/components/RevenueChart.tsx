import { useState } from "react";
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
}

type Period = "week" | "month" | "year";
type ChartType = "bar" | "pie";

const RevenueChart = ({ services }: RevenueChartProps) => {
  const [period, setPeriod] = useState<Period>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const CHART_COLORS = [
    "hsl(var(--cyber-glow))",
    "hsl(var(--cyber-secondary))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const getChartData = () => {
    let days: Date[] = [];
    let format: Intl.DateTimeFormatOptions = {};

    switch (period) {
      case "week":
        days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });
        format = { weekday: "short", day: "numeric" };
        break;

      case "month":
        days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });
        format = { day: "numeric", month: "short" };
        break;

      case "year":
        days = Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          date.setDate(1);
          date.setHours(0, 0, 0, 0);
          return date;
        });
        format = { month: "short" };
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

  const getPeriodTitle = () => {
    switch (period) {
      case "week":
        return "Últimos 7 Días";
      case "month":
        return "Últimos 30 Días";
      case "year":
        return "Últimos 12 Meses";
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
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, ingresos }) => `${name}: $${ingresos.toFixed(2)}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="ingresos"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                backdropFilter: "blur(12px)",
              }}
              itemStyle={{ color: "hsl(var(--cyber-glow))" }}
            />
            <Legend 
              wrapperStyle={{ color: "hsl(var(--foreground))" }}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
