import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export interface ReportData {
  spaceName: string;
  periodLabel: string;
  currency: string;
  income: number; // centesimi
  expense: number;
  categories: { name: string; spent: number }[];
}

function fmt(cents: number, currency: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")} ${currency}`;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#111827", fontFamily: "Helvetica" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#6b7280", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280" },
});

function ReportDocument({ data }: { data: ReportData }) {
  const net = data.income - data.expense;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Report — {data.spaceName}</Text>
        <Text style={styles.subtitle}>{data.periodLabel}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riepilogo</Text>
          <View style={styles.row}>
            <Text>Entrate</Text>
            <Text>{fmt(data.income, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Uscite</Text>
            <Text>{fmt(data.expense, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bold}>Saldo del periodo</Text>
            <Text style={styles.bold}>{fmt(net, data.currency)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spese per categoria</Text>
          {data.categories.length === 0 ? (
            <Text style={styles.muted}>Nessuna spesa nel periodo.</Text>
          ) : (
            data.categories.map((c, i) => (
              <View style={styles.row} key={i}>
                <Text>{c.name}</Text>
                <Text>{fmt(c.spent, data.currency)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.muted}>Generato da TRACKIT</Text>
      </Page>
    </Document>
  );
}

/** Renderizza il report in un Buffer PDF (lato server). */
export function renderReport(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
