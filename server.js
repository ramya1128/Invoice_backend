const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const User = require('./models/User');
const Invoice = require('./models/Invoice');

const app = express();
const PORT = 4000;
const SECRET_KEY = process.env.SECRET_KEY || "ramya1128"; 

// Middleware
app.use(
  cors({
    origin: "https://invoice-frontend-ashen.vercel.app/",
    credentials: true,
  })
);
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/invoiceDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ DB Connection Error:', err));

// Register Route
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('❌ Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = await User.findOne({ email, username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('❌ Error in login:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Invoice Routes
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create Invoice Route
app.post('/api/invoice/create-invoice', async (req, res) => {
  const { invoiceData, email } = req.body;

  try {
    const newInvoice = new Invoice({
      ...invoiceData,
      createdBy: email,
    });

    await newInvoice.save();
    res.status(201).json({ message: 'Invoice created successfully!' });
  } catch (error) {
    console.error('❌ Invoice Creation Error:', error);
    res.status(500).json({ message: 'Error creating invoice.' });
  }
});

// Send Invoice via Email Route
app.post('/api/invoice/send-invoice', upload.single('file'), async (req, res) => {
  const { email } = req.body;
  const file = req.file;

  console.log("📩 Email received in backend:", email);
  console.log("📄 File received in backend:", file?.originalname);

  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 's.ramya1128@gmail.com',  
      pass: 'lepumwgivoxripht',   
    }
  });

  const mailOptions = {
    from: 's.ramya1128@gmail.com',  
    to: email,  
    subject: 'Invoice Attached',
    text: 'Please find the attached invoice.',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: file.buffer,  
        encoding: 'base64'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Invoice sent successfully!' });
  } catch (error) {
    console.error('❌ Error sending invoice:', error);
    res.status(500).json({ message: 'Error sending invoice.' });
  }
});

app.post('/api/save-invoice', async (req, res) => {
  try {
    const invoiceData = req.body;
    const newInvoice = new Invoice(invoiceData);
    await newInvoice.save();
    res.status(201).json({ message: "Invoice saved successfully" });
  } catch (err) {
    console.error("Error saving invoice:", err);
    res.status(500).json({ message: "Failed to save invoice", error: err });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).send('Server error');
  }
});

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).send('Invoice not found');
    }

    const doc = new pdfkit();
    const filename = `Invoice_${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(__dirname, 'invoices', filename);

    doc.pipe(fs.createWriteStream(filePath));

    // Write invoice content to PDF
    doc.fontSize(18).text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'center' })
      .moveDown()
      .fontSize(14)
      .text(`Bill From: ${invoice.billFrom}`)
      .text(`Bill To: ${invoice.billTo}`)
      .text(`Date: ${new Date(invoice.dateOfIssue).toLocaleDateString()}`)
      .moveDown()
      .text(`Subtotal: ${invoice.currency}${invoice.subTotal}`)
      .text(`Tax Amount: ${invoice.currency}${invoice.taxAmmount}`)
      .text(`Discount: ${invoice.currency}${invoice.discountAmmount}`)
      .text(`Total: ${invoice.currency}${invoice.total}`)
      .moveDown();

    doc.text('Items:', { underline: true });
    invoice.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name} - ${item.quantity} x ${item.price} = ${item.quantity * item.price}`);
    });

    doc.end();

    doc.on('finish', () => {
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error downloading the file:', err);
        }
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Server error');
  }
});


// Server Listener
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
