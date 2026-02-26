import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
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
  aiCoachPersonality: text("ai_coach_personality", { enum: ["military", "sweetheart", "stoic"] }).default("military").notNull(),
  // Fitbit OAuth tokens
  fitbitAccessToken: text("fitbit_access_token"),
  fitbitRefreshToken: text("fitbit_refresh_token"),
  fitbitTokenExpiry: timestamp("fitbit_token_expiry", { mode: "date" }),
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
  // Penalty Staking
  stakeAmount: integer("stake_amount").default(0).notNull(),
  stakeStatus: text("stake_status", { enum: ["none", "active", "won", "lost"] }).default("none").notNull(),
  // Co-op
  coopPartnerStreakId: uuid("coop_partner_streak_id"),
  // Auto Check-in from Fitbit
  autoCheckinSource: text("auto_checkin_source", { enum: ["none", "fitbit"] }).default("none").notNull(),
  autoCheckinMinMinutes: integer("auto_checkin_min_minutes").default(10).notNull(),
  autoCheckinMinSteps: integer("auto_checkin_min_steps").default(2000).notNull(),
  // Zen Mode
  zenMode: boolean("zen_mode").default(false).notNull(),
  // Cumulative Impact
  impactMultiplier: integer("impact_multiplier").default(0).notNull(),
  impactUnit: text("impact_unit").default("").notNull(),
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
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Death Pool Tables ────────────────────────────────
export const deathPools = pgTable("death_pool", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  stakeAmount: integer("stake_amount").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  status: text("status", { enum: ["active", "ended"] }).default("active").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const deathPoolMembers = pgTable(
  "death_pool_member",
  {
    poolId: uuid("pool_id")
      .notNull()
      .references(() => deathPools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stakeCoins: integer("stake_coins").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  },
  (m) => [primaryKey({ columns: [m.poolId, m.userId] })]
);

// Co-op invite system: one user sends an invite to another for a specific streak
export const coopInvites = pgTable("coop_invite", {
  id: uuid("id").defaultRandom().primaryKey(),
  // The streak that is proposing the co-op
  fromStreakId: uuid("from_streak_id")
    .notNull()
    .references(() => streaks.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Invited by email (the recipient may not exist yet)
  toEmail: text("to_email").notNull(),
  // If they accept, their streak ID is saved here
  toStreakId: uuid("to_streak_id").references(() => streaks.id, { onDelete: "set null" }),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  streaks: many(streaks),
  checkIns: many(checkIns),
  sentCoopInvites: many(coopInvites, { relationName: "sentCoopInvites" }),
  deathPoolsCreated: many(deathPools),
  deathPoolMemberships: many(deathPoolMembers),
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

export const coopInvitesRelations = relations(coopInvites, ({ one }) => ({
  fromUser: one(users, {
    fields: [coopInvites.fromUserId],
    references: [users.id],
    relationName: "sentCoopInvites",
  }),
  fromStreak: one(streaks, {
    fields: [coopInvites.fromStreakId],
    references: [streaks.id],
  }),
}));

export const deathPoolsRelations = relations(deathPools, ({ one, many }) => ({
  creator: one(users, { fields: [deathPools.createdBy], references: [users.id] }),
  members: many(deathPoolMembers),
}));

export const deathPoolMembersRelations = relations(deathPoolMembers, ({ one }) => ({
  pool: one(deathPools, { fields: [deathPoolMembers.poolId], references: [deathPools.id] }),
  user: one(users, { fields: [deathPoolMembers.userId], references: [users.id] }),
}));
