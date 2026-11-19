import { MAX_IMAGES } from "./gearImages";

// Shared by GearList, AddGear and EditGear

export const CATEGORIES = ["Camping", "Camera", "Sports", "Tools", "Electronics", "Other"];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB, same as the server

// Checks the form fields. Returns the error text, or "" when everything is fine.
// (Same rules as the backend. The server checks them again.)
// noImageMessage = the text to show when there are no images at all.
export const validateGearForm = (form, imageCount, noImageMessage) => {
  const title = form.title.trim();
  if (title.length < 3 || title.length > 60) return "Title must be 3 to 60 characters";
  if (form.description.trim().length < 10) return "Description must be at least 10 characters";
  if (!form.category) return "Please select a category";
  if (!(Number(form.pricePerDay) > 0)) return "Price per day must be greater than 0";

  const location = form.location.trim();
  if (!location) return "Location is required";
  if (location.length > 100) return "Location must be 100 characters or less";

  if (form.deposit !== "" && !(Number(form.deposit) >= 0)) return "Deposit must be 0 or more";
  if (imageCount < 1) return noImageMessage;
  return "";
};

// Checks the files the user just chose (max 4 images in total, jpg/png/webp, 5MB each).
// currentCount = how many images the gear already has. Returns the error text, or "".
export const checkChosenFiles = (files, currentCount, tooManyMessage) => {
  if (currentCount + files.length > MAX_IMAGES) return tooManyMessage;
  for (let i = 0; i < files.length; i++) {
    if (!ALLOWED_TYPES.includes(files[i].type)) return "Only JPG, PNG or WEBP images are allowed";
    if (files[i].size > MAX_SIZE) return "Each image must be 5MB or smaller";
  }
  return "";
};

// Gives every chosen file a small preview address: [{ file, url }]
export const makePreviews = (files) => {
  return files.map((file) => ({ file, url: URL.createObjectURL(file) }));
};

// Puts the text fields of the form into a FormData (the server reads multipart data because of the images)
export const buildGearFormData = (form) => {
  const data = new FormData();
  data.append("title", form.title);
  data.append("description", form.description);
  data.append("category", form.category);
  data.append("pricePerDay", form.pricePerDay);
  data.append("location", form.location.trim());
  data.append("deposit", form.deposit === "" ? 0 : form.deposit);
  return data;
};
