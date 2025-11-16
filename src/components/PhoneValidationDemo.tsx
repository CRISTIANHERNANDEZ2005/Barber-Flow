import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PhoneInput from "./PhoneInput";
import { usePhoneValidation } from "@/hooks/use-phone-validation";
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const PhoneValidationDemo = () => {
  const [testPhone1, setTestPhone1] = useState("");
  const [testPhone2, setTestPhone2] = useState("");
  const [savedPhones, setSavedPhones] = useState<string[]>([]);

  const validation1 = usePhoneValidation(testPhone1);
  const validation2 = usePhoneValidation(testPhone2);

  const testCases = [
    { label: "Número válido US", value: "+1234567890" },
    { label: "Número corto (inválido)", value: "123456" },
    { label: "Con formato", value: "(555) 123-4567" },
    { label: "Internacional", value: "+52 55 1234 5678" },
    { label: "Solo números", value: "5551234567" },
  ];

  const simulateSave = (phone: string) => {
    if (phone && !savedPhones.includes(phone)) {
      setSavedPhones([...savedPhones, phone]);
    }
  };

  const clearSaved = () => {
    setSavedPhones([]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyber-glow to-cyber-secondary bg-clip-text text-transparent">
          🧪 Demo de Validación de Teléfonos
        </h2>
        <p className="text-muted-foreground">
          Prueba la validación de números únicos en tiempo real
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input de Prueba 1 */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-cyan-500" />
            <h3 className="text-lg font-semibold">Cliente #1</h3>
          </div>

          <PhoneInput
            label="Teléfono Cliente 1"
            value={testPhone1}
            onChange={setTestPhone1}
            placeholder="+1 (555) 123-4567"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Estado:</span>
              {validation1.isChecking && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Verificando...
                </Badge>
              )}
              {!validation1.isChecking && validation1.isValid && validation1.isUnique && testPhone1 && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Válido y único
                </Badge>
              )}
              {validation1.error && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
              {!testPhone1 && (
                <Badge variant="outline">Vacío (válido)</Badge>
              )}
            </div>

            <Button
              onClick={() => simulateSave(testPhone1)}
              disabled={!testPhone1 || !validation1.isValid || validation1.isChecking}
              className="w-full"
            >
              Simular Guardado
            </Button>
          </div>
        </Card>

        {/* Input de Prueba 2 */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Cliente #2</h3>
          </div>

          <PhoneInput
            label="Teléfono Cliente 2"
            value={testPhone2}
            onChange={setTestPhone2}
            placeholder="+1 (555) 987-6543"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Estado:</span>
              {validation2.isChecking && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Verificando...
                </Badge>
              )}
              {!validation2.isChecking && validation2.isValid && validation2.isUnique && testPhone2 && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Válido y único
                </Badge>
              )}
              {validation2.error && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
              {!testPhone2 && (
                <Badge variant="outline">Vacío (válido)</Badge>
              )}
            </div>

            <Button
              onClick={() => simulateSave(testPhone2)}
              disabled={!testPhone2 || !validation2.isValid || validation2.isChecking}
              className="w-full"
            >
              Simular Guardado
            </Button>
          </div>
        </Card>
      </div>

      {/* Casos de Prueba Rápida */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          ⚡ Casos de Prueba Rápida
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {testCases.map((testCase, index) => (
            <div key={index} className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setTestPhone1(testCase.value)}
                className="w-full text-left justify-start"
              >
                {testCase.label}
              </Button>
              <code className="text-xs text-muted-foreground block truncate">
                {testCase.value}
              </code>
            </div>
          ))}
        </div>
      </Card>

      {/* Números Guardados Simulados */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            💾 Teléfonos "Guardados"
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSaved}
            disabled={savedPhones.length === 0}
          >
            Limpiar
          </Button>
        </div>

        {savedPhones.length === 0 ? (
          <p className="text-muted-foreground italic">
            No hay números guardados. Guarda algunos para probar la validación de duplicados.
          </p>
        ) : (
          <div className="space-y-2">
            {savedPhones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Phone className="h-4 w-4" />
                <code>{phone}</code>
                <Badge variant="secondary">Cliente #{index + 1}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instrucciones */}
      <Card className="p-6 bg-gradient-to-r from-cyber-glow/5 to-cyber-secondary/5 border-cyber-glow/20">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          📋 Instrucciones de Prueba
        </h3>
        <div className="space-y-2 text-sm">
          <p>• <strong>Prueba de duplicados:</strong> Guarda un número y luego intenta ingresarlo en el otro campo</p>
          <p>• <strong>Validación de formato:</strong> Prueba números muy cortos (menos de 8 dígitos)</p>
          <p>• <strong>Tiempo real:</strong> Observa cómo cambian los íconos mientras escribes</p>
          <p>• <strong>Estados visuales:</strong> Nota los colores de borde y mensajes de validación</p>
        </div>
      </Card>
    </div>
  );
};

export default PhoneValidationDemo;
