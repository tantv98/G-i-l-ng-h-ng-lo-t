import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";

dotenv.config();

// Helper to generate PDF as Buffer using standard Helvetica font (no accents)
async function generatePDFBuffer(employee: any, password?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      userPassword: password,
      ownerPassword: 'admin-salary-mail',
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false
      },
      margin: 50
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Using standard PDF fonts (Helvetica)
    const fontRegular = 'Helvetica';
    const fontBold = 'Helvetica-Bold';

    doc.font(fontRegular);

    // Header
    doc.font(fontBold).fontSize(18).text("PHIEU LUONG NHAN VIEN", { align: 'center' });
    doc.fontSize(12).text(`Thang: ${employee.month || 'N/A'}`, { align: 'center' });
    doc.moveDown(2);

    // Employee Info
    doc.font(fontBold).fontSize(12).text("THONG TIN NHAN VIEN");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.font(fontRegular).fontSize(11);
    doc.text(`Ho va ten: ${employee.name || 'N/A'}`);
    doc.text(`Email: ${employee.email || employee.Email || 'N/A'}`);
    if (employee.id) doc.text(`Ma nhan vien: ${employee.id}`);
    if (employee.department) doc.text(`Phong ban: ${employee.department}`);
    doc.moveDown(2);

    // Salary Details Table
    doc.font(fontBold).fontSize(12).text("CHI TIET LUONG");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const itemX = 60;
    const valueX = 400;

    function addTableRow(label: string, value: string, isBold = false) {
      doc.font(isBold ? fontBold : fontRegular).fontSize(11);
      doc.text(label, itemX, doc.y);
      doc.text(value, valueX, doc.y, { align: 'right', width: 150 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.5);
    }

    addTableRow("Luong co ban", `${employee.base_salary || '0'} VND`);
    addTableRow("Phu cap", `${employee.allowance || '0'} VND`);
    addTableRow("Thuong", `${employee.bonus || '0'} VND`);
    
    if (employee.overtime) addTableRow("Luong tang ca", `${employee.overtime} VND`);
    if (employee.deduction) addTableRow("Cac khoan tru", `-${employee.deduction} VND`);

    doc.moveDown(0.5);
    doc.font(fontBold).fontSize(13).fillColor('#1d4ed8');
    doc.text("THUC LINH", itemX, doc.y);
    doc.text(`${employee.total || '0'} VND`, valueX, doc.y, { align: 'right', width: 150 });
    doc.fillColor('black');

    doc.moveDown(3);
    doc.font(fontRegular).fontSize(10).fillColor('#6b7280');
    doc.text("Ghi chu: Neu co bat ky thac mac nao ve bang luong, vui long lien he phong nhan su trong vong 3 ngay ke tu ngay nhan phieu luong.", { align: 'left', width: 500 });
    
    doc.moveDown(2);
    doc.font(fontBold).fontSize(11).fillColor('black');
    doc.text("PHONG NHAN SU", { align: 'right' });
    doc.font(fontRegular).fontSize(10).text("(Da ky dien tu)", { align: 'right' });

    doc.end();
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for sending emails
  app.post("/api/send-emails", async (req, res) => {
    const { employees, template, smtpConfig, pdfConfig } = req.body;

    if (!employees || !template || !smtpConfig) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host || process.env.SMTP_HOST,
      port: parseInt(smtpConfig.port || process.env.SMTP_PORT || "587"),
      secure: smtpConfig.port === "465",
      auth: {
        user: smtpConfig.user || process.env.SMTP_USER,
        pass: smtpConfig.pass || process.env.SMTP_PASS,
      },
    });

    const results = [];

    for (const employee of employees) {
      let html = template.body;
      let subject = template.subject;

      // Replace placeholders
      Object.keys(employee).forEach(key => {
        const placeholder = `{{${key}}}`;
        html = html.replaceAll(placeholder, employee[key]);
        subject = subject.replaceAll(placeholder, employee[key]);
      });

      try {
        const attachments = [];
        
        if (pdfConfig?.enabled) {
          const password = pdfConfig.passwordField ? employee[pdfConfig.passwordField] : undefined;
          const pdfBuffer = await generatePDFBuffer(employee, password);
          attachments.push({
            filename: `Phieu_Luong_${employee.name || 'Nhan_Vien'}.pdf`,
            content: pdfBuffer
          });
        }

        await transporter.sendMail({
          from: `"${smtpConfig.fromName || 'HR Department'}" <${smtpConfig.user || process.env.SMTP_USER}>`,
          to: employee.email || employee.Email,
          subject: subject,
          html: html,
          attachments: attachments
        });
        results.push({ email: employee.email || employee.Email, status: "success" });
      } catch (error: any) {
        console.error(`Failed to send to ${employee.email}:`, error);
        results.push({ email: employee.email || employee.Email, status: "failed", error: error.message });
      }
    }

    res.json({ results });
  });

  // API Route for previewing/downloading a single PDF
  app.post("/api/preview-pdf", async (req, res) => {
    const { employee, pdfConfig } = req.body;
    if (!employee) return res.status(400).json({ error: "Missing employee data" });

    try {
      const password = pdfConfig?.enabled && pdfConfig.passwordField ? employee[pdfConfig.passwordField] : undefined;
      const pdfBuffer = await generatePDFBuffer(employee, password);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Phieu_Luong_${employee.name || 'Nhan_Vien'}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Failed to generate preview PDF:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
