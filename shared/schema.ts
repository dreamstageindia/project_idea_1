import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  json,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* =========================================================
   CATEGORIES
   =======================================================*/
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   EMPLOYEES
   =======================================================*/
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  points: integer("points").notNull().default(0),
  loginAttempts: integer("login_attempts").default(0),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   PRODUCTS
   =======================================================*/
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: json("images").$type<string[]>().default([]),
  colors: json("colors").$type<string[]>().default([]),
  stock: integer("stock").default(0),
  packagesInclude: json("packages_include").$type<string[]>().default([]),
  specifications: json("specifications").$type<Record<string, string>>().default({}),
  sku: text("sku").notNull().unique(),
  isActive: boolean("is_active").default(true),
  backupProductId: varchar("backup_product_id"),
  categoryId: varchar("category_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   ORDERS
   =======================================================*/
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").notNull().unique(),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  selectedColor: text("selected_color"),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").default("confirmed"),
  orderDate: timestamp("order_date").defaultNow(),
  metadata: json("metadata").$type<Record<string, any> | null>().default(null),
});

/* =========================================================
   CART ITEMS
   =======================================================*/
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  selectedColor: text("selected_color"),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   SESSIONS
   =======================================================*/
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   BRANDING
   =======================================================*/
export const branding = pgTable("branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoUrl: text("logo_url"),
  companyName: text("company_name").default("TechCorp"),
  primaryColor: text("primary_color").default("#1e40af"),
  accentColor: text("accent_color").default("#f97316"),
  bannerUrl: text("banner_url"),
  bannerText: text("banner_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
  inrPerPoint: decimal("inr_per_point", { precision: 10, scale: 2 }).default("1.00"),
  maxSelectionsPerUser: integer("max_selections_per_user").default(1),
});

/* =========================================================
   OTP ISSUES (Email flow)
   =======================================================*/
export const otps = pgTable("otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  metadata: json("metadata").$type<{ localCode?: string | null } | null>().default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================================================
   ZOD INSERT SCHEMAS
   =======================================================*/
export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
  imageUrl: true,
  isActive: true,
  sortOrder: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  firstName: true,
  lastName: true,
  email: true,
  points: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  price: true,
  images: true,
  colors: true,
  stock: true,
  packagesInclude: true,
  specifications: true,
  sku: true,
  backupProductId: true,
  categoryId: true,
  isActive: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  employeeId: true,
  productId: true,
  selectedColor: true,
  quantity: true,
  metadata: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).pick({
  employeeId: true,
  productId: true,
  selectedColor: true,
  quantity: true,
});

/* =========================================================
   EMAIL OTP FLOW SCHEMAS
   =========================================================*/
export const emailLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
});
export const otpVerifySchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().min(4, "OTP is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const sendOtpSchema = emailLoginSchema;
export const verifyOtpSchema = otpVerifySchema;

/* =========================================================
   TYPES
   =======================================================*/
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type Session = typeof sessions.$inferSelect;

export type Branding = typeof branding.$inferSelect;

export type OTP = typeof otps.$inferSelect;