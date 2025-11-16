interface Service {
  id: string;
  client_id: string;
  service_type: string;
  price: number;
  notes: string | null;
  created_at: string;
}

interface AskJulesParams {
  question: string;
  services: Service[];
}

export const askJules = async ({
  question,
  services,
}: AskJulesParams): Promise<string> => {
  const apiKey = import.meta.env.VITE_JULES_API_KEY;

  if (!apiKey) {
    throw new Error("Jules API key not found in environment variables.");
  }

  // Basic context generation, you can customize this prompt
  const context = `
    You are a helpful assistant for a barbershop.
    Here is the list of services for today:
    ${JSON.stringify(services, null, 2)}
  `;

  try {
    const response = await fetch("https://api.jules.ai/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        question: question,
        context: context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch from Jules API.");
    }

    const data = await response.json();
    return data.answer || "Sorry, I could not find an answer.";
  } catch (error) {
    console.error("Error calling Jules API:", error);
    return "An error occurred while processing your request.";
  }
};
