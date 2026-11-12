# DASA TECH — Smart Employee Attendance & Workforce Management Platform

A modern, premium, secure, and responsive enterprise web application built for **DASA TECH** to replace traditional Excel-based attendance sheets with real-time biometric-style digital tracking, analytics, and workforce automation.

---

## 🌟 Key Highlights & Architecture

- **Human-Crafted SaaS Visual Polish**: Minimalist, high-performance visual hierarchy inspired by Tesla, Linear, and Apple interfaces, built with the official **DASA TECH** brand palette (Deep Crimson `#8C1D2F`, Warm Amber Gold `#F5A623`, Metallic Copper `#D97A53`, and rich dark obsidian `#0D0709`).
- **Flagship Attendance Landing Terminal**:
  - Live ticking digital clock with date format and milliseconds precision.
  - Dynamically fetched employee roster directly from PostgreSQL (no hardcoded staff).
  - Browser Geolocation API integration with coordinate capture and precision accuracy indication.
  - Live camera selfie capture with oval face guide, instant preview confirmation, and fallback photo upload.
  - Section 14 Security PIN authentication pad preventing identity spoofing.
  - Smart check-in & check-out sequence prevention (duplicate blocking, active session detection).
  - Server-side timestamping ensuring tamper-proof logs.
- **Gamified Snapchat-Inspired Streak Engine**:
  - Animated flame icon with Framer Motion glow and pulse animations.
  - Real-time streak tracking counting eligible scheduled working days.
  - Smart exemption logic: approved leaves, weekly offs, and holidays do not break streaks; unauthorized absences break them.
  - Multi-tiered celebration fireworks (confetti) on reaching milestone days (3, 7, 15, 30, 60, 100 days).
- **Internal Recognition Nicknames**:
  - **Chopplangi**: Automatically awarded to staff with a pattern of late arrivals past grace period.
  - **Minnal Murali**: Lightning fast early birds consistently checking in before shift start.
  - **Kutty Dragon**: Dynamic hybrid achievers alternating between early and punctual arrivals.
  - **On-Time Star**: Pillar of clockwork punctuality within the grace window.
  - Dynamically evaluated over a configurable 30-day window.
- **Work & Attendance Requests Hub**:
  - Leave Applications (Paid Leave, Casual Leave, Sick Leave, Unpaid Leave, Emergency Leave, Other).
  - Permission Requests (Late arrival, early departure, short personal break, doctor appointment).
  - Weekend Work logging (Project, client, deliverables, duration).
  - Client Visits & Executive Client Meetings (location, purpose, discussion summary, follow-up actions).
- **Super Admin Command Center**:
  - 8 Top-level real-time telemetry metrics.
  - 7-Day arrival trend analytics and department punctuality index.
  - Employee streak leaderboard.
  - Live attendance activity feed.
  - Employee Master CRUD with shift assignment and PIN reset.
  - Attendance Management & Selfie Inspection gallery with Google Maps GPS link.
  - Section 20 Authorized Attendance Corrections with mandatory audit explanation.
  - Advanced Reporting with 1-click export to **Excel (.xlsx)**, **CSV**, and **PDF Print**.
  - Company settings (grace periods, geofence policy, checkout selfies, holidays calendar).
  - Immutable system audit trail.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, Axios, Canvas-Confetti, jsPDF, jspdf-autotable, SheetJS (XLSX) |
| **Backend** | Node.js, Express.js (REST API modular architecture), Multer, Bcrypt.js, JSON Web Tokens (JWT), Helmet, Express Rate Limit |
| **Database** | PostgreSQL 18.6 with relational schema, foreign key cascades, unique constraints, and B-tree indexes |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (verified on Node.js v24)
- **PostgreSQL**: 16 or 18 running on port `5432` with user `postgres` and password `2200`
- Database `dasa_attendance` is already provisioned and seeded.

### 2. Launch with One Click
In the workspace root, simply double-click or run:
```bash
.\start_all.bat
```
Or start each service individually:
- **Backend**: `.\start_backend.bat` (runs on `http://localhost:5000`)
- **Frontend**: `.\start_frontend.bat` (runs on `http://localhost:5180`)

---

## 🔑 Demo Credentials

### Super Admin
- **URL**: `http://localhost:5180/admin/login`
- **Email**: `admin@dasatech.com`
- **Password**: `admin123`

### Staff Members (Landing Terminal & Employee Portal)
- **Karthik Raja** (Principal Architect, `DASA-101`) — PIN: `1234` *(Minnal Murali)*
- **Divya Sundaram** (UI/UX Designer, `DASA-102`) — PIN: `1234` *(Kutty Dragon)*
- **Praveen Kumar** (Backend Engineer, `DASA-103`) — PIN: `1234` *(Chopplangi)*
- **Ananya Mohan** (QA Engineer, `DASA-104`) — PIN: `1234` *(On-Time Star)*
- **Vijay Sethupathi** (DevOps Engineer, `DASA-105`) — PIN: `1234`
- **Sneha Priya** (React Developer, `DASA-106`) — PIN: `1234`

---

## 🛡️ Security Features
1. **PIN Security Pad**: Prevents fraudulent check-in when an employee's name is picked from a shared terminal.
2. **Server Timestamps**: Attendance timestamps are generated strictly on the Node.js server.
3. **Audit Trail**: Every check-in, check-out, setting update, or correction writes an immutable event into `attendance_events` or `audit_logs`.
4. **CORS & Rate Limiting**: Centralized API protection against brute force attacks.
5. **Role-Based Access Control (RBAC)**: Enforced via JWT verification middleware.
