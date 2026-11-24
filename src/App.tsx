import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import { registerUser, loginUser, logoutUser } from "./auth";
import {
  createTicket,
  getTickets,
  updateTicket,
  deleteTicket,
  type Ticket
} from "./tickets";
import "./App.css";

const TICKETS_PER_PAGE = 3;

const welcomeSlides = [
  {
    eyebrow: "IT SUPPORT MANAGEMENT",
    title: <>Keep your IT<br />operations<br /><span>flowing.</span></>,
    description:
      "A simpler way to manage support requests, track issues, and keep your technology running smoothly.",
    footer: "One workspace. Better IT support."
  },
  {
    eyebrow: "SMARTER ISSUE TRACKING",
    title: <>Every issue.<br />Under better<br /><span>control.</span></>,
    description:
      "Create support tickets, follow their progress, and keep every IT issue organized in one place.",
    footer: "Track issues. Follow progress."
  },
  {
    eyebrow: "BETTER WORKFLOW",
    title: <>Stay focused.<br />Keep things<br /><span>moving.</span></>,
    description:
      "Organize support requests by category, priority, and status to manage your work more easily.",
    footer: "Simple tools. Smoother support."
  }
];

// Reusable dropdown component
type SearchableDropdownProps = {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
};

function SearchableDropdown({
  value,
  options,
  placeholder,
  onChange
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="searchable-dropdown">
      <button
        type="button"
        className="searchable-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value === "All" ? placeholder : value}</span>
        <span className="dropdown-arrow">⌄</span>
      </button>

      {isOpen && (
        <div className="searchable-dropdown-menu">
          <div className="searchable-dropdown-options">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={value === option ? "selected-option" : ""}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option === "All" ? placeholder : option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Create a compact list of page numbers
function getPaginationItems(
  totalPages: number,
  currentPage: number
): (number | "...")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages
  ];
}

function App() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Ticket states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("Medium");
  const [category, setCategory] = useState<Ticket["category"]>("Software");

  // Edit ticket states
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<Ticket["priority"]>("Medium");
  const [editCategory, setEditCategory] = useState<Ticket["category"]>("Software");
  const [savingEdit, setSavingEdit] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically change the welcome slide every 5 seconds
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((current) => (current + 1) % welcomeSlides.length);
    }, 5000);

    return () => clearInterval(slideTimer);
  }, []);

  // Check the user's login session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load tickets when a user logs in
  useEffect(() => {
    if (!user) {
      setTickets([]);
      return;
    }

    const loadTickets = async () => {
      setTicketsLoading(true);
      setTicketError("");

      try {
        const result = await getTickets();
        setTickets(result);
      } catch (err) {
        setTicketError(
          err instanceof Error ? err.message : "Could not load tickets."
        );
      } finally {
        setTicketsLoading(false);
      }
    };

    loadTickets();
  }, [user]);

  // Convert Firebase errors into easier messages
  const getAuthErrorMessage = (err: unknown) => {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String(err.code)
        : "";

    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
      case "auth/invalid-credential":
        return "Incorrect email or password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Your password is too weak. Use at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a little and try again.";
      case "auth/network-request-failed":
        return "Network problem. Check your internet connection.";
      default:
        return err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
    }
  };

  // Register or log in
  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser(cleanEmail, password);
      } else {
        await loginUser(cleanEmail, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Switch between login and registration
  const switchAuthMode = () => {
    setIsRegistering(!isRegistering);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Log out
  const handleLogout = async () => {
    try {
      await logoutUser();
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTicketError("");
    } catch {
      setTicketError("Could not log out. Please try again.");
    }
  };

  // Create a new support ticket
  const handleCreateTicket = async () => {
    setTicketError("");
    setTicketSuccess("");

    if (!ticketTitle.trim() || !ticketDescription.trim()) {
      setTicketError("Please enter a title and description.");
      return;
    }

    setCreatingTicket(true);

    try {
      await createTicket({
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        status: "Open",
        priority,
        category
      });

      setTicketTitle("");
      setTicketDescription("");
      setPriority("Medium");
      setCategory("Software");

      const result = await getTickets();
      setTickets(result);
      setCurrentPage(1);

      setTicketSuccess("Your support ticket was created successfully!");
    } catch (err) {
      setTicketError(
        err instanceof Error ? err.message : "Could not create ticket."
      );
    } finally {
      setCreatingTicket(false);
    }
  };

  // Change ticket status
  const handleStatusChange = async (
    ticketId: string,
    status: Ticket["status"]
  ) => {
    if (updatingTicketId) return;

    setTicketError("");
    setTicketSuccess("");
    setUpdatingTicketId(ticketId);

    try {
      await updateTicket(ticketId, { status });

      const result = await getTickets();
      setTickets(result);

      setTicketSuccess("Ticket status updated successfully!");
    } catch (err) {
      setTicketError(
        err instanceof Error ? err.message : "Could not update ticket."
      );
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Open the edit form
  const handleStartEdit = (ticket: Ticket) => {
    setEditingTicketId(ticket.id!);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setEditCategory(ticket.category);
    setTicketError("");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTicketId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority("Medium");
    setEditCategory("Software");
  };

  // Save ticket changes
  const handleSaveEdit = async (ticketId: string) => {
    setTicketError("");

    if (!editTitle.trim() || !editDescription.trim()) {
      setTicketError("Please enter a title and description.");
      return;
    }

    setSavingEdit(true);

    try {
      await updateTicket(ticketId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        category: editCategory
      });

      const result = await getTickets();
      setTickets(result);

      handleCancelEdit();
    } catch (err) {
      setTicketError(
        err instanceof Error ? err.message : "Could not save ticket changes."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a ticket
  const handleDeleteTicket = async (ticketId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this ticket?"
    );

    if (!confirmed) return;

    setTicketError("");

    try {
      await deleteTicket(ticketId);

      const result = await getTickets();
      setTickets(result);
    } catch (err) {
      setTicketError(
        err instanceof Error ? err.message : "Could not delete ticket."
      );
    }
  };

  // Search and filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      ticket.title.toLowerCase().includes(search) ||
      ticket.description.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    const matchesCategory =
      categoryFilter === "All" || ticket.category === categoryFilter;

    const matchesPriority =
      priorityFilter === "All" || ticket.priority === priorityFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesPriority
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
  const safeCurrentPage = Math.min(
    currentPage,
    Math.max(totalPages, 1)
  );

  const startIndex = (safeCurrentPage - 1) * TICKETS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + TICKETS_PER_PAGE,
    filteredTickets.length
  );

  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
  const paginationItems = getPaginationItems(totalPages, safeCurrentPage);

  // Keep the current page valid when tickets are deleted or filters change
  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  // Wait while Firebase checks the login session
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="loading-spinner"></div>
          <h2>FixFlow</h2>
          <p>Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  // Welcome, login and registration pages
  if (!user) {
    return (
      <div className="auth-page">
        <section className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="brand-logo">
              <span className="brand-logo-icon">F</span>
              <span>FixFlow</span>
            </div>

            <div className="brand-message" key={currentSlide}>
              <span className="brand-eyebrow">
                {welcomeSlides[currentSlide].eyebrow}
              </span>

              <h1>{welcomeSlides[currentSlide].title}</h1>

              <p>{welcomeSlides[currentSlide].description}</p>
            </div>

            <div className="brand-bottom">
              <div className="brand-decoration">
                {welcomeSlides.map((slide, index) => (
                  <button
                    key={index}
                    type="button"
                    className={currentSlide === index ? "active-slide" : ""}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Show slide ${index + 1}: ${slide.eyebrow}`}
                    aria-pressed={currentSlide === index}
                  />
                ))}
              </div>

              <p>{welcomeSlides[currentSlide].footer}</p>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-container">
            <div className="mobile-brand-logo">
              <span className="brand-logo-icon">F</span>
              <span>FixFlow</span>
            </div>

            <div className="auth-heading">
              <span className="auth-eyebrow">
                {isRegistering ? "GET STARTED" : "WELCOME BACK"}
              </span>

              <h2>
                {isRegistering
                  ? "Create your account"
                  : "Sign in to FixFlow"}
              </h2>

              <p>
                {isRegistering
                  ? "Create an account to start managing your IT support requests."
                  : "Enter your details to access your support workspace."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>

                <div className="password-input-wrapper">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {isRegistering && (
                <div className="auth-field">
                  <label htmlFor="auth-confirm-password">
                    Confirm password
                  </label>

                  <div className="password-input-wrapper">
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter your password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="auth-error-message">
                  <span className="auth-message-icon">!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegistering
                  ? "Create account"
                  : "Sign in"}
                {!loading && <span>→</span>}
              </button>
            </form>

            <div className="auth-switch">
              <p>
                {isRegistering
                  ? "Already have an account?"
                  : "Don't have an account?"}

                <button type="button" onClick={switchAuthMode}>
                  {isRegistering ? "Sign in" : "Create account"}
                </button>
              </p>
            </div>

            <div className="auth-form-footer">
              <span>© {new Date().getFullYear()} FixFlow</span>
              <span>IT Support Management</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="app">
      <header className="header">
        <h1>FixFlow</h1>
        <p>IT Support and Maintenance Management</p>
      </header>

      <main className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2>Dashboard</h2>
            <p>Welcome, {user.email}</p>
          </div>

          <button onClick={handleLogout}>Logout</button>
        </div>

        {ticketError && <p className="error">{ticketError}</p>}

        {ticketSuccess && (
          <p className="success-message">{ticketSuccess}</p>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Total Tickets</h3>
            <p>{tickets.length}</p>
          </div>

          <div className="stat-card">
            <h3>Open</h3>
            <p>{tickets.filter(t => t.status === "Open").length}</p>
          </div>

          <div className="stat-card">
            <h3>In Progress</h3>
            <p>{tickets.filter(t => t.status === "In Progress").length}</p>
          </div>

          <div className="stat-card">
            <h3>Resolved</h3>
            <p>{tickets.filter(t => t.status === "Resolved").length}</p>
          </div>
        </section>

        <section className="ticket-form">
          <h2>Create a Support Ticket</h2>

          <input
            type="text"
            placeholder="Ticket title"
            value={ticketTitle}
            onChange={(e) => setTicketTitle(e.target.value)}
          />

          <textarea
            placeholder="Describe the IT issue..."
            value={ticketDescription}
            onChange={(e) => setTicketDescription(e.target.value)}
          />

          <label>Category</label>
          <SearchableDropdown
            value={category}
            options={["Hardware", "Software", "Network", "Security"]}
            placeholder="Select Category"
            onChange={(value) => setCategory(value as Ticket["category"])}
          />

          <label>Priority</label>
          <SearchableDropdown
            value={priority}
            options={["Low", "Medium", "High"]}
            placeholder="Select Priority"
            onChange={(value) => setPriority(value as Ticket["priority"])}
          />

          <button
            onClick={handleCreateTicket}
            disabled={creatingTicket}
          >
            {creatingTicket ? "Creating Ticket..." : "Create Ticket"}
          </button>
        </section>

        <section className="ticket-list">
          <h2>Support Tickets</h2>

          <div className="ticket-filters">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />

            <SearchableDropdown
              value={statusFilter}
              options={["All", "Open", "In Progress", "Resolved"]}
              placeholder="All Statuses"
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            />

            <SearchableDropdown
              value={categoryFilter}
              options={["All", "Hardware", "Software", "Network", "Security"]}
              placeholder="All Categories"
              onChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
            />

            <SearchableDropdown
              value={priorityFilter}
              options={["All", "Low", "Medium", "High"]}
              placeholder="All Priorities"
              onChange={(value) => {
                setPriorityFilter(value);
                setCurrentPage(1);
              }}
            />

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setCategoryFilter("All");
                setPriorityFilter("All");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>

          {ticketsLoading ? (
            <p>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p>No support tickets yet. Create your first ticket above.</p>
          ) : filteredTickets.length === 0 ? (
            <p>No tickets match your search or filters.</p>
          ) : (
            <>
              <p className="ticket-count">
                Showing {startIndex + 1}-{endIndex} of {filteredTickets.length} matching tickets
              </p>

              {paginatedTickets.map((ticket) => (
                <div className="ticket-card" key={ticket.id}>
                  {editingTicketId === ticket.id ? (
                    <div className="ticket-form ticket-edit-form">
                      <h3>Edit Support Ticket</h3>

                      <input
                        type="text"
                        placeholder="Ticket title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />

                      <textarea
                        placeholder="Describe the IT issue..."
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />

                      <label>Category</label>
                      <SearchableDropdown
                        value={editCategory}
                        options={["Hardware", "Software", "Network", "Security"]}
                        placeholder="Select Category"
                        onChange={(value) =>
                          setEditCategory(value as Ticket["category"])
                        }
                      />

                      <label>Priority</label>
                      <SearchableDropdown
                        value={editPriority}
                        options={["Low", "Medium", "High"]}
                        placeholder="Select Priority"
                        onChange={(value) =>
                          setEditPriority(value as Ticket["priority"])
                        }
                      />

                      <button
                        onClick={() => handleSaveEdit(ticket.id!)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </button>

                      <button
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3>{ticket.title}</h3>
                        <p>{ticket.description}</p>
                        <p>Category: {ticket.category}</p>
                        <p>Priority: {ticket.priority}</p>
                      </div>

                      <div className="ticket-actions">
                        {updatingTicketId === ticket.id && (
                          <p className="ticket-update-message">
                            Updating status...
                          </p>
                        )}

                        <div className="ticket-action-row">
                          <div className="ticket-status-control">
                            <label>Status</label>

                            <SearchableDropdown
                              value={ticket.status}
                              options={["Open", "In Progress", "Resolved"]}
                              placeholder="Select Status"
                              onChange={(value) =>
                                handleStatusChange(
                                  ticket.id!,
                                  value as Ticket["status"]
                                )
                              }
                            />
                          </div>

                          <button
                            className="ticket-edit-button"
                            onClick={() => handleStartEdit(ticket)}
                          >
                            Edit
                          </button>

                          <button
                            className="ticket-delete-button"
                            onClick={() => handleDeleteTicket(ticket.id!)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              
                            {totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-nav"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                  >
                    First
                  </button>

                  <button
                    type="button"
                    className="pagination-nav"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safeCurrentPage === 1}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    «
                  </button>

                  <div className="pagination-pages">
                    {paginationItems.map((item, index) =>
                      item === "..." ? (
                        <span
                          className="pagination-ellipsis"
                          key={`ellipsis-${index}`}
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          type="button"
                          key={item}
                          className={
                            safeCurrentPage === item
                              ? "pagination-page active"
                              : "pagination-page"
                          }
                          onClick={() => setCurrentPage(item)}
                          aria-label={`Go to page ${item}`}
                          aria-current={
                            safeCurrentPage === item ? "page" : undefined
                          }
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="pagination-nav"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    disabled={safeCurrentPage === totalPages}
                    aria-label="Next page"
                    title="Next page"
                  >
                    »
                  </button>

                  <button
                    type="button"
                    className="pagination-nav"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Last
                  </button>
                </div>
              )}

              {totalPages > 1 && (
                <p className="pagination-info">
                  Page {safeCurrentPage} of {totalPages}
                </p>
              )}


            </>
          )}
        </section>
      </main>

      <footer>
        <p>FixFlow | IT Support Management</p>
      </footer>
    </div>
  );
}

export default App;