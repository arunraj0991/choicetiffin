const GOOGLE_API_KEY = '';

export const searchPlacesByText = async (text: string) => {
  if (!text || text.length < 3) return [];

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:IN`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results) return [];

  return data.results.slice(0, 5).map((item: any, index: number) => ({
    id: item.place_id || index.toString(),
    title: item.formatted_address,
    lat: item.geometry.location.lat,
    lng: item.geometry.location.lng,
  }));
};

export const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.results?.[0]?.formatted_address ?? `${lat}, ${lng}`;
  } catch {
    return `${lat}, ${lng}`;
  }
};
