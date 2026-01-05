# Financial Master Dashboard

A comprehensive financial management dashboard for tracking quotations, invoices, expenses, and project planning.

## Features

- 📋 **Planning** - Create project plans with budgets and generate quotations
- 📄 **Quotation** - Generate and manage quotations with PDF export
- 🧾 **Invoice** - Track invoices with status management (Draft → Pending → Paid)
- 💰 **Expense** - Track project expenses and calculate profit margins
- 🏢 **Master Data** - Manage companies, products, billings, and signatures
- 📊 **Dashboard** - Financial overview with yearly statistics
- 🎫 **Special Cases** - Paragon and Erha ticket management
- 📱 **PDF Export** - Generate professional PDFs for all documents
- 🌙 **Dark Mode** - Full dark mode support

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui + Radix UI
- **PDF Generation:** @react-pdf/renderer
- **Charts:** Recharts

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Neon account (free tier works) - [neon.tech](https://neon.tech)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/master-dashboard.git
cd master-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database (Neon PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (choose region closest to you)
3. Copy the connection strings from the dashboard

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Neon PostgreSQL Connection (Pooled - for app queries)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Neon Direct Connection (for Prisma migrations)
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

> ⚠️ **Important:** 
> - `DATABASE_URL` should use the **pooled** connection (has `-pooler` in hostname)
> - `DIRECT_URL` should use the **direct** connection (no `-pooler`)

### 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📁 Project Structure

```
master-dashboard/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── planning/          # Planning pages
│   ├── quotation/         # Quotation pages
│   ├── invoice/           # Invoice pages
│   ├── expense/           # Expense pages
│   ├── companies/         # Company master data
│   ├── products/          # Product master data
│   ├── billings/          # Billing master data
│   ├── signatures/        # Signature master data
│   └── special-case/      # Paragon & Erha tickets
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── pdf/              # PDF templates
│   └── layout/           # Layout components
├── lib/                   # Utility functions
├── hooks/                 # Custom React hooks
├── prisma/               # Prisma schema
└── public/               # Static assets
```

---

## 🔧 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Prisma Commands

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma studio      # Open Prisma Studio (database GUI)
```

---

## 🌐 Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `DATABASE_URL` - Neon pooled connection
   - `DIRECT_URL` - Neon direct connection
4. Deploy!

---

## 📝 Usage Guide

### Document Flow

```
Planning → Quotation → Invoice → Expense
   ↓           ↓           ↓         ↓
 Draft      Draft       Draft     Draft
   ↓           ↓           ↓         ↓
 Final     Pending     Pending    Final
             ↓           ↓
          Accepted     Paid
```

### Status Meanings

| Document | Status | Editable |
|----------|--------|----------|
| Planning | Draft | ✅ Yes |
| Planning | Final | ❌ No (generates quotation) |
| Quotation | Draft | ✅ Yes |
| Quotation | Pending | ✅ Yes |
| Quotation | Accepted | ❌ No (can generate invoice) |
| Invoice | Draft | ✅ Yes |
| Invoice | Pending | ✅ Yes |
| Invoice | Paid | ❌ No (creates expense) |
| Expense | Draft | ✅ Yes |
| Expense | Final | ❌ No |

---

## 🛡️ Backup

Neon PostgreSQL automatically handles backups. You can also:

1. Use Prisma Studio to view/export data: `npx prisma studio`
2. Export data via Neon dashboard
3. Use `pg_dump` for full database backup

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is private and for internal use only.
