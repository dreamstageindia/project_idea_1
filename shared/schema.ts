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

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  yearOfBirth: integer("year_of_birth").notNull(),
  loginAttempts: integer("login_attempts").default(0),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").notNull().unique(),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  selectedColor: text("selected_color"),
  status: text("status").default("confirmed"),
  orderDate: timestamp("order_date").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const branding = pgTable("branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoUrl: text("logo_url"),
  companyName: text("company_name").default("TechCorp"),
  primaryColor: text("primary_color").default("#1e40af"),
  accentColor: text("accent_color").default("#f97316"),
  bannerUrl: text("banner_url"),
  bannerText: text("banner_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  employeeId: true,
  firstName: true,
  lastName: true,
  yearOfBirth: true,
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
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  employeeId: true,
  productId: true,
  selectedColor: true,
});

export const loginSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
});

export const verificationSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  yearOfBirth: z.number().min(1950).max(2010),
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Branding = typeof branding.$inferSelect;
