import type { Express } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import {
  loginSchema,
  verificationSchema,
  insertProductSchema,
  insertEmployeeSchema,
} from "@shared/schema";
import { storage } from "./storage";

// ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage config: keep original ext, unique prefix
const storageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const stamp = Date.now();
    cb(null, `${base}_${stamp}${ext}`);
  },
});

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,                  // up to 10 files per request
  },
});

// convert absolute file path under uploads/ to a public URL
function toPublicUrl(absPath: string) {
  const rel = path.relative(UPLOAD_DIR, absPath).replaceAll("\\", "/");
  return `/uploads/${rel}`;
}

export async function registerRoutes(app: Express): Promise<void> {
  // serve the uploads folder as static (public)
  app.use("/uploads", (await import("express")).default.static(UPLOAD_DIR));

  // ========= Upload API =========
  // Single or multiple files. Use field name "files" in multipart form.
  app.post("/api/upload", upload.array("files", 10), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => toPublicUrl(f.path));
    res.json({ urls });
  });

  // ========= Authentication =========
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { employeeId } = loginSchema.parse(req.body);
      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      if (employee.isLocked) {
        return res.status(423).json({ message: "Account is locked due to too many failed attempts" });
      }
      res.json({
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
        },
      });
    } catch {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { employeeId, yearOfBirth } = verificationSchema.parse(req.body);
      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      if (employee.isLocked) return res.status(423).json({ message: "Account is locked" });

      if (employee.yearOfBirth !== yearOfBirth) {
        const updatedAttempts = (employee.loginAttempts || 0) + 1;
        const isLocked = updatedAttempts >= 2;
        await storage.updateEmployee(employee.id, { loginAttempts: updatedAttempts, isLocked });
        return res.status(401).json({
          message: "Invalid year of birth",
          remainingAttempts: Math.max(0, 2 - updatedAttempts),
          isLocked,
        });
      }

      await storage.updateEmployee(employee.id, { loginAttempts: 0, isLocked: false });
      const session = await storage.createSession(employee.id);
      res.json({
        token: session.token,
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
        },
        expiresAt: session.expiresAt,
      });
    } catch {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) await storage.deleteSession(token);
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/session", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token provided" });
    const session = await storage.getSession(token);
    if (!session) return res.status(401).json({ message: "Invalid or expired session" });
    const employee = await storage.getEmployee(session.employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      expiresAt: session.expiresAt,
    });
  });

  // ========= Products =========
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      const productsWithBackups: any[] = [];
      for (const product of products) {
        productsWithBackups.push(product);
        if (product.stock === 0 && product.backupProductId) {
          const backupProduct = await storage.getProduct(product.backupProductId);
          if (backupProduct && (backupProduct.stock || 0) > 0) {
            productsWithBackups.push({
              ...backupProduct,
              isBackup: true,
              originalProductId: product.id,
            });
          }
        }
      }
      res.json(productsWithBackups);
    } catch {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // ========= Orders =========
  app.post("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });

      const existingOrder = await storage.getOrderByEmployeeId(session.employeeId);
      if (existingOrder) return res.status(400).json({ message: "Employee can only select one product" });

      const { productId, selectedColor } = req.body;
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      if ((product.stock || 0) <= 0) return res.status(400).json({ message: "Product out of stock" });

      await storage.updateProduct(productId, { stock: (product.stock || 0) - 1 });
      const order = await storage.createOrder({ employeeId: session.employeeId, productId, selectedColor });
      const employee = await storage.getEmployee(session.employeeId);
      res.json({ order, product, employee });
    } catch {
      res.status(500).json({ message: "Error creating order" });
    }
  });

  app.get("/api/orders/my-order", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });
      const order = await storage.getOrderByEmployeeId(session.employeeId);
      if (!order) return res.status(404).json({ message: "No order found" });
      const product = await storage.getProduct(order.productId);
      const employee = await storage.getEmployee(order.employeeId);
      res.json({ order, product, employee });
    } catch {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  // ========= Admin: stats & lists =========
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      const products = await storage.getAllProducts();
      const orders = await storage.getAllOrders();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ordersToday = orders.filter((o) => o.orderDate && o.orderDate >= today);
      const lockedAccounts = employees.filter((e) => e.isLocked);
      res.json({
        totalEmployees: employees.length,
        totalProducts: products.length,
        ordersToday: ordersToday.length,
        lockedAccounts: lockedAccounts.length,
      });
    } catch {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  app.get("/api/admin/employees", async (_req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch {
      res.status(500).json({ message: "Error fetching employees" });
    }
  });

  app.post("/api/admin/employees", async (req, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(employeeData);
      res.json(employee);
    } catch {
      res.status(400).json({ message: "Invalid employee data" });
    }
  });

  app.post("/api/admin/employees/bulk", async (req, res) => {
    try {
      const rows = Array.isArray(req.body) ? req.body : [];
      let inserted = 0;
      let skipped = 0;
      for (const r of rows) {
        try {
          const exists = await storage.getEmployeeByEmployeeId(r.employeeId);
          if (exists) {
            skipped++;
            continue;
          }
          await storage.createEmployee({
            employeeId: String(r.employeeId),
            firstName: String(r.firstName),
            lastName: String(r.lastName),
            yearOfBirth: Number(r.yearOfBirth),
          });
          inserted++;
        } catch {
          skipped++;
        }
      }
      res.json({ inserted, skipped });
    } catch {
      res.status(400).json({ message: "Invalid bulk payload" });
    }
  });

  app.put("/api/admin/employees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateEmployee(id, req.body);
      if (!updated) return res.status(404).json({ message: "Employee not found" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Error updating employee" });
    }
  });

  app.post("/api/admin/employees/:id/unlock", async (req, res) => {
    try {
      const { id } = req.params;
      const emp = await storage.getEmployee(id);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      const updated = await storage.updateEmployee(id, { loginAttempts: 0, isLocked: false });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Error unlocking employee" });
    }
  });

  app.get("/api/admin/orders", async (_req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const withDetails = await Promise.all(
        orders.map(async (o) => ({
          ...o,
          employee: await storage.getEmployee(o.employeeId),
          product: await storage.getProduct(o.productId),
        }))
      );
      res.json(withDetails);
    } catch {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.post("/api/admin/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch {
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      const ok = await storage.deleteProduct(req.params.id);
      if (!ok) return res.status(404).json({ message: "Product not found" });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  app.get("/api/admin/branding", async (_req, res) => {
    try {
      const branding = await storage.getBranding();
      res.json(branding);
    } catch {
      res.status(500).json({ message: "Error fetching branding" });
    }
  });

  app.put("/api/admin/branding", async (req, res) => {
    try {
      const branding = await storage.updateBranding(req.body);
      res.json(branding);
    } catch {
      res.status(500).json({ message: "Error updating branding" });
    }
  });

  // Debug
  app.post("/api/debug/reset-employee/:employeeId", async (req, res) => {
    try {
      const success = await storage.resetEmployeeLoginAttempts(req.params.employeeId);
      if (success) return res.json({ message: "Employee login attempts reset successfully" });
      res.status(404).json({ message: "Employee not found" });
    } catch {
      res.status(500).json({ message: "Error resetting employee" });
    }
  });
}
