import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Card, Alert, Spinner, Form, Button } from "react-bootstrap";
import api, { getErrorMessage } from "../api/axios";

// Opened from the link in the verification email: /verify-email/<token>
const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  // resend form (shown when the link is expired / invalid)
  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);

  // The link works only once. In development React runs effects twice, so remember that we already called the server.
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    api
      .post(`/auth/verify-email/${token}`)
      .then((res) => {
        setMessage(res.data.message);
        setStatus("success");
      })
      .catch((err) => {
        setMessage(getErrorMessage(err, "This verification link is invalid or has expired."));
        setStatus("error");
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendMsg({ type: "", text: "" });
    if (!email.trim()) {
      setResendMsg({ type: "danger", text: "Please enter your email" });
      return;
    }
    setSending(true);
    try {
      const res = await api.post("/auth/resend-verification", { email: email.trim() });
      setResendMsg({ type: "success", text: res.data.message });
    } catch (err) {
      setResendMsg({ type: "danger", text: getErrorMessage(err, "Could not send the email.") });
    } finally {
      setSending(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "420px", width: "100%" }}>
        {status === "loading" && (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="mt-3 mb-0">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <>
            <h2 className="mb-3 text-center fw-bold">Email verified ✅</h2>
            <Alert variant="success">{message}</Alert>
            <Button as={Link} to="/login" className="btn-accent w-100" size="lg">
              Go to Login
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="mb-3 text-center fw-bold">Link expired</h2>
            <Alert variant="danger">{message}</Alert>
            <p className="text-muted">Enter your email and we will send you a new verification link.</p>
            {resendMsg.text && <Alert variant={resendMsg.type}>{resendMsg.text}</Alert>}
            <Form onSubmit={handleResend}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Form.Group>
              <Button type="submit" className="btn-accent w-100" disabled={sending}>
                {sending ? "Sending..." : "Resend verification email"}
              </Button>
            </Form>
            <p className="text-center mt-3 mb-0">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        )}
      </Card>
    </Container>
  );
};

export default VerifyEmail;
