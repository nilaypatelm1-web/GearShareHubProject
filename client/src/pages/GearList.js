import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner, Alert, Pagination } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import GearCard from "../components/GearCard";
import { CATEGORIES } from "../utils/gearForm";

const SORTS = ["newest", "priceLow", "priceHigh", "topRated", "mostRented"];

// Page numbers to show: first, last, and the pages around the current one ("..." for gaps)
const getPageItems = (page, totalPages) => {
  const items = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      items.push(p);
    } else if (items[items.length - 1] !== "...") {
      items.push("...");
    }
  }
  return items;
};

// Checks the two price boxes. Returns the error text, or "" when they are fine.
const getPriceError = (min, max) => {
  if (min !== "" && !(Number(min) >= 0)) return "Prices must be numbers, 0 or more";
  if (max !== "" && !(Number(max) >= 0)) return "Prices must be numbers, 0 or more";
  if (min !== "" && max !== "" && Number(min) > Number(max)) return "Min price cannot be more than max price";
  return "";
};

// The sort name from the URL, or "newest" when it is missing or not one of ours
const getSortFromUrl = (searchParams) => {
  const sort = searchParams.get("sort");
  if (SORTS.includes(sort)) return sort;
  return "newest";
};

// The page number from the URL, or 1 when it is missing or not a positive number
const getPageFromUrl = (searchParams) => {
  const page = Number(searchParams.get("page"));
  if (page > 0) return page;
  return 1;
};

const GearList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [gears, setGears] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");

  // Start the filters from the URL, e.g. /gears?category=Camping&page=2
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sortBy, setSortBy] = useState(getSortFromUrl(searchParams));
  // price boxes (typing) and the price range that is really applied (after pressing Search)
  const [minInput, setMinInput] = useState(searchParams.get("minPrice") || "");
  const [maxInput, setMaxInput] = useState(searchParams.get("maxPrice") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [page, setPage] = useState(getPageFromUrl(searchParams));

  // Load the gears again whenever a filter, the sort or the page changes (the server does the sorting and paging)
  useEffect(() => {
    let cancelled = false; // ignore an old answer if a newer request was started

    const fetchGears = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/gears", {
          params: {
            search: search || undefined,
            category: category || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            sort: sortBy,
            page,
          },
        });
        if (cancelled) return;
        setGears(res.data.gears);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
        if (res.data.page !== page) setPage(res.data.page); // the server moved us to the last page
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load gears. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchGears();

    return () => {
      cancelled = true;
    };
  }, [search, category, sortBy, minPrice, maxPrice, page]);

  // Keep the URL in sync with the filters (only the filters that are not empty)
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sortBy !== "newest") params.sort = sortBy;
    if (page > 1) params.page = page;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sortBy, minPrice, maxPrice, page]);

  // Search button / Enter: apply the search text and the price range (always back to page 1)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const min = minInput.trim();
    const max = maxInput.trim();

    const problem = getPriceError(min, max);
    setPriceError(problem);
    if (problem) return;

    setSearch(searchInput.trim());
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  // Category and sort apply straight away and go back to page 1
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4">Browse Gears</h2>

      {/* Search + filter bar */}
      <Form onSubmit={handleSearchSubmit} className="mb-4">
        <Row className="g-2">
          <Col md={12} lg={5}>
            <Form.Control
              type="text"
              placeholder="Search by gear name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Col>
          <Col md={6} lg={3}>
            <Form.Select value={category} onChange={handleCategoryChange}>
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Form.Select>
          </Col>
          {/* Sort dropdown (sorted by the server so paging stays correct) */}
          <Col md={6} lg={4}>
            <Form.Select value={sortBy} onChange={handleSortChange}>
              <option value="newest">Newest</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="topRated">Top Rated</option>
              <option value="mostRented">Most Rented</option>
            </Form.Select>
          </Col>

          {/* Price range per day */}
          <Col xs={6} md={3} lg={3}>
            <Form.Control
              type="number"
              min="0"
              placeholder="Min ₹/day"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
            />
          </Col>
          <Col xs={6} md={3} lg={3}>
            <Form.Control
              type="number"
              min="0"
              placeholder="Max ₹/day"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
            />
          </Col>
          <Col xs={12} md={6} lg={2}>
            <Button type="submit" className="btn-accent w-100">Search</Button>
          </Col>
        </Row>
        {priceError && <div className="text-danger small mt-2">{priceError}</div>}
      </Form>

      {/* Loading / error states */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && gears.length === 0 && (
        <Alert variant="info">No gears found. Try a different search, category or price range.</Alert>
      )}
      {!loading && !error && total > 0 && (
        <p className="text-muted small mb-3">
          {total} gear{total > 1 ? "s" : ""} found &middot; page {page} of {totalPages}
        </p>
      )}

      {/* Gear cards grid */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {!loading && gears.map((gear) => (
          <Col key={gear._id}>
            <GearCard gear={gear} />
          </Col>
        ))}
      </Row>

      {/* Page buttons */}
      {!loading && totalPages > 1 && (
        <Pagination className="justify-content-center mt-4 flex-wrap">
          <Pagination.Prev disabled={page <= 1} onClick={() => handlePageChange(page - 1)} />
          {getPageItems(page, totalPages).map((item, i) =>
            item === "..." ? (
              <Pagination.Ellipsis key={`gap-${i}`} disabled />
            ) : (
              <Pagination.Item key={item} active={item === page} onClick={() => handlePageChange(item)}>
                {item}
              </Pagination.Item>
            )
          )}
          <Pagination.Next disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)} />
        </Pagination>
      )}
    </Container>
  );
};

export default GearList;
