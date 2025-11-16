import React, { useState } from "react";
import {
  Wifi,
  Database,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { useClients } from "../../context/ClientsContext";
import { checkSupabaseHealth } from "../../integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  name: string;
  status: "pending" | "success" | "error" | "running";
  message: string;
  duration?: number;
}

const ConnectionTest: React.FC = () => {
  const {
    clients,
    connectionState,
    refreshClients,
    addClientOptimistic,
    retryConnection,
    lastUpdated,
  } = useClients();

  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const updateTestResult = (index: number, updates: Partial<TestResult>) => {
    setTestResults((prev) =>
      prev.map((result, i) =>
        i === index ? { ...result, ...updates } : result,
      ),
    );
  };

  const runComprehensiveTest = async () => {
    setTesting(true);
    const startTime = Date.now();

    const tests: TestResult[] = [
      {
        name: "Conexión a Supabase",
        status: "pending",
        message: "Verificando conectividad...",
      },
      {
        name: "Base de datos accesible",
        status: "pending",
        message: "Probando acceso a BD...",
      },
      {
        name: "Realtime activo",
        status: "pending",
        message: "Verificando WebSocket...",
      },
      {
        name: "Cache de clientes",
        status: "pending",
        message: "Validando datos locales...",
      },
      {
        name: "Sincronización optimista",
        status: "pending",
        message: "Probando actualizaciones...",
      },
    ];

    setTestResults(tests);

    // Test 1: Supabase Health Check
    try {
      updateTestResult(0, { status: "running" });
      const testStart = Date.now();
      const isHealthy = await checkSupabaseHealth();
      const duration = Date.now() - testStart;

      updateTestResult(0, {
        status: isHealthy ? "success" : "error",
        message: isHealthy
          ? `Conexión exitosa (${duration}ms)`
          : "Servidor no disponible",
        duration,
      });
    } catch (error) {
      updateTestResult(0, {
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Desconocido"}`,
      });
    }

    // Test 2: Database Access
    try {
      updateTestResult(1, { status: "running" });
      const testStart = Date.now();
      await refreshClients();
      const duration = Date.now() - testStart;

      updateTestResult(1, {
        status: "success",
        message: `Base de datos accesible (${duration}ms)`,
        duration,
      });
    } catch (error) {
      updateTestResult(1, {
        status: "error",
        message: `Error de BD: ${error instanceof Error ? error.message : "Desconocido"}`,
      });
    }

    // Test 3: Realtime Connection
    updateTestResult(2, { status: "running" });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    updateTestResult(2, {
      status: connectionState.isConnected ? "success" : "error",
      message: connectionState.isConnected
        ? "WebSocket conectado correctamente"
        : `Realtime desconectado: ${connectionState.lastError || "Error desconocido"}`,
    });

    // Test 4: Client Cache
    updateTestResult(3, { status: "running" });
    const cacheAge = Date.now() - lastUpdated;
    const isCacheFresh = cacheAge < 60000;

    updateTestResult(3, {
      status: clients.length > 0 && isCacheFresh ? "success" : "error",
      message: `${clients.length} clientes en cache (${Math.round(cacheAge / 1000)}s)`,
    });

    // Test 5: Optimistic Updates
    updateTestResult(4, { status: "running" });
    try {
      const testStart = Date.now();

      const testClient = await addClientOptimistic({
        first_name: `Test-${Date.now()}`,
        last_name: "Conectividad",
        phone: `555000${Math.random().toString().substr(2, 4)}`,
      });

      const duration = Date.now() - testStart;

      updateTestResult(4, {
        status: testClient ? "success" : "error",
        message: testClient
          ? `Actualización optimista exitosa (${duration}ms)`
          : "Error en actualización optimista",
        duration,
      });

      // Clean up test client
      if (testClient) {
        setTimeout(async () => {
          try {
            const { supabase } = await import(
              "../../integrations/supabase/client"
            );
            await supabase.from("clients").delete().eq("id", testClient.id);
          } catch (error) {
            console.error("Error cleaning up test client:", error);
          }
        }, 2000);
      }
    } catch (error) {
      updateTestResult(4, {
        status: "error",
        message: `Error optimista: ${error instanceof Error ? error.message : "Desconocido"}`,
      });
    }

    const totalDuration = Date.now() - startTime;
    setTesting(false);

    toast.success(`Pruebas completadas en ${totalDuration}ms`, {
      description: `${testResults.filter((t) => t.status === "success").length}/5 pruebas exitosas`,
    });
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeClass = (status: TestResult["status"]) => {
    const baseClass =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    switch (status) {
      case "success":
        return `${baseClass} border-transparent bg-primary text-primary-foreground hover:bg-primary/80`;
      case "error":
        return `${baseClass} border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80`;
      case "running":
        return `${baseClass} border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80`;
      default:
        return `${baseClass} text-foreground border`;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Zap className="h-5 w-5 text-cyber-glow" />
          Diagnóstico de Conectividad
        </h3>
      </div>
      <div className="p-6 pt-0 space-y-6">
        {/* Current Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Wifi
              className={`h-4 w-4 ${connectionState.isConnected ? "text-green-500" : "text-red-500"}`}
            />
            <div>
              <p className="text-sm font-medium">Realtime</p>
              <p className="text-xs text-muted-foreground">
                {connectionState.isConnected ? "Conectado" : "Desconectado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Clientes</p>
              <p className="text-xs text-muted-foreground">
                {clients.length} registros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Database className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Cache</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((Date.now() - lastUpdated) / 1000)}s ago
              </p>
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* Test Controls */}
        <div className="flex gap-2">
          <button
            onClick={runComprehensiveTest}
            disabled={testing}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-gradient-to-r from-cyber-glow to-cyber-secondary text-primary-foreground hover:opacity-90"
          >
            {testing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando Pruebas...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Ejecutar Diagnóstico
              </>
            )}
          </button>

          <button
            onClick={retryConnection}
            disabled={connectionState.isReconnecting}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${connectionState.isReconnecting ? "animate-spin" : ""}`}
            />
            Reconectar
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <>
            <div className="border-t" />
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Resultados de Pruebas</h3>
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <p className="font-medium text-sm">{test.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.message}
                        {test.duration && ` • ${test.duration}ms`}
                      </p>
                    </div>
                  </div>
                  <div className={getStatusBadgeClass(test.status)}>
                    {test.status === "running"
                      ? "Ejecutando"
                      : test.status === "pending"
                        ? "Pendiente"
                        : test.status}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="border-t" />
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Use este diagnóstico para identificar problemas de conectividad.
            <br />
            Los resultados ayudan a resolver issues de sincronización en tiempo
            real.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
