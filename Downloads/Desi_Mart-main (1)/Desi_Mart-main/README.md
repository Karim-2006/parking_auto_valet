# DesiBazaar - Full-Stack eCommerce Website

🇮🇳 **DesiBazaar** is a modern, full-featured eCommerce platform built with Indian branding and real payment integration.

## 🌟 Features

### Frontend (React + TypeScript + Tailwind CSS)
- **Beautiful Indian Branding**: Saffron, white, and green theme with tricolor elements
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Real-time Cart**: Live cart synchronization with local storage persistence
- **Advanced Search & Filtering**: Category-based filtering, price range, and live search
- **Authentication System**: JWT-based login/register with secure token management
- **Payment Integration**: Google Pay UPI merchant integration with fallback QR codes
- **Order Management**: Complete order tracking with invoice generation

### Backend (Node.js + Express + MongoDB)
- **RESTful API**: Clean, documented API endpoints
- **JWT Authentication**: Secure user authentication and authorization
- **Order Processing**: Complete order lifecycle management
- **Payment Verification**: Google Pay payment verification and processing
- **Notifications**: Email and WhatsApp order confirmations
- **Database**: MongoDB with Mongoose ODM

### Payment Features
- **Google Pay Integration**: Real merchant ID support for live transactions
- **UPI QR Codes**: Fallback payment method with QR code generation
- **Invoice Generation**: GST-compliant PDF invoices with Indian tax structure
- **Payment Status Tracking**: Real-time payment status updates
- **Manual Payment Confirmation**: Support for manual UPI payments

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Google Pay Merchant Account
- Twilio Account (for WhatsApp notifications)
- Gmail Account (for email notifications)

### Frontend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   VITE_GOOGLE_PAY_MERCHANT_ID=your_actual_merchant_id
   VITE_MERCHANT_NAME=DesiBazaar
   VITE_MERCHANT_UPI_ID=desibazaar@paytm
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Update with your credentials:
   ```env
   MONGODB_URI=mongodb://localhost:27017/desibazaar
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   TWILIO_SID=your-twilio-sid
   TWILIO_TOKEN=your-twilio-token
   GOOGLE_PAY_MERCHANT_ID=your-merchant-id
   ```

4. **Start Backend Server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration Guide

### Google Pay Setup
1. **Get Merchant ID**: Register at [Google Pay Business Console](https://pay.google.com/business/console)
2. **Configure Payment Methods**: Enable UPI and card payments
3. **Set up Webhooks**: Configure payment verification endpoints
4. **Update Environment**: Add your merchant ID to `.env` files

### MongoDB Setup
1. **Local MongoDB**: Install and run MongoDB locally
2. **MongoDB Atlas**: Create a cloud database at [MongoDB Atlas](https://www.mongodb.com/atlas)
3. **Connection String**: Update `MONGODB_URI` in backend `.env`

### Email Configuration
1. **Gmail Setup**: Enable 2-factor authentication
2. **App Password**: Generate an app-specific password
3. **Update Config**: Add credentials to backend `.env`

### WhatsApp Notifications
1. **Twilio Account**: Sign up at [Twilio](https://www.twilio.com)
2. **WhatsApp Sandbox**: Enable WhatsApp API in Twilio Console
3. **Configure**: Add Twilio credentials to backend `.env`

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:orderId` - Get specific order

### Payments
- `POST /api/payments/verify` - Verify payment status

## 🎨 Design System

### Colors
- **Saffron**: `#FF9933` (Primary)
- **White**: `#FFFFFF` (Background)
- **Green**: `#138808` (Success)
- **Orange**: `#FF6B35` (Accent)

### Typography
- **Headers**: Inter/Helvetica Bold
- **Body**: Inter/Helvetica Regular
- **Hindi Text**: Devanagari fonts

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **CORS Protection**: Configured for production
- **Rate Limiting**: API rate limiting for abuse prevention
- **Input Validation**: Comprehensive input sanitization

## 📦 Deployment

### Frontend (Vercel)
1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Environment Variables**: Add all `VITE_*` variables
3. **Deploy**: Automatic deployment on push

### Backend (Railway/Render)
1. **Create Service**: Set up Node.js service
2. **Environment Variables**: Add all backend environment variables
3. **Database**: Connect to MongoDB Atlas
4. **Deploy**: Push to deploy

## 🔍 Testing

### Demo Credentials
- **Email**: `demo@desibazaar.com`
- **Password**: `demo123`

### Test Payment
- Use Google Pay test environment
- Test UPI ID: `test@paytm`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For support and queries:
- **Email**: support@desibazaar.com
- **WhatsApp**: +91-1800-123-4567
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)

---

**Made with ❤️ in India** 🇮🇳