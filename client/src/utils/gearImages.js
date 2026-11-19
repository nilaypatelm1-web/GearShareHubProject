// Which pictures does a gear have? New gears: images[]. Old gears (or rentals that only carry imageUrl): [imageUrl].
// Same rule as the server (server/utils/gearImages.js).
export const getGearImages = (gear) => {
  if (!gear) return [];
  if (Array.isArray(gear.images) && gear.images.length > 0) return gear.images;
  if (gear.imageUrl) return [gear.imageUrl];
  return [];
};

export const MAX_IMAGES = 4;
