import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

const storedToken = localStorage.getItem("staff_token");
if (storedToken) setAuthToken(storedToken);
