import jsPDF from 'jspdf';
import { Order } from '../types';

export class InvoiceService {
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  generateInvoice(order: Order): void {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    let yPosition = 20;

    // Header with Indian flag colors
    pdf.setFillColor(255, 153, 51); // Saffron
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setFillColor(255, 255, 255); // White
    pdf.rect(0, 15, pageWidth, 15, 'F');
    pdf.setFillColor(19, 136, 8); // Green
    pdf.rect(0, 30, pageWidth, 15, 'F');

    // Company Logo and Name
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DesiBazaar', 20, 60);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('भारत का बाज़ार', 20, 70);

    // Invoice Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAX INVOICE', pageWidth - 20, 60, { align: 'right' });

    yPosition = 90;

    // Invoice Details
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Left side - Company details
    pdf.text('DesiBazaar Private Limited', 20, yPosition);
    pdf.text('123 Business Park, Sector 18', 20, yPosition + 10);
    pdf.text('Gurugram, Haryana - 122015', 20, yPosition + 20);
    pdf.text('GSTIN: 06AABCU9603R1ZX', 20, yPosition + 30);
    pdf.text('PAN: AABCU9603R', 20, yPosition + 40);

    // Right side - Invoice details
    const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
    pdf.text(`Invoice No: ${invoiceNumber}`, pageWidth - 20, yPosition, { align: 'right' });
    pdf.text(`Date: ${this.formatDate(order.createdAt)}`, pageWidth - 20, yPosition + 10, { align: 'right' });
    pdf.text(`Order ID: #${order.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, yPosition + 20, { align: 'right' });
    pdf.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, pageWidth - 20, yPosition + 30, { align: 'right' });

    yPosition += 60;

    // Billing Address
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill To:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(order.address.name, 20, yPosition + 10);
    pdf.text(order.address.phone, 20, yPosition + 20);
    pdf.text(order.address.addressLine1, 20, yPosition + 30);
    if (order.address.addressLine2) {
      pdf.text(order.address.addressLine2, 20, yPosition + 40);
      yPosition += 10;
    }
    pdf.text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, 20, yPosition + 40);

    yPosition += 70;

    // Items Table Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item', 25, yPosition + 5);
    pdf.text('Qty', 120, yPosition + 5);
    pdf.text('Rate', 140, yPosition + 5);
    pdf.text('Amount', pageWidth - 25, yPosition + 5, { align: 'right' });

    yPosition += 20;

    // Items
    pdf.setFont('helvetica', 'normal');
    order.items.forEach((item, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      const itemName = item.product.name.length > 35 
        ? item.product.name.substring(0, 35) + '...' 
        : item.product.name;
      
      pdf.text(itemName, 25, yPosition);
      pdf.text(item.quantity.toString(), 120, yPosition);
      pdf.text(this.formatPrice(item.product.price), 140, yPosition);
      pdf.text(this.formatPrice(item.product.price * item.quantity), pageWidth - 25, yPosition, { align: 'right' });
      
      yPosition += 15;
    });

    // Totals
    yPosition += 10;
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    pdf.text('Subtotal:', 140, yPosition);
    pdf.text(this.formatPrice(order.subtotal), pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 15;

    pdf.text('CGST (9%):', 140, yPosition);
    pdf.text(this.formatPrice(order.gst / 2), pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 10;

    pdf.text('SGST (9%):', 140, yPosition);
    pdf.text(this.formatPrice(order.gst / 2), pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 15;

    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Amount:', 140, yPosition);
    pdf.text(this.formatPrice(order.total), pageWidth - 25, yPosition, { align: 'right' });

    // Footer
    yPosition += 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Thank you for shopping with DesiBazaar!', 20, yPosition);
    pdf.text('For support, contact: support@desibazaar.com | +91-1800-123-4567', 20, yPosition + 10);

    // Terms and conditions
    yPosition += 25;
    pdf.text('Terms & Conditions:', 20, yPosition);
    pdf.text('1. Goods once sold will not be taken back or exchanged.', 20, yPosition + 10);
    pdf.text('2. All disputes are subject to Delhi jurisdiction only.', 20, yPosition + 20);
    pdf.text('3. This is a computer generated invoice and does not require signature.', 20, yPosition + 30);

    // Save the PDF
    pdf.save(`DesiBazaar-Invoice-${invoiceNumber}.pdf`);
  }
}

export const invoiceService = new InvoiceService();