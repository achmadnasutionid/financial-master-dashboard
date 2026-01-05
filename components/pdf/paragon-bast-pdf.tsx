import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: "25%",
    fontSize: 10,
  },
  colon: {
    width: "3%",
    fontSize: 10,
  },
  value: {
    width: "72%",
    fontSize: 10,
  },
  boldText: {
    fontWeight: "bold",
  },
  productList: {
    marginLeft: 20,
    marginTop: 5,
    marginBottom: 5,
  },
  productItem: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
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
    marginTop: 5,
    marginBottom: 5,
  },
  footerName: {
    fontSize: 10,
    fontWeight: "bold",
  },
  footerCompany: {
    fontSize: 10,
    marginTop: 2,
  },
  footerRole: {
    fontSize: 10,
    marginTop: 2,
  },
  stamp: {
    marginTop: 30,
    fontSize: 10,
  },
})

interface ParagonBASTPDFProps {
  data: {
    ticketId: string
    quotationId: string
    invoiceId: string
    companyName: string
    companyAddress: string
    companyCity: string
    companyProvince: string
    companyPostalCode?: string
    companyTelp?: string
    companyEmail?: string
    invoiceBastDate: string // BAST date
    billTo: string
    contactPerson: string
    contactPosition: string
    productionDate: string
    signatureName: string
    signatureRole?: string
    signatureImageData: string
    finalWorkImageData?: string // Screenshot final work
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

export const ParagonBASTPDF: React.FC<ParagonBASTPDFProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  // Combine all products and details
  const getProductList = () => {
    return data.items.map(item => {
      // Combine product name with all its details
      const detailsText = item.details.map(d => d.detail).join(" ")
      return `${item.productName} ${detailsText}`
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)</Text>

        {/* Date */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Pada hari ini, tanggal</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{formatDate(data.invoiceBastDate)}</Text>
          </View>
        </View>

        {/* Signer Info */}
        <View style={styles.section}>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>Saya yang bertanda tangan di bawah ini :</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.signatureName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.signatureRole || "-"}</Text>
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>Menerangkan Bahwa Pekerjaan Berupa :</Text>
          <View style={styles.productList}>
            {getProductList().map((productText, index) => (
              <Text key={index} style={styles.productItem}>
                {productText}
              </Text>
            ))}
          </View>
        </View>

        {/* Quotation Reference */}
        <View style={styles.section}>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>Sesuai Dengan :</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Quotation No.</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.quotationId}</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Nama</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.contactPerson}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.contactPosition}</Text>
          </View>
        </View>

        {/* Closing Statement */}
        <View style={styles.section}>
          <Text style={{ fontSize: 10, marginTop: 10 }}>
            Demikian <Text style={styles.boldText}>Berita Acara</Text> ini dibuat untuk dapat di pergunakan sebagaimana mestinya
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.footer} wrap={false}>
          {/* Left: Company Representative */}
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Hormat Saya,</Text>
            <Text style={{ fontSize: 10, marginBottom: 5, color: "white" }}>{data.billTo}</Text>
            {data.signatureImageData && (
              <Image
                src={data.signatureImageData}
                style={styles.signatureImage}
              />
            )}
            <Text style={styles.footerName}>{data.signatureName}</Text>
            <Text style={styles.footerRole}>{data.signatureRole}</Text>
          </View>

          {/* Right: Client Representative */}
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Perwakilan</Text>
            <Text style={styles.footerCompany}>{data.billTo}</Text>
            <View style={{ height: 40, marginTop: 5, marginBottom: 5 }} />
            <Text style={styles.footerName}>{data.contactPerson}</Text>
            <Text style={styles.footerRole}>{data.contactPosition}</Text>
          </View>
        </View>
      </Page>

      {/* Second Page - Bukti Pekerjaan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.stamp}>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>Bukti Pekerjaan</Text>
          {data.finalWorkImageData && (
            <Image
              src={data.finalWorkImageData}
              style={{
                maxWidth: 400,
                maxHeight: 300,
                objectFit: "contain",
              }}
            />
          )}
        </View>
      </Page>
    </Document>
  )
}

