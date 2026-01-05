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
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    width: "60%",
  },
  headerRight: {
    width: "40%",
    textAlign: "right",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 3,
  },
  ticketNumber: {
    fontSize: 10,
    marginBottom: 5,
  },
  dateLocation: {
    fontSize: 10,
    marginBottom: 2,
  },
  companySection: {
    marginBottom: 15,
  },
  companyTitle: {
    fontSize: 10,
    marginBottom: 3,
  },
  companyName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 9,
    marginBottom: 1,
    lineHeight: 1.3,
  },
  billToSection: {
    marginBottom: 15,
  },
  billToTitle: {
    fontSize: 10,
    marginBottom: 3,
  },
  billToValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  billToAddress: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#B4C7E7",
    padding: 6,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    minHeight: 20,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    minHeight: 20,
    backgroundColor: "#F8F8F8",
  },
  col1: { width: "30%", paddingRight: 4 },
  col2: { width: "30%", paddingRight: 4 },
  col3: { width: "15%", textAlign: "right", paddingRight: 4 },
  col4: { width: "8%", textAlign: "center" },
  col5: { width: "17%", textAlign: "right" },
  summarySection: {
    marginTop: 10,
    marginBottom: 15,
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
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    width: "80%",
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    width: "20%",
  },
  summaryValueHighlight: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    width: "20%",
    color: "#C00000",
  },
  remarksSection: {
    marginBottom: 20,
  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  remarkItem: {
    fontSize: 8,
    marginBottom: 1,
    lineHeight: 1.3,
  },
  remarkItemStrikethrough: {
    fontSize: 8,
    marginBottom: 1,
    lineHeight: 1.3,
    textDecoration: "line-through",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  footerLeft: {
    width: "45%",
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

interface ErhaQuotationPDFProps {
  data: {
    ticketId: string
    quotationId: string
    companyName: string
    companyAddress: string
    companyCity: string
    companyProvince: string
    companyPostalCode?: string
    companyTelp?: string
    companyEmail?: string
    quotationDate: string
    billTo: string
    billToAddress?: string
    contactPerson: string
    contactPosition: string
    productionDate: string
    signatureName: string
    signatureRole?: string
    signatureImageData: string
    billingName?: string
    billingBankName?: string
    billingBankAccount?: string
    billingBankAccountName?: string
    billingNpwp?: string
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

export const ErhaQuotationPDF: React.FC<ErhaQuotationPDFProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return `Rp${new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(amount)}`
  }

  // Calculate totals
  const calculateGrossTotal = () => {
    // Total before PPh deduction (Total Inc PPH)
    return data.totalAmount
  }

  const calculatePph = () => {
    // PPh amount based on percentage
    const pphRate = parseFloat(data.pph) / 100
    return data.totalAmount * pphRate
  }

  const calculateNett = () => {
    // Nett amount after PPh deduction
    return data.totalAmount - calculatePph()
  }

  // Flatten items for table - each detail is a separate row
  // Only show product name on first detail of each product
  const flattenedItems = data.items.flatMap((item) =>
    item.details.map((detail, index) => ({
      productName: index === 0 ? item.productName : "", // Only show on first row
      detail: detail.detail,
      unitPrice: detail.unitPrice,
      qty: detail.qty,
      amount: detail.amount,
    }))
  )

  // Get remark style based on content
  const getRemarkStyle = (text: string) => {
    // Check if the text is marked as completed (strikethrough in original data)
    // For now, all remarks use the same style (no colors)
    return styles.remarkItem
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>QUOTATION</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.ticketNumber}>No : {data.quotationId}</Text>
            <Text style={styles.dateLocation}>
              {data.companyCity}, {new Date(data.quotationDate).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Company Section */}
        <View style={styles.companySection}>
          <Text style={styles.companyTitle}>Company</Text>
          <Text style={styles.companyName}>{data.companyName}</Text>
          <Text style={styles.companyDetail}>{data.companyAddress},</Text>
          <Text style={styles.companyDetail}>
            Kec {data.companyCity}, {data.companyProvince} {data.companyPostalCode}
          </Text>
          <Text style={styles.companyDetail}>
            {data.companyTelp} / {data.companyEmail}
          </Text>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToTitle}>Bill To:</Text>
          <Text style={styles.billToValue}>{data.billTo}</Text>
          {data.billToAddress && (
            <Text style={styles.billToAddress}>{data.billToAddress}</Text>
          )}
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>PRODUCT NAME</Text>
            <Text style={styles.col2}>Detail</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Qty</Text>
            <Text style={styles.col5}>TOTAL</Text>
          </View>

          {/* Table Rows - Each detail as separate row */}
          {flattenedItems.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{item.productName}</Text>
              <Text style={styles.col2}>{item.detail}</Text>
              <Text style={styles.col3}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.col4}>{item.qty}</Text>
              <Text style={styles.col5}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Inc PPH</Text>
              <Text style={styles.summaryValue}>{formatCurrency(calculateGrossTotal())}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>PPH 23</Text>
              <Text style={styles.summaryValueHighlight}>{formatCurrency(calculatePph())}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nett</Text>
              <Text style={styles.summaryValue}>{formatCurrency(calculateNett())}</Text>
            </View>
          </View>
        </View>

        {/* Remarks */}
        {data.remarks && data.remarks.length > 0 && (
          <View style={styles.remarksSection} wrap={false}>
            <Text style={styles.remarksTitle}>Remarks :</Text>
            {data.remarks
              .filter((remark) => remark.text.trim())
              .map((remark, index) => (
                <Text 
                  key={index} 
                  style={remark.isCompleted ? styles.remarkItemStrikethrough : styles.remarkItem}
                >
                  {remark.text}
                </Text>
              ))}
          </View>
        )}

        {/* Billing Information - Separate section below remarks */}
        {data.billingName && (
          <View style={{ marginBottom: 20 }} wrap={false}>
            <Text style={styles.remarkItem}>{data.billingName}</Text>
            {data.billingBankName && data.billingBankAccount && data.billingBankAccountName && (
              <Text style={styles.remarkItem}>
                Bank {data.billingBankName} {data.billingBankAccount} an {data.billingBankAccountName}
              </Text>
            )}
            {data.billingNpwp && (
              <Text style={styles.remarkItem}>NO NPWP CV : {data.billingNpwp}</Text>
            )}
          </View>
        )}

        {/* Footer with Signature */}
        <View style={styles.footer} wrap={false}>
          {/* Left: Empty or Client */}
          <View style={styles.footerLeft} />

          {/* Right: Company Signature */}
          <View style={styles.footerRight}>
            <Text style={{ fontSize: 10, marginBottom: 5 }}>Best Regards,</Text>
            {data.signatureImageData && (
              <Image src={data.signatureImageData} style={styles.signatureImage} />
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

