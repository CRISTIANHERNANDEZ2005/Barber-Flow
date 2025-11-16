import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, Phone } from "lucide-react";
import {
  usePhoneValidation,
  formatPhoneNumber,
} from "@/hooks/use-phone-validation";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currentServiceId?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const PhoneInput = ({
  id = "client_phone",
  label = "Teléfono",
  value,
  onChange,
  currentServiceId,
  required = false,
  className,
  placeholder = "1234567890",
}: PhoneInputProps) => {
  const validation = usePhoneValidation(value, currentServiceId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits and limit to 10 characters
    const numbersOnly = input.replace(/\D/g, "").slice(0, 10);
    onChange(numbersOnly);
  };

  const handleBlur = () => {
    // Format the phone number when user finishes typing
    if (value && validation.isValid && validation.isUnique) {
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  };

  const getInputState = () => {
    if (!value || value.trim() === "") {
      return "default";
    }
    if (validation.isChecking) {
      return "checking";
    }
    if (validation.error) {
      return "error";
    }
    if (validation.isValid && validation.isUnique) {
      return "success";
    }
    return "default";
  };

  const getIconComponent = () => {
    const state = getInputState();
    const baseClass = "h-4 w-4";

    switch (state) {
      case "checking":
        return (
          <Loader2 className={cn(baseClass, "animate-spin text-yellow-500")} />
        );
      case "success":
        return <CheckCircle className={cn(baseClass, "text-green-500")} />;
      case "error":
        return <AlertCircle className={cn(baseClass, "text-red-500")} />;
      default:
        return <Phone className={cn(baseClass, "text-muted-foreground")} />;
    }
  };

  const getBorderColor = () => {
    const state = getInputState();
    switch (state) {
      case "checking":
        return "border-yellow-500/50 focus:border-yellow-500";
      case "success":
        return "border-green-500/50 focus:border-green-500";
      case "error":
        return "border-red-500/50 focus:border-red-500";
      default:
        return "border-border/50 focus:border-cyber-glow";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-foreground flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {validation.isChecking && (
          <span className="text-xs text-yellow-600">Verificando...</span>
        )}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn("bg-input pr-10", getBorderColor(), className)}
          placeholder={placeholder}
          maxLength={10}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-invalid={validation.error ? "true" : "false"}
          aria-describedby={validation.error ? `${id}-error` : undefined}
        />

        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {getIconComponent()}
        </div>
      </div>

      {/* Validation Messages */}
      {validation.error && (
        <div
          id={`${id}-error`}
          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded-md border border-red-200 dark:border-red-800"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Success Message */}
      {value &&
        validation.isValid &&
        validation.isUnique &&
        !validation.isChecking && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded-md border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Número de teléfono válido y disponible</span>
          </div>
        )}

      {/* Help Text */}
      {!value && !validation.error && (
        <div className="text-xs text-muted-foreground">
          Solo números: 1234567890
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
