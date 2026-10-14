import {
  Bell,
  Camera,
  Check,
  Clock3,
  History,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, DashboardData, Employee, PunchResult, TimeEntry } from "./api";
import { CameraCapture } from "./CameraCapture";

type Page = "dashboard" | "employees" | "punch" | "history" | "settings";

const navItems: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "employees", label: "Funcionários", icon: Users },
  { id: "punch", label: "Registro de ponto", icon: Camera },
  { id: "history", label: "Histórico", icon: History },
  { id: "settings", label: "Configurações", icon: Settings },
];

const titleByPage: Record<Page, [string, string, string]> = {
  dashboard: ["PLATAFORMA / DASHBOARD", "Visão geral", "Acompanhe os registros e a jornada em tempo real."],
  employees: ["PLATAFORMA / EQUIPE", "Funcionários", "Cadastre dados e biometria de forma simples e segura."],
  punch: ["PLATAFORMA / BIOMETRIA", "Reconhecimento facial", "Aproxime-se da câmera para identificar sua matrícula."],
  history: ["PLATAFORMA / REGISTROS", "Histórico", "Consulte os registros de ponto da equipe."],
  settings: ["PLATAFORMA / AJUSTES", "Configurações", "Preferências do ambiente demonstrativo."],
};

const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
const initials = (name: string) => name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function Sidebar({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand__mark">◉</span><strong>facepoint</strong></div>
      <p className="sidebar__eyebrow">WORKSPACE</p>
      <nav>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => onChange(id)}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="account"><span>LP</span><div><strong>Administrador</strong><small>Painel de gestão</small></div></div>
    </aside>
  );
}

function MobileNav({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  return <nav className="mobile-nav">{navItems.slice(0, 4).map(({ id, label, icon: Icon }) => (
    <button key={id} className={page === id ? "active" : ""} onClick={() => onChange(id)}><Icon size={20} /><span>{label.replace("Registro de ", "")}</span></button>
  ))}</nav>;
}

function PageHeader({ page }: { page: Page }) {
  const [eyebrow, title, description] = titleByPage[page];
  return <header className="page-header"><div><p>{eyebrow}</p><h1>{title}</h1></div><div className="online"><span /> Sistema online</div><small>{description}</small></header>;
}

function Dashboard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const recent = data?.recent ?? [];
  return <div className="dashboard-grid">
    <section className="metric"><span>FUNCIONÁRIOS ATIVOS</span><Users /><strong>{loading ? "—" : data?.employees ?? 0}</strong><small>Cadastros no sistema</small></section>
    <section className="metric"><span>REGISTROS HOJE</span><Clock3 /><strong>{loading ? "—" : data?.entries_today ?? 0}</strong><small>Atualização em tempo real</small></section>
    <section className="metric"><span>MOTOR FACIAL</span><ShieldCheck /><strong className="metric__text">DeepFace</strong><small>Modelo Facenet512</small></section>
    <section className="panel chart-panel"><h2>Movimentação diária</h2><p>Registros por horário</p><div className="bars">{[32, 56, 78, 68, 45, 84, 62, 48, 92, 70].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>07h</span><span>09h</span><span>11h</span><span>13h</span><span>15h</span><span>17h</span></div></section>
    <section className="panel activity-panel"><h2>Atividade recente</h2>{recent.length ? recent.map((entry) => <div className="activity" key={entry.id}><span>{initials(entry.employee_name)}</span><div><strong>{entry.employee_name}</strong><small>{entry.entry_type} · {formatDate(entry.recorded_at)}</small></div></div>) : <div className="empty">Nenhum registro realizado.</div>}</section>
  </div>;
}

function EmployeesPage({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photo) return setMessage({ type: "error", text: "Capture ou selecione uma fotografia facial." });
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("photo", photo, "face.jpg");
    setSaving(true); setMessage(null);
    try {
      await api.createEmployee(data);
      form.reset(); setPhoto(null); onCreated();
      setMessage({ type: "success", text: "Funcionário cadastrado com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha no cadastro." });
    } finally { setSaving(false); }
  };

  return <div className="two-columns">
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title"><div><h2>Novo funcionário</h2><p>Informações pessoais e biometria</p></div><span>ETAPA ÚNICA</span></div>
      <div className="form-grid">
        <label>Nome completo<input name="name" minLength={3} required placeholder="Ana Oliveira" /></label>
        <label>Matrícula<input name="registration" minLength={2} required placeholder="2026001" /></label>
        <label>Cargo<input name="role" minLength={2} required placeholder="Analista de sistemas" /></label>
        <label>Setor<input name="department" minLength={2} required placeholder="Tecnologia e Inovação" /></label>
      </div>
      <label className="form-label">Fotografia para reconhecimento</label>
      <CameraCapture compact onCapture={setPhoto} />
      <div className="privacy-note"><ShieldCheck size={17} /> Dados biométricos exigem tratamento seguro e acesso restrito.</div>
      {message && <div className={`notice notice--${message.type}`}>{message.text}</div>}
      <button className="button button--primary submit" disabled={saving}>{saving ? "Validando rosto..." : <><UserPlus size={17} /> Salvar cadastro</>}</button>
    </form>
    <section className="panel team-panel"><h2>Equipe cadastrada</h2><p>{employees.length} funcionário(s)</p>{employees.length ? employees.map((employee) => <div className="employee-row" key={employee.id}><span>{initials(employee.name)}</span><div><strong>{employee.name}</strong><small>{employee.role} · {employee.registration}</small></div></div>) : <div className="empty">A equipe ainda está vazia.</div>}</section>
  </div>;
}

function PunchPage({ onRegistered }: { onRegistered: () => void }) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [entryType, setEntryType] = useState<TimeEntry["entry_type"]>("entrada");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<PunchResult | null>(null);
  const [error, setError] = useState("");

  const register = async () => {
    if (!photo) return setError("Capture uma imagem antes de continuar.");
    const data = new FormData(); data.set("entry_type", entryType); data.set("photo", photo, "ponto.jpg");
    setWorking(true); setError(""); setResult(null);
    try { const response = await api.createEntry(data); setResult(response); onRegistered(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reconhecer o rosto."); }
    finally { setWorking(false); }
  };

  if (result) return <section className="panel success-card"><span className="success-icon"><Check size={52} /></span><h2>Ponto registrado!</h2><b>{result.entry_type}</b><dl><div><dt>FUNCIONÁRIO</dt><dd>{result.employee.name}</dd></div><div><dt>MATRÍCULA</dt><dd>{result.employee.registration}</dd></div><div><dt>DATA E HORÁRIO</dt><dd>{formatDate(result.recorded_at)}</dd></div></dl><button className="button button--primary" onClick={() => { setResult(null); setPhoto(null); }}>Novo registro</button></section>;

  return <div className="punch-grid"><section className="panel punch-camera"><CameraCapture onCapture={setPhoto} /></section><section className="panel instructions"><span className="ready"><i /> SISTEMA PRONTO</span><h2>Registre seu ponto</h2><ol><li><span>01</span><div><strong>Olhe diretamente</strong><small>para a câmera</small></div></li><li><span>02</span><div><strong>Centralize o rosto</strong><small>na área indicada</small></div></li><li><span>03</span><div><strong>Escolha o registro</strong><small>antes de confirmar</small></div></li></ol><div className="entry-types">{(["entrada", "intervalo", "saida"] as const).map((type) => <button key={type} className={entryType === type ? "active" : ""} onClick={() => setEntryType(type)}>{type}</button>)}</div>{error && <div className="notice notice--error">{error}</div>}<button className="button button--primary full" disabled={working} onClick={register}>{working ? "Reconhecendo..." : "Identificar e registrar"}</button></section></div>;
}

function HistoryPage({ entries }: { entries: TimeEntry[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => entries.filter((entry) => `${entry.employee_name} ${entry.registration}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  return <section className="panel history-panel"><div className="history-toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar funcionário ou matrícula" /></div><span>{filtered.length} registro(s)</span></div><div className="table-wrap"><table><thead><tr><th>Funcionário</th><th>Matrícula</th><th>Tipo</th><th>Data e horário</th><th>Confiança</th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.id}><td><span className="mini-avatar">{initials(entry.employee_name)}</span>{entry.employee_name}</td><td>{entry.registration}</td><td><b className={`type type--${entry.entry_type}`}>{entry.entry_type}</b></td><td>{formatDate(entry.recorded_at)}</td><td>{entry.confidence ? `${entry.confidence.toFixed(1)}%` : "—"}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty">Nenhum registro encontrado.</div>}</div></section>;
}

function SettingsPage() {
  return <div className="settings-grid"><section className="panel settings-card"><h2>Preferências gerais</h2><p>Comportamento da aplicação neste dispositivo.</p><Setting icon={Bell} title="Notificações" detail="Alertas de novos registros" enabled /><Setting icon={Volume2} title="Confirmação sonora" detail="Som ao concluir o ponto" /></section><section className="panel settings-card"><h2>Segurança e privacidade</h2><p>Controles previstos para a próxima etapa.</p><Setting icon={ShieldCheck} title="Dados biométricos" detail="Armazenamento local restrito" enabled /><Setting icon={Users} title="Permissões" detail="Perfis e níveis de acesso" /></section></div>;
}

function Setting({ icon: Icon, title, detail, enabled = false }: { icon: typeof Bell; title: string; detail: string; enabled?: boolean }) {
  return <div className="setting"><span><Icon size={19} /></span><div><strong>{title}</strong><small>{detail}</small></div><button aria-label={`Alternar ${title}`} className={`toggle ${enabled ? "on" : ""}`}><i /></button></div>;
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setApiError("");
    try {
      const [dashboardData, employeeData, entryData] = await Promise.all([api.dashboard(), api.employees(), api.entries()]);
      setDashboard(dashboardData); setEmployees(employeeData); setEntries(entryData);
    } catch { setApiError("API desconectada. Inicie o backend na porta 8000."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <div className="app-shell"><Sidebar page={page} onChange={setPage} /><main><div className="mobile-brand"><div className="brand"><span className="brand__mark">◉</span><strong>facepoint</strong></div><button onClick={() => setPage("settings")}><Settings size={20} /></button></div><PageHeader page={page} />{apiError && <div className="notice notice--error api-error">{apiError}</div>}{page === "dashboard" && <Dashboard data={dashboard} loading={loading} />}{page === "employees" && <EmployeesPage employees={employees} onCreated={refresh} />}{page === "punch" && <PunchPage onRegistered={refresh} />}{page === "history" && <HistoryPage entries={entries} />}{page === "settings" && <SettingsPage />}<footer>FACEPOINT / AMBIENTE DEMONSTRATIVO <span>v0.1 · 2026</span></footer></main><MobileNav page={page} onChange={setPage} /></div>;
}
