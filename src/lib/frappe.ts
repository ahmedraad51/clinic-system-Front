import axios from "axios";
import {
  mockGetList,
  mockGetDoc,
  mockCreateDoc,
  mockUpdateDoc,
  mockDeleteDoc,
} from "./mockData";

/**
 * TEMPORARY: serve every read and write from src/lib/mockData.ts instead of Frappe,
 * so the UI can be built while login is switched off and there is no session cookie.
 * Set this to false to talk to the real backend again.
 */
export const MOCK_DATA: boolean = true;

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
  if (MOCK_DATA) return mockGetList(doctype, fields, filters);
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
  if (MOCK_DATA) return mockGetDoc(doctype, name);
  initAuth();
  const res = await api.get(`/frappe/api/resource/${doctype}/${name}`);
  return res.data.data;
};

export const createDoc = async (doctype: string, data: any) => {
  if (MOCK_DATA) return mockCreateDoc(doctype, data);
  initAuth();
  const res = await api.post(`/frappe/api/resource/${doctype}`, data);
  return res.data.data;
};

export const updateDoc = async (doctype: string, name: string, data: any) => {
  if (MOCK_DATA) return mockUpdateDoc(doctype, name, data);
  initAuth();
  const res = await api.put(`/frappe/api/resource/${doctype}/${name}`, data);
  return res.data.data;
};

export const deleteDoc = async (doctype: string, name: string) => {
  if (MOCK_DATA) return mockDeleteDoc(doctype, name);
  initAuth();
  await api.delete(`/frappe/api/resource/${doctype}/${name}`);
};

export default api;
