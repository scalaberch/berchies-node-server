export type SoaChargeRow = {
  invoiceNumber: string;
  dueDate: string;
  remarks: string;
  amountPhp: number;
};

export type StatementOfAccountTemplateInput = {
  companyName: string;
  customerName: string;
  generatedAt: string;
  rows: SoaChargeRow[];
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const buildStatementOfAccountHtml = (input: StatementOfAccountTemplateInput): string => {
  const rowsHtml = input.rows
    .map(
      (row) => `
      <tr>
        <td>${row.invoiceNumber}</td>
        <td>${row.dueDate}</td>
        <td>${row.remarks}</td>
        <td style="text-align:right">${formatMoney(row.amountPhp)}</td>
      </tr>`,
    )
    .join('');

  const total = input.rows.reduce((sum, row) => sum + Number(row.amountPhp || 0), 0);

  return `
    <main class="pdf-page">
      <h1 class="pdf-title">Statement of Account</h1>
      <p class="pdf-subtitle">${input.companyName}</p>
      <p class="pdf-subtitle">Customer: ${input.customerName}</p>
      <p class="pdf-subtitle">Generated at: ${input.generatedAt}</p>

      <table class="pdf-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Due date</th>
            <th>Remarks</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="4">No unpaid charges found.</td></tr>'}
        </tbody>
      </table>

      <p style="margin-top:12px; text-align:right; font-weight:600;">Total Due: ${formatMoney(total)}</p>
    </main>
  `;
};

