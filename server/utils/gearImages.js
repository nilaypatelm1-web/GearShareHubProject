// One place that answers "which pictures does this gear have?".
// New gears store them in images[]. Old gears only have imageUrl, so we fall back to [imageUrl].
const getGearImages = (gear) => {
  if (Array.isArray(gear.images) && gear.images.length > 0) return gear.images;
  return gear.imageUrl ? [gear.imageUrl] : [];
};

module.exports = { getGearImages, MAX_IMAGES: 4 };
