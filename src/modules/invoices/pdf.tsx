import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { LineItemRecord } from "@/modules/line-items/types";

type InvoicePdfData = {
  invoice: {
    id: string;
    invoiceNumber: string | null;
    invoiceDate: string;
    dueDate: string | null;
    amountCents: number;
    currency: string;
    notes: string | null;
    lineItems: LineItemRecord[];
  };
  customer: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  };
  revenueRecord: {
    id: string;
    serviceDate: string;
    groupName: string | null;
    status: string;
    notes: string | null;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    color: "#1f1a14",
    backgroundColor: "#fffdf8",
    fontFamily: "Helvetica",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d8cdbc",
    marginBottom: 20,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  muted: {
    color: "#6f665c",
  },
  section: {
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d8cdbc",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  customerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  tableHeader: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d8cdbc",
    paddingBottom: 8,
    marginBottom: 8,
    fontWeight: 700,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ebe3d7",
  },
  itemMain: {
    width: "68%",
    paddingRight: 12,
  },
  itemAmount: {
    width: "32%",
    textAlign: "right",
  },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#1f1a14",
    fontSize: 13,
    fontWeight: 700,
  },
});

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function InvoicePdfDocument({ invoice, customer, revenueRecord }: InvoicePdfData) {
  return (
    <Document
      author="ReceAI"
      title={`Invoice ${invoice.invoiceNumber ?? invoice.id}`}
      subject="ReceAI invoice PDF"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.stack}>
            <Text style={styles.brand}>ReceAI</Text>
            <Text style={styles.muted}>Invoice export</Text>
          </View>

          <View style={styles.stack}>
            <Text style={styles.title}>
              {invoice.invoiceNumber ?? `Invoice ${invoice.id.slice(0, 8)}`}
            </Text>
            <Text style={styles.muted}>Invoice date: {formatDate(invoice.invoiceDate)}</Text>
            <Text style={styles.muted}>Due date: {formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerBlock}>
            <Text>{customer.name}</Text>
            {customer.company ? <Text>{customer.company}</Text> : null}
            {customer.email ? <Text>{customer.email}</Text> : null}
            {customer.phone ? <Text>{customer.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue record</Text>
          <View style={styles.stack}>
            <Text style={styles.muted}>Record ID: {revenueRecord.id}</Text>
            <Text style={styles.muted}>Service date: {formatDate(revenueRecord.serviceDate)}</Text>
            {revenueRecord.groupName ? (
              <Text style={styles.muted}>Group: {revenueRecord.groupName}</Text>
            ) : null}
            <Text style={styles.muted}>Status: {revenueRecord.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.itemMain}>Description</Text>
            <Text style={styles.itemAmount}>Amount</Text>
          </View>

          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.itemMain}>
                <Text>{item.title}</Text>
                {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
                <Text style={styles.muted}>
                  Qty {item.quantity} x {formatAmount(item.unitPriceCents, invoice.currency)}
                </Text>
              </View>
              <Text style={styles.itemAmount}>
                {formatAmount(item.amountCents, invoice.currency)}
              </Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text>Total</Text>
            <Text>{formatAmount(invoice.amountCents, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.notes || revenueRecord.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {invoice.notes ? <Text>{invoice.notes}</Text> : null}
            {invoice.notes && revenueRecord.notes ? <Text>{"\n"}</Text> : null}
            {revenueRecord.notes ? <Text style={styles.muted}>{revenueRecord.notes}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
