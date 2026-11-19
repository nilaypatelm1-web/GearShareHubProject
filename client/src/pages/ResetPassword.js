import React, { useState } from "react";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";

const ResetPassword = () => {
  const { token } = useParams(); // the token from the emailed link
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Copies the form values and changes the one field that was typed in
  const handleChange = (e) => {
    const newData = Object.assign({}, formData);
    newData[e.target.name] = e.target.value;
    setFormData(newData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password: formData.password });
      setSuccess(res.data.message);
      setFormData({ password: "", confirmPassword: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "420px", width: "100%" }}>
        <h2 className="mb-1 text-center fw-bold">Reset Password</h2>
        <p className="text-muted text-center mb-4">Choose a new password for your account</p>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* after success we hide the form and show a Login button */}
        {success ? (
          <Button as={Link} to="/login" className="btn-accent w-100" size="lg">
            Go to Login
          </Button>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
              />
            </Form.Group>

            <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </Form>
        )}

        {!success && (
          <p className="text-center mt-3 mb-0">
            Link expired? <Link to="/forgot-password">Request a new one</Link>
          </p>
        )}
      </Card>
    </Container>
  );
};

export default ResetPassword;
