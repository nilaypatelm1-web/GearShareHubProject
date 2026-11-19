import React, { useState, useEffect } from "react";
import { Container, Tabs, Tab, Row, Col, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import GearCard from "../components/GearCard";
import MyGearCard from "../components/MyGearCard";
import MyRentalCard from "../components/MyRentalCard";
import RequestCard from "../components/RequestCard";
import WarningCard from "../components/WarningCard";
import ProfileTab from "../components/ProfileTab";

const VALID_TABS = ["myGear", "requests", "myRentals", "wishlist", "warnings", "profile"];

// Groups rentals by gear: { gearId: [rental, rental] }. The My Gear cards use it to show the renter info.
const groupRentalsByGear = (rentals) => {
  const groups = {};
  for (let i = 0; i < rentals.length; i++) {
    const rental = rentals[i];
    if (!rental.gear) continue;
    if (!groups[rental.gear._id]) groups[rental.gear._id] = [];
    groups[rental.gear._id].push(rental);
  }
  return groups;
};

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin"; // admins send warnings, they never receive them

  const [myGears, setMyGears] = useState([]);
  const [activeRentalsOnMyGear, setActiveRentalsOnMyGear] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [warnings, setWarnings] = useState([]); // warnings sent to me by the admin
  const [wishlistGears, setWishlistGears] = useState([]); // gears I saved with the heart
  const { ids: wishlistIds } = useWishlist(); // used to hide a gear straight away when I un-heart it here

  // notification links look like /dashboard?tab=requests
  const [searchParams] = useSearchParams();
  let tabFromUrl = "myGear";
  if (VALID_TABS.includes(searchParams.get("tab"))) tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl); // so the banner can switch to the Warnings tab

  // clicking a notification while already on the Dashboard changes the URL, so follow it
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null); // disables buttons mid-action to avoid double-clicks

  // Loads everything on this page at the same time
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [
        api.get("/gears/my/listings"),
        api.get("/rentals/my-gear-active"),
        api.get("/rentals/my-rentals"),
        api.get("/rentals/incoming"),
      ];
      if (isAdmin) {
        requests.push(Promise.resolve({ data: [] })); // no warnings for admin
      } else {
        requests.push(api.get("/warnings/my"));
      }
      requests.push(api.get("/wishlist"));

      const results = await Promise.all(requests);
      setMyGears(results[0].data);
      setActiveRentalsOnMyGear(results[1].data);
      setMyRentals(results[2].data);
      setIncomingRequests(results[3].data);
      setWarnings(results[4].data);
      setWishlistGears(results[5].data);
    } catch (err) {
      setError(err.response ? "Failed to load your dashboard data." : getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleDeleteGear = async (gearId) => {
    if (!window.confirm("Delete this gear listing? Its rentals, ratings and picture will also be deleted.")) return;
    try {
      await api.delete(`/gears/${gearId}`);
      setMyGears((prev) => prev.filter((g) => g._id !== gearId));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete gear."));
    }
  };

  // Owner pauses / resumes one of their gears (the server toggles it)
  const handleTogglePause = async (gearId) => {
    try {
      const res = await api.put(`/gears/${gearId}/pause`);
      setMyGears((prev) =>
        prev.map((g) => {
          if (g._id !== gearId) return g;
          return Object.assign({}, g, { isPaused: res.data.isPaused });
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update the listing."));
    }
  };

  // One function for all the rental buttons (request-return, return, cancel, accept, reject).
  // It asks first (when confirmText is given), blocks the buttons of that rental, calls the server, then reloads everything.
  const doRentalAction = async (rentalId, action, confirmText, errorText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(rentalId);
    try {
      await api.put(`/rentals/${rentalId}/${action}`);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, errorText));
    } finally {
      setBusyId(null);
    }
  };

  // Renter says "I returned it" (the owner still has to confirm)
  const handleRequestReturn = (rentalId) => {
    doRentalAction(rentalId, "request-return", "Tell the owner that you have returned this gear?", "Failed to send return request.");
  };

  // Owner confirms the return (the server works out the late fee)
  const handleConfirmReturn = (rentalId) => {
    doRentalAction(rentalId, "return", "Confirm that you got this gear back?", "Failed to confirm return.");
  };

  // Renter cancels their own pending request
  const handleCancel = (rentalId) => {
    doRentalAction(rentalId, "cancel", "Cancel this rental request?", "Failed to cancel request.");
  };

  const handleAccept = (rentalId) => {
    doRentalAction(rentalId, "accept", "", "Failed to accept request.");
  };

  const handleReject = (rentalId) => {
    doRentalAction(rentalId, "reject", "", "Failed to reject request.");
  };

  // Mark one of my warnings as read
  const handleMarkRead = async (warningId) => {
    try {
      await api.put(`/warnings/${warningId}/read`);
      // update just this warning in the list (no need to reload everything)
      setWarnings((prev) =>
        prev.map((w) => {
          if (w._id !== warningId) return w;
          return Object.assign({}, w, { isRead: true });
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark warning as read."));
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  const activeRentalsByGearId = groupRentalsByGear(activeRentalsOnMyGear);

  // saved gears still on my wishlist (un-hearting a card removes it from this list at once)
  const savedGears = wishlistGears.filter((g) => wishlistIds.includes(g._id));

  // How many warnings I have not read yet (used for the banner and the tab badge)
  const unreadCount = warnings.filter((w) => !w.isRead).length;

  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4">Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* red banner shown only when there are unread warnings */}
      {unreadCount > 0 && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>
            ⚠️ You have {unreadCount} unread warning{unreadCount > 1 ? "s" : ""} from the admin.
          </span>
          <Button size="sm" variant="danger" onClick={() => setActiveTab("warnings")}>
            View
          </Button>
        </Alert>
      )}

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="myGear" title={`My Gear (${myGears.length})`}>
          {myGears.length === 0 ? (
            <Alert variant="info" className="mt-3">
              You haven't listed any gear yet. <Link to="/add-gear">Add one now</Link>.
            </Alert>
          ) : (
            <Row className="mt-3">
              {myGears.map((gear) => (
                <MyGearCard
                  key={gear._id}
                  gear={gear}
                  activeRentals={activeRentalsByGearId[gear._id] || []}
                  onDelete={handleDeleteGear}
                  onTogglePause={handleTogglePause}
                  onConfirmReturn={handleConfirmReturn}
                  busyId={busyId}
                />
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="requests" title={`Requests (${incomingRequests.length})`}>
          {incomingRequests.length === 0 ? (
            <Alert variant="info" className="mt-3">No pending requests on your gear right now.</Alert>
          ) : (
            <Row className="mt-3">
              {incomingRequests.map((req) => (
                <RequestCard
                  key={req._id}
                  req={req}
                  busy={busyId === req._id}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="myRentals" title={`My Rentals (${myRentals.length})`}>
          {myRentals.length === 0 ? (
            <Alert variant="info" className="mt-3">
              You haven't requested any gear yet. <Link to="/gears">Browse gears</Link>.
            </Alert>
          ) : (
            <Row className="mt-3">
              {myRentals.map((rental) => (
                <MyRentalCard
                  key={rental._id}
                  rental={rental}
                  onRequestReturn={handleRequestReturn}
                  onCancel={handleCancel}
                  busy={busyId === rental._id}
                />
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="wishlist" title={`Wishlist (${savedGears.length})`}>
          {savedGears.length === 0 ? (
            <Alert variant="info" className="mt-3">
              You haven't saved any gear yet. Tap the ♡ on a gear to save it. <Link to="/gears">Browse gears</Link>.
            </Alert>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-4 mt-1">
              {savedGears.map((gear) => (
                <Col key={gear._id}>
                  <GearCard gear={gear} />
                </Col>
              ))}
            </Row>
          )}
        </Tab>

        {/* Warnings tab is hidden for admin */}
        {!isAdmin && (
          <Tab
            eventKey="warnings"
            title={
              <>
                Warnings {unreadCount > 0 && <Badge bg="danger">{unreadCount}</Badge>}
              </>
            }
          >
            {warnings.length === 0 ? (
              <Alert variant="info" className="mt-3">You have no warnings. Keep it up!</Alert>
            ) : (
              <div className="mt-3">
                {warnings.map((w) => (
                  <WarningCard key={w._id} warning={w} onMarkRead={handleMarkRead} />
                ))}
              </div>
            )}
          </Tab>
        )}

        <Tab eventKey="profile" title="Profile">
          <ProfileTab gearsCount={myGears.length} rentalsCount={myRentals.length} />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Dashboard;
