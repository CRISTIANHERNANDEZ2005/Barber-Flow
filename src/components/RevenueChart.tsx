import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Service {
  id: string;
  price: number;
  created_at: string;
}

interface RevenueChartProps {
  services: Service[];
}

const RevenueChart = ({ services }: RevenueChartProps) => {
  // Get last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const chartData = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayServices = services.filter((s) => {
      const serviceDate = new Date(s.created_at);
      return serviceDate >= date && serviceDate < nextDay;
    });

    const revenue = dayServices.reduce((sum, s) => sum + Number(s.price), 0);

    return {
      name: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
      ingresos: revenue,
      servicios: dayServices.length,
    };
  });

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 mb-8 shadow-[0_8px_32px_hsl(var(--background)/0.4)]">
      <h2 className="text-2xl font-bold text-foreground mb-6">Ingresos Últimos 7 Días</h2>
      <ResponsiveContainer width="100%" height={300}>
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
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
