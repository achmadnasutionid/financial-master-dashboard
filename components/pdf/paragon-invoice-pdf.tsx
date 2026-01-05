import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 20,
  },
  dateLocation: {
    textAlign: "right",
    fontSize: 10,
    marginBottom: 10,
  },
  companySection: {
    marginBottom: 20,
  },
  companyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  companyName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#C00000",
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  billToSection: {
    marginBottom: 15,
  },
  billToTitle: {
    fontSize: 10,
    marginBottom: 3,
  },
  billToValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  productionDate: {
    marginBottom: 20,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#B4C7E7",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
    padding: 8,
    fontSize: 9,
  },
  col1: { width: "25%" },
  col2: { width: "30%" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "10%", textAlign: "center" },
  col5: { width: "20%", textAlign: "right" },
  summarySection: {
    marginTop: 10,
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: "#E7E6E6",
    padding: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
    width: "70%",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
    width: "30%",
  },
  remarksSection: {
    marginBottom: 30,
  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  remarkItem: {
    fontSize: 9,
    marginBottom: 2,
    color: "#C00000",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 30,
  },
  footerRight: {
    width: "45%",
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 10,
    marginBottom: 5,
  },
  signatureImage: {
    width: 80,
    height: 40,
    marginBottom: 5,
  },
  footerName: {
    fontSize: 10,
    fontWeight: "bold",
    textDecoration: "underline",
  },
  footerRole: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
})

interface ParagonInvoicePDFProps {
  data: {
    ticketId: string
    quotationId: string
    invoiceId: string // Invoice ID from main database
    companyName: string
    companyAddress: string
    companyCity: string
    companyProvince: string
    companyPostalCode?: string
    companyTelp?: string
    companyEmail?: string
    invoiceBastDate: string // Use invoice/BAST date
    billTo: string
    contactPerson: string
    contactPosition: string
    productionDate: string
    signatureName: string
    signatureRole?: string
    signatureImageData: string
    pph: string
    totalAmount: number
    remarks?: Array<{
      text: string
      isCompleted: boolean
    }>
    items: Array<{
      productName: string
      total: number
      details: Array<{
        detail: string
        unitPrice: number
        qty: number
        amount: number
      }>
    }>
    updatedAt: string
  }
}

export const ParagonInvoicePDF: React.FC<ParagonInvoicePDFProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // For Paragon, subtotal is the final total amount (PPh already included in prices)
  const calculateSubtotal = () => {
    return data.totalAmount
  }

  const calculatePph = () => {
    // PPh is 0 for Paragon because it's already included in the price
    return 0
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>Number : {data.invoiceId}</Text>
          <Text style={styles.dateLocation}>
            {data.companyCity}, {new Date(data.invoiceBastDate).toLocaleDateString("id-ID")}
          </Text>
        </View>

        {/* Company Section */}
        <View style={styles.companySection}>
          <Text style={styles.companyTitle}>Company</Text>
          <Text style={styles.companyName}>{data.companyName}</Text>
          <Text style={styles.companyDetail}>{data.companyAddress}</Text>
          <Text style={styles.companyDetail}>
            Kec. Pd. Aren, Kota {data.companyCity}, {data.companyProvince} {data.companyPostalCode}
          </Text>
          <Text style={styles.companyDetail}>
            {data.companyTelp} / {data.companyEmail}
          </Text>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToTitle}>Bill To:</Text>
          <Text style={styles.billToValue}>{data.billTo}</Text>
        </View>

        {/* Production Date */}
        <View style={styles.productionDate}>
          <Text style={{ fontSize: 10 }}>
            Production Date : {new Date(data.productionDate).toLocaleDateString("id-ID")}
          </Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Product Name</Text>
            <Text style={styles.col2}>Detail</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Qty</Text>
            <Text style={styles.col5}>Amount</Text>
          </View>

          {/* Table Rows */}
          {(() => {
            // Combine ALL products with line breaks
            const allProducts = data.items.map(item => item.productName).join("\n")
            
            // Combine ALL details from ALL items with line breaks
            const allDetails = data.items
              .flatMap(item => item.details.map(d => d.detail))
              .join("\n")
            
            // Unit price is the TOTAL AMOUNT (after PPh) from data
            const finalTotal = data.totalAmount
            
            return (
              <View style={styles.tableRow}>
                <Text style={styles.col1}>{allProducts}</Text>
                <Text style={styles.col2}>{allDetails}</Text>
                <Text style={styles.col3}>{formatCurrency(finalTotal)}</Text>
                <Text style={styles.col4}>1</Text>
                <Text style={styles.col5}>{formatCurrency(finalTotal)}</Text>
              </View>
            )
          })()}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Remarks */}
        {data.remarks && data.remarks.length > 0 && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>Remarks:</Text>
            {data.remarks.map((remark, index) => (
              <Text
                key={index}
                style={{
                  ...styles.remarkItem,
                  textDecoration: remark.isCompleted ? "line-through" : "none",
                }}
              >
                • {remark.text}
              </Text>
            ))}
          </View>
        )}

        {/* Footer - Only Best Regards (no Menyetujui section) */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Best Regards,</Text>
            {data.signatureImageData && (
              <Image
                src={data.signatureImageData}
                style={styles.signatureImage}
              />
            )}
            <Text style={styles.footerName}>{data.signatureName}</Text>
            {data.signatureRole && (
              <Text style={styles.footerRole}>{data.signatureRole}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

