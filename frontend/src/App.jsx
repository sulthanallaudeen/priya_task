import { useEffect, useMemo, useState } from "react";
import {
  registerUser,
  loginUser,
  fetchCurrentUser,
  logoutUser,
  getStatuses,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getUsers,
  getUserTasks,
  updateUser,
  createStatus,
  updateStatus,
  deleteStatus
} from "./api";

const TOKEN_KEY = "priya_task_manager_token";
const TASK_PAGE_SIZE = 5;
const USER_PAGE_SIZE = 8;

const EMPTY_AUTH_FORM = {
  fullName: "",
  email: "",
  password: ""
};

function normalizeRoute(hashValue) {
  const clean = String(hashValue || "").replace(/^#/, "");
  if (!clean || clean === "/") {
    return "/";
  }
  if (clean === "/register") {
    return "/register";
  }
  if (clean === "/login") {
    return "/login";
  }
  if (clean === "/dashboard") {
    return "/dashboard";
  }
  return "/";
}

function setRoute(path) {
  window.location.hash = path === "/" ? "" : `#${path}`;
}

function formatDateLabel(value) {
  if (!value) {
    return "No due date";
  }
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function pageCount(total, limit) {
  return Math.max(1, Math.ceil(Number(total || 0) / Number(limit || 1)));
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function buildTaskPayload(form, isAdmin, userId) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    statusId: Number(form.statusId),
    dueDate: form.dueDate || null
  };

  if (isAdmin) {
    payload.assignedToUserId = Number(form.assignedToUserId);
  } else {
    payload.assignedToUserId = Number(userId);
  }

  return payload;
}

function createTaskForm({ task, statuses, users, isAdmin, user }) {
  const defaultStatusId = statuses[0]?.id ? String(statuses[0].id) : "";
  const defaultAssignee = isAdmin
    ? String(users[0]?.id || user?.id || "")
    : String(user?.id || "");

  if (!task) {
    return {
      title: "",
      description: "",
      priority: "medium",
      statusId: defaultStatusId,
      dueDate: "",
      assignedToUserId: defaultAssignee
    };
  }

  return {
    title: task.title || "",
    description: task.description || "",
    priority: task.priority || "medium",
    statusId: String(task.statusId || defaultStatusId),
    dueDate: task.dueDate || "",
    assignedToUserId: String(task.assignedToUserId || defaultAssignee)
  };
}

export default function App() {
  const [route, setRouteState] = useState(normalizeRoute(window.location.hash));
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [registerForm, setRegisterForm] = useState(EMPTY_AUTH_FORM);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [statuses, setStatuses] = useState([]);
  const [taskFilters, setTaskFilters] = useState({
    q: "",
    statusId: "all",
    priority: "all",
    sortBy: "createdAt",
    order: "DESC",
    assignedToUserId: "all"
  });
  const [taskPage, setTaskPage] = useState(1);
  const [taskData, setTaskData] = useState({
    tasks: [],
    total: 0,
    page: 1,
    limit: TASK_PAGE_SIZE
  });
  const [taskLoading, setTaskLoading] = useState(false);

  const [userFilters, setUserFilters] = useState({ q: "" });
  const [userPage, setUserPage] = useState(1);
  const [userData, setUserData] = useState({
    users: [],
    total: 0,
    page: 1,
    limit: USER_PAGE_SIZE
  });
  const [userLoading, setUserLoading] = useState(false);

  const [taskModal, setTaskModal] = useState({
    open: false,
    mode: "create",
    taskId: null,
    form: createTaskForm({ task: null, statuses: [], users: [], isAdmin: false, user: null })
  });
  const [taskSaving, setTaskSaving] = useState(false);
  const [deleteTaskState, setDeleteTaskState] = useState({ open: false, task: null });

  const [newStatusName, setNewStatusName] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [adminMenu, setAdminMenu] = useState("dashboard");
  const [selectedUserForTasks, setSelectedUserForTasks] = useState(null);
  const [selectedUserTaskPage, setSelectedUserTaskPage] = useState(1);
  const [selectedUserTaskData, setSelectedUserTaskData] = useState({
    tasks: [],
    total: 0,
    page: 1,
    limit: TASK_PAGE_SIZE
  });
  const [selectedUserTaskLoading, setSelectedUserTaskLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const taskTotalPages = pageCount(taskData.total, taskData.limit || TASK_PAGE_SIZE);
  const userTotalPages = pageCount(userData.total, userData.limit || USER_PAGE_SIZE);
  const selectedUserTaskTotalPages = pageCount(
    selectedUserTaskData.total,
    selectedUserTaskData.limit || TASK_PAGE_SIZE
  );
  const assignableUsers = useMemo(() => {
    if (!user) {
      return [];
    }
    if (!isAdmin) {
      return [user];
    }

    const merged = new Map();
    userData.users.forEach((item) => merged.set(item.id, item));
    if (!merged.has(user.id)) {
      merged.set(user.id, user);
    }
    return Array.from(merged.values());
  }, [isAdmin, user, userData.users]);

  useEffect(() => {
    const onHashChange = () => setRouteState(normalizeRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      if (!token) {
        setAppLoading(false);
        return;
      }
      try {
        const data = await fetchCurrentUser(token);
        if (!active) {
          return;
        }
        setUser(data.user);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setToken("");
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (active) {
          setAppLoading(false);
        }
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (appLoading) {
      return;
    }

    if (user && route !== "/dashboard") {
      setRoute("/dashboard");
      return;
    }

    if (!user && route === "/dashboard") {
      setRoute("/login");
    }
  }, [appLoading, user, route]);

  async function loadStatuses() {
    const data = await getStatuses(token);
    setStatuses(data);
    const drafts = {};
    data.forEach((status) => {
      drafts[status.id] = status.name;
    });
    setStatusDrafts(drafts);
  }

  async function loadTasks() {
    if (!token || !user) {
      return;
    }
    setTaskLoading(true);
    try {
      const result = await getTasks(token, {
        ...taskFilters,
        page: taskPage,
        limit: TASK_PAGE_SIZE
      });
      setTaskData(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTaskLoading(false);
    }
  }

  async function loadUsers() {
    if (!token || !isAdmin) {
      return;
    }
    setUserLoading(true);
    try {
      const result = await getUsers(token, {
        q: userFilters.q,
        page: userPage,
        limit: USER_PAGE_SIZE
      });
      setUserData(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUserLoading(false);
    }
  }

  async function loadTasksForSelectedUser(userId, page = selectedUserTaskPage) {
    if (!token || !isAdmin || !userId) {
      return;
    }
    setSelectedUserTaskLoading(true);
    try {
      const result = await getUserTasks(token, userId, {
        page,
        limit: TASK_PAGE_SIZE
      });
      setSelectedUserTaskData(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSelectedUserTaskLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !user || route !== "/dashboard") {
      return;
    }

    setError("");
    loadStatuses();
  }, [token, user, route]);

  useEffect(() => {
    if (!token || !user || route !== "/dashboard") {
      return;
    }
    loadTasks();
  }, [token, user, route, taskFilters, taskPage]);

  useEffect(() => {
    if (!token || !isAdmin || route !== "/dashboard") {
      return;
    }
    loadUsers();
  }, [token, isAdmin, route, userFilters, userPage]);

  useEffect(() => {
    if (!token || !isAdmin || route !== "/dashboard" || !selectedUserForTasks?.id) {
      return;
    }
    loadTasksForSelectedUser(selectedUserForTasks.id, selectedUserTaskPage);
  }, [token, isAdmin, route, selectedUserForTasks, selectedUserTaskPage]);

  const stats = useMemo(() => {
    const list = taskData.tasks || [];
    const byStatus = {
      total: taskData.total || 0,
      toDo: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0
    };
    list.forEach((task) => {
      const status = String(task.statusName || "").toLowerCase();
      if (status === "to do") {
        byStatus.toDo += 1;
      }
      if (status === "in progress") {
        byStatus.inProgress += 1;
      }
      if (status === "completed") {
        byStatus.completed += 1;
      }
      if (status === "blocked") {
        byStatus.blocked += 1;
      }
    });
    return byStatus;
  }, [taskData]);

  function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setAdminMenu("dashboard");
    setNotice("Login successful.");
    setError("");
    setRoute("/dashboard");
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await registerUser(registerForm);
      saveSession(response);
      setRegisterForm(EMPTY_AUTH_FORM);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await loginUser(loginForm);
      saveSession(response);
      setLoginForm({ email: "", password: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setError("");
    setNotice("");
    try {
      if (token) {
        await logoutUser(token);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setUser(null);
      setTaskData({ tasks: [], total: 0, page: 1, limit: TASK_PAGE_SIZE });
      setUserData({ users: [], total: 0, page: 1, limit: USER_PAGE_SIZE });
      setStatuses([]);
      setAdminMenu("dashboard");
      setSelectedUserForTasks(null);
      setSelectedUserTaskPage(1);
      setSelectedUserTaskData({ tasks: [], total: 0, page: 1, limit: TASK_PAGE_SIZE });
      setRoute("/login");
    }
  }

  function openCreateTaskModal() {
    setTaskModal({
      open: true,
      mode: "create",
      taskId: null,
      form: createTaskForm({
        task: null,
        statuses,
        users: assignableUsers,
        isAdmin,
        user
      })
    });
  }

  function openEditTaskModal(task) {
    setTaskModal({
      open: true,
      mode: "edit",
      taskId: task.id,
      form: createTaskForm({
        task,
        statuses,
        users: assignableUsers,
        isAdmin,
        user
      })
    });
  }

  async function handleTaskSave(event) {
    event.preventDefault();
    if (!token || !user) {
      return;
    }

    setTaskSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = buildTaskPayload(taskModal.form, isAdmin, user.id);
      if (taskModal.mode === "create") {
        await createTask(token, payload);
        setNotice("Task created successfully.");
      } else {
        await updateTask(token, taskModal.taskId, payload);
        setNotice("Task updated successfully.");
      }

      setTaskModal((prev) => ({ ...prev, open: false }));
      await loadTasks();
      if (isAdmin) {
        await loadUsers();
        if (selectedUserForTasks?.id) {
          await loadTasksForSelectedUser(selectedUserForTasks.id, selectedUserTaskPage);
        }
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTaskSaving(false);
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskState.task || !token) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await deleteTask(token, deleteTaskState.task.id);
      setDeleteTaskState({ open: false, task: null });
      setNotice("Task deleted successfully.");
      await loadTasks();
      if (isAdmin) {
        await loadUsers();
        if (selectedUserForTasks?.id) {
          await loadTasksForSelectedUser(selectedUserForTasks.id, selectedUserTaskPage);
        }
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleUserUpdate(userId, updates) {
    setError("");
    setNotice("");
    try {
      await updateUser(token, userId, updates);
      setNotice("User updated.");
      await loadUsers();
      await loadTasks();
      if (selectedUserForTasks?.id) {
        await loadTasksForSelectedUser(selectedUserForTasks.id, selectedUserTaskPage);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleSelectUserTasks(userItem) {
    setSelectedUserTaskPage(1);
    setSelectedUserForTasks(userItem);
  }

  async function handleCreateStatus(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await createStatus(token, { name: newStatusName });
      setNewStatusName("");
      setNotice("Status created.");
      await loadStatuses();
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleUpdateStatus(statusId) {
    setError("");
    setNotice("");
    try {
      await updateStatus(token, statusId, { name: statusDrafts[statusId] || "" });
      setNotice("Status updated.");
      await loadStatuses();
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDeleteStatus(statusId) {
    setError("");
    setNotice("");
    try {
      await deleteStatus(token, statusId);
      setNotice("Status deleted.");
      await loadStatuses();
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (appLoading) {
    return (
      <div className="screen-center">
        <p>Loading Priya Task Manager...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <div className="container">
        <header className="topbar">
          <div>
            <p className="eyebrow">Priya Task Manager</p>
            <h1>Organize work with clarity.</h1>
          </div>
          <nav className="top-actions">
            {!user ? (
              <>
                <button className="btn ghost" onClick={() => setRoute("/")} type="button">
                  Home
                </button>
                <button className="btn ghost" onClick={() => setRoute("/register")} type="button">
                  Register
                </button>
                <button className="btn primary" onClick={() => setRoute("/login")} type="button">
                  Login
                </button>
              </>
            ) : (
              <>
                <div className="user-chip">
                  <strong>{user.fullName}</strong>
                  <span>{user.role}</span>
                </div>
                <button className="btn danger" onClick={handleLogout} type="button">
                  Logout
                </button>
              </>
            )}
          </nav>
        </header>

        {notice ? <p className="banner success">{notice}</p> : null}
        {error ? <p className="banner error">{error}</p> : null}

        {route === "/" && !user ? (
          <section className="hero-card">
            <h2>Welcome to Priya Task Manager</h2>
            <p>
              Create an account, manage your task list, and track progress with status, priority,
              due date, search, and pagination.
            </p>
            <div className="hero-actions">
              <button className="btn primary" onClick={() => setRoute("/register")} type="button">
                Get Started
              </button>
              <button className="btn ghost" onClick={() => setRoute("/login")} type="button">
                I already have an account
              </button>
            </div>
          </section>
        ) : null}

        {route === "/register" && !user ? (
          <section className="auth-card">
            <h2>Create account</h2>
            <form className="stack" onSubmit={handleRegister}>
              <label>
                <span>Full Name</span>
                <input
                  value={registerForm.fullName}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  required
                  maxLength={120}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                  minLength={8}
                />
              </label>
              <button className="btn primary" disabled={authSubmitting}>
                {authSubmitting ? "Creating..." : "Register"}
              </button>
            </form>
          </section>
        ) : null}

        {route === "/login" && !user ? (
          <section className="auth-card">
            <h2>Login</h2>
            <form className="stack" onSubmit={handleLogin}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              <button className="btn primary" disabled={authSubmitting}>
                {authSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          </section>
        ) : null}

        {route === "/dashboard" && user ? (
          <section className="dashboard">
            {isAdmin ? (
              <div className="menu-tabs">
                <button
                  className={`btn ${adminMenu === "dashboard" ? "primary" : "ghost"}`}
                  onClick={() => setAdminMenu("dashboard")}
                  type="button"
                >
                  Dashboard
                </button>
                <button
                  className={`btn ${adminMenu === "users" ? "primary" : "ghost"}`}
                  onClick={() => setAdminMenu("users")}
                  type="button"
                >
                  Manage Users
                </button>
                <button
                  className={`btn ${adminMenu === "statuses" ? "primary" : "ghost"}`}
                  onClick={() => setAdminMenu("statuses")}
                  type="button"
                >
                  Manage Task Status
                </button>
              </div>
            ) : null}

            {!isAdmin || adminMenu === "dashboard" ? (
              <>
                <div className="stats-grid">
                  <article>
                    <span>{stats.total}</span>
                    <p>Total Tasks</p>
                  </article>
                  <article>
                    <span>{stats.toDo}</span>
                    <p>To Do (Current Page)</p>
                  </article>
                  <article>
                    <span>{stats.inProgress}</span>
                    <p>In Progress (Current Page)</p>
                  </article>
                  <article>
                    <span>{stats.completed}</span>
                    <p>Completed (Current Page)</p>
                  </article>
                  <article>
                    <span>{stats.blocked}</span>
                    <p>Blocked (Current Page)</p>
                  </article>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Task List</h2>
                    <button className="btn primary" onClick={openCreateTaskModal} type="button">
                      Create Task
                    </button>
                  </div>

                  <div className="filters">
                    <input
                      placeholder="Search tasks"
                      value={taskFilters.q}
                      onChange={(event) => {
                        setTaskPage(1);
                        setTaskFilters((prev) => ({ ...prev, q: event.target.value }));
                      }}
                    />
                    <select
                      value={taskFilters.statusId}
                      onChange={(event) => {
                        setTaskPage(1);
                        setTaskFilters((prev) => ({ ...prev, statusId: event.target.value }));
                      }}
                    >
                      <option value="all">All statuses</option>
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={taskFilters.priority}
                      onChange={(event) => {
                        setTaskPage(1);
                        setTaskFilters((prev) => ({ ...prev, priority: event.target.value }));
                      }}
                    >
                      <option value="all">All priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select
                      value={`${taskFilters.sortBy}:${taskFilters.order}`}
                      onChange={(event) => {
                        const [sortBy, order] = event.target.value.split(":");
                        setTaskPage(1);
                        setTaskFilters((prev) => ({ ...prev, sortBy, order }));
                      }}
                    >
                      <option value="createdAt:DESC">Newest first</option>
                      <option value="createdAt:ASC">Oldest first</option>
                      <option value="dueDate:ASC">Due date first</option>
                      <option value="priority:DESC">Priority</option>
                      <option value="title:ASC">Title A-Z</option>
                    </select>
                  </div>

                  {taskLoading ? <p className="muted">Loading tasks...</p> : null}
                  {!taskLoading && taskData.tasks.length === 0 ? (
                    <p className="muted">No tasks found.</p>
                  ) : null}
                  <div className="task-list">
                    {taskData.tasks.map((task) => (
                      <article className="task-card" key={task.id}>
                        <div className="task-title">
                          <h3>{task.title}</h3>
                          <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                        </div>
                        <p className="muted">{task.description || "No description"}</p>
                        <div className="task-meta">
                          <span>Status: {task.statusName}</span>
                          <span>Due: {formatDateLabel(task.dueDate)}</span>
                          <span>Assigned: {task.assignedToUserName}</span>
                        </div>
                        <div className="task-actions">
                          <button
                            className="btn ghost"
                            onClick={() => openEditTaskModal(task)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="btn danger"
                            onClick={() => setDeleteTaskState({ open: true, task })}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="pagination">
                    <button
                      className="btn ghost"
                      onClick={() => setTaskPage((prev) => Math.max(1, prev - 1))}
                      disabled={taskPage <= 1}
                      type="button"
                    >
                      Previous
                    </button>
                    <p>
                      Page {taskPage} / {taskTotalPages}
                    </p>
                    <button
                      className="btn ghost"
                      onClick={() => setTaskPage((prev) => Math.min(taskTotalPages, prev + 1))}
                      disabled={taskPage >= taskTotalPages}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {isAdmin && (adminMenu === "dashboard" || adminMenu === "users") ? (
              <section className="panel">
                <div className="panel-head">
                  <h2>User List</h2>
                  <input
                    placeholder="Search users"
                    value={userFilters.q}
                    onChange={(event) => {
                      setUserPage(1);
                      setUserFilters({ q: event.target.value });
                    }}
                  />
                </div>
                {userLoading ? <p className="muted">Loading users...</p> : null}
                <div className="user-list">
                  {userData.users.map((item) => (
                    <article className="user-row" key={item.id}>
                      <div>
                        <h3>{item.fullName}</h3>
                        <p className="muted">{item.email}</p>
                        <p className="muted">Tasks: {item.taskCount || 0}</p>
                      </div>
                      <div className="user-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => handleSelectUserTasks(item)}
                        >
                          View Tasks
                        </button>
                        {adminMenu === "users" ? (
                          <>
                            <select
                              value={item.role}
                              onChange={(event) =>
                                handleUserUpdate(item.id, { role: event.target.value })
                              }
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={() =>
                                handleUserUpdate(item.id, { isActive: !item.isActive })
                              }
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="pagination">
                  <button
                    className="btn ghost"
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                    disabled={userPage <= 1}
                    type="button"
                  >
                    Previous
                  </button>
                  <p>
                    Page {userPage} / {userTotalPages}
                  </p>
                  <button
                    className="btn ghost"
                    onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
                    disabled={userPage >= userTotalPages}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : null}

            {isAdmin && selectedUserForTasks && adminMenu !== "statuses" ? (
              <section className="panel">
                <div className="panel-head">
                  <h2>{selectedUserForTasks.fullName} - Task List</h2>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setSelectedUserForTasks(null)}
                  >
                    Close
                  </button>
                </div>
                {selectedUserTaskLoading ? <p className="muted">Loading user tasks...</p> : null}
                {!selectedUserTaskLoading && selectedUserTaskData.tasks.length === 0 ? (
                  <p className="muted">No tasks found for this user.</p>
                ) : null}
                <div className="task-list">
                  {selectedUserTaskData.tasks.map((task) => (
                    <article className="task-card" key={`user-task-${task.id}`}>
                      <div className="task-title">
                        <h3>{task.title}</h3>
                        <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                      </div>
                      <div className="task-meta">
                        <span>Status: {task.statusName}</span>
                        <span>Due: {formatDateLabel(task.dueDate)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="pagination">
                  <button
                    className="btn ghost"
                    onClick={() => setSelectedUserTaskPage((prev) => Math.max(1, prev - 1))}
                    disabled={selectedUserTaskPage <= 1}
                    type="button"
                  >
                    Previous
                  </button>
                  <p>
                    Page {selectedUserTaskPage} / {selectedUserTaskTotalPages}
                  </p>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      setSelectedUserTaskPage((prev) =>
                        Math.min(selectedUserTaskTotalPages, prev + 1)
                      )
                    }
                    disabled={selectedUserTaskPage >= selectedUserTaskTotalPages}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : null}

            {isAdmin && adminMenu === "statuses" ? (
              <section className="panel">
                <h2>Manage Task Status</h2>
                <form className="status-create" onSubmit={handleCreateStatus}>
                  <input
                    placeholder="New status name"
                    value={newStatusName}
                    onChange={(event) => setNewStatusName(event.target.value)}
                    maxLength={40}
                    required
                  />
                  <button className="btn primary" type="submit">
                    Add Status
                  </button>
                </form>
                <div className="status-list">
                  {statuses.map((status) => (
                    <article className="status-row" key={status.id}>
                      <input
                        value={statusDrafts[status.id] || ""}
                        onChange={(event) =>
                          setStatusDrafts((prev) => ({
                            ...prev,
                            [status.id]: event.target.value
                          }))
                        }
                        maxLength={40}
                      />
                      <button
                        className="btn ghost"
                        onClick={() => handleUpdateStatus(status.id)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => handleDeleteStatus(status.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </div>

      {taskModal.open ? (
        <Modal
          title={taskModal.mode === "create" ? "Create Task" : "Edit Task"}
          onClose={() => setTaskModal((prev) => ({ ...prev, open: false }))}
        >
          <form className="stack" onSubmit={handleTaskSave}>
            <label>
              <span>Title</span>
              <input
                value={taskModal.form.title}
                onChange={(event) =>
                  setTaskModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, title: event.target.value }
                  }))
                }
                required
                maxLength={120}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                value={taskModal.form.description}
                onChange={(event) =>
                  setTaskModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, description: event.target.value }
                  }))
                }
                rows={4}
                maxLength={2000}
              />
            </label>
            <div className="split">
              <label>
                <span>Status</span>
                <select
                  value={taskModal.form.statusId}
                  onChange={(event) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, statusId: event.target.value }
                    }))
                  }
                  required
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select
                  value={taskModal.form.priority}
                  onChange={(event) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, priority: event.target.value }
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label>
              <span>Due Date</span>
              <input
                type="date"
                value={taskModal.form.dueDate}
                onChange={(event) =>
                  setTaskModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, dueDate: event.target.value }
                  }))
                }
              />
            </label>
            {isAdmin ? (
              <label>
                <span>Assign To</span>
                <select
                  value={taskModal.form.assignedToUserId}
                  onChange={(event) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, assignedToUserId: event.target.value }
                    }))
                  }
                >
                  {assignableUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="task-actions">
              <button className="btn primary" disabled={taskSaving}>
                {taskSaving ? "Saving..." : "Save"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setTaskModal((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTaskState.open && deleteTaskState.task ? (
        <Modal
          title="Delete Task"
          onClose={() => setDeleteTaskState({ open: false, task: null })}
        >
          <p>Are you sure you want to delete "{deleteTaskState.task.title}"?</p>
          <div className="task-actions" style={{ marginTop: "1rem" }}>
            <button className="btn danger" onClick={handleDeleteTask} type="button">
              Delete
            </button>
            <button
              className="btn ghost"
              onClick={() => setDeleteTaskState({ open: false, task: null })}
              type="button"
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
