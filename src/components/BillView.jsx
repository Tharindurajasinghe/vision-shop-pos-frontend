export const getBillHTML = (bill) => {
  const date = new Date(bill.date).toLocaleDateString('en-CA');
  
  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill ${bill.billId}</title>
      <style>
        @media print {
          @page { size: 80mm auto; margin: 0; }
        }
          
        body {
          font-family: 'Courier New', monospace;
          width: 220px;
          margin: 0 auto;
          padding: 5px;
          font-size: 10px;
        }
        .header { text-align: center; }
        .separator { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { font-size: 11px; padding: 10px 0; }
        th { border-bottom: 1px solid #000; }
        .right { text-align: right; }
        .variant-info {
          font-size: 9px;
          color: #555;
          font-style: italic;
        }
        .sinhala-note {
          font-size: 9px;
          text-align: center;
          margin: 8px 0;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>The Vision</h2>
        <p>Vijayabahu Road, Okkampitiya</p>
        <p>Tel: 076 2700253</p>
      </div>

      <p><b>Bill ID – ${bill.billId}</b></p>
      <p>${date.replace(/-/g, '.')} | ${bill.time}</p>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty </th>
            <th>Price </th>
            <th class="right">Tot</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(i => {
            const variantText = (i.variant && i.variant !== 'Standard') 
              ? `<br><span class="variant-info">(${i.variant})</span>` 
              : '';
            return `
            <tr>
              <td>${i.name}${variantText}</td>
              <td>${i.quantity}</td>
              <td>${i.price}</td>
              <td class="right">${i.total}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>

      <div class="separator"></div>
      <p><b>Sub Total: ${bill.totalAmount.toFixed(2)}/=</b></p>
      <p><b>Cash Paid: ${bill.cash.toFixed(2)}/=</b></p>
      <p><b>Change: ${bill.change.toFixed(2)}/=</b></p>

      <div class="sinhala-note">
        <p>භාණ්ඩ මාරු කිරීමට </b>></p>
        <p>බිල රෑගෙන ඒම අනිවාර්ය වේ.</b></p>
      </div>

      <p style="text-align:center"><b>Thank You..!</b></p>

      <script>
        window.onload = () => {
          window.print();
          window.onafterprint = () => window.close();
        };
      </script>
    </body>
  </html>
  `;
};