import type { Express } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import {
  insertProductSchema,
  insertEmployeeSchema,
  insertCartItemSchema,
  insertCategorySchema,
  insertDomainWhitelistSchema,
  type Product,
  type Category,
  insertCampaignSchema,
  insertCampaignProductSchema,
  type Campaign,
  insertBlogSchema,
  type Blog,
} from "@shared/schema";
import { storage } from "./storage";
import { sendOTP, verifyOTP, lookupByEmail } from "./auth-otp";
import crypto from "crypto";
import "dotenv/config";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

function toPublicUrl(absPath: string) {
  const rel = path.relative(UPLOAD_DIR, absPath).replaceAll("\\", "/");
  return `/uploads/${rel}`;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

type CategoryMap = Map<string, Category>;

function buildCategoryMap(list: Category[]): CategoryMap {
  return new Map(list.map((category) => [category.id, category]));
}

function attachCategoriesToProduct<T extends Product>(
  product: T,
  categoryMap: CategoryMap
) {
  const categories =
    product.categoryIds
      ?.map((id) => categoryMap.get(id))
      .filter((cat): cat is Category => Boolean(cat)) ?? [];

  return {
    ...product,
    categories,
    category: categories[0] ?? null,
  };
}

export async function registerRoutes(app: Express): Promise<void> {
  app.use("/uploads", (await import("express")).default.static(UPLOAD_DIR));

  // File upload
  app.post("/api/upload", upload.array("files", 10), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => toPublicUrl(f.path));
    res.json({ urls });
  });

  // Auth routes
  app.post("/api/auth/send-otp", sendOTP);
  app.post("/api/auth/verify-otp", verifyOTP);
  app.get("/api/auth/lookup-by-email", lookupByEmail);

  // Domain check endpoint
  app.get("/api/auth/check-domain/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const domainRecord = await storage.getDomainWhitelistByDomain(domain.toLowerCase());
      res.json({ 
        isWhitelisted: !!domainRecord && domainRecord.isActive,
        domain: domainRecord 
      });
    } catch (error: any) {
      console.error("Domain check error:", error);
      res.status(500).json({ message: "Error checking domain", details: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) await storage.deleteSession(token);
    res.json({ message: "Logged out successfully" });
  });

  // Session check
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
        employeeId: employee.employeeId ?? null,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        points: employee.points ?? 0,
      },
      expiresAt: session.expiresAt,
    });
  });

  // Domain Whitelist Admin Routes
  app.get("/api/admin/domain-whitelist", async (_req, res) => {
    try {
      const domains = await storage.getAllDomainWhitelists();
      res.json(domains);
    } catch (error: any) {
      console.error("Domain whitelist fetch error:", error);
      res.status(500).json({ message: "Error fetching domain whitelist", details: error.message });
    }
  });

  app.get("/api/admin/domain-whitelist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const domain = await storage.getDomainWhitelist(id);
      if (!domain) return res.status(404).json({ message: "Domain not found" });
      res.json(domain);
    } catch (error: any) {
      console.error("Domain fetch error:", error);
      res.status(500).json({ message: "Error fetching domain", details: error.message });
    }
  });

  app.post("/api/admin/domain-whitelist", async (req, res) => {
    try {
      const domainData = insertDomainWhitelistSchema.parse(req.body);
      // Ensure domain doesn't start with @ and is lowercase
      domainData.domain = domainData.domain.toLowerCase().replace(/^@/, '');
      
      // Check if domain already exists
      const existing = await storage.getDomainWhitelistByDomain(domainData.domain);
      if (existing) {
        return res.status(409).json({ message: "Domain already exists" });
      }
      
      const domain = await storage.createDomainWhitelist(domainData);
      res.json(domain);
    } catch (error: any) {
      console.error("Domain creation error:", error);
      res.status(400).json({ message: "Invalid domain data", details: error.message });
    }
  });

  app.put("/api/admin/domain-whitelist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertDomainWhitelistSchema.partial().parse(req.body);
      
      if (updates.domain) {
        updates.domain = updates.domain.toLowerCase().replace(/^@/, '');
      }
      
      const domain = await storage.updateDomainWhitelist(id, updates);
      if (!domain) return res.status(404).json({ message: "Domain not found" });
      res.json(domain);
    } catch (error: any) {
      console.error("Domain update error:", error);
      res.status(500).json({ message: "Error updating domain", details: error.message });
    }
  });

  app.delete("/api/admin/domain-whitelist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await storage.deleteDomainWhitelist(id);
      if (!ok) return res.status(404).json({ message: "Domain not found" });
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Domain delete error:", error);
      res.status(500).json({ message: "Error deleting domain", details: error.message });
    }
  });

  // Categories API
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.get("/api/categories/:id/products", async (req, res) => {
    try {
      const { id } = req.params;
      const products = await storage.getProductsByCategory(id);
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      const enriched = products.map((product) => attachCategoriesToProduct(product, categoryMap));
      res.json(enriched);
    } catch {
      res.status(500).json({ message: "Error fetching category products" });
    }
  });

  app.post("/api/admin/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.put("/api/admin/categories/:id", async (req, res) => {
    try {
      const updates = req.body;
      const category = await storage.updateCategory(req.params.id, updates);
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch {
      res.status(500).json({ message: "Error updating category" });
    }
  });

  app.delete("/api/admin/categories/:id", async (req, res) => {
    try {
      const ok = await storage.deleteCategory(req.params.id);
      if (!ok) return res.status(404).json({ message: "Category not found" });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Products API
  app.get("/api/products", async (_req, res) => {
    try {
      const all = await storage.getAllProducts();
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      const enriched = all.map((product) => attachCategoriesToProduct(product, categoryMap));
      
      // Get all campaign product IDs
      const campaigns = await storage.getAllCampaigns();
      const campaignProductIds = new Set<string>();
      
      for (const campaign of campaigns) {
        if (campaign.isActive) {
          const campaignProducts = await storage.getCampaignProducts(campaign.id);
          campaignProducts.forEach(cp => {
            campaignProductIds.add(cp.product.id);
          });
        }
      }
      
      const byId = new Map(enriched.map((p) => [p.id, p]));
      const backupCandidateIds = new Set(
        enriched
          .map((p) => p.backupProductId)
          .filter((v): v is string => Boolean(v))
      );
      const originals = enriched.filter((p) => !backupCandidateIds.has(p.id));
      const visible: any[] = [];
      
      for (const orig of originals) {
        const origStock = Number(orig.stock || 0);
        
        // Skip products that are in active campaigns
        if (campaignProductIds.has(orig.id)) {
          continue;
        }
        
        if (origStock > 0) {
          visible.push(orig);
        } else if (origStock <= 0 && orig.backupProductId) {
          const backup = byId.get(orig.backupProductId);
          // Also check if backup product is in a campaign
          if (backup && Number(backup.stock || 0) > 0 && backup.isActive !== false && !campaignProductIds.has(backup.id)) {
            visible.push({
              ...backup,
              isBackup: true,
              originalProductId: orig.id,
            });
          }
        }
      }
      res.json(visible);
    } catch {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products-admin", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      const productsWithBackups: any[] = [];
      
      for (const product of products) {
        const enrichedProduct = attachCategoriesToProduct(product, categoryMap);
        productsWithBackups.push(enrichedProduct);
        
        if (product.stock === 0 && product.backupProductId) {
          const backupProduct = await storage.getProduct(product.backupProductId);
          if (backupProduct && (backupProduct.stock || 0) > 0) {
            const enrichedBackup = attachCategoriesToProduct(backupProduct, categoryMap);
            productsWithBackups.push({
              ...enrichedBackup,
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
      
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      const enrichedProduct = attachCategoriesToProduct(product, categoryMap);
      
      res.json(enrichedProduct);
    } catch {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // CSR Products
  app.get("/api/csr-products", async (_req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const csrProducts = allProducts.filter(product => 
        product.csrSupport === true && product.isActive === true
      );
      
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      
      const enrichedProducts = csrProducts.map((product) => 
        attachCategoriesToProduct(product, categoryMap)
      );
      
      res.json(enrichedProducts);
    } catch (error: any) {
      console.error("CSR products fetch error:", error);
      res.status(500).json({ message: "Error fetching CSR products", details: error.message });
    }
  });

  // Cart API
  app.get("/api/cart", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });
      const items = await storage.getCartItems(session.employeeId);
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      
      const detailedItems = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product: product ? attachCategoriesToProduct(product, categoryMap) : null
          };
        })
      );
      res.json(detailedItems);
    } catch {
      res.status(500).json({ message: "Error fetching cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });

      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });

      const employee = await storage.getEmployee(session.employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      const data = insertCartItemSchema.parse({
        ...req.body,
        employeeId: employee.id,
      });

      const product = await storage.getProduct(data.productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const selectedColor = data.selectedColor ?? null;
      const requestedQty = data.quantity ?? 1;

      if ((product.stock || 0) < requestedQty) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      const currentItems = await storage.getCartItems(employee.id);
      const existing = currentItems.find(
        (it) =>
          it.productId === data.productId &&
          (it.selectedColor ?? null) === (selectedColor ?? null)
      );

      if (existing) {
        const newQuantity = (existing.quantity || 1) + requestedQty;
        if ((product.stock || 0) < newQuantity) {
          return res.status(400).json({ message: "Insufficient stock" });
        }
        const updated = await storage.updateCartItem(existing.id, { quantity: newQuantity });
        return res.json(updated);
      }

      const item = await storage.createCartItem({
        employeeId: employee.id,
        productId: data.productId,
        selectedColor: selectedColor ?? undefined,
        quantity: requestedQty,
      });
      res.json(item);
    } catch (error: any) {
      console.error("Cart POST error:", error);
      res.status(400).json({ message: "Invalid cart item data", details: error.message });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      const item = await storage.getCartItem(id);
      if (!item) return res.status(404).json({ message: "Cart item not found" });
      const product = await storage.getProduct(item.productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      if ((product.stock || 0) < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      const updated = await storage.updateCartItem(id, { quantity });
      res.json(updated);
    } catch (error: any) {
      console.error("Cart PUT error:", error);
      res.status(500).json({ message: "Error updating cart item", details: error.message });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const ok = await storage.removeCartItem(req.params.id);
      if (!ok) return res.status(404).json({ message: "Cart item not found" });
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Cart DELETE error:", error);
      res.status(500).json({ message: "Error removing cart item", details: error.message });
    }
  });

  // Orders API with delivery support
  app.post("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });
      const employee = await storage.getEmployee(session.employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const branding = await storage.getBranding();
      const maxSelections = branding?.maxSelectionsPerUser ?? 1;

      const { deliveryMethod = "office", deliveryAddress = null } = req.body;

      const cartItems = await storage.getCartItems(session.employeeId);
      if (cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });

      const employeeOrders = await storage.getOrdersByEmployeeId(session.employeeId);
      if (maxSelections !== -1 && employeeOrders.length + cartItems.length > maxSelections) {
        return res.status(400).json({ message: "Selection limit reached" });
      }

      const inrPerPoint = parseFloat(branding?.inrPerPoint ?? "1");
      let totalPointsRequired = 0;

      for (const item of cartItems) {
        const p = await storage.getProduct(item.productId);
        if (!p || (p.stock || 0) < item.quantity) {
          return res.status(400).json({ message: `Product ${p?.name || item.productId} unavailable` });
        }
        totalPointsRequired += Math.ceil(parseFloat(p.price) / inrPerPoint) * item.quantity;
      }

      const userPoints = employee.points ?? 0;
      if (userPoints < totalPointsRequired) {
        return res.status(400).json({ message: "Insufficient points" });
      }

      const orders = [];
      for (const item of cartItems) {
        const p = await storage.getProduct(item.productId);
        await storage.updateProduct(item.productId, { stock: (p!.stock || 0) - item.quantity });
        const order = await storage.createOrder({
          employeeId: session.employeeId,
          productId: item.productId,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
          metadata: { 
            usedPoints: Math.ceil(parseFloat(p!.price) / inrPerPoint) * item.quantity,
            deliveryMethod,
            deliveryAddress,
          },
        });
        orders.push({ order, product: p });
      }

      await storage.updateEmployee(employee.id, { points: userPoints - totalPointsRequired });
      await storage.clearCart(session.employeeId);
      const updatedEmployee = await storage.getEmployee(session.employeeId);

      res.json({ orders, employee: updatedEmployee });
    } catch (error: any) {
      console.error("Orders POST error:", error);
      res.status(500).json({ message: "Error creating orders", details: error.message });
    }
  });

  // PhonePe Payment Routes with delivery support
  app.post("/api/orders/create-copay-order", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });
      const employee = await storage.getEmployee(session.employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      const { deliveryMethod = "office", deliveryAddress = null } = req.body;

      const cartItems = await storage.getCartItems(session.employeeId);
      if (cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });

      const branding = await storage.getBranding();
      const maxSelections = branding?.maxSelectionsPerUser ?? 1;
      const employeeOrders = await storage.getOrdersByEmployeeId(session.employeeId);

      if (maxSelections !== -1 && employeeOrders.length + cartItems.length > maxSelections) {
        return res.status(400).json({ message: "Selection limit reached" });
      }

      const inrPerPoint = parseFloat(branding?.inrPerPoint ?? "1");
      let totalPointsRequired = 0;

      for (const item of cartItems) {
        const product = await storage.getProduct(item.productId);
        if (!product || (product.stock || 0) < item.quantity) {
          return res.status(400).json({ message: `Product ${product?.name || item.productId} unavailable` });
        }
        totalPointsRequired += Math.ceil(parseFloat(product.price) / inrPerPoint) * item.quantity;
      }

      const userPoints = employee.points ?? 0;
      if (userPoints >= totalPointsRequired) {
        return res.status(400).json({ message: "Sufficient points, use normal checkout" });
      }

      const deficitPoints = totalPointsRequired - userPoints;
      const copayInr = Math.ceil(deficitPoints * inrPerPoint);

      const merchantId = "PGTESTPAYUAT";
      const saltKey = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
      const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
      const apiUrl = process.env.PHONEPE_API_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

      if (!merchantId || !saltKey) {
        return res.status(500).json({ message: "PhonePe not configured" });
      }

      const merchantTransactionId = `TXN_${Date.now()}`;
      
      // Store delivery info in session or pass in callback URL
      const callbackUrl = `http://localhost:5000/api/orders/phonepe-callback?merchantOrderId=${merchantTransactionId}&deliveryMethod=${deliveryMethod}`;
      if (deliveryAddress) {
        callbackUrl += `&deliveryAddress=${encodeURIComponent(deliveryAddress)}`;
      }

      const payload = {
        merchantId,
        merchantTransactionId,
        merchantUserId: employee.id,
        amount: copayInr * 100,
        redirectUrl: "http://localhost:5000/cart",
        redirectMode: "REDIRECT",
        callbackUrl,
        mobileNumber: employee.phoneNumber?.replace(/^\+91/, ""),
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const endpoint = "/pg/v1/pay";
      const stringToHash = base64Payload + endpoint + saltKey;
      const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const xVerify = sha256 + "###" + saltIndex;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        return res.status(500).json({ message: "Failed to initiate PhonePe payment", details: result });
      }

      res.json({
        paymentUrl: result.data.instrumentResponse.redirectInfo.url,
        merchantTransactionId,
      });
    } catch (error: any) {
      console.error("create-copay-order error:", error);
      res.status(500).json({ message: "Failed to create copay order", details: error.message });
    }
  });

  app.post("/api/orders/phonepe-callback", async (req, res) => {
    try {
      const { code } = req.body;
      const { merchantOrderId, deliveryMethod, deliveryAddress } = req.query;
      
      if (code !== "PAYMENT_SUCCESS") {
        return res.status(200).json({ success: false });
      }
      
      if (merchantOrderId && deliveryMethod) {
        res.redirect(`/cart?merchantOrderId=${merchantOrderId}&deliveryMethod=${deliveryMethod}${deliveryAddress ? `&deliveryAddress=${encodeURIComponent(deliveryAddress as string)}` : ''}`);
      } else {
        res.redirect("/cart?payment=success");
      }
    } catch (error: any) {
      console.error("PhonePe callback error:", error);
      res.redirect("/cart?payment=failure");
    }
  });

  app.post("/api/orders/verify-copay", async (req, res) => {
    try {
      const { merchantTransactionId, deliveryMethod = "office", deliveryAddress = null } = req.body;
      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const saltKey = process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
      const apiUrl = process.env.PHONEPE_API_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

      const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
      const stringToHash = endpoint + saltKey;
      const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const xVerify = sha256 + "###" + saltIndex;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": merchantId!,
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success || result.code !== "PAYMENT_SUCCESS") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token" });

      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });

      const employee = await storage.getEmployee(session.employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      const branding = await storage.getBranding();
      const maxSelections = branding?.maxSelectionsPerUser ?? 1;

      const employeeOrders = await storage.getOrdersByEmployeeId(session.employeeId);
      const cartItems = await storage.getCartItems(session.employeeId);
      if (cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });
      if (maxSelections !== -1 && employeeOrders.length + cartItems.length > maxSelections) {
        return res.status(400).json({ message: "Selection limit reached" });
      }

      const inrPerPoint = parseFloat(branding?.inrPerPoint ?? "1");
      let totalPointsRequired = 0;
      for (const item of cartItems) {
        const product = await storage.getProduct(item.productId);
        if (!product || (product.stock || 0) < item.quantity) {
          return res.status(400).json({ message: `Product ${product?.name || item.productId} unavailable` });
        }
        totalPointsRequired += Math.ceil(parseFloat(product.price) / inrPerPoint) * item.quantity;
      }

      const userPoints = employee.points ?? 0;
      if (userPoints >= totalPointsRequired) {
        return res.status(400).json({ message: "Sufficient points" });
      }

      const deficitPoints = totalPointsRequired - userPoints;
      const copayInr = Math.ceil(deficitPoints * inrPerPoint);
      const paidAmount = result.data.amount / 100;

      if (paidAmount !== copayInr) {
        return res.status(400).json({ message: "Amount mismatch" });
      }

      const orders = [];
      for (const item of cartItems) {
        const product = await storage.getProduct(item.productId);
        await storage.updateProduct(item.productId, { stock: (product!.stock || 0) - item.quantity });
        const order = await storage.createOrder({
          employeeId: employee.id,
          productId: item.productId,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
          metadata: {
            usedPoints: Math.ceil(parseFloat(product!.price) / inrPerPoint) * item.quantity,
            copayInr,
            paymentId: result.data.transactionId,
            phonepeOrderId: merchantTransactionId,
            deliveryMethod,
            deliveryAddress,
          },
        });
        orders.push({ order, product });
      }

      await storage.updateEmployee(employee.id, { points: 0 });
      await storage.clearCart(employee.id);
      const updatedEmployee = await storage.getEmployee(employee.id);

      res.json({ orders, employee: updatedEmployee });
    } catch (error: any) {
      console.error("verify-copay error:", error);
      res.status(400).json({ message: "Invalid payment", details: error.message });
    }
  });

  app.get("/api/orders/my-orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });
      const session = await storage.getSession(token);
      if (!session) return res.status(401).json({ message: "Invalid session" });
      const orders = await storage.getOrdersByEmployeeId(session.employeeId);
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      
      const detailedOrders = await Promise.all(
        orders.map(async (order) => {
          const product = await storage.getProduct(order.productId);
          const employee = await storage.getEmployee(order.employeeId);
          
          return {
            order,
            product: product ? attachCategoriesToProduct(product, categoryMap) : null,
            employee
          };
        })
      );
      res.json(detailedOrders);
    } catch {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const emps = await storage.getAllEmployees();
      const prods = await storage.getAllProducts();
      const ords = await storage.getAllOrders();
      const categories = await storage.getAllCategories();
      const domains = await storage.getAllDomainWhitelists();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ordersToday = ords.filter((o) => o.orderDate && o.orderDate >= today);
      const lockedAccounts = emps.filter((e) => e.isLocked);
      const activeDomains = domains.filter((d) => d.isActive);
      
      res.json({
        totalEmployees: emps.length,
        totalProducts: prods.length,
        totalCategories: categories.length,
        totalDomains: domains.length,
        activeDomains: activeDomains.length,
        ordersToday: ordersToday.length,
        lockedAccounts: lockedAccounts.length,
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Employees Admin
  app.get("/api/admin/employees", async (_req, res) => {
    try {
      const emps = await storage.getAllEmployees();
      res.json(emps);
    } catch {
      res.status(500).json({ message: "Error fetching employees" });
    }
  });

  app.post("/api/admin/employees", async (req, res) => {
    try {
      const body = insertEmployeeSchema.parse(req.body);
      const email = body.email.trim().toLowerCase();
      if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email" });
      
      // Check if domain is whitelisted
      const domainCheck = await storage.checkDomainWhitelisted(email);
      if (!domainCheck.isWhitelisted && domainCheck.domain?.canLoginWithoutEmployeeId === false) {
        return res.status(403).json({ 
          message: "Email domain not authorized or requires whitelisting" 
        });
      }
      
      const exists = await storage.getEmployeeByEmail(email);
      if (exists) return res.status(409).json({ message: "Employee already exists (email)" });
      const employee = await storage.createEmployee({ ...body, email });
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
          const rawEmail = r.email ? String(r.email).trim().toLowerCase() : "";
          if (!rawEmail || !isValidEmail(rawEmail)) {
            skipped++;
            continue;
          }

          // Check domain whitelist
          const domainCheck = await storage.checkDomainWhitelisted(rawEmail);
          if (!domainCheck.isWhitelisted && domainCheck.domain?.canLoginWithoutEmployeeId === false) {
            skipped++;
            continue;
          }

          const exists = await storage.getEmployeeByEmail(rawEmail);
          if (exists) {
            const pts = Number(r.points);
            if (Number.isFinite(pts)) {
              await storage.updateEmployee(exists.id, { points: pts });
            }
            skipped++;
            continue;
          }

          const firstName = String(r.firstName || "").trim();
          const lastName = String(r.lastName || "").trim();
          const points = Number.isFinite(Number(r.points)) ? Number(r.points) : 0;

          if (!firstName || !lastName) {
            skipped++;
            continue;
          }

          await storage.createEmployee({
            firstName,
            lastName,
            email: rawEmail,
            points,
          } as any);

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
      const updates = { ...req.body };
      if (updates.email !== undefined) {
        const email = updates.email.trim().toLowerCase();
        if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email" });
        
        // Check domain whitelist
        const domainCheck = await storage.checkDomainWhitelisted(email);
        if (!domainCheck.isWhitelisted && domainCheck.domain?.canLoginWithoutEmployeeId === false) {
          return res.status(403).json({ 
            message: "Email domain not authorized" 
          });
        }
        
        updates.email = email;
      }
      const updated = await storage.updateEmployee(id, updates);
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

  // Orders Admin
  app.get("/api/admin/orders", async (_req, res) => {
    try {
      const ords = await storage.getAllOrders();
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      
      const withDetails = await Promise.all(
        ords.map(async (o) => {
          const product = await storage.getProduct(o.productId);
          const employee = await storage.getEmployee(o.employeeId);
          
          return {
            ...o,
            product: product ? attachCategoriesToProduct(product, categoryMap) : null,
            employee
          };
        })
      );
      res.json(withDetails);
    } catch {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Products Admin
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

  // Branding
  app.get("/api/admin/branding", async (_req, res) => {
    try {
      const b = await storage.getBranding();
      res.json(b);
    } catch {
      res.status(500).json({ message: "Error fetching branding" });
    }
  });

  app.put("/api/admin/branding", async (req, res) => {
    try {
      const b = await storage.updateBranding(req.body);
      res.json(b);
    } catch {
      res.status(500).json({ message: "Error updating branding" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (_req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch {
      res.status(500).json({ message: "Error fetching campaigns" });
    }
  });
  
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch {
      res.status(500).json({ message: "Error fetching campaign" });
    }
  });
  
  app.get("/api/campaigns/:id/products", async (req, res) => {
    try {
      const { id } = req.params;
      const campaignProducts = await storage.getCampaignProducts(id);
      
      const categories = await storage.getAllCategories();
      const categoryMap = buildCategoryMap(categories);
      
      const enrichedProducts = campaignProducts.map(cp => ({
        ...cp.product,
        categories: cp.product.categoryIds
          ?.map((catId: string) => categoryMap.get(catId))
          .filter((cat): cat is Category => Boolean(cat)) ?? [],
      }));
      
      res.json(enrichedProducts);
    } catch {
      res.status(500).json({ message: "Error fetching campaign products" });
    }
  });
  
  app.post("/api/admin/campaigns", async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error: any) {
      console.error("Campaign creation error:", error);
      res.status(400).json({ message: "Invalid campaign data", details: error.message });
    }
  });
  
  app.put("/api/admin/campaigns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCampaignSchema.partial().parse(req.body);
      
      const campaign = await storage.updateCampaign(id, updates);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error: any) {
      console.error("Campaign update error:", error);
      res.status(500).json({ message: "Error updating campaign", details: error.message });
    }
  });
  
  app.delete("/api/admin/campaigns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await storage.deleteCampaign(id);
      if (!ok) return res.status(404).json({ message: "Campaign not found" });
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Campaign delete error:", error);
      res.status(500).json({ message: "Error deleting campaign", details: error.message });
    }
  });
  
  app.post("/api/admin/campaigns/:campaignId/products", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      
      const campaignProduct = await storage.addProductToCampaign(campaignId, productId);
      res.json(campaignProduct);
    } catch (error: any) {
      console.error("Add product to campaign error:", error);
      res.status(400).json({ message: "Error adding product to campaign", details: error.message });
    }
  });
  
  app.delete("/api/admin/campaigns/:campaignId/products/:productId", async (req, res) => {
    try {
      const { campaignId, productId } = req.params;
      
      const campaignProducts = await storage.getCampaignProducts(campaignId);
      const campaignProduct = campaignProducts.find(cp => cp.product.id === productId);
      
      if (!campaignProduct) {
        return res.status(404).json({ message: "Product not found in campaign" });
      }
      
      const ok = await storage.removeProductFromCampaign(campaignProduct.campaignProduct.id);
      if (!ok) return res.status(500).json({ message: "Error removing product from campaign" });
      
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Remove product from campaign error:", error);
      res.status(500).json({ message: "Error removing product from campaign", details: error.message });
    }
  });
  
  app.get("/api/admin/products/:productId/campaigns", async (req, res) => {
    try {
      const { productId } = req.params;
      const campaigns = await storage.getProductCampaigns(productId);
      res.json(campaigns);
    } catch (error: any) {
      console.error("Get product campaigns error:", error);
      res.status(500).json({ message: "Error fetching product campaigns", details: error.message });
    }
  });

  app.get("/api/admin/product-campaigns", async (_req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const result: Record<string, Campaign[]> = {};
      
      for (const product of allProducts) {
        const campaigns = await storage.getProductCampaigns(product.id);
        result[product.id] = campaigns;
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Get product campaigns error:", error);
      res.status(500).json({ message: "Error fetching product campaigns", details: error.message });
    }
  });

  // Blogs API
  app.get("/api/blogs", async (_req, res) => {
    try {
      const blogs = await storage.getPublishedBlogs();
      res.json(blogs);
    } catch (error: any) {
      console.error("Blogs fetch error:", error);
      res.status(500).json({ message: "Error fetching blogs", details: error.message });
    }
  });

  app.get("/api/blogs/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const blog = await storage.getBlogBySlug(slug);
      if (!blog) return res.status(404).json({ message: "Blog not found" });
      
      if (blog.isPublished) {
        await storage.incrementBlogViews(blog.id);
      }
      
      res.json(blog);
    } catch (error: any) {
      console.error("Blog fetch error:", error);
      res.status(500).json({ message: "Error fetching blog", details: error.message });
    }
  });

  // Admin Blog Routes
  app.get("/api/admin/blogs", async (_req, res) => {
    try {
      const blogs = await storage.getAllBlogs();
      res.json(blogs);
    } catch (error: any) {
      console.error("Admin blogs fetch error:", error);
      res.status(500).json({ message: "Error fetching blogs", details: error.message });
    }
  });

  app.get("/api/admin/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const blog = await storage.getBlog(id);
      if (!blog) return res.status(404).json({ message: "Blog not found" });
      res.json(blog);
    } catch (error: any) {
      console.error("Admin blog fetch error:", error);
      res.status(500).json({ message: "Error fetching blog", details: error.message });
    }
  });

  app.post("/api/admin/blogs", async (req, res) => {
    try {
      const blogData = insertBlogSchema.parse(req.body);
      
      const dataForDb = {
        ...blogData,
        publishedAt: blogData.isPublished ? new Date() : null,
      };
      
      const blog = await storage.createBlog(dataForDb);
      res.json(blog);
    } catch (error: any) {
      console.error("Blog creation error:", error);
      res.status(400).json({ message: "Invalid blog data", details: error.message });
    }
  });

  app.put("/api/admin/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertBlogSchema.partial().parse(req.body);
      
      const updatesForDb: any = { ...updates };
      if (updates.isPublished !== undefined) {
        updatesForDb.publishedAt = updates.isPublished ? new Date() : null;
      }
      
      const blog = await storage.updateBlog(id, updatesForDb);
      if (!blog) return res.status(404).json({ message: "Blog not found" });
      res.json(blog);
    } catch (error: any) {
      console.error("Blog update error:", error);
      res.status(500).json({ message: "Error updating blog", details: error.message });
    }
  });

  app.delete("/api/admin/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await storage.deleteBlog(id);
      if (!ok) return res.status(404).json({ message: "Blog not found" });
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Blog delete error:", error);
      res.status(500).json({ message: "Error deleting blog", details: error.message });
    }
  });

  // Add this endpoint to get all campaign products
  app.get("/api/admin/all-campaign-products", async (_req, res) => {
    try {
      const allCampaignProducts = await storage.getAllCampaignProducts();
      
      // Remove duplicates (same product might be in multiple campaigns)
      const uniqueProducts = new Map();
      allCampaignProducts.forEach(cp => {
        if (!uniqueProducts.has(cp.product.id)) {
          uniqueProducts.set(cp.product.id, cp);
        }
      });
      
      res.json(Array.from(uniqueProducts.values()));
    } catch (error: any) {
      console.error("Error fetching all campaign products:", error);
      res.status(500).json({ message: "Error fetching campaign products", details: error.message });
    }
  });
}