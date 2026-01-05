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
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  headerRight: {
    textAlign: "right",
    marginBottom: 20,
  },
  dateLocation: {
    fontSize: 10,
  },
  openingText: {
    fontSize: 10,
    marginBottom: 15,
    lineHeight: 1.4,
  },
  partySection: {
    marginBottom: 15,
  },
  partyTitle: {
    fontSize: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: "20%",
    fontSize: 10,
  },
  colon: {
    width: "3%",
    fontSize: 10,
  },
  value: {
    width: "77%",
    fontSize: 10,
  },
  boldValue: {
    width: "77%",
    fontSize: 10,
    fontWeight: "bold",
  },
  workSection: {
    marginBottom: 15,
  },
  workTitle: {
    fontSize: 10,
    marginBottom: 10,
  },
  workRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  workLabel: {
    width: "30%",
    fontSize: 10,
  },
  workValue: {
    width: "67%",
    fontSize: 10,
    fontWeight: "bold",
  },
  paymentSection: {
    marginBottom: 15,
    marginTop: 10,
  },
  paymentText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  amountHighlight: {
    color: "#C00000",
    fontWeight: "bold",
  },
  spelledAmount: {
    fontSize: 10,
    color: "#C00000",
    lineHeight: 1.4,
  },
  closingText: {
    fontSize: 10,
    lineHeight: 1.4,
    marginTop: 15,
    marginBottom: 30,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  footerLeft: {
    width: "45%",
    alignItems: "center",
  },
  footerRight: {
    width: "45%",
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 10,
    marginBottom: 5,
  },
  signatureImage: {
    width: 80,
    height: 40,
    marginTop: 10,
    marginBottom: 10,
  },
  signaturePlaceholder: {
    height: 50,
    marginTop: 10,
    marginBottom: 10,
  },
  footerCompany: {
    fontSize: 10,
    fontWeight: "bold",
    textDecoration: "underline",
    marginTop: 5,
  },
  footerName: {
    fontSize: 10,
    textDecoration: "underline",
  },
  // Bukti Pekerjaan page
  buktiTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 15,
    textDecoration: "underline",
  },
  buktiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  buktiImage: {
    width: 150,
    height: 150,
    objectFit: "contain",
    marginBottom: 10,
    marginRight: 10,
  },
})

interface ErhaBASTPDFProps {
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
    invoiceBastDate: string
    billTo: string
    billToAddress?: string
    contactPerson: string
    contactPosition: string
    productionDate: string
    signatureName: string
    signatureRole?: string
    signatureImageData: string
    finalWorkImageData?: string
    billingName?: string
    billingBankName?: string
    billingBankAccount?: string
    billingBankAccountName?: string
    billingNpwp?: string
    pph: string
    totalAmount: number
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

export const ErhaBASTPDF: React.FC<ErhaBASTPDFProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return `Rp${new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(amount)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateFull = (dateString: string) => {
    const date = new Date(dateString)
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "long" })
    const year = date.getFullYear()
    return `${dayName}, ${day} ${month} ${year}`
  }

  // Convert number to Indonesian words
  const numberToWords = (num: number): string => {
    const ones = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"]
    const teens = ["sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas", "tujuh belas", "delapan belas", "sembilan belas"]
    const tens = ["", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh", "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"]

    if (num === 0) return "nol"
    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "")
    if (num < 200) return "seratus" + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "")
    if (num < 1000) return ones[Math.floor(num / 100)] + " ratus" + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "")
    if (num < 2000) return "seribu" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "")
    if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + " ribu" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "")
    if (num < 1000000000) return numberToWords(Math.floor(num / 1000000)) + " juta" + (num % 1000000 !== 0 ? " " + numberToWords(num % 1000000) : "")
    return numberToWords(Math.floor(num / 1000000000)) + " miliar" + (num % 1000000000 !== 0 ? " " + numberToWords(num % 1000000000) : "")
  }

  const amountInWords = numberToWords(Math.floor(data.totalAmount)) + " rupiah"

  // Get work name from items
  const getWorkName = () => {
    return data.items.map(item => {
      const detailsText = item.details.map(d => d.detail).join(" - ")
      return item.productName + (detailsText ? " - " + detailsText : "")
    }).join(", ")
  }

  // Build full address for first party (signer)
  const getSignerAddress = () => {
    let address = data.companyAddress
    if (data.companyCity) address += `, Kec. ${data.companyCity}`
    if (data.companyProvince) address += `, ${data.companyProvince}`
    if (data.companyPostalCode) address += ` ${data.companyPostalCode}`
    return address
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)</Text>

        {/* Location and Date - Right aligned */}
        <View style={styles.headerRight}>
          <Text style={styles.dateLocation}>
            {data.companyCity}, {formatDate(data.invoiceBastDate)}
          </Text>
        </View>

        {/* Opening Text */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.openingText}>
            Pada hari ini, {formatDateFull(data.invoiceBastDate)}    <Text style={{ fontWeight: "bold" }}>{formatDate(data.invoiceBastDate)}</Text>    kami yang bertanda tangan dibawah ini:
          </Text>
        </View>

        {/* First Party (PIHAK PERTAMA) - The service provider/signer */}
        <View style={styles.partySection}>
          <View style={styles.row}>
            <Text style={styles.label}>Nama</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.signatureName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.signatureRole || "Founder Cataracta Studio"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alamat</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{getSignerAddress()}</Text>
          </View>
          <Text style={styles.partyTitle}>
            Dalam hal ini disebut sebagai <Text style={{ fontWeight: "bold", color: "#0066CC" }}>PIHAK PERTAMA</Text>.
          </Text>
        </View>

        {/* Second Party (PIHAK KEDUA) - The client */}
        <View style={styles.partySection}>
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
          <View style={styles.row}>
            <Text style={styles.label}>Alamat</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{data.billToAddress || "-"}</Text>
          </View>
          <Text style={styles.partyTitle}>
            Dalam hal ini disebut sebagai <Text style={{ fontWeight: "bold", color: "#0066CC" }}>PIHAK KEDUA</Text>. Telah mengadakan <Text style={{ fontWeight: "bold" }}>SERAH TERIMA</Text> pekerjaan untuk :
          </Text>
        </View>

        {/* Work Details */}
        <View style={styles.workSection}>
          <View style={styles.workRow}>
            <Text style={styles.workLabel}>Nama Pekerjaan</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.workValue}>{getWorkName()}</Text>
          </View>
          <View style={styles.workRow}>
            <Text style={styles.workLabel}>Total Nominal Pekerjaan</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={[styles.workValue, { color: "#0066CC" }]}>{formatCurrency(data.totalAmount)}</Text>
          </View>
        </View>

        {/* Payment Statement */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentText}>
            Atas Pekerjaan tersebut <Text style={{ fontWeight: "bold" }}>PIHAK PERTAMA</Text> berhak menagihkan pembayaran pelunasan pekerjaan sebesar:{"        "}
            <Text style={styles.amountHighlight}>{formatCurrency(data.totalAmount)}</Text>
          </Text>
          <Text style={styles.spelledAmount}>
            ({amountInWords}) kepada <Text style={{ fontWeight: "bold" }}>PIHAK KEDUA</Text>
          </Text>
        </View>

        {/* Closing Statement */}
        <Text style={styles.closingText}>
          Demikian berita acara penyelesaian dan serah terima pekerjaan ini kami buat dan ditanda tangani oleh kedua belah pihak untuk dapat dipergunakan sebagaimana mestinya.
        </Text>

        {/* Signatures */}
        <View style={styles.footer} wrap={false}>
          {/* Left: Pihak Kedua (Client) */}
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Pihak Kedua</Text>
            <View style={styles.signaturePlaceholder} />
            <Text style={styles.footerCompany}>{data.billTo}</Text>
            <Text style={styles.footerName}>{data.contactPerson}</Text>
          </View>

          {/* Right: Pihak Pertama (Service Provider) */}
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Pihak Pertama</Text>
            {data.signatureImageData && (
              <Image src={data.signatureImageData} style={styles.signatureImage} />
            )}
            {!data.signatureImageData && <View style={styles.signaturePlaceholder} />}
            <Text style={styles.footerCompany}>{data.billingName || "CV CATA KARYA ABADI"}</Text>
            <Text style={styles.footerName}>{data.signatureName}</Text>
          </View>
        </View>
      </Page>

      {/* Second Page - Bukti Pekerjaan (Always on separate page) */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.buktiTitle}>Bukti Pekerjaan</Text>
        {data.finalWorkImageData ? (
          <Image
            src={data.finalWorkImageData}
            style={{
              maxWidth: 500,
              maxHeight: 700,
              objectFit: "contain",
            }}
          />
        ) : (
          <Text style={{ fontSize: 10, color: "#666" }}>No work evidence uploaded yet.</Text>
        )}
      </Page>
    </Document>
  )
}

