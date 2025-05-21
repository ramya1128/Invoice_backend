// backend/models/Invoice.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  quantity: Number,
  price: Number,
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  billFrom: String,
  billFromAddress: String,
  billFromEmail: String,
  billTo: String,
  billToAddress: String,
  billToEmail: String,
  dateOfIssue: String,
  currency: String,
  subTotal: Number,
  taxAmmount: Number,
  discountAmmount: Number,
  total: Number,
  items: [ItemSchema],
  notes: String,
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
