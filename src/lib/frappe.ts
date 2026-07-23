import axios from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Expect": "",
  },
});

export const initAuth = () => {
  const csrf = localStorage.getItem("csrf_token");
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
  }
};

export const login = async (usr: string, pwd: string) => {
  const res = await api.post("/frappe/api/method/login", { usr, pwd });
  const csrf = res.headers["x-frappe-csrf-token"];
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
    localStorage.setItem("csrf_token", csrf);
  }
  return res.data;
};

export const logout = async () => {
  await api.get("/frappe/api/method/logout");
  localStorage.removeItem("csrf_token");
  localStorage.removeItem("dental_user");
};

export const getList = async (doctype: string, fields: string[], filters?: any) => {
  initAuth();
  const res = await api.get(`/frappe/api/resource/${doctype}`, {
    params: {
      fields: JSON.stringify(fields),
      filters: filters ? JSON.stringify(filters) : undefined,
      limit_page_length: 100,
    },
  });
  return res.data.data;
};

export const getDoc = async (doctype: string, name: string) => {
  initAuth();
  const res = await api.get(`/frappe/api/resource/${doctype}/${name}`);
  return res.data.data;
};

export const createDoc = async (doctype: string, data: any) => {
  initAuth();
  const res = await api.post(`/frappe/api/resource/${doctype}`, data);
  return res.data.data;
};

export const updateDoc = async (doctype: string, name: string, data: any) => {
  initAuth();
  const res = await api.put(`/frappe/api/resource/${doctype}/${name}`, data);
  return res.data.data;
};

export const deleteDoc = async (doctype: string, name: string) => {
  initAuth();
  await api.delete(`/frappe/api/resource/${doctype}/${name}`);
};

export default api;