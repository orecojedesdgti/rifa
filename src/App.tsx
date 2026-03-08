import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Ticket as TicketIcon, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Image as ImageIcon,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  Info
} from "lucide-react";
import { User, RaffleInfo, Ticket } from "./types";

const API_BASE = "/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"login" | "register" | "recover" | "dashboard" | "admin" | "change-password">("login");
  const [activeTab, setActiveTab] = useState<"rifa" | "comprar" | "consultar">("rifa");
  const [raffleInfo, setRaffleInfo] = useState<RaffleInfo | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchRaffleInfo();
  }, []);

  const fetchRaffleInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/raffle-info`);
      const data = await res.json();
      setRaffleInfo(data);
    } catch (err) {
      console.error("Error fetching raffle info", err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView("login");
    setActiveTab("rifa");
  };

  if (!user) {
    if (view === "register") return <RegisterView onBack={() => setView("login")} />;
    if (view === "recover") return <RecoverView onBack={() => setView("login")} />;
    return <LoginView onLogin={(u) => {
      setUser(u);
      if (u.is_admin && u.must_change_password) {
        setView("change-password");
      } else {
        setView(u.is_admin ? "admin" : "dashboard");
      }
    }} onRegister={() => setView("register")} onRecover={() => setView("recover")} />;
  }

  if (view === "change-password") {
    return <ChangePasswordView user={user} onComplete={() => setView("admin")} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Sidebar / Navigation */}
      <nav className={`fixed inset-0 z-50 md:relative md:z-0 bg-white border-r border-neutral-200 w-64 transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <TicketIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">RifaExpress</h1>
          </div>

          <div className="flex-1 space-y-1">
            {user.is_admin ? (
              <>
                <NavButton active={true} icon={<Settings />} label="Administración" onClick={() => {}} />
              </>
            ) : (
              <>
                <NavButton active={activeTab === "rifa"} icon={<Info />} label="Rifa Actual" onClick={() => { setActiveTab("rifa"); setIsMobileMenuOpen(false); }} />
                <NavButton active={activeTab === "comprar"} icon={<CreditCard />} label="Comprar Tickets" onClick={() => { setActiveTab("comprar"); setIsMobileMenuOpen(false); }} />
                <NavButton active={activeTab === "consultar"} icon={<Search />} label="Consultar Tickets" onClick={() => { setActiveTab("consultar"); setIsMobileMenuOpen(false); }} />
              </>
            )}
          </div>

          <div className="pt-6 border-t border-neutral-100">
            <div className="flex items-center gap-3 mb-4 px-3 py-2">
              <div className="bg-neutral-100 p-2 rounded-full">
                <UserIcon className="text-neutral-500 w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-neutral-900 truncate">{user.full_name}</p>
                <p className="text-xs text-neutral-500 truncate">@{user.username}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir de la app
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TicketIcon className="text-emerald-500 w-6 h-6" />
          <span className="font-bold">RifaExpress</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {user.is_admin ? (
            <AdminDashboard raffleInfo={raffleInfo} onUpdate={fetchRaffleInfo} />
          ) : (
            <>
              {activeTab === "rifa" && <RifaActualView raffleInfo={raffleInfo} />}
              {activeTab === "comprar" && <ComprarTicketsView user={user} raffleInfo={raffleInfo} onPurchase={fetchRaffleInfo} />}
              {activeTab === "consultar" && <ConsultarTicketsView user={user} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      {label}
    </button>
  );
}

// --- Views ---

function LoginView({ onLogin, onRegister, onRecover }: { onLogin: (u: User) => void, onRegister: () => void, onRecover: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) onLogin(data.user);
      else setError(data.error);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-neutral-100">
        <div className="text-center mb-8">
          <div className="bg-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <TicketIcon className="text-white w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Bienvenido a RifaExpress</h2>
          <p className="text-neutral-500 mt-2">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre de Usuario</label>
            <input 
              type="text" required value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Ej: juan_perez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Contraseña</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100 space-y-3 text-center">
          <p className="text-sm text-neutral-600">
            ¿No tienes cuenta? <button onClick={onRegister} className="text-emerald-600 font-semibold hover:underline">Regístrate aquí</button>
          </p>
          <button onClick={onRecover} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
            ¿Olvidaste tus datos de ingreso? Recuperar datos
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RegisterView({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    full_name: "", id_card: "", phone: "", whatsapp: "", username: "", password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        onBack();
      } else setError(data.error);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-neutral-100">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Crear nueva cuenta</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombres y Apellidos</label>
            <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cédula de Identidad</label>
            <input type="text" required value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Teléfono</label>
            <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">WhatsApp</label>
            <input type="text" required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre de Usuario</label>
            <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Contraseña</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {error && <p className="md:col-span-2 text-red-500 text-sm text-center">{error}</p>}
          <div className="md:col-span-2 flex gap-3 mt-4">
            <button type="button" onClick={onBack} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-3 rounded-xl transition-all">Volver</button>
            <button disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50">
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function RecoverView({ onBack }: { onBack: () => void }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp })
      });
      const data = await res.json();
      if (data.success) setMessage(data.message);
      else setError(data.error);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-neutral-100">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Recuperar datos</h2>
        <p className="text-neutral-500 mb-6">Ingresa tu número de WhatsApp registrado para recibir tus datos.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">WhatsApp</label>
            <input type="text" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej: +584120000000" />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">{message}</div>}
          <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50">
            {loading ? "Validando..." : "Validar WhatsApp"}
          </button>
          <button type="button" onClick={onBack} className="w-full text-neutral-500 text-sm hover:underline">Volver al inicio</button>
        </form>
      </motion.div>
    </div>
  );
}

function ChangePasswordView({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    try {
      const res = await fetch(`${API_BASE}/admin/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newPassword: password })
      });
      if (res.ok) onComplete();
    } catch (err) {
      setError("Error al guardar");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">Cambiar Contraseña</h2>
        <p className="text-neutral-500 mb-6">Como administrador, debes cambiar tu contraseña preestablecida.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" required placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-200" />
          <input type="password" required placeholder="Confirmar nueva contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-200" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Guardar nueva contraseña</button>
        </form>
      </div>
    </div>
  );
}

function RifaActualView({ raffleInfo }: { raffleInfo: RaffleInfo | null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  if (!raffleInfo) return <div className="animate-pulse bg-neutral-200 h-64 rounded-2xl" />;

  const soldPercent = (raffleInfo.soldCount / raffleInfo.totalTickets) * 100;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div 
          onClick={() => setIsModalOpen(true)}
          className="relative h-64 md:h-96 rounded-3xl overflow-hidden shadow-2xl cursor-pointer group"
        >
          <img src={raffleInfo.image_url} alt="Rifa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">{raffleInfo.title}</h2>
            <p className="text-neutral-200 text-lg max-w-xl">{raffleInfo.description}</p>
          </div>
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Search className="text-white w-5 h-5" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <p className="text-neutral-500 text-sm mb-1 uppercase tracking-wider font-semibold">Precio del Ticket</p>
            <p className="text-3xl font-bold text-emerald-600">Bs. {raffleInfo.ticket_price.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm md:col-span-2">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-neutral-500 text-sm mb-1 uppercase tracking-wider font-semibold">Progreso de Venta</p>
                <p className="text-2xl font-bold text-neutral-900">{raffleInfo.soldCount.toLocaleString()} / {raffleInfo.totalTickets.toLocaleString()} vendidos</p>
              </div>
              <p className="text-emerald-600 font-bold text-lg">{soldPercent.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${soldPercent}%` }} 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-white hover:text-neutral-300 transition-colors z-[110]"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={raffleInfo.image_url} 
              alt="Rifa Full" 
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ComprarTicketsView({ user, raffleInfo, onPurchase }: { user: User, raffleInfo: RaffleInfo | null, onPurchase: () => void }) {
  const [qty, setQty] = useState(1);
  const [paymentRef, setPaymentRef] = useState("");
  const [bank, setBank] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState<string[]>([]);

  if (!raffleInfo) return null;

  const total = qty * raffleInfo.ticket_price;
  const isSoldOut = raffleInfo.soldCount >= raffleInfo.totalTickets;

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSoldOut) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/buy-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, quantity: qty, paymentRef, bank, senderPhone })
      });
      const data = await res.json();
      if (data.success) {
        setPurchasedTickets(data.tickets);
        onPurchase();
      } else alert(data.error);
    } catch (err) {
      alert("Error al procesar la compra");
    } finally {
      setLoading(false);
    }
  };

  if (purchasedTickets.length > 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl text-center border border-emerald-100">
        <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <TicketIcon className="text-emerald-600 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">¡Compra Exitosa!</h2>
        <p className="text-neutral-500 mb-8">Tus números han sido generados aleatoriamente:</p>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          {purchasedTickets.map(num => (
            <div key={num} className="bg-emerald-50 text-emerald-700 font-mono font-bold py-2 rounded-lg border border-emerald-100">{num}</div>
          ))}
        </div>
        <button onClick={() => setPurchasedTickets([])} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100">Comprar más</button>
      </motion.div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Comprar Tickets</h2>
      
      {isSoldOut ? (
        <div className="p-12 text-center bg-red-50 rounded-2xl border border-red-100">
          <Smartphone className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900">Tickets Agotados</h3>
          <p className="text-red-700">Lo sentimos, todos los números para esta rifa han sido vendidos.</p>
        </div>
      ) : (
        <form onSubmit={handleBuy} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div>
              <p className="text-xs text-neutral-400 uppercase font-bold mb-1">Usuario</p>
              <p className="font-medium text-neutral-900">{user.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase font-bold mb-1">Cédula</p>
              <p className="font-medium text-neutral-900">{user.id_card}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase font-bold mb-1">WhatsApp</p>
              <p className="font-medium text-neutral-900">{user.whatsapp}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cantidad de tickets a comprar</label>
              <input type="number" min="1" max="100" required value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Total a pagar</label>
              <div className="w-full px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 text-xl">
                Bs. {total.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">N° Referencia del pago</label>
              <input type="text" required value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej: 12345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Banco de donde realizó el pago</label>
              <input type="text" required value={bank} onChange={e => setBank(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej: Banesco" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">N° de teléfono emisor del pago</label>
              <input type="text" required value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej: 04120000000" />
            </div>
          </div>

          <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="animate-spin" /> : <TicketIcon />}
            {loading ? "Generando tickets..." : "Generar Tickets"}
          </button>
        </form>
      )}
    </div>
  );
}

function ConsultarTicketsView({ user }: { user: User }) {
  const [idCard, setIdCard] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API_BASE}/my-tickets/${idCard}`);
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      alert("Error al consultar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Consultar mis Tickets</h2>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" required value={idCard} onChange={e => setIdCard(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="Ingresa tu número de cédula" 
            />
          </div>
          <button disabled={loading} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="animate-spin" /> : <Search className="w-5 h-5" />}
            Consultar
          </button>
        </form>
      </div>

      {searched && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xl font-bold text-neutral-900 mb-6">Resultados para: {idCard}</h3>
          {tickets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tickets.map((t, idx) => (
                <div key={idx} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center">
                  <p className="text-xs text-neutral-400 font-bold uppercase mb-1">Ticket</p>
                  <p className="text-2xl font-mono font-bold text-emerald-600">{t.number}</p>
                  <p className="text-[10px] text-neutral-400 mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No se encontraron tickets para esta cédula.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function AdminDashboard({ raffleInfo, onUpdate }: { raffleInfo: RaffleInfo | null, onUpdate: () => void }) {
  const [editInfo, setEditInfo] = useState({ title: "", description: "", image_url: "", ticket_price: 0 });
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [activeView, setActiveView] = useState<"edit" | "tickets">("edit");

  useEffect(() => {
    if (raffleInfo) {
      setEditInfo({
        title: raffleInfo.title,
        description: raffleInfo.description,
        image_url: raffleInfo.image_url,
        ticket_price: raffleInfo.ticket_price
      });
    }
    fetchAllTickets();
  }, [raffleInfo]);

  const fetchAllTickets = async () => {
    const res = await fetch(`${API_BASE}/admin/all-tickets`);
    const data = await res.json();
    setAllTickets(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditInfo({ ...editInfo, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/admin/update-raffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editInfo)
    });
    if (res.ok) {
      alert("Información actualizada");
      onUpdate();
    }
  };

  const handleReset = async () => {
    if (confirm("¿Estás seguro de resetear todos los tickets? Esta acción no se puede deshacer.")) {
      await fetch(`${API_BASE}/admin/reset-tickets`, { method: "POST" });
      alert("Base de datos de tickets reseteada");
      onUpdate();
      fetchAllTickets();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-neutral-200 pb-4">
        <button onClick={() => setActiveView("edit")} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeView === "edit" ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>Editar Rifa</button>
        <button onClick={() => setActiveView("tickets")} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeView === "tickets" ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>Consultar Números</button>
        <button onClick={handleReset} className="ml-auto px-4 py-2 rounded-lg font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-all flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Resetear Tickets
        </button>
      </div>

      {activeView === "edit" ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xl font-bold mb-6">Configuración de la Rifa</h3>
          <form onSubmit={handleUpdateRaffle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Título</label>
              <input type="text" value={editInfo.title} onChange={e => setEditInfo({...editInfo, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción</label>
              <textarea value={editInfo.description} onChange={e => setEditInfo({...editInfo, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 h-32" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Imagen de la Rifa</label>
              <div className="flex items-center gap-4">
                {editInfo.image_url && (
                  <img src={editInfo.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-neutral-200" referrerPolicy="no-referrer" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Precio del Ticket (Bs.)</label>
              <input type="number" step="0.01" value={editInfo.ticket_price} onChange={e => setEditInfo({...editInfo, ticket_price: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200" />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100">Guardar Cambios</button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="text-xl font-bold">Números Vendidos ({allTickets.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Cédula</th>
                  <th className="px-6 py-4">Referencia / Banco</th>
                  <th className="px-6 py-4">Tel. Emisor</th>
                  <th className="px-6 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {allTickets.map((t, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{t.number}</td>
                    <td className="px-6 py-4 text-sm">{t.full_name}</td>
                    <td className="px-6 py-4 text-sm">{t.id_card}</td>
                    <td className="px-6 py-4 text-sm">{t.payment_ref} ({t.bank})</td>
                    <td className="px-6 py-4 text-sm">{t.sender_phone}</td>
                    <td className="px-6 py-4 text-xs text-neutral-400">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
