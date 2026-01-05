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
    width: "40%",
  },
  tableCol2: {
    width: "20%",
    textAlign: "right",
  },
  tableCol3: {
    width: "20%",
    textAlign: "right",
  },
  tableCol4: {
    width: "20%",
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
  differencePositive: {
    color: "#16a34a",
  },
  differenceNegative: {
    color: "#dc2626",
  },
  itemTotalsBox: {
    marginTop: 20,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f5f5f5",
    border: "2 dashed #d1d5db",
    borderRadius: 5,
  },
  itemTotalsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 8,
  },
  itemTotalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    fontSize: 9,
    color: "#6b7280",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
    borderTop: "1 solid #ddd",
    paddingTop: 10,
  },
})

interface ExpensePDFProps {
  data: {
    expenseId: string
    projectName: string
    productionDate: string
    clientBudget: number
    paidAmount: number
    totalItemBudgeted: number
    totalItemDifferences: number
    notes?: string
    status: string
    items: Array<{
      productName: string
      budgeted: number
      actual: number
      difference: number
    }>
    createdAt: string
    updatedAt: string
  }
}

export const ExpensePDF: React.FC<ExpensePDFProps> = ({ data }) => {
  const totalBudget = data.clientBudget // From client budget field
  const totalPaid = data.paidAmount // From paid amount field
  const totalActual = data.items.reduce((sum, item) => sum + item.actual, 0)
  const totalDifference = totalPaid - totalActual // Paid - Actual

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>EXPENSE REPORT</Text>
          <Text style={styles.subtitle}>
            {data.expenseId} - {new Date(data.createdAt).toLocaleDateString("id-ID")}
          </Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Expense ID:</Text>
            <Text style={styles.value}>{data.expenseId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Project Name:</Text>
            <Text style={styles.value}>{data.projectName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Production Date:</Text>
            <Text style={styles.value}>
              {new Date(data.productionDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Budget:</Text>
            <Text style={styles.value}>{formatCurrency(data.clientBudget)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Paid Amount:</Text>
            <Text style={styles.value}>{formatCurrency(data.paidAmount)}</Text>
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
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.tableCol1}>Product Name</Text>
              <Text style={styles.tableCol2}>Budgeted</Text>
              <Text style={styles.tableCol3}>Actual</Text>
              <Text style={styles.tableCol4}>Difference</Text>
            </View>

            {/* Add spacer */}
            <View style={{ height: 5 }} />

            {data.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{item.productName}</Text>
                <Text style={styles.tableCol2}>{formatCurrency(item.budgeted)}</Text>
                <Text style={styles.tableCol3}>{formatCurrency(item.actual)}</Text>
                <Text style={[
                  styles.tableCol4,
                  item.difference >= 0 ? styles.differencePositive : styles.differenceNegative
                ]}>
                  {formatCurrency(item.difference)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Item Totals (For Reference) */}
        <View style={styles.itemTotalsBox} break>
          <Text style={styles.itemTotalsTitle}>Item Totals (For Reference)</Text>
          <View style={styles.itemTotalsRow}>
            <Text>Sum of Item Budgeted:</Text>
            <Text>{formatCurrency(data.totalItemBudgeted)}</Text>
          </View>
          <View style={styles.itemTotalsRow}>
            <Text>Sum of Item Differences:</Text>
            <Text style={
              data.totalItemDifferences >= 0 ? styles.differencePositive : styles.differenceNegative
            }>
              {formatCurrency(data.totalItemDifferences)}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Budget:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Actual:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalActual)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Difference:</Text>
            <Text style={[
              styles.summaryValue,
              totalDifference >= 0 ? styles.differencePositive : styles.differenceNegative
            ]}>
              {formatCurrency(totalDifference)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generated on {new Date().toLocaleDateString("id-ID")} | {data.expenseId}
        </Text>
      </Page>
    </Document>
  )
}

