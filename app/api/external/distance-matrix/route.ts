import { NextResponse } from "next/server";

// Utility: Convert meters to miles.
function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

// Utility: Convert seconds to minutes.
function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export async function POST(request: Request) {
  try {
    const { origin, destination } = await request.json();

    // Log the received addresses for debugging:
    console.log("Distance Matrix Request:", { origin, destination });

    // Check that both origin and destination are provided.
    if (!origin || !destination) {
      return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 });
    }

    // Build query parameters for the Google Maps Distance Matrix API URL.
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      key: process.env.GOOGLE_MAPS_API_KEY || "", // Ensure your API key is set in environment variables.
      mode: "driving",
      units: "imperial",
    });

    const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

    // Fetch from the Google Maps API.
    const mapsResponse = await fetch(mapsUrl);
    if (!mapsResponse.ok) {
      throw new Error(`Google Maps API error: ${mapsResponse.status}`);
    }

    // Parse the API response.
    const mapsData = await mapsResponse.json();

    // Log the entire response for debugging.
    console.log("Google Maps API Response:", JSON.stringify(mapsData, null, 2));

    // Validate that the response has the expected structure.
    if (
      !mapsData ||
      mapsData.status !== "OK" ||
      !mapsData.rows ||
      !mapsData.rows[0] ||
      !mapsData.rows[0].elements ||
      mapsData.rows[0].elements[0].status !== "OK"
    ) {
      // Log the problematic part of the response before throwing an error.
      console.error("Invalid data from Google Maps API:", mapsData);
      throw new Error("Google Maps API returned an error or invalid data");
    }

    // Extract the distance (in meters) and duration (in seconds) from the response.
    const distanceMeters = mapsData.rows[0].elements[0].distance.value;
    const durationSeconds = mapsData.rows[0].elements[0].duration.value;

    const distanceMiles = metersToMiles(distanceMeters);
    const travelTimeMinutes = secondsToMinutes(durationSeconds);

    return NextResponse.json({ distance: distanceMiles, travelTimeMinutes });
  } catch (error: any) {
    console.error("Error fetching data from Google Maps API:", error);
    // Fallback values in case of error.
    const fallback = {
      distance: 3,             // e.g., default of 3 miles
      travelTimeMinutes: 15,   // e.g., default of 15 minutes
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
