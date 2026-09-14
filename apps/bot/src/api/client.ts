import axios from "axios";
import { config } from "@/config";

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    ...(config.api.apiKey
      ? { Authorization: `Bearer ${config.api.apiKey}` }
      : {}),
  },
});

export async function apiGet<T>(path: string, params?: any): Promise<T> {
  const { data } = await apiClient.get<T>(path, { params });
  return data;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const { data } = await apiClient.post<T>(path, body);
  return data;
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const { data } = await apiClient.patch<T>(path, body);
  return data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const { data } = await apiClient.delete<T>(path);
  return data;
}

export { apiClient };
