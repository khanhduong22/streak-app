import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── NextAuth Tables ──────────────────────────────────────
export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  coins: integer("coins").default(0).notNull(),
  freezeTokens: integer("freeze_tokens").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ─── App Tables ───────────────────────────────────────────
export const streaks = pgTable("streak", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  emoji: text("emoji").default("🔥"),
  color: text("color").default("#f97316"),
  targetDays: integer("target_days").default(0),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastCheckIn: date("last_check_in", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const checkIns = pgTable("check_in", {
  id: uuid("id").defaultRandom().primaryKey(),
  streakId: uuid("streak_id")
    .notNull()
    .references(() => streaks.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  checkInDate: date("check_in_date", { mode: "string" }).notNull(),
  status: text("status", { enum: ["checked_in", "frozen"] }).default("checked_in").notNull(),
  tier: text("tier", { enum: ["full", "half", "minimal"] }).default("full").notNull(),
  mood: text("mood", { enum: ["happy", "tired", "stressed"] }),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  streaks: many(streaks),
  checkIns: many(checkIns),
}));

export const streaksRelations = relations(streaks, ({ one, many }) => ({
  user: one(users, { fields: [streaks.userId], references: [users.id] }),
  checkIns: many(checkIns),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  streak: one(streaks, {
    fields: [checkIns.streakId],
    references: [streaks.id],
  }),
  user: one(users, { fields: [checkIns.userId], references: [users.id] }),
}));
