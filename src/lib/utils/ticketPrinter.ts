import { format } from "date-fns";
import { formatCurrency } from "./currency";

interface ManualTicket {
  id: string;
  ticket_no: string;
  booking_date_time: string;
  journey_date: string;
  passenger_name: string;
  passenger_phone: string;
  with_family_friends: string | null;
  address: string | null;
  tours_to: string;
  no_of_tourist: number;
  seat_no: string | null;
  rep_time: string | null;
  dep_time: string | null;
  amount: number;
  pnr_no: string | null;
  bus_no: string | null;
  branch: string | null;
  notes: string | null;
  collection_status: string;
}

interface TicketPayment {
  received_by_name: string;
  payment_mode: string;
  paid_amount: number;
}

interface CompanySettings {
  company_name: string;
  address_line: string;
  phone_numbers: string;
  footer_note: string;
}

export function printTicket(
  ticket: ManualTicket,
  payment?: TicketPayment,
  settings?: CompanySettings | null
) {
  const companyName = settings?.company_name || "ROYAL TOURS & TRAVELS";
  const addressLine = settings?.address_line || "";
  const phoneNumbers = settings?.phone_numbers || "";
  const footerNote = settings?.footer_note || "Wish you a Happy Journey";

  const journeyDate = format(new Date(ticket.journey_date), "dd/MM/yyyy");
  const bookingDate = format(new Date(ticket.booking_date_time), "dd/MM/yyyy");
  const formattedAmount = formatCurrency(ticket.amount);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket - ${ticket.ticket_no}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .ticket-container {
          display: flex;
          width: 100%;
          max-width: 280mm;
          border: 2px solid #000;
          page-break-inside: avoid;
        }
        
        .main-ticket {
          flex: 2;
          padding: 15px;
          border-right: 2px dashed #000;
        }
        
        .boarding-pass {
          flex: 1;
          padding: 15px;
          background: #f9f9f9;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        .company-name {
          font-size: 20px;
          font-weight: bold;
          letter-spacing: 2px;
        }
        
        .company-address {
          font-size: 11px;
          margin-top: 5px;
        }
        
        .company-phone {
          font-size: 11px;
          margin-top: 3px;
        }
        
        .ticket-no-section {
          background: #000;
          color: #fff;
          padding: 8px;
          text-align: center;
          margin-bottom: 15px;
        }
        
        .ticket-no {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 3px;
        }
        
        .field-row {
          display: flex;
          margin-bottom: 8px;
          border-bottom: 1px dotted #999;
          padding-bottom: 5px;
        }
        
        .field-label {
          width: 120px;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .field-value {
          flex: 1;
        }
        
        .amount-section {
          background: #eee;
          padding: 10px;
          margin-top: 15px;
          border: 1px solid #000;
        }
        
        .amount-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
        }
        
        .signature-section {
          margin-top: 30px;
          text-align: right;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          width: 150px;
          margin-left: auto;
          padding-top: 5px;
          text-align: center;
          font-size: 10px;
        }
        
        .boarding-header {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
          letter-spacing: 2px;
        }
        
        .boarding-field {
          margin-bottom: 10px;
          padding: 5px;
          background: #fff;
          border: 1px solid #ccc;
        }
        
        .boarding-label {
          font-size: 10px;
          color: #666;
        }
        
        .boarding-value {
          font-size: 14px;
          font-weight: bold;
        }
        
        .boarding-amount {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          background: #000;
          color: #fff;
          padding: 10px;
          margin: 15px 0;
        }
        
        .footer-note {
          text-align: center;
          font-style: italic;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #000;
        }
        
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: bold;
          border-radius: 3px;
        }
        
        .status-paid {
          background: #28a745;
          color: white;
        }
        
        .status-unpaid {
          background: #dc3545;
          color: white;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <!-- Main Ticket -->
        <div class="main-ticket">
          <div class="header">
            <div class="company-name">${companyName}</div>
            ${addressLine ? `<div class="company-address">${addressLine}</div>` : ""}
            ${phoneNumbers ? `<div class="company-phone">Ph: ${phoneNumbers}</div>` : ""}
          </div>
          
          <div class="ticket-no-section">
            <div class="ticket-no">T.No: ${ticket.ticket_no}</div>
          </div>
          
          <div class="field-row">
            <span class="field-label">Shri/Smt:</span>
            <span class="field-value">${ticket.passenger_name}${ticket.with_family_friends ? ` (with ${ticket.with_family_friends})` : ""}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Tours To:</span>
            <span class="field-value">${ticket.tours_to}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Journey Date:</span>
            <span class="field-value">${journeyDate}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Booking Date:</span>
            <span class="field-value">${bookingDate}</span>
          </div>
          
          ${ticket.address ? `
          <div class="field-row">
            <span class="field-label">Address:</span>
            <span class="field-value">${ticket.address}</span>
          </div>
          ` : ""}
          
          <div class="field-row">
            <span class="field-label">Phone:</span>
            <span class="field-value">${ticket.passenger_phone}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">No. of Tourist:</span>
            <span class="field-value">${ticket.no_of_tourist}</span>
          </div>
          
          ${ticket.seat_no ? `
          <div class="field-row">
            <span class="field-label">Seat No.:</span>
            <span class="field-value">${ticket.seat_no}</span>
          </div>
          ` : ""}
          
          ${ticket.rep_time ? `
          <div class="field-row">
            <span class="field-label">Rep. Time:</span>
            <span class="field-value">${ticket.rep_time}</span>
          </div>
          ` : ""}
          
          ${ticket.dep_time ? `
          <div class="field-row">
            <span class="field-label">Dep. Time:</span>
            <span class="field-value">${ticket.dep_time}</span>
          </div>
          ` : ""}
          
          ${ticket.pnr_no ? `
          <div class="field-row">
            <span class="field-label">PNR No.:</span>
            <span class="field-value">${ticket.pnr_no}</span>
          </div>
          ` : ""}
          
          ${ticket.bus_no ? `
          <div class="field-row">
            <span class="field-label">Bus No.:</span>
            <span class="field-value">${ticket.bus_no}</span>
          </div>
          ` : ""}
          
          ${ticket.branch ? `
          <div class="field-row">
            <span class="field-label">Branch:</span>
            <span class="field-value">${ticket.branch}</span>
          </div>
          ` : ""}
          
          <div class="amount-section">
            <div class="amount-row">
              <span>Amount Rs.:</span>
              <span>${formattedAmount}</span>
            </div>
            <div style="margin-top: 5px; font-size: 11px;">
              Status: <span class="status-badge ${ticket.collection_status === "PAID" ? "status-paid" : "status-unpaid"}">${ticket.collection_status}</span>
              ${payment ? ` | Received by: ${payment.received_by_name} (${payment.payment_mode})` : ""}
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-line">Sig. of Tourist</div>
          </div>
        </div>
        
        <!-- Boarding Pass -->
        <div class="boarding-pass">
          <div class="boarding-header">BOARDING PASS</div>
          
          <div class="boarding-field">
            <div class="boarding-label">T.No.</div>
            <div class="boarding-value">${ticket.ticket_no}</div>
          </div>
          
          <div class="boarding-field">
            <div class="boarding-label">Shri/Smt</div>
            <div class="boarding-value">${ticket.passenger_name}</div>
          </div>
          
          <div class="boarding-field">
            <div class="boarding-label">Tours To</div>
            <div class="boarding-value">${ticket.tours_to}</div>
          </div>
          
          ${ticket.seat_no ? `
          <div class="boarding-field">
            <div class="boarding-label">Seat No.</div>
            <div class="boarding-value">${ticket.seat_no}</div>
          </div>
          ` : ""}
          
          <div class="boarding-field">
            <div class="boarding-label">Date</div>
            <div class="boarding-value">${journeyDate}</div>
          </div>
          
          ${ticket.dep_time ? `
          <div class="boarding-field">
            <div class="boarding-label">Dep. Time</div>
            <div class="boarding-value">${ticket.dep_time}</div>
          </div>
          ` : ""}
          
          <div class="boarding-amount">₹ ${ticket.amount.toLocaleString("en-IN")}</div>
          
          <div class="signature-section">
            <div class="signature-line">Signature</div>
          </div>
          
          <div class="footer-note">${footerNote}</div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
