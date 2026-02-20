const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = options.token || null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export async function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchCurrentUser(token) {
  return request("/auth/me", { token });
}

export async function logoutUser(token) {
  return request("/auth/logout", {
    method: "POST",
    token
  });
}

export async function getStatuses(token) {
  const data = await request("/statuses", { token });
  return data.statuses || [];
}

export async function createStatus(token, payload) {
  const data = await request("/statuses", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
  return data.status;
}

export async function updateStatus(token, statusId, payload) {
  const data = await request(`/statuses/${statusId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
  return data.status;
}

export async function deleteStatus(token, statusId) {
  await request(`/statuses/${statusId}`, {
    method: "DELETE",
    token
  });
}

export async function getTasks(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/tasks${suffix}`, { token });
}

export async function createTask(token, payload) {
  const data = await request("/tasks", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
  return data.task;
}

export async function updateTask(token, taskId, payload) {
  const data = await request(`/tasks/${taskId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
  return data.task;
}

export async function deleteTask(token, taskId) {
  await request(`/tasks/${taskId}`, {
    method: "DELETE",
    token
  });
}

export async function getUsers(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/users${suffix}`, { token });
}

export async function updateUser(token, userId, payload) {
  const data = await request(`/users/${userId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
  return data.user;
}
