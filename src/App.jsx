import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// =====================================================
// HELPER: CLEAN LAVALUST RESPONSE
// =====================================================
const cleanResponse = (data) => {
  if (typeof data !== "string") {
    return data;
  }

  const cleaned = data
    .replace(/^\uFEFF/, "")
    .trim();

  if (!cleaned) {
    return {};
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Could not parse API response:", cleaned);

    return {
      error: cleaned,
      status: 500,
    };
  }
};

// =====================================================
// APP
// =====================================================
function App() {
  // ---------------------------------------------------
  // LOGIN
  // ---------------------------------------------------
  const [loggedIn, setLoggedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ---------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------
  const [products, setProducts] = useState([]);

  // ---------------------------------------------------
  // PRODUCT FORM
  // ---------------------------------------------------
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const [editingId, setEditingId] = useState(null);

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalUnits = products.reduce(
    (total, product) =>
      total + Number(product.quantity || 0),
    0
  );

  const stockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) *
        Number(product.quantity || 0),
    0
  );

  // ===================================================
  // GET TOKEN
  // ===================================================
  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  // ===================================================
  // GET AUTH HEADERS
  // ===================================================
  const getHeaders = () => {
    const token = getToken();

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // ===================================================
  // LOAD PRODUCTS
  // ===================================================
  const loadProducts = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      setError("");

      const response = await axios.get(
        `${API_URL}/products`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "RAW PRODUCT RESPONSE:",
        response.data
      );

      const result = cleanResponse(
        response.data
      );

      console.log(
        "CLEAN PRODUCT RESPONSE:",
        result
      );

      if (result?.status === 200) {
        setProducts(result.data || []);
      } else {
        setProducts([]);
      }

    } catch (err) {
      console.error(
        "LOAD PRODUCTS ERROR:",
        err
      );

      if (err.response?.status === 401) {
        logout();
      } else {
        const serverData = cleanResponse(
          err.response?.data
        );

        setError(
          serverData?.error ||
          serverData?.message ||
          err.message ||
          "Failed to load products."
        );
      }
    }
  };

  // ===================================================
  // CHECK EXISTING LOGIN
  // ===================================================
  useEffect(() => {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (token) {
      setLoggedIn(true);

      loadProducts();
    }
  }, []);

  // ===================================================
  // LOGIN
  // ===================================================
  const login = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      console.log(
        "Sending login request to:",
        `${API_URL}/login`
      );

      const response = await axios.post(
        `${API_URL}/login`,
        {
          username: username.trim(),
          password: password,
        },
        {
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log(
        "RAW LOGIN RESPONSE:",
        response.data
      );

      const result = cleanResponse(
        response.data
      );

      console.log(
        "CLEAN LOGIN RESPONSE:",
        result
      );

      // =============================================
      // GET ACCESS TOKEN
      // =============================================
      const accessToken =
        result?.data?.tokens?.access_token;

      if (!accessToken) {
        console.error(
          "No access token found:",
          result
        );

        throw new Error(
          result?.error ||
          result?.message ||
          "Access token was not returned by the server."
        );
      }

      // =============================================
      // SAVE TOKEN
      // =============================================
      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "username",
        result?.data?.username ||
          username.trim()
      );

      console.log(
        "LOGIN SUCCESS - TOKEN SAVED"
      );

      // =============================================
      // CHANGE PAGE
      // =============================================
      setLoggedIn(true);

      setPassword("");

      setError("");

      // =============================================
      // LOAD PRODUCTS
      // =============================================
      await loadProducts();

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      let message =
        "Login failed. Please check your username and password.";

      if (err.response) {
        const serverData =
          cleanResponse(
            err.response.data
          );

        message =
          serverData?.error ||
          serverData?.message ||
          message;

      } else {
        message =
          err.message ||
          message;
      }

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // LOGOUT
  // ===================================================
  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "username"
    );

    setLoggedIn(false);

    setUsername("");

    setPassword("");

    setProducts([]);

    resetForm();

    setError("");
  };

  // ===================================================
  // RESET FORM
  // ===================================================
  const resetForm = () => {
    setProductName("");
    setDescription("");
    setPrice("");
    setQuantity("");
    setEditingId(null);
  };

  // ===================================================
  // SAVE PRODUCT
  // CREATE / UPDATE
  // ===================================================
  const saveProduct = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const productData = {
        product_name:
          productName.trim(),

        description:
          description.trim(),

        price: Number(price),

        quantity: Number(quantity),
      };

      // =============================================
      // UPDATE
      // =============================================
      if (editingId) {
        const response =
          await axios.put(
            `${API_URL}/products/${editingId}`,
            productData,
            {
              headers:
                getHeaders(),
            }
          );

        console.log(
          "UPDATE RESPONSE:",
          response.data
        );
      }

      // =============================================
      // CREATE
      // =============================================
      else {
        const response =
          await axios.post(
            `${API_URL}/products`,
            productData,
            {
              headers:
                getHeaders(),
            }
          );

        console.log(
          "CREATE RESPONSE:",
          response.data
        );
      }

      resetForm();

      await loadProducts();

    } catch (err) {
      console.error(
        "SAVE PRODUCT ERROR:",
        err
      );

      if (
        err.response?.status ===
        401
      ) {
        logout();
        return;
      }

      const serverData =
        cleanResponse(
          err.response?.data
        );

      setError(
        serverData?.error ||
        serverData?.message ||
        err.message ||
        "Failed to save product."
      );
    }
  };

  // ===================================================
  // EDIT PRODUCT
  // ===================================================
  const editProduct = (product) => {
    setEditingId(product.id);

    setProductName(
      product.product_name || ""
    );

    setDescription(
      product.description || ""
    );

    setPrice(
      product.price || ""
    );

    setQuantity(
      product.quantity || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ===================================================
  // DELETE PRODUCT
  // ===================================================
  const deleteProduct = async (id) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this product?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response =
        await axios.delete(
          `${API_URL}/products/${id}`,
          {
            headers:
              getHeaders(),
          }
        );

      console.log(
        "DELETE RESPONSE:",
        response.data
      );

      await loadProducts();

    } catch (err) {
      console.error(
        "DELETE PRODUCT ERROR:",
        err
      );

      if (
        err.response?.status ===
        401
      ) {
        logout();
        return;
      }

      const serverData =
        cleanResponse(
          err.response?.data
        );

      setError(
        serverData?.error ||
        serverData?.message ||
        err.message ||
        "Failed to delete product."
      );
    }
  };

  // ===================================================
  // LOGIN PAGE
  // ===================================================
  if (!loggedIn) {
    return (
      <div className="login-page">

        <div className="login-card">

          <h1>
            LavaLust
          </h1>

          <p className="subtitle">
            Product Management System
          </p>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <form onSubmit={login}>

            <label>
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              placeholder="Enter username"
              required
            />

            <label>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Enter password"
              required
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

        </div>

      </div>
    );
  }

  // ===================================================
  // PRODUCT MANAGEMENT PAGE
  // ===================================================
  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>

          <h1>
            LavaLust
          </h1>

          <p>
            Product Management System
          </p>

        </div>

        <div className="header-right">

          <span>
            Welcome,{" "}
            {
              localStorage.getItem(
                "username"
              ) || "admin"
            }
          </span>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="container">

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="page-title">

          <div>

            <p className="eyebrow">
              THE COLLECTION{" "}
              <span>/</span> 01
            </p>

            <h2>
              Inventory
              <span className="brand-period">
                .
              </span>
            </h2>

            <p>
              A living record of
              everything in the studio.
            </p>

          </div>

          <div className="inventory-stamp">

            <span>
              LL
            </span>

            <small>
              CURATED
              <br />
              WITH INTENT
            </small>

          </div>

        </section>

        <section
          className="stats-row"
          aria-label="Inventory summary"
        >

          <article className="stat-block stat-highlight">

            <span className="stat-label">
              IN THE COLLECTION
            </span>

            <strong>
              {products.length
                .toString()
                .padStart(2, "0")}
            </strong>

            <span className="stat-foot">
              unique pieces
            </span>

          </article>

          <article className="stat-block">

            <span className="stat-label">
              TOTAL UNITS
            </span>

            <strong>
              {totalUnits.toLocaleString(
                "en-PH"
              )}
            </strong>

            <span className="stat-foot">
              across all products
            </span>

          </article>

          <article className="stat-block">

            <span className="stat-label">
              SHELF VALUE
            </span>

            <strong>
              ₱
              {stockValue.toLocaleString(
                "en-PH",
                {
                  maximumFractionDigits: 0,
                }
              )}
            </strong>

            <span className="stat-foot">
              based on current stock
            </span>

          </article>

          <div className="stat-aside">

            <span className="status-dot" />

            LIVE INVENTORY

            <br />

            <small>
              JUST AS IT IS
            </small>

          </div>

        </section>

        <div className="workspace-grid">

          {/* PRODUCT FORM */}

          <section className="form-card">

            <div className="section-heading">

              <span className="section-number">
                A / 01
              </span>

              <h2>
                {editingId
                  ? "Edit piece"
                  : "Add a piece"}
              </h2>

              <p>
                {editingId
                  ? "Refine the details below."
                  : "Make room for something new."}
              </p>

            </div>

            <form
              onSubmit={saveProduct}
            >

              <div className="form-grid">

                <div>

                  <label>
                    Product name
                  </label>

                  <input
                    type="text"
                    value={
                      productName
                    }
                    onChange={(e) =>
                      setProductName(
                        e.target.value
                      )
                    }
                    placeholder="Product name"
                    required
                  />

                </div>

                <div>

                  <label>
                    Description{" "}
                    <span className="optional">
                      OPTIONAL
                    </span>
                  </label>

                  <input
                    type="text"
                    value={
                      description
                    }
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    placeholder="Description"
                  />

                </div>

                <div>

                  <label>
                    Price{" "}
                    <span className="currency-label">
                      PHP ₱
                    </span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) =>
                      setPrice(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    required
                  />

                </div>

                <div>

                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        e.target.value
                      )
                    }
                    placeholder="0"
                    required
                  />

                </div>

              </div>

              <div className="form-buttons">

                <button
                  className="primary-button"
                  type="submit"
                >
                  {editingId
                    ? "Save changes"
                    : "Add to collection"}

                  <span aria-hidden="true">
                    ↗
                  </span>

                </button>

                {editingId && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetForm}
                  >
                    Discard
                  </button>
                )}

              </div>

            </form>

          </section>

          {/* PRODUCTS */}

          <section className="products-card">

            <div className="products-title">

              <div>

                <span className="section-number">
                  B / 02
                </span>

                <h2>
                  All pieces
                </h2>

                <p>
                  {products.length}{" "}
                  {products.length === 1
                    ? "piece"
                    : "pieces"}{" "}
                  in the collection
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={
                  loadProducts
                }
              >
                <span aria-hidden="true">
                  ↻
                </span>{" "}
                Refresh
              </button>

            </div>

            {products.length === 0 ? (

              <div className="empty">

                <strong>
                  A little space to begin.
                </strong>

                <span>
                  Your next favorite
                  starts here.
                </span>

              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        ID
                      </th>

                      <th>
                        Product Name
                      </th>

                      <th>
                        Description
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Quantity
                      </th>

                      <th>
                        Created At
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {products.map(
                      (product) => (

                        <tr
                          key={
                            product.id
                          }
                        >

                          <td className="id-cell">
                            LL–
                            {String(
                              product.id
                            ).padStart(
                              3,
                              "0"
                            )}
                          </td>

                          <td>
                            <span className="product-name-cell">
                              {
                                product.product_name
                              }
                            </span>
                          </td>

                          <td>
                            {
                              product.description
                            }
                          </td>

                          <td>
                            ₱
                            {Number(
                              product.price
                            ).toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>

                            <span
                              className={`quantity-pill ${
                                Number(
                                  product.quantity
                                ) <= 5
                                  ? "quantity-low"
                                  : ""
                              }`}
                            >
                              {
                                product.quantity
                              }{" "}
                              <small>
                                units
                              </small>
                            </span>

                          </td>

                          <td>
                            {
                              product.created_at
                            }
                          </td>

                          <td>

                            <div className="actions">

                              <button
                                className="edit-button"
                                onClick={() =>
                                  editProduct(
                                    product
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  deleteProduct(
                                    product.id
                                  )
                                }
                              >
                                Remove
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </div>

      </main>

    </div>
  );
}

export default App;