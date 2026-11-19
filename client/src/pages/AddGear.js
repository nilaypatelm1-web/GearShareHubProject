import React, { useState } from "react";
import { Container, Form, Button, Alert, Card, Image, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { MAX_IMAGES } from "../utils/gearImages";
import { CATEGORIES, validateGearForm, checkChosenFiles, makePreviews, buildGearFormData } from "../utils/gearForm";

// The three info boxes on the left side of the page
const FEATURES = [
  { icon: "📸", title: "Easy to List", desc: "Add your gear in just a few steps." },
  { icon: "🤝", title: "Reach More People", desc: "Let fellow adventurers find and rent your gear." },
  { icon: "💰", title: "Earn from Your Gear", desc: "Turn your unused equipment into income." },
];

const AddGear = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    location: "",
    deposit: "",
  });
  const [images, setImages] = useState([]); // [{ file, url }] up to 4, url = small preview
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Copies the form values and changes the one field that was typed in
  const handleChange = (e) => {
    const newData = Object.assign({}, formData);
    newData[e.target.name] = e.target.value;
    setFormData(newData);
  };

  // Adds the chosen files to the list (the checks are in utils/gearForm.js)
  const handleFileChange = (e) => {
    const chosen = Array.from(e.target.files);
    e.target.value = ""; // so the same file can be chosen again later
    setError("");

    const problem = checkChosenFiles(chosen, images.length, `You can add at most ${MAX_IMAGES} images`);
    if (problem) {
      setError(problem);
      return;
    }
    setImages(images.concat(makePreviews(chosen)));
  };

  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(images[index].url);
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const problem = validateGearForm(formData, images.length, "Please add at least 1 image");
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const data = buildGearFormData(formData);
      for (let i = 0; i < images.length; i++) {
        data.append("images", images[i].file); // field name must be "images"
      }

      const res = await api.post("/gears", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/gears/${res.data._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Page header, styled like the hero but shorter */}
      <section className="hero-section py-5">
        <Container>
          <div className="hero-eyebrow mb-2">Share Your Gear</div>
          <h1 className="mb-2">
            Add Your <span className="brand-accent">Gear</span>
          </h1>
          <p className="lead mb-0">
            List your gear and help others rent it. Turn your equipment into earning opportunities.
          </p>
        </Container>
      </section>

      <Container className="py-5">
        <Row className="g-4">
          {/* Left info panel */}
          <Col lg={5}>
            <div className="gear-form-panel">
              {FEATURES.map((f) => (
                <div className="feature-row" key={f.title}>
                  <div className="feature-icon">{f.icon}</div>
                  <div>
                    <h6 className="mb-1 text-white">{f.title}</h6>
                    <small className="text-muted">{f.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </Col>

          {/* Right form panel */}
          <Col lg={7}>
            <Card className="gear-form-card p-4">
              <h4 className="fw-bold mb-4">Gear Details</h4>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Gear Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Canon EOS 200D"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category *</Form.Label>
                      <Form.Select name="category" value={formData.category} onChange={handleChange}>
                        <option value="">Select Category</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Daily Rental Price (₹) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="pricePerDay"
                        value={formData.pricePerDay}
                        onChange={handleChange}
                        placeholder="e.g. 500"
                        min="1"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pickup Location *</Form.Label>
                      <Form.Control
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Adajan, Surat"
                        maxLength={100}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Refundable Deposit (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        name="deposit"
                        value={formData.deposit}
                        onChange={handleChange}
                        placeholder="0 = no deposit"
                        min="0"
                      />
                      <Form.Text className="text-muted">Paid directly to you by the renter.</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your gear, its condition, features and any additional information (min 10 characters)..."
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Images * (1 to {MAX_IMAGES})</Form.Label>
                  {/* small previews, each with a remove (x) button. The first image is the cover on the cards. */}
                  {images.length > 0 && (
                    <div className="image-preview-row mb-2">
                      {images.map((img, i) => (
                        <div className="image-preview-item" key={img.url}>
                          <Image src={img.url} rounded />
                          <button type="button" className="image-remove-btn" onClick={() => handleRemoveImage(i)} aria-label="Remove image">
                            ×
                          </button>
                          {i === 0 && <span className="image-cover-tag">Cover</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length < MAX_IMAGES && (
                    <>
                      <label htmlFor="gear-image-input" className="upload-dropzone d-block">
                        <div className="mb-1">⬆️ Click to add images</div>
                        <small className="text-muted">JPG, PNG or WEBP — max 5MB each — up to {MAX_IMAGES} images</small>
                      </label>
                      <Form.Control
                        id="gear-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileChange}
                        className="d-none"
                      />
                    </>
                  )}
                </Form.Group>

                <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
                  {loading ? "Listing..." : "+ List Gear"}
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AddGear;
