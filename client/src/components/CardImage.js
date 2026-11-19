import React from "react";

// Image box shared by all cards here — shows the full image, never cropped
const CardImage = ({ src, alt }) => (
  <div
    style={{ height: "200px", background: "white",  padding:"10px" }}
    className="d-flex align-items-center justify-content-center"
  >
    <img
      src={src || "https://placehold.co/300x180?text=No+Image"}
      alt={alt}
      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
    />
  </div>
);

export default CardImage;
