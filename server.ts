import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("rifa.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    id_card TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS raffle_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT DEFAULT 'Gran Rifa Próxima',
    description TEXT DEFAULT '¡Participa y gana increíbles premios!',
    image_url TEXT DEFAULT 'https://picsum.photos/seed/raffle/800/400',
    ticket_price REAL DEFAULT 10.0
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    payment_ref TEXT,
    bank TEXT,
    sender_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Insert default admin if not exists
  INSERT OR IGNORE INTO users (full_name, id_card, phone, whatsapp, username, password, is_admin, must_change_password)
  VALUES ('Administrador', '00000000', '0000000000', '0000000000', 'admin', '1234567890', 1, 1);

  -- Insert default settings if not exists
  INSERT OR IGNORE INTO raffle_settings (id, title, description, image_url, ticket_price)
  VALUES (1, 'Gran Rifa de Tecnología', 'Gana un iPhone 15 Pro Max y una MacBook Air M2. ¡Solo 10,000 números disponibles!', 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?auto=format&fit=crop&w=1200&q=80', 5.0);
`);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // --- API Routes ---

  // Auth
  app.post("/api/register", (req, res) => {
    const { full_name, id_card, phone, whatsapp, username, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (full_name, id_card, phone, whatsapp, username, password) VALUES (?, ?, ?, ?, ?, ?)");
      const info = stmt.run(full_name, id_card, phone, whatsapp, username, password);
      res.json({ success: true, userId: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes("UNIQUE") ? "Usuario o Cédula ya registrados" : "Error al registrar" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ success: true, user: { id: user.id, username: user.username, full_name: user.full_name, id_card: user.id_card, whatsapp: user.whatsapp, is_admin: user.is_admin, must_change_password: user.must_change_password } });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  });

  app.post("/api/recover", (req, res) => {
    const { whatsapp } = req.body;
    const user = db.prepare("SELECT username, password FROM users WHERE whatsapp = ?").get(whatsapp) as any;
    if (user) {
      // In a real app, we'd send a WhatsApp message. Here we simulate it.
      res.json({ success: true, message: `Datos enviados a su WhatsApp: Usuario: ${user.username}, Contraseña: ${user.password}` });
    } else {
      res.status(404).json({ error: "Número de WhatsApp no encontrado" });
    }
  });

  // Raffle Info
  app.get("/api/raffle-info", (req, res) => {
    const info = db.prepare("SELECT * FROM raffle_settings WHERE id = 1").get();
    const soldCount = db.prepare("SELECT COUNT(*) as count FROM tickets").get() as any;
    res.json({ ...info, soldCount: soldCount.count, totalTickets: 10000 });
  });

  app.post("/api/admin/update-raffle", (req, res) => {
    const { title, description, image_url, ticket_price } = req.body;
    db.prepare("UPDATE raffle_settings SET title = ?, description = ?, image_url = ?, ticket_price = ? WHERE id = 1")
      .run(title, description, image_url, ticket_price);
    res.json({ success: true });
  });

  // Tickets
  app.post("/api/buy-tickets", (req, res) => {
    const { userId, quantity, paymentRef, bank, senderPhone } = req.body;
    
    // Check availability
    const soldCount = db.prepare("SELECT COUNT(*) as count FROM tickets").get() as any;
    if (soldCount.count + quantity > 10000) {
      return res.status(400).json({ error: "No hay suficientes tickets disponibles" });
    }

    const generatedTickets: string[] = [];
    const transaction = db.transaction(() => {
      for (let i = 0; i < quantity; i++) {
        let ticketNum = "";
        let exists = true;
        while (exists) {
          ticketNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
          const check = db.prepare("SELECT id FROM tickets WHERE number = ?").get(ticketNum);
          if (!check) exists = false;
        }
        db.prepare("INSERT INTO tickets (number, user_id, payment_ref, bank, sender_phone) VALUES (?, ?, ?, ?, ?)")
          .run(ticketNum, userId, paymentRef, bank, senderPhone);
        generatedTickets.push(ticketNum);
      }
    });

    try {
      transaction();
      res.json({ success: true, tickets: generatedTickets });
    } catch (error) {
      res.status(500).json({ error: "Error al generar tickets" });
    }
  });

  app.get("/api/my-tickets/:idCard", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.number, t.created_at 
      FROM tickets t 
      JOIN users u ON t.user_id = u.id 
      WHERE u.id_card = ?
    `).all(req.params.idCard);
    res.json(tickets);
  });

  // Admin Actions
  app.post("/api/admin/change-password", (req, res) => {
    const { userId, newPassword } = req.body;
    db.prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?").run(newPassword, userId);
    res.json({ success: true });
  });

  app.post("/api/admin/reset-tickets", (req, res) => {
    db.prepare("DELETE FROM tickets").run();
    res.json({ success: true });
  });

  app.get("/api/admin/all-tickets", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.number, u.full_name, u.id_card, t.payment_ref, t.bank, t.sender_phone, t.created_at 
      FROM tickets t 
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tickets);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
