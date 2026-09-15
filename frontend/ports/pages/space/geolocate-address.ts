import type { AddressValue } from "domain/space/space.types.ts";

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access was denied — please type your address instead.",
  2: "Location is unavailable right now — please type your address instead.",
  3: "Location lookup timed out — please type your address instead.",
};

// Same approach as frontend/trick-or-treat-signup.html's standalone prototype:
// the browser's Geolocation API for coordinates, then OpenStreetMap's
// Nominatim (no API key, same OSM ecosystem the main app's map already uses)
// to turn those into a human-readable address the participant can still
// correct before submitting.
export async function locateAddress(): Promise<AddressValue> {
  if (!("geolocation" in navigator)) {
    throw new Error("This browser doesn't support location — please type your address.");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  }).catch((error: GeolocationPositionError) => {
    throw new Error(GEOLOCATION_ERROR_MESSAGES[error.code] ?? "Could not get your location — please type your address instead.");
  });

  const { latitude, longitude } = position.coords;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    const json = await res.json();
    const address = json.address ?? {};
    const text = [address.house_number, address.road ?? address.pedestrian].filter(Boolean).join(" ") || json.display_name;
    if (!text) {
      throw new Error("no match");
    }
    return { text, lat: latitude, lng: longitude };
  } catch {
    throw new Error("Found your location, but couldn't match an address — please type it in.");
  }
}
