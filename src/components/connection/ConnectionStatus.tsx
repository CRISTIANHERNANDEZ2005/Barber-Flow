import React from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastError: string | null;
}

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  onRetry,
  className,
  compact = false,
}) => {
  const { isConnected, isReconnecting, connectionAttempts, lastError } =
    connectionState;

  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        icon: RefreshCw,
        text: `Reconectando... (${connectionAttempts}/5)`,
        variant: "secondary" as const,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        iconClass: "animate-spin",
      };
    }

    if (isConnected) {
      return {
        icon: Wifi,
        text: "Conectado",
        variant: "default" as const,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        iconClass: "",
      };
    }

    return {
      icon: lastError ? AlertCircle : WifiOff,
      text: lastError || "Sin conexión",
      variant: "destructive" as const,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      iconClass: "",
    };
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            statusInfo.bgColor,
            statusInfo.color,
          )}
        >
          <IconComponent
            className={cn("h-3 w-3", statusInfo.iconClass)}
          />
          <span>{statusInfo.text}</span>
        </div>
        {!isConnected && !isReconnecting && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Don't show full card if connected and no errors
  if (isConnected && !lastError) {
    return (
      <Badge
        variant="default"
        className={cn(
          "flex items-center gap-1",
          "bg-green-500/10 text-green-500 border-green-500/20",
          className,
        )}
      >
        <Wifi className="h-3 w-3" />
        En línea
      </Badge>
    );
  }

  return (
    <Card
      className={cn(
        "border-l-4 shadow-sm",
        {
          "border-l-green-500 bg-green-50/50 dark:bg-green-950/20":
            isConnected,
          "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20":
            isReconnecting,
          "border-l-red-500 bg-red-50/50 dark:bg-red-950/20":
            !isConnected && !isReconnecting,
        },
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                statusInfo.bgColor,
              )}
            >
              <IconComponent
                className={cn(
                  "h-4 w-4",
                  statusInfo.color,
                  statusInfo.iconClass,
                )}
              />
            </div>
            <div>
              <p className="font-medium text-sm">{statusInfo.text}</p>
              {lastError && (
                <p className="text-xs text-muted-foreground mt-1">
                  {lastError}
                </p>
              )}
              {isReconnecting && (
                <p className="text-xs text-muted-foreground mt-1">
                  Los datos se actualizarán automáticamente al reconectar
                </p>
              )}
            </div>
          </div>

          {!isConnected && !isReconnecting && onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          )}
        </div>

        {/* Progress bar for reconnection attempts */}
        {isReconnecting && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Reintentando...</span>
              <span>{connectionAttempts}/5</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                style={{
                  width: `${(connectionAttempts / 5) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
