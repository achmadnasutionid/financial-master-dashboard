import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { PPH_OPTIONS } from "@/lib/constants"

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "30%",
    fontWeight: "bold",
    fontSize: 8,
  },
  value: {
    width: "70%",
    fontSize: 8,
  },
  grid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  gridCol: {
    width: "50%",
    paddingRight: 10,
  },
  table: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000",
    color: "#fff",
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #ddd",
    padding: 4,
    minHeight: 20,
  },
  col1: { width: "50%" },
  col2: { width: "17%", textAlign: "right" },
  col3: { width: "16%", textAlign: "right" },
  col4: { width: "17%", textAlign: "right" },
  summary: {
    marginTop: 12,
    marginBottom: 50,
    padding: 8,
    backgroundColor: "#f9f9f9",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "2 solid #000",
    fontSize: 11,
    fontWeight: "bold",
  },
  signature: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "40%",
    alignItems: "flex-end",
  },
  signatureLabel: {
    fontSize: 9,
    marginBottom: 5,
  },
  signatureImage: {
    maxWidth: 150,
    maxHeight: 60,
    objectFit: "contain",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#666",
    fontSize: 7,
    borderTop: "1 solid #ddd",
    paddingTop: 8,
  },
})

interface QuotationPDFProps {
  data: {
    quotationId: string
    companyName: string
    companyAddress: string
    companyCity: string
    companyProvince: string
    companyPostalCode?: string
    companyTelp?: string
    companyEmail?: string
    productionDate: string
    billTo: string
    notes?: string
    billingName: string
    billingBankName: string
    billingBankAccount: string
    billingBankAccountName: string
    signatureName: string
    signatureRole?: string
    signatureImageData: string
    pph: string
    totalAmount: number
    status: string
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

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ data }) => {
  // Items total is the NET amount (after tax deduction)
  const netAmount = data.items.reduce((sum, item) => sum + item.total, 0)
  
  // Calculate GROSS amount (before tax deduction)
  // Formula: Gross = Net × (100 / (100 - pph%))
  const pphRate = parseFloat(data.pph)
  const grossAmount = pphRate > 0 ? netAmount * (100 / (100 - pphRate)) : netAmount
  
  // PPh amount is the difference
  const pphAmount = grossAmount - netAmount
  
  // Get PPh label from constants
  const pphOption = PPH_OPTIONS.find(option => option.value === data.pph)
  const pphLabel = pphOption ? pphOption.label : `PPh (${data.pph}%)`
  
  // Split PPh label into main text and note (if exists)
  const pphParts = pphLabel.split(' - After reporting')
  const pphMainLabel = pphParts[0]
  const pphNote = pphParts[1] ? 'After reporting' + pphParts[1] : null

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>QUOTATION</Text>
          <Text style={styles.subtitle}>
            {data.quotationId} - {new Date(data.createdAt).toLocaleDateString("id-ID")}
          </Text>
        </View>

        {/* Company & Basic Info */}
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.companyName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{data.companyAddress}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>City:</Text>
              <Text style={styles.value}>{data.companyCity}, {data.companyProvince}</Text>
            </View>
            {data.companyPostalCode && (
              <View style={styles.row}>
                <Text style={styles.label}>Postal Code:</Text>
                <Text style={styles.value}>{data.companyPostalCode}</Text>
              </View>
            )}
            {data.companyTelp && (
              <View style={styles.row}>
                <Text style={styles.label}>Tel:</Text>
                <Text style={styles.value}>{data.companyTelp}</Text>
              </View>
            )}
            {data.companyEmail && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{data.companyEmail}</Text>
              </View>
            )}
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.sectionTitle}>Quotation Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Production Date:</Text>
              <Text style={styles.value}>
                {new Date(data.productionDate).toLocaleDateString("id-ID")}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Bill To:</Text>
              <Text style={styles.value}>{data.billTo}</Text>
            </View>
            {data.notes && (
              <View style={styles.row}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{data.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items */}
        <View style={styles.section} break={false}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Product / Description</Text>
              <Text style={styles.col2}>Unit Price</Text>
              <Text style={styles.col3}>Qty</Text>
              <Text style={styles.col4}>Amount</Text>
            </View>

            {data.items.map((item, itemIndex) => (
              <View key={itemIndex} wrap={false}>
                {/* Product Header Row - No Amount */}
                <View style={[styles.tableRow, { backgroundColor: "#f9f9f9", fontWeight: "bold" }]}>
                  <Text style={styles.col1}>{item.productName}</Text>
                  <Text style={styles.col2}></Text>
                  <Text style={styles.col3}></Text>
                  <Text style={styles.col4}></Text>
                </View>

                {/* Detail Rows */}
                {item.details.map((detail, detailIndex) => (
                  <View key={detailIndex} style={styles.tableRow}>
                    <Text style={styles.col1}>  • {detail.detail}</Text>
                    <Text style={styles.col2}>{formatCurrency(detail.unitPrice)}</Text>
                    <Text style={styles.col3}>{detail.qty}</Text>
                    <Text style={styles.col4}>{formatCurrency(detail.amount)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(netAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={{ flexDirection: "column" }}>
              <Text>{pphMainLabel}:</Text>
              {pphNote && (
                <Text style={{ fontSize: 8, fontWeight: "bold", marginTop: 2 }}>
                  {pphNote}
                </Text>
              )}
            </View>
            <Text style={{ color: "green" }}>+ {formatCurrency(pphAmount)}</Text>
          </View>
          <View style={styles.summaryTotal}>
            <Text>Total Amount:</Text>
            <Text>{formatCurrency(grossAmount)}</Text>
          </View>
        </View>

        {/* Remarks */}
        {data.remarks && data.remarks.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            {data.remarks.map((remark, index) => (
              <View key={index} style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={{ fontSize: 8, marginRight: 5 }}>
                  {remark.isCompleted ? "☑" : "☐"}
                </Text>
                <Text style={{ 
                  fontSize: 8, 
                  textDecoration: remark.isCompleted ? "line-through" : "none",
                  color: remark.isCompleted ? "#999" : "#000"
                }}>
                  {remark.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Billing & Signature */}
        <View style={styles.grid} wrap={false}>
          <View style={styles.gridCol}>
            <Text style={styles.sectionTitle}>Billing Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Account:</Text>
              <Text style={styles.value}>{data.billingName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Bank:</Text>
              <Text style={styles.value}>{data.billingBankName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Number:</Text>
              <Text style={styles.value}>{data.billingBankAccount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.billingBankAccountName}</Text>
            </View>
          </View>

          <View style={[styles.gridCol, { paddingRight: 0, alignItems: "center", justifyContent: "center" }]}>
            <View style={{ alignItems: "center", width: "100%" }}>
              <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 2 }}>
                {data.companyCity}, {data.companyProvince}
              </Text>
              <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 5 }}>
                {new Date(data.updatedAt).toLocaleDateString("id-ID")}
              </Text>
              <Image src={data.signatureImageData} style={styles.signatureImage} />
              <Text style={{ fontSize: 8, marginTop: 4, textAlign: "center" }}>
                {data.signatureName}
              </Text>
              {data.signatureRole && (
                <Text style={{ fontSize: 7, marginTop: 2, textAlign: "center", color: "#666" }}>
                  {data.signatureRole}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generated on {new Date().toLocaleDateString("id-ID")} | {data.quotationId}
        </Text>
      </Page>
    </Document>
  )
}


