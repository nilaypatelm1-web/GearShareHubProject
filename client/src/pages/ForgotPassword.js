import React, { useState } from "react";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccess(res.data.message);
      setEmail("");
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "420px", width: "100%" }}>
        <h2 className="mb-1 text-center fw-bold">Forgot Password</h2>
        <p className="text-muted text-center mb-4">
          Enter your email and we'll send you a link to reset your password
        </p>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Form.Group>

          <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </Form>

        <p className="text-center mt-3 mb-0">
          Remembered it? <Link to="/login">Back to Login</Link>
        </p>
      </Card>
    </Container>
  );
};

export default ForgotPassword;
