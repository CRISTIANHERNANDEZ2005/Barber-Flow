interface Service {
  id: string;
  client_id: string;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

interface AskGoogleAIParams {
  question: string;
  services: Service[];
}

export const askGoogleAI = async ({
  question,
  services,
}: AskGoogleAIParams): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  if (!apiKey) {
    throw new Error("La clave de la API de Google AI no se encontró en las variables de entorno.");
  }

  const prompt = `
    Eres un asistente útil para una barbería.
    Aquí está la lista de servicios de hoy:
    ${JSON.stringify(services, null, 2)}

    Responde a la siguiente pregunta basándote en los datos proporcionados:
    "${question}"
  `;

  try {
    const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "No se pudo decodificar la respuesta de error JSON." } }));
      throw new Error(`Error de la API de Google AI: ${response.status} ${response.statusText} - ${errorData.error.message}`);
    }

    const data = await response.json();
    // Extract the text from the response
    const text = data.candidates[0]?.content?.parts[0]?.text;

    return text || "Lo siento, no pude encontrar una respuesta.";
  } catch (error) {
    console.error("Error al llamar a la API de Google AI:", error);
    if (error instanceof Error) {
      throw new Error(`Falló la comunicación con la API: ${error.message}`);
    }
    throw new Error("Ocurrió un error desconocido al procesar tu solicitud.");
  }
};
