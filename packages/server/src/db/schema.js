import { pgTable, text, integer, timestamp, boolean, uuid, varchar, json } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ==========================================
// BETTER AUTH CORE TABLES (Generated Schema)
// ==========================================
export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    role: text("role"),
    banned: boolean("banned"),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires")
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text("impersonated_by")
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at")
});

// ==========================================
// DMS BUSINESS TABLES
// ==========================================

export const role = pgTable("role", {
    id: text("id").primaryKey(), // Using text like initiator, cost_control etc.
    name: varchar("name", { length: 100 }).notNull(), // e.g. "Cost Control", "Hotel Manager"
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const documentCategory = pgTable("document_category", {
    id: varchar("id", { length: 50 }).primaryKey(), // Using text like PO, CA, MEMO Let's stick with the original string constants
    name: varchar("name", { length: 100 }).notNull(), // e.g. "Purchase Order", "Cash Advance"
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const departmentRef = pgTable("department_ref", {
    id: varchar("id", { length: 50 }).primaryKey(), // e.g. FO, HK, FB
    name: varchar("name", { length: 255 }).notNull(), // e.g. Front Office, Housekeeping
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const userProfile = pgTable("user_profile", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    branches: varchar("branches", { length: 255 }).array().notNull().default(sql`ARRAY['Astara Hotel']::varchar[]`),
    department: varchar("department", { length: 100 }), // e.g. FO, HK, FB, HR
    isAbsent: boolean("is_absent").default(false).notNull(),
    delegatedToUserId: text("delegated_to_user_id").references(() => user.id, { onDelete: 'set null' }),
    absenceStartDate: timestamp("absence_start_date"),
    absenceEndDate: timestamp("absence_end_date")
});

export const signature = pgTable("signature", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    imagePath: text("image_path").notNull(),
    uploadedBy: text("uploaded_by").notNull().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const document = pgTable("document", {
    id: uuid("id").defaultRandom().primaryKey(),
    displayId: varchar("display_id", { length: 50 }).notNull().unique(), // e.g., PO-2026-0042
    title: text("title").notNull(),
    category: varchar("category", { length: 50 }).notNull(), // PO, CA, PETTY_CASH, MEMO
    subCategory: varchar("sub_category", { length: 100 }), // e.g., Cluster Memo, Internal Memo
    branch: varchar("branch", { length: 255 }).notNull(),
    department: varchar("department", { length: 100 }), // e.g., FO, FB, HR (crucial for HOD routing)
    notes: text("notes"), // Optional notes from uploader for approvers
    filePath: text("file_path").notNull(), // Path to original PDF
    signedFilePath: text("signed_file_path"), // Path to final signed PDF
    status: varchar("status", { length: 50 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED, REVISION
    uploadedBy: text("uploaded_by").notNull().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const workflow = pgTable("workflow", {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 50 }).notNull(), // PO, CA, PETTY_CASH, MEMO
    subCategory: varchar("sub_category", { length: 100 }), // e.g., Cluster Memo, Internal Memo
    branch: varchar("branch", { length: 255 }).notNull(), // Can be 'All' for global workflows
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const workflowStep = pgTable("workflow_step", {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowId: uuid("workflow_id").notNull().references(() => workflow.id, { onDelete: 'cascade' }),
    stepOrder: integer("step_order").notNull(),
    roleRequired: varchar("role_required", { length: 100 }).notNull(), // Cost Control, Financial Controller, etc
    isOptional: boolean("is_optional").default(false).notNull(),
    isDynamicDepartment: boolean("is_dynamic_department").default(false).notNull(),
});

export const approval = pgTable("approval", {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull().references(() => document.id, { onDelete: 'cascade' }),
    stepOrder: integer("step_order").notNull(),
    roleRequired: varchar("role_required", { length: 100 }).notNull(),
    targetDepartment: varchar("target_department", { length: 100 }), // The dynamic department routed for this step
    assignedUserId: text("assigned_user_id").references(() => user.id, { onDelete: 'set null' }), // nullable if assigned generally by role
    status: varchar("status", { length: 50 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
    comment: text("comment"),
    delegatedFromUserId: text("delegated_from_user_id").references(() => user.id, { onDelete: 'set null' }),
    actedByUserId: text("acted_by_user_id").references(() => user.id, { onDelete: 'set null' }),
    signedAt: timestamp("signed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const keywordMapping = pgTable("keyword_mapping", {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 50 }).notNull(),
    subCategory: varchar("sub_category", { length: 100 }), // e.g., Cluster Memo, Internal Memo
    branch: varchar("branch", { length: 255 }).notNull().default('All'),
    role: varchar("role", { length: 100 }).notNull(),
    stepOrder: integer("step_order"), // Added to resolve HOD collisions
    keyword: text("keyword").notNull(),
    offset_x: integer("offset_x").default(0).notNull(),
    offset_y: integer("offset_y").default(0).notNull(),
    positionHint: varchar("position_hint", { length: 100 }), // e.g., 'Below table', 'Footer'
    createdAt: timestamp("created_at").defaultNow().notNull()
});

// ==========================================
// ACTIVITY LOG TABLE
// ==========================================
export const activityLog = pgTable("activity_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: 'set null' }),
    action: varchar("action", { length: 100 }).notNull(), // DOCUMENT_UPLOADED, APPROVAL_GRANTED, APPROVAL_REJECTED, WORKFLOW_UPDATED, KEYWORD_UPDATED, USER_CREATED
    entity: varchar("entity", { length: 50 }).notNull(),   // Document, Workflow, User, Keyword
    entityId: text("entity_id"),                            // UUID or ID of the target entity
    details: text("details").notNull(),                     // Human-readable summary e.g. "Nawawi uploaded Monthly_Tax_Report_Q3.pdf"
    metadata: text("metadata"),                             // Optional JSON blob for extra context
    createdAt: timestamp("created_at").defaultNow().notNull()
});

// ==========================================
// DOCUMENT GENERATION TEMPLATE TABLE
// ==========================================
export const documentTemplate = pgTable("document_template", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    filePath: text("file_path").notNull(),
    fieldsConfig: json("fields_config"), // JSON array of fields e.g [{name: "to", label: "To", type: "text"}]
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});
