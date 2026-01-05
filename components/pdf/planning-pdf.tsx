import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    padding: 5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    fontWeight: "bold",
  },
  value: {
    width: "70%",
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000",
    color: "#fff",
    padding: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #ddd",
    padding: 5,
    minHeight: 25,
  },
  tableCol1: {
    width: "5%",
  },
  tableCol2: {
    width: "40%",
  },
  tableCol3: {
    width: "18%",
    textAlign: "right",
  },
  tableCol4: {
    width: "18%",
    textAlign: "right",
  },
  tableCol5: {
    width: "19%",
    textAlign: "right",
  },
  summary: {
    marginTop: 20,
    marginBottom: 50,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontWeight: "bold",
  },
  summaryValue: {
    fontWeight: "bold",
  },
  profitPositive: {
    color: "green",
  },
  profitNegative: {
    color: "red",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#666",
    fontSize: 8,
    borderTop: "1 solid #ddd",
    paddingTop: 10,
  },
})

interface PlanningItem {
  productName: string
  budget: number
  expense: number
}

interface PlanningPDFProps {
  data: {
    planningId: string
    projectName: string
    clientName: string
    clientBudget: number
    notes?: string
    status: string
    items: PlanningItem[]
    createdAt: string
    updatedAt: string
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

export const PlanningPDF: React.FC<PlanningPDFProps> = ({ data }) => {
  const calculateTotals = () => {
    const totalBudget = data.items.reduce((sum, item) => sum + item.budget, 0)
    const totalExpense = data.items.reduce((sum, item) => sum + item.expense, 0)
    const totalProfit = totalBudget - totalExpense
    const margin = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0
    return { totalBudget, totalExpense, totalProfit, margin }
  }

  const totals = calculateTotals()

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>PLANNING DOCUMENT</Text>
          <Text style={styles.subtitle}>{data.planningId}</Text>
        </View>

        {/* Project Information */}
        <View style={styles.section} break={false}>
          <Text style={styles.sectionTitle}>Project Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Project Name:</Text>
            <Text style={styles.value}>{data.projectName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{data.clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Budget:</Text>
            <Text style={styles.value}>{formatCurrency(data.clientBudget)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>
              {new Date(data.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          {data.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{data.notes}</Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.section} break={false}>
          <Text style={styles.sectionTitle}>Budget Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.tableCol1}>#</Text>
              <Text style={styles.tableCol2}>Product</Text>
              <Text style={styles.tableCol3}>Budget</Text>
              <Text style={styles.tableCol4}>Expense</Text>
              <Text style={styles.tableCol5}>Profit</Text>
            </View>
            {data.items.map((item, index) => {
              const profit = item.budget - item.expense
              return (
                <View key={index} style={styles.tableRow} wrap={false}>
                  <Text style={styles.tableCol1}>{index + 1}</Text>
                  <Text style={styles.tableCol2}>{item.productName}</Text>
                  <Text style={styles.tableCol3}>{formatCurrency(item.budget)}</Text>
                  <Text style={styles.tableCol4}>{formatCurrency(item.expense)}</Text>
                  <Text
                    style={[
                      styles.tableCol5,
                      profit >= 0 ? styles.profitPositive : styles.profitNegative,
                    ]}
                  >
                    {formatCurrency(profit)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary} wrap={false}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent" }]}>
            Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Budget:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.totalBudget)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Expense:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.totalExpense)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                totals.totalProfit >= 0 ? styles.profitPositive : styles.profitNegative,
              ]}
            >
              Total Profit:
            </Text>
            <Text
              style={[
                styles.summaryValue,
                totals.totalProfit >= 0 ? styles.profitPositive : styles.profitNegative,
              ]}
            >
              {formatCurrency(totals.totalProfit)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                totals.margin >= 0 ? styles.profitPositive : styles.profitNegative,
              ]}
            >
              Margin:
            </Text>
            <Text
              style={[
                styles.summaryValue,
                totals.margin >= 0 ? styles.profitPositive : styles.profitNegative,
              ]}
            >
              {totals.margin.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generated on {new Date().toLocaleDateString("id-ID")} | Financial Master Dashboard
        </Text>
      </Page>
    </Document>
  )
}

