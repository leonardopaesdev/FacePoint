const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export type Employee = {
  id: number;
  name: string;
  registration: string;
  role: string;
  department: string;
  created_at: string;
};

export type TimeEntry = {
  id: number;
  entry_type: "entrada" | "saida" | "intervalo";
  recorded_at: string;
  confidence: number | null;
  employee_id: number;
  employee_name: string;
  registration: string;
};

export type DashboardData = {
  employees: number;
  entries_today: number;
  recent: TimeEntry[];
};

export type PunchResult = {
  id: number;
  employee: Employee;
  entry_type: TimeEntry["entry_type"];
  recorded_at: string;
  confidence: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    let message = "Não foi possível concluir a operação.";
    try {
      const payload = (await response.json()) as { detail?: string | Array<{ msg: string }> };
      message = typeof payload.detail === "string" ? payload.detail : payload.detail?.[0]?.msg ?? message;
    } catch {
      // Keep the generic message when the server returns no JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardData>("/dashboard"),
  employees: () => request<Employee[]>("/employees"),
  createEmployee: (data: FormData) => request<Employee>("/employees", { method: "POST", body: data }),
  entries: () => request<TimeEntry[]>("/time-entries"),
  createEntry: (data: FormData) => request<PunchResult>("/time-entries", { method: "POST", body: data }),
};
