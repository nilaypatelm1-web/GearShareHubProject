import React from "react";
import { Card } from "react-bootstrap";
import { getImageUrl } from "../api/axios";
import { getGearImages } from "../utils/gearImages";

// Big picture of a gear + small clickable thumbnails (only when there is more than one picture)
// activeImage = number of the picture shown big, onSelect(number) is called when a thumbnail is clicked
const GearGallery = ({ gear, activeImage, onSelect }) => {
  const images = getGearImages(gear); // images[], or [imageUrl] for old gears
  const mainImage = images[activeImage] || images[0];

  return (
    <Card className="hover-card">
      <div style={{ height: "350px", background: "white" }} className="d-flex align-items-center justify-content-center">
        <img
          src={getImageUrl(mainImage) || "https://placehold.co/500x350?text=No+Image"}
          alt={gear.title}
          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        />
      </div>
      {images.length > 1 && (
        <div className="gear-thumbs">
          {images.map((img, i) => (
            <button
              type="button"
              key={img}
              className={`gear-thumb ${i === activeImage ? "active" : ""}`}
              onClick={() => onSelect(i)}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={getImageUrl(img)} alt={`${gear.title} ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default GearGallery;
