import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhoneValidationResult {
  isValid: boolean;
  isUnique: boolean;
  isChecking: boolean;
  error: string | null;
}

export const usePhoneValidation = (phone: string, currentClientId?: string) => {
  const [validationResult, setValidationResult] =
    useState<PhoneValidationResult>({
      isValid: false,
      isUnique: true,
      isChecking: false,
      error: null,
    });

  useEffect(() => {
    const validatePhone = async () => {
      // Reset state
      setValidationResult({
        isValid: false,
        isUnique: true,
        isChecking: false,
        error: null,
      });

      // If phone is empty, it's not valid (phone is required for clients)
      if (!phone || phone.trim() === "") {
        setValidationResult({
          isValid: false,
          isUnique: true,
          isChecking: false,
          error: "El número de teléfono es requerido",
        });
        return;
      }

      // Basic phone format validation - exactly 10 digits
      const phoneRegex = /^[1-9][\d]{9}$/;
      const cleanPhone = phone.replace(/\D/g, "");

      if (cleanPhone.length !== 10 || !phoneRegex.test(cleanPhone)) {
        setValidationResult({
          isValid: false,
          isUnique: true,
          isChecking: false,
          error: "El número debe tener exactamente 10 dígitos",
        });
        return;
      }

      // Start checking uniqueness
      setValidationResult((prev) => ({
        ...prev,
        isChecking: true,
      }));

      try {
        // Check if phone number already exists in clients table
        let query = supabase
          .from("clients")
          .select("id, first_name, last_name")
          .eq("phone", cleanPhone);

        // If we're editing an existing client, exclude it from the check
        if (currentClientId) {
          query = query.neq("id", currentClientId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const isUnique = !data || data.length === 0;

        setValidationResult({
          isValid: isUnique,
          isUnique,
          isChecking: false,
          error: isUnique
            ? null
            : `Este número ya está registrado para: ${data[0]?.first_name} ${data[0]?.last_name || ""}`.trim(),
        });
      } catch (error: unknown) {
        console.error("Error validating phone:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al validar el número de teléfono";
        setValidationResult({
          isValid: false,
          isUnique: false,
          isChecking: false,
          error: errorMessage,
        });
      }
    };

    // Debounce the validation to avoid too many requests
    const timeoutId = setTimeout(validatePhone, 500);

    return () => clearTimeout(timeoutId);
  }, [phone, currentClientId]);

  return validationResult;
};

// Utility function to format phone numbers consistently
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";

  // Only keep digits, no automatic formatting
  const cleaned = phone.replace(/\D/g, "");
  return cleaned;
};

// Utility function to validate phone format
export const isValidPhoneFormat = (phone: string): boolean => {
  if (!phone || phone.trim() === "") return true; // Empty is valid (optional field)

  const cleanPhone = phone.replace(/\D/g, "");
  const phoneRegex = /^[1-9][\d]{9}$/;

  return phoneRegex.test(cleanPhone) && cleanPhone.length === 10;
};
