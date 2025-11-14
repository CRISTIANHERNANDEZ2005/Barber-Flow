import { Card } from "@/components/ui/card";
import { Scissors, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: "scissors" | "dollar" | "trending" | "chart";
}

const iconMap = {
  scissors: Scissors,
  dollar: DollarSign,
  trending: TrendingUp,
  chart: BarChart3,
};

const StatsCard = ({ title, value, subtitle, icon }: StatsCardProps) => {
  const Icon = iconMap[icon];

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 hover:border-cyber-glow/50 transition-all duration-300 shadow-[0_8px_32px_hsl(var(--background)/0.4)] hover:shadow-[0_8px_32px_hsl(var(--cyber-glow)/0.2)] group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-cyber-glow transition-colors">
            {value}
          </p>
        </div>
        <div className="bg-gradient-to-br from-cyber-glow/20 to-cyber-secondary/20 p-3 rounded-xl group-hover:from-cyber-glow/30 group-hover:to-cyber-secondary/30 transition-all">
          <Icon className="h-6 w-6 text-cyber-glow" />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
    </Card>
  );
};

export default StatsCard;
