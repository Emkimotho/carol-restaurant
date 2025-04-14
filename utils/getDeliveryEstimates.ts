export interface DeliveryEstimates {
  distance: number;  // in miles
  travelTimeMinutes: number;
}

// Fallback defaults
const FALLBACK_DISTANCE = 3;
const FALLBACK_TRAVEL_TIME = 15;

export async function getDeliveryEstimates(
  origin: string,
  destination: string
): Promise<DeliveryEstimates> {
  try {
    // IMPORTANT: the API route expects { origin, destination }, so we match those keys.
    const response = await fetch("/api/external/distance-matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // Expecting { distance: number, travelTimeMinutes: number } from the API
    return {
      distance: data.distance,
      travelTimeMinutes: data.travelTimeMinutes,
    };
  } catch (error) {
    console.error("Real-time API failed, falling back to defaults", error);
    return {
      distance: FALLBACK_DISTANCE,
      travelTimeMinutes: FALLBACK_TRAVEL_TIME,
    };
  }
}
