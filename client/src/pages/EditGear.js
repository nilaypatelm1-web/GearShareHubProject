import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Card, Image, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage, getImageUrl } from "../api/axios";
import { getGearImages, MAX_IMAGES } from "../utils/gearImages";
import { CATEGORIES, validateGearForm, checkChosenFiles, makePreviews, buildGearFormData } from "../utils/gearForm";

const EditGear = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    location: "",
    deposit: "",
  });
  const [existingImages, setExistingImages] = useState([]); // pictures already saved on the gear ("/uploads/...")
  const [removed, setRemoved] = useState([]); // saved pictures the user pressed (x) on
  const [newImages, setNewImages] = useState([]); // [{ file, url }] pictures added now

  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load the existing gear's data so the form starts pre-filled
  useEffect(() => {
    const fetchGear = async () => {
      try {
        const res = await api.get(`/gears/${id}`);
        const gear = res.data;
        setFormData({
          title: gear.title,
          description: gear.description,
          category: gear.category,
          pricePerDay: gear.pricePerDay,
          location: gear.location || "", // old gears have no location yet
          deposit: gear.deposit || 0,
        });
        setExistingImages(getGearImages(gear));
      } catch (err) {
        setError(err.response ? "Failed to load gear details." : getErrorMessage(err));
      } finally {
        setFetching(false);
      }
    };
    fetchGear();
  }, [id]);

  // Copies the form values and changes the one field that was typed in
  const handleChange = (e) => {
    const newData = Object.assign({}, formData);
    newData[e.target.name] = e.target.value;
    setFormData(newData);
  };

  // pictures that will stay + pictures that will be added = the final total (must be 1 to 4)
  const keptImages = existingImages.filter((img) => !removed.includes(img));
  const totalImages = keptImages.length + newImages.length;

  // Adds the chosen files to the list (the checks are in utils/gearForm.js)
  const handleFileChange = (e) => {
    const chosen = Array.from(e.target.files);
    e.target.value = ""; // so the same file can be chosen again later
    setError("");

    const problem = checkChosenFiles(chosen, totalImages, `A gear can have at most ${MAX_IMAGES} images`);
    if (problem) {
      setError(problem);
      return;
    }
    setNewImages(newImages.concat(makePreviews(chosen)));
  };

  // (x) on a saved picture: it is only marked, the server deletes it when we press Save
  const handleRemoveSaved = (img) => {
    setRemoved(removed.concat([img]));
  };

  // (x) on a picture that was just added: simply forget it
  const handleRemoveNew = (index) => {
    URL.revokeObjectURL(newImages[index].url);
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const problem = validateGearForm(formData, totalImages, "A gear needs at least 1 image");
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const data = buildGearFormData(formData);
      // pictures to delete (file names) and new pictures to add. The backend keeps all the others.
      for (let i = 0; i < removed.length; i++) {
        data.append("removeImages", removed[i].split("/").pop());
      }
      for (let i = 0; i < newImages.length; i++) {
        data.append("images", newImages[i].file);
      }

      const res = await api.put(`/gears/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/gears/${res.data._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <h2 className="mb-3 text-center">Edit Gear</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control type="text" name="title" value={formData.title} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            <Form.Select name="category" value={formData.category} onChange={handleChange}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Price per day (₹)</Form.Label>
            <Form.Control
              type="number"
              name="pricePerDay"
              value={formData.pricePerDay}
              onChange={handleChange}
              min="1"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Pickup Location</Form.Label>
            <Form.Control
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Adajan, Surat"
              maxLength={100}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Refundable Deposit (₹)</Form.Label>
            <Form.Control
              type="number"
              name="deposit"
              value={formData.deposit}
              onChange={handleChange}
              min="0"
            />
            <Form.Text className="text-muted">0 = no deposit. Paid directly to you by the renter.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Gear Images ({totalImages} of {MAX_IMAGES})</Form.Label>
            {/* current pictures, each with a remove (x) button; new pictures are marked "New" */}
            <div className="image-preview-row mb-2">
              {keptImages.map((img) => (
                <div className="image-preview-item" key={img}>
                  <Image src={getImageUrl(img)} rounded />
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={() => handleRemoveSaved(img)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImages.map((img, i) => (
                <div className="image-preview-item" key={img.url}>
                  <Image src={img.url} rounded />
                  <button type="button" className="image-remove-btn" onClick={() => handleRemoveNew(i)} aria-label="Remove image">
                    ×
                  </button>
                  <span className="image-cover-tag">New</span>
                </div>
              ))}
            </div>
            <Form.Control
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={totalImages >= MAX_IMAGES}
            />
            <Form.Text className="text-muted">
              {totalImages >= MAX_IMAGES
                ? `You have ${MAX_IMAGES} images. Remove one to add another.`
                : `Add more images (JPG, PNG or WEBP, 5MB each). The first image is the cover.`}
            </Form.Text>
          </Form.Group>

          <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default EditGear;
