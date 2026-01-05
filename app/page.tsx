"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, FileSignature, Package, Calendar, FileCheck, Receipt, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, BarChart, Cell } from 'recharts'

export default function Home() {
  const router = useRouter()
  const [invoiceStats, setInvoiceStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    paid: 0,
  })
  const [quotationStats, setQuotationStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    accepted: 0,
  })
  const [expenseStats, setExpenseStats] = useState({
    totalUnderBudget: 0,
    totalOverBudget: 0,
    averageEfficiency: 0,
    grossProfit: 0,
    netProfit: 0,
    marginPercentage: 0,
  })
  const [extraExpenses, setExtraExpenses] = useState({
    gearTotal: 0,
    bigTotal: 0,
  })
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
  const [productExpenses, setProductExpenses] = useState<any[]>([])
  const [etcExpenses, setEtcExpenses] = useState<any[]>([])
  const [showAllProducts, setShowAllProducts] = useState(false)
  const currentYear = new Date().getFullYear().toString()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>(currentYear)
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(currentYear)
  const [selectedTrendsYear, setSelectedTrendsYear] = useState<string>(currentYear)
  const [selectedProductsYear, setSelectedProductsYear] = useState<string>(currentYear)
  const [loading, setLoading] = useState(true)

  // Fetch statistics
  // Auto weekly backup - runs silently on app startup
  useEffect(() => {
    const runBackup = async () => {
      try {
        await fetch("/api/backup")
      } catch (error) {
        // Silent fail - backup is not critical for app function
        console.error("Auto backup check failed:", error)
      }
    }
    runBackup()
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [invoicesRes, quotationsRes, expensesRes, productsRes, gearExpensesRes, bigExpensesRes] = await Promise.all([
          fetch("/api/invoice"),
          fetch("/api/quotation"),
          fetch("/api/expense"),
          fetch("/api/products"),
          fetch("/api/gear-expenses"),
          fetch("/api/big-expenses"),
        ])

        const [invoices, quotations, expenses, products, gearExpenses, bigExpenses] = await Promise.all([
          invoicesRes.json(),
          quotationsRes.json(),
          expensesRes.json(),
          productsRes.json(),
          gearExpensesRes.json(),
          bigExpensesRes.json(),
        ])

        // Extract unique years from all datasets
        const years = new Set<number>()
        // Always include current year so it's never blank
        years.add(new Date().getFullYear())
        invoices.forEach((inv: any) => {
          if (inv.productionDate) {
            const year = new Date(inv.productionDate).getFullYear()
            years.add(year)
          }
        })
        quotations.forEach((q: any) => {
          if (q.productionDate) {
            const year = new Date(q.productionDate).getFullYear()
            years.add(year)
          }
        })
        expenses.forEach((exp: any) => {
          if (exp.productionDate) {
            const year = new Date(exp.productionDate).getFullYear()
            years.add(year)
          }
        })
        setAvailableYears(Array.from(years).sort((a, b) => b - a))

        // Calculate stats with year filter
        calculateStats(invoices, quotations, selectedYear)
        calculateExpenseStats(expenses, selectedFinancialYear)
        calculateExtraExpenses(gearExpenses, bigExpenses, selectedFinancialYear)
        calculateMonthlyTrends(expenses, selectedTrendsYear)
        calculateProductExpenses(expenses, products, selectedProductsYear)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Recalculate stats when year filter changes
  useEffect(() => {
    const recalculateStats = async () => {
      try {
        const [invoicesRes, quotationsRes] = await Promise.all([
          fetch("/api/invoice"),
          fetch("/api/quotation"),
        ])

        const [invoices, quotations] = await Promise.all([
          invoicesRes.json(),
          quotationsRes.json(),
        ])

        calculateStats(invoices, quotations, selectedYear)
      } catch (error) {
        console.error("Error recalculating stats:", error)
      }
    }

    if (selectedYear && !loading) {
      recalculateStats()
    }
  }, [selectedYear])

  // Recalculate expense stats when financial year filter changes
  useEffect(() => {
    const recalculateExpenseStats = async () => {
      try {
        const [expensesRes, gearExpensesRes, bigExpensesRes] = await Promise.all([
          fetch("/api/expense"),
          fetch("/api/gear-expenses"),
          fetch("/api/big-expenses"),
        ])
        const [expenses, gearExpenses, bigExpenses] = await Promise.all([
          expensesRes.json(),
          gearExpensesRes.json(),
          bigExpensesRes.json(),
        ])
        calculateExpenseStats(expenses, selectedFinancialYear)
        calculateExtraExpenses(gearExpenses, bigExpenses, selectedFinancialYear)
      } catch (error) {
        console.error("Error recalculating expense stats:", error)
      }
    }

    if (selectedFinancialYear && !loading) {
      recalculateExpenseStats()
    }
  }, [selectedFinancialYear])

  // Recalculate trends when trends year filter changes
  useEffect(() => {
    const recalculateTrends = async () => {
      try {
        const expensesRes = await fetch("/api/expense")
        const expenses = await expensesRes.json()
        calculateMonthlyTrends(expenses, selectedTrendsYear)
      } catch (error) {
        console.error("Error recalculating trends:", error)
      }
    }

    if (selectedTrendsYear && !loading) {
      recalculateTrends()
    }
  }, [selectedTrendsYear])

  // Recalculate products when products year filter changes
  useEffect(() => {
    const recalculateProducts = async () => {
      try {
        const [expensesRes, productsRes] = await Promise.all([
          fetch("/api/expense"),
          fetch("/api/products")
        ])
        const [expenses, products] = await Promise.all([
          expensesRes.json(),
          productsRes.json()
        ])
        calculateProductExpenses(expenses, products, selectedProductsYear)
      } catch (error) {
        console.error("Error recalculating products:", error)
      }
    }

    if (selectedProductsYear && !loading) {
      recalculateProducts()
    }
  }, [selectedProductsYear])

  const calculateStats = (invoices: any[], quotations: any[], year: string) => {
    // Filter by year if not "all" - using productionDate
    const filteredInvoices = year === "all" 
      ? invoices 
      : invoices.filter((inv: any) => inv.productionDate && new Date(inv.productionDate).getFullYear().toString() === year)
    
    const filteredQuotations = year === "all"
      ? quotations
      : quotations.filter((q: any) => q.productionDate && new Date(q.productionDate).getFullYear().toString() === year)

    // Calculate invoice totals (sum of totalAmount for each status)
    const invoiceTotal = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoicePending = filteredInvoices.filter((inv: any) => inv.status === "pending").reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoicePaid = filteredInvoices.filter((inv: any) => inv.status === "paid").reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoiceDraftCount = filteredInvoices.filter((inv: any) => inv.status === "draft").length

    setInvoiceStats({
      total: invoiceTotal,
      draft: invoiceDraftCount,
      pending: invoicePending,
      paid: invoicePaid,
    })

    // Calculate quotation totals (sum of totalAmount for each status)
    const quotationTotal = filteredQuotations.reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationPending = filteredQuotations.filter((q: any) => q.status === "pending").reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationAccepted = filteredQuotations.filter((q: any) => q.status === "accepted").reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationDraftCount = filteredQuotations.filter((q: any) => q.status === "draft").length

    setQuotationStats({
      total: quotationTotal,
      draft: quotationDraftCount,
      pending: quotationPending,
      accepted: quotationAccepted,
    })
  }

  const calculateExpenseStats = (expenses: any[], year: string) => {
    // Filter by year if not "all" - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses
      : expenses.filter((exp: any) => exp.productionDate && new Date(exp.productionDate).getFullYear().toString() === year)

    // Only consider finalized expenses
    const finalExpenses = filteredExpenses.filter((exp: any) => exp.status === "final")

    let totalUnderBudget = 0
    let totalOverBudget = 0
    let totalEfficiency = 0
    let countWithPaid = 0
    let grossProfit = 0 // Total paid amount
    let totalActualExpenses = 0 // Total actual expenses

    finalExpenses.forEach((exp: any) => {
      const totalPaid = exp.paidAmount || 0
      const totalActual = exp.items.reduce((sum: number, item: any) => sum + item.actual, 0)
      const difference = totalPaid - totalActual

      // Accumulate for gross and net profit
      grossProfit += totalPaid
      totalActualExpenses += totalActual

      if (difference >= 0) {
        totalUnderBudget += difference
      } else {
        totalOverBudget += Math.abs(difference)
      }

      if (totalPaid > 0) {
        const efficiency = (difference / totalPaid) * 100
        totalEfficiency += efficiency
        countWithPaid++
      }
    })

    const netProfit = grossProfit - totalActualExpenses
    const marginPercentage = grossProfit > 0 ? (netProfit / grossProfit) * 100 : 0

    setExpenseStats({
      totalUnderBudget,
      totalOverBudget,
      averageEfficiency: countWithPaid > 0 ? totalEfficiency / countWithPaid : 0,
      grossProfit,
      netProfit,
      marginPercentage,
    })
  }

  const calculateExtraExpenses = (gearExpenses: any[], bigExpenses: any[], year: string) => {
    // Filter by year if not "all"
    const filteredGear = year === "all"
      ? gearExpenses
      : gearExpenses.filter((exp: any) => exp.year.toString() === year)
    
    const filteredBig = year === "all"
      ? bigExpenses
      : bigExpenses.filter((exp: any) => exp.year.toString() === year)

    const gearTotal = filteredGear.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
    const bigTotal = filteredBig.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

    setExtraExpenses({
      gearTotal,
      bigTotal,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateMonthlyTrends = (expenses: any[], year: string) => {
    // Filter expenses by year - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses.filter((exp: any) => exp.status === "final")
      : expenses.filter((exp: any) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })

    // Initialize monthly data
    const monthlyData: any = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach((month, index) => {
      monthlyData[index + 1] = {
        month,
        grossProfit: 0,
        netProfit: 0,
        underBudget: 0,
        overBudget: 0,
        projectCount: 0,
        totalInvoiceValue: 0,
      }
    })

    // Aggregate data by month
    filteredExpenses.forEach((exp: any) => {
      // Use expense's own productionDate for month aggregation
      const month = exp.productionDate 
        ? new Date(exp.productionDate).getMonth() + 1 
        : new Date(exp.createdAt).getMonth() + 1 // Fallback to createdAt if no productionDate
      const totalPaid = exp.paidAmount || 0
      const totalActual = exp.items.reduce((sum: number, item: any) => sum + item.actual, 0)
      const difference = totalPaid - totalActual

      // Convert to millions (Juta Rupiah) - divide by 1,000,000
      monthlyData[month].grossProfit += totalPaid / 1000000
      monthlyData[month].netProfit += difference / 1000000
      monthlyData[month].projectCount += 1
      monthlyData[month].totalInvoiceValue += totalPaid

      if (difference >= 0) {
        monthlyData[month].underBudget += difference / 1000000
      } else {
        monthlyData[month].overBudget += Math.abs(difference) / 1000000
      }
    })

    // Calculate derived metrics
    Object.keys(monthlyData).forEach((monthKey) => {
      const data = monthlyData[monthKey]
      // Profit margin percentage
      data.profitMargin = data.grossProfit > 0 ? (data.netProfit / data.grossProfit) * 100 : 0
      // Average invoice value in millions
      data.averageValue = data.projectCount > 0 ? data.totalInvoiceValue / data.projectCount / 1000000 : 0
    })

    // Convert to array format for recharts
    const trendsData = Object.values(monthlyData)
    setMonthlyTrends(trendsData)
  }

  const calculateProductExpenses = (expenses: any[], products: any[], year: string) => {
    // Filter by year and only finalized expenses - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses.filter((exp: any) => exp.status === "final")
      : expenses.filter((exp: any) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })
    
    // Get master product names
    const masterProductNames = products.map((p: any) => p.name)
    
    // Aggregate expenses by product
    const productTotals: { [key: string]: number } = {}
    const etcTotals: { [key: string]: number } = {}
    
    filteredExpenses.forEach((exp: any) => {
      exp.items.forEach((item: any) => {
        const actual = item.actual || 0
        const productName = item.productName
        
        // Check if product is from master data
        if (masterProductNames.includes(productName)) {
          productTotals[productName] = (productTotals[productName] || 0) + actual
        } else {
          // It's an ETC item (manually typed)
          etcTotals[productName] = (etcTotals[productName] || 0) + actual
        }
      })
    })
    
    // Convert to array and sort by amount (descending)
    const productArray = Object.entries(productTotals).map(([name, amount]) => ({
      name,
      amount: amount / 1000000, // Convert to millions
      percentage: 0, // Will be calculated below
    })).sort((a, b) => b.amount - a.amount)
    
    const etcArray = Object.entries(etcTotals).map(([name, amount]) => ({
      name,
      amount: amount / 1000000, // Convert to millions
      percentage: 0, // Will be calculated below
    })).sort((a, b) => b.amount - a.amount)
    
    // Calculate totals for percentage
    const totalProductExpense = productArray.reduce((sum, p) => sum + p.amount, 0)
    const totalEtcExpense = etcArray.reduce((sum, p) => sum + p.amount, 0)
    
    // Add percentage
    productArray.forEach(p => {
      p.percentage = totalProductExpense > 0 ? (p.amount / totalProductExpense) * 100 : 0
    })
    
    etcArray.forEach(p => {
      p.percentage = totalEtcExpense > 0 ? (p.amount / totalEtcExpense) * 100 : 0
    })
    
    setProductExpenses(productArray)
    setEtcExpenses(etcArray)
  }

  // Get least expense, excluding PHOTOGRAPHER (since it's profit, not expense)
  const getLeastExpense = () => {
    // Start from the end (least) and find first non-PHOTOGRAPHER product
    for (let i = productExpenses.length - 1; i >= 0; i--) {
      if (productExpenses[i].name.toUpperCase() !== "PHOTOGRAPHER") {
        return productExpenses[i]
      }
    }
    // If all products are PHOTOGRAPHER (unlikely), return null
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-12">
          {/* Quick Action Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Quick Action</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Planning Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/planning')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Planning</CardTitle>
                </CardHeader>
              </Card>

              {/* Quotation Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/quotation')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Quotation</CardTitle>
                </CardHeader>
              </Card>

              {/* Invoice Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/invoice')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Invoice</CardTitle>
                </CardHeader>
              </Card>

              {/* Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/expense')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Expenses</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Management Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Management</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Companies Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/companies')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Companies</CardTitle>
                </CardHeader>
              </Card>

              {/* Billings Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/billings')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Billings</CardTitle>
                </CardHeader>
              </Card>

              {/* Signatures Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/signatures')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Signatures</CardTitle>
                </CardHeader>
              </Card>

              {/* Products Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/products')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Special Case Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Special Case</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Paragon Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/paragon')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Paragon</CardTitle>
                </CardHeader>
              </Card>

              {/* Erha Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/erha')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Erha</CardTitle>
                </CardHeader>
              </Card>

              {/* Gear Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/gear-expenses')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Gear Expenses</CardTitle>
                </CardHeader>
              </Card>

              {/* Big Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/big-expenses')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Big Expenses</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Quotations & Invoices Analytics Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Quotations & Invoices</h2>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-8 w-16 bg-muted rounded mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => router.push('/quotation')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(quotationStats.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total value</p>
                  </CardContent>
                </Card>

                {/* Draft Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-yellow-500/50"
                  onClick={() => router.push('/quotation?status=draft')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Draft Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">{quotationStats.draft}</div>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </CardContent>
                </Card>

                {/* Pending Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
                  onClick={() => router.push('/quotation?status=pending')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(quotationStats.pending)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting acceptance</p>
                  </CardContent>
                </Card>

                {/* Accepted Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
                  onClick={() => router.push('/quotation?status=accepted')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Accepted Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(quotationStats.accepted)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>

                {/* Total Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => router.push('/invoice')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(invoiceStats.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total value</p>
                  </CardContent>
                </Card>

                {/* Draft Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-yellow-500/50"
                  onClick={() => router.push('/invoice?status=draft')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Draft Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">{invoiceStats.draft}</div>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </CardContent>
                </Card>

                {/* Pending Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
                  onClick={() => router.push('/invoice?status=pending')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(invoiceStats.pending)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
                  </CardContent>
                </Card>

                {/* Paid Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
                  onClick={() => router.push('/invoice?status=paid')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Paid Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(invoiceStats.paid)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Financial Health Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Financial Health</h2>
              </div>
              <Select value={selectedFinancialYear} onValueChange={setSelectedFinancialYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <>
                <Card className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="animate-pulse border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Under Budget */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Under Budget</p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(expenseStats.totalUnderBudget)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total savings</p>
                      </div>

                      {/* Over Budget */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Over Budget</p>
                        <p className="text-3xl font-bold text-red-600">
                          {formatCurrency(expenseStats.totalOverBudget)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total overspend</p>
                      </div>

                      {/* Efficiency */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                        <p className={`text-3xl font-bold ${
                          expenseStats.averageEfficiency >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {expenseStats.averageEfficiency.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Average efficiency</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Gross Profit */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(expenseStats.grossProfit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total client paid amount</p>
                      </div>

                      {/* Net Profit */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                        <p className={`text-3xl font-bold ${
                          expenseStats.netProfit >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {formatCurrency(expenseStats.netProfit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Paid - Actual expenses</p>
                      </div>

                      {/* Margin Percentage */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Margin</p>
                        <p className={`text-3xl font-bold ${
                          expenseStats.marginPercentage >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {expenseStats.marginPercentage.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Profit margin</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Extra Expenses Card */}
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Net Profit After Expenses */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Net Profit After Expenses</p>
                        <p className={`text-3xl font-bold ${
                          (expenseStats.netProfit - extraExpenses.gearTotal - extraExpenses.bigTotal) >= 0 
                            ? "text-green-600" 
                            : "text-red-600"
                        }`}>
                          {formatCurrency(expenseStats.netProfit - extraExpenses.gearTotal - extraExpenses.bigTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Net - Gear - Big expenses</p>
                      </div>

                      {/* Gear Expenses */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Gear Expenses</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {formatCurrency(extraExpenses.gearTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total gear expenses</p>
                      </div>

                      {/* Big Expenses */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Big Expenses</p>
                        <p className="text-3xl font-bold text-red-600">
                          {formatCurrency(extraExpenses.bigTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total big expenses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Financial Trends Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Financial Trends</h2>
              </div>
              <Select value={selectedTrendsYear} onValueChange={setSelectedTrendsYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                {/* Profit Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Gross & Net Profit Trends</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Amounts in Juta Rupiah (Millions)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `Rp ${Number(value).toFixed(2)} Juta`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="grossProfit" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="Gross Profit"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="netProfit" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="Net Profit"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Budget Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget Trends</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Amounts in Juta Rupiah (Millions)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `Rp ${Number(value).toFixed(2)} Juta`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="underBudget" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="Under Budget"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="overBudget" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="Over Budget"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Profit Margin and Project Volume */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Profit Margin Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profit Margin Trend</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Percentage of net profit to gross profit</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: '%', position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value) => `${Number(value).toFixed(2)}%`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="profitMargin" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Profit Margin"
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Project Volume Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Volume Trend</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Number of completed projects per month</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `${value} projects`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="projectCount" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Project Count"
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              </>
            )}
          </div>

          {/* Products Overview Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Products Overview</h2>
              </div>
              <Select value={selectedProductsYear} onValueChange={setSelectedProductsYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Master Products Cards */}
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Most Expense Card */}
                      <Card className={`border-2 ${productExpenses[0] ? 'border-blue-200' : 'border-transparent'}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className={`text-sm font-medium text-muted-foreground ${!productExpenses[0] && 'invisible'}`}>
                            Most Expense
                          </CardTitle>
                        </CardHeader>
                        <CardContent className={!productExpenses[0] ? 'invisible' : ''}>
                          {productExpenses[0] ? (
                            <>
                              <div className="text-2xl font-bold text-blue-600">
                                Rp {productExpenses[0].amount.toFixed(2)} Juta
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {productExpenses[0].name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {productExpenses[0].percentage.toFixed(1)}% of total
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold">Placeholder</div>
                              <p className="text-sm mt-1">Placeholder</p>
                              <p className="text-xs mt-1">Placeholder</p>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* Least Expense Card */}
                      {(() => {
                        const leastExpense = getLeastExpense()
                        return (
                          <Card className={`border-2 ${leastExpense ? 'border-green-200' : 'border-transparent'}`}>
                            <CardHeader className="pb-3">
                              <CardTitle className={`text-sm font-medium text-muted-foreground ${!leastExpense && 'invisible'}`}>
                                Least Expense
                              </CardTitle>
                            </CardHeader>
                            <CardContent className={!leastExpense ? 'invisible' : ''}>
                              {leastExpense ? (
                                <>
                                  <div className="text-2xl font-bold text-green-600">
                                    Rp {leastExpense.amount.toFixed(2)} Juta
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {leastExpense.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {leastExpense.percentage.toFixed(1)}% of total
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-bold">Placeholder</div>
                                  <p className="text-sm mt-1">Placeholder</p>
                                  <p className="text-xs mt-1">Placeholder</p>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })()}
                    </div>

                    {/* Master Products Chart */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Master Products Expenses</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Top expenses from master product data (Juta Rupiah)</p>
                  </CardHeader>
                  <CardContent>
                    {productExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height={showAllProducts ? Math.max(400, productExpenses.length * 50) : 400}>
                        <BarChart 
                          data={showAllProducts ? productExpenses : productExpenses.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip 
                            formatter={(value, _name, props: any) => [
                              `Rp ${Number(value).toFixed(2)} Juta (${props.payload.percentage.toFixed(1)}%)`,
                              'Amount'
                            ]}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                          />
                          <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                            {(showAllProducts ? productExpenses : productExpenses.slice(0, 5)).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#2563eb" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No master products expenses found
                      </div>
                    )}
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAllProducts(!showAllProducts)}
                        className={productExpenses.length <= 5 ? "invisible" : ""}
                      >
                        {showAllProducts ? "Show Less" : `See More (${productExpenses.length - 5} more)`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ETC Items Cards and Chart */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* First Most ETC Expense Card */}
                  <Card 
                    className={`border-2 ${etcExpenses[0] ? 'border-red-200 cursor-pointer hover:shadow-lg transition-all' : 'border-transparent'}`}
                    onClick={etcExpenses[0] ? () => {
                      // Store the product name for auto-fill
                      sessionStorage.setItem('newProductName', etcExpenses[0].name)
                      sessionStorage.setItem('fromLanding', 'true')
                      router.push('/products?action=create')
                    } : undefined}
                    title={etcExpenses[0] ? "Click to add this to product master" : undefined}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm font-medium text-muted-foreground ${!etcExpenses[0] && 'invisible'}`}>
                        1st Most ETC Expense
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={!etcExpenses[0] ? 'invisible' : ''}>
                      {etcExpenses[0] ? (
                        <>
                          <div className="text-2xl font-bold text-red-600">
                            Rp {etcExpenses[0].amount.toFixed(2)} Juta
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {etcExpenses[0].name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {etcExpenses[0].percentage.toFixed(1)}% of ETC total
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">Placeholder</div>
                          <p className="text-sm mt-1">Placeholder</p>
                          <p className="text-xs mt-1">Placeholder</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Second Most ETC Expense Card */}
                  <Card 
                    className={`border-2 ${etcExpenses[1] ? 'border-orange-200 cursor-pointer hover:shadow-lg transition-all' : 'border-transparent'}`}
                    onClick={etcExpenses[1] ? () => {
                      // Store the product name for auto-fill
                      sessionStorage.setItem('newProductName', etcExpenses[1].name)
                      sessionStorage.setItem('fromLanding', 'true')
                      router.push('/products?action=create')
                    } : undefined}
                    title={etcExpenses[1] ? "Click to add this to product master" : undefined}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm font-medium text-muted-foreground ${!etcExpenses[1] && 'invisible'}`}>
                        2nd Most ETC Expense
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={!etcExpenses[1] ? 'invisible' : ''}>
                      {etcExpenses[1] ? (
                        <>
                          <div className="text-2xl font-bold text-orange-600">
                            Rp {etcExpenses[1].amount.toFixed(2)} Juta
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {etcExpenses[1].name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {etcExpenses[1].percentage.toFixed(1)}% of ETC total
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">Placeholder</div>
                          <p className="text-sm mt-1">Placeholder</p>
                          <p className="text-xs mt-1">Placeholder</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ETC Items Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ETC Items Expenses</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Top 5 manually entered items (Juta Rupiah)</p>
                  </CardHeader>
                  <CardContent>
                    {etcExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={etcExpenses.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip 
                            formatter={(value, _name, props: any) => [
                              `Rp ${Number(value).toFixed(2)} Juta (${props.payload.percentage.toFixed(1)}%)`,
                              'Amount'
                            ]}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                          />
                          <Bar dataKey="amount" fill="#dc2626" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No ETC items found
                      </div>
                    )}
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="invisible"
                      >
                        Placeholder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
