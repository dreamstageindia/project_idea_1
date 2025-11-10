// server/storage.ts
import { and, desc, eq, sql as dsql, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  employees,
  products,
  orders,
  cartItems,
  sessions,
  branding as brandingTable,
  otps,
  type Employee,
  type InsertEmployee,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type CartItem,
  type InsertCartItem,
  type Session,
  type Branding,
  type OTP,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getEmployeeByPhone(phoneE164: string): Promise<Employee | undefined>;
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
  getOrdersByEmployeeId(employeeId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;

  // Cart
  getCartItem(id: string): Promise<CartItem | undefined>;
  getCartItems(employeeId: string): Promise<CartItem[]>;
  createCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, updates: Partial<CartItem>): Promise<CartItem | undefined>;
  removeCartItem(id: string): Promise<boolean>;
  clearCart(employeeId: string): Promise<void>;

  // Sessions
  getSession(token: string): Promise<Session | undefined>;
  createSession(employeeId: string): Promise<Session>;
  deleteSession(token: string): Promise<boolean>;

  // Branding
  getBranding(): Promise<Branding | undefined>;
  updateBranding(updates: Partial<Branding>): Promise<Branding>;

  // OTP
  createOTP(rec: { phoneNumber: string; code: string; expiresAt: Date; metadata?: any }): Promise<OTP>;
  getLastOTPForPhone(phoneNumber: string): Promise<OTP | undefined>;
  markOTPAsUsed(id: string): Promise<void>;
}

class DrizzleStorage implements IStorage {
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

  async getEmployeeByPhone(phoneE164: string) {
    const rows = await db.select().from(employees).where(eq(employees.phoneNumber, phoneE164)).limit(1);
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

  async getOrder(id: string) {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0];
  }

  async getOrdersByEmployeeId(employeeId: string) {
    return db.select().from(orders).where(eq(orders.employeeId, employeeId)).orderBy(desc(orders.orderDate));
  }

  async getAllOrders() {
    return db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async createOrder(orderData: InsertOrder) {
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
        metadata: orderData.metadata ?? null,
      })
      .returning();
    return rows[0];
  }

  async getCartItem(id: string) {
    const rows = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
    return rows[0];
  }

  async getCartItems(employeeId: string) {
    return db.select().from(cartItems).where(eq(cartItems.employeeId, employeeId));
  }

  async createCartItem(item: InsertCartItem) {
    const rows = await db.insert(cartItems).values(item).returning();
    return rows[0];
  }

  async updateCartItem(id: string, updates: Partial<CartItem>) {
    const rows = await db.update(cartItems).set(updates).where(eq(cartItems.id, id)).returning();
    return rows[0];
  }

  async removeCartItem(id: string) {
    const res = await db.delete(cartItems).where(eq(cartItems.id, id));
    return res.rowCount ? res.rowCount > 0 : true;
  }

  async clearCart(employeeId: string) {
    await db.delete(cartItems).where(eq(cartItems.employeeId, employeeId));
  }

  async getSession(token: string) {
    const rows = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    const sess = rows[0];
    if (!sess) return undefined;
    return sess;
  }

  async createSession(employeeId: string) {
    const rows = await db
      .insert(sessions)
      .values({
        employeeId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  async deleteSession(token: string) {
    const res = await db.delete(sessions).where(eq(sessions.token, token));
    return res.rowCount ? res.rowCount > 0 : true;
  }

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

  async createOTP(rec: { phoneNumber: string; code: string; expiresAt: Date; metadata?: any }) {
    const rows = await db
      .insert(otps)
      .values({
        phoneNumber: rec.phoneNumber,
        code: rec.code,
        expiresAt: rec.expiresAt,
        metadata: rec.metadata ?? null,
      })
      .returning();
    return rows[0];
  }

  async getLastOTPForPhone(phoneNumber: string) {
    const rows = await db
      .select()
      .from(otps)
      .where(and(eq(otps.phoneNumber, phoneNumber), isNull(otps.usedAt)))
      .orderBy(desc(otps.createdAt))
      .limit(1);
    return rows[0];
  }

  async markOTPAsUsed(id: string) {
    await db.update(otps).set({ usedAt: new Date() }).where(eq(otps.id, id));
  }
}

export const storage: IStorage = new DrizzleStorage();