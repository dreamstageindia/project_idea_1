// server/storage.ts
import { and, desc, eq, sql as dsql } from "drizzle-orm";
import { db } from "./db";
import {
  employees,
  products,
  orders,
  sessions,
  branding as brandingTable,
  type Employee,
  type InsertEmployee,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type Session,
  type Branding,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByEmployeeId(employeeId: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;

  // Sessions
  getSession(token: string): Promise<Session | undefined>;
  createSession(employeeId: string): Promise<Session>;
  deleteSession(token: string): Promise<boolean>;

  // Branding
  getBranding(): Promise<Branding | undefined>;
  updateBranding(updates: Partial<Branding>): Promise<Branding>;

  // Legacy (compat)
  getUser(id: string): Promise<Employee | undefined>;
  getUserByUsername(username: string): Promise<Employee | undefined>;
  createUser(user: any): Promise<Employee>;
}

class DrizzleStorage implements IStorage {
  // --- Employees ---
  async getEmployee(id: string) {
    const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return rows[0];
  }

  async getEmployeeByEmployeeId(employeeId: string) {
    const rows = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId))
      .limit(1);
    return rows[0];
  }

  async createEmployee(employeeData: InsertEmployee) {
    const rows = await db.insert(employees).values(employeeData).returning();
    return rows[0];
  }

  async updateEmployee(id: string, updates: Partial<Employee>) {
    const rows = await db.update(employees).set(updates).where(eq(employees.id, id)).returning();
    return rows[0];
  }

  async getAllEmployees() {
    return db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  // --- Products ---
  async getProduct(id: string) {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0];
  }

  async getAllProducts() {
    return db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt));
  }

  async createProduct(productData: InsertProduct) {
    const rows = await db.insert(products).values(productData).returning();
    return rows[0];
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const rows = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return rows[0];
  }

  async deleteProduct(id: string) {
    const res = await db.delete(products).where(eq(products.id, id));
    return res.rowCount ? res.rowCount > 0 : true;
  }

  // --- Orders ---
  async getOrder(id: string) {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0];
  }

  async getOrderByEmployeeId(employeeId: string) {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.employeeId, employeeId))
      .orderBy(desc(orders.orderDate))
      .limit(1);
    return rows[0];
  }

  async getAllOrders() {
    return db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async createOrder(orderData: InsertOrder) {
    // Human-friendly orderId: ORD-YYYY-xxx
    const year = new Date().getFullYear();
    const [{ c }] = await db
      .select({ c: dsql<number>`count(*)` })
      .from(orders)
      .where(dsql`extract(year from ${orders.orderDate}) = ${year}`);
    const next = Number(c) + 1;
    const orderId = `ORD-${year}-${String(next).padStart(3, "0")}`;

    const rows = await db
      .insert(orders)
      .values({
        ...orderData,
        orderId,
        status: "confirmed",
        orderDate: new Date(),
      })
      .returning();
    return rows[0];
  }

  // --- Sessions ---
  async getSession(token: string) {
    const rows = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    const sess = rows[0];
    if (!sess) return undefined;
    if (sess.expiresAt && new Date(sess.expiresAt) < new Date()) {
      await this.deleteSession(token);
      return undefined;
    }
    return sess;
  }

  async createSession(employeeId: string) {
    const rows = await db
      .insert(sessions)
      .values({
        employeeId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        createdAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  async deleteSession(token: string) {
    const res = await db.delete(sessions).where(eq(sessions.token, token));
    return res.rowCount ? res.rowCount > 0 : true;
  }

  // --- Branding ---
  async getBranding() {
    const rows = await db.select().from(brandingTable).limit(1);
    return rows[0];
  }

  async updateBranding(updates: Partial<Branding>) {
    const current = await this.getBranding();
    if (!current) {
      const rows = await db
        .insert(brandingTable)
        .values({ ...updates, updatedAt: new Date() })
        .returning();
      return rows[0];
    }
    const rows = await db
      .update(brandingTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandingTable.id, current.id))
      .returning();
    return rows[0];
  }

  // --- Legacy (compat) ---
  async getUser(id: string) {
    return this.getEmployee(id);
  }
  async getUserByUsername(username: string) {
    return this.getEmployeeByEmployeeId(username);
  }
  async createUser(user: any) {
    return this.createEmployee(user);
  }
}

export const storage: IStorage = new DrizzleStorage();
