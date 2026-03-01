# FundMyIdea BD 🎓

[![Node.js](https://img.shields.io/badge/Node.js-14.x%2B-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-blue)](https://www.mongodb.com/cloud/atlas)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A modern, full-stack crowdfunding platform built for Bangladeshi students to bring their innovative ideas to life. Connect with supporters, showcase your projects, and make your educational dreams a reality.

## 🌟 Key Features

### 💡 Campaign Management
- **Create & Launch**: Build compelling campaigns with rich media support
- **Dynamic Listings**: Real-time campaign discovery with advanced search
- **Progress Tracking**: Visual funding progress and milestone monitoring
- **Smart Categories**: Organized by Technology, Education, Social Impact, and more

### 👥 User Experience
- **Personalized Dashboard**: Track your campaigns and donations in one place
- **Secure Authentication**: JWT-based login with session management
- **Mobile Responsive**: Beautiful interface that works on all devices
- **bKash Integration**: Local payment processing for Bangladeshi users

### 🛠 Technical Excellence
- **Component-Based CSS**: Custom styling architecture without external frameworks
- **Server-Side Rendering**: Fast, SEO-friendly EJS templates
- **Cloud Database**: MongoDB Atlas for reliable data storage
- **File Uploads**: Secure image handling with Multer middleware

## 🚀 Getting Started

### Prerequisites
- Node.js 14.x or higher
- MongoDB Atlas account
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fundmyidea-bd.git
cd fundmyidea-bd

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and other configurations

# Start the development server
npm run dev
```

Visit `http://localhost:3000` to see the application in action!

## 🏗 Architecture Overview

```
fundmyidea-bd/
├── src/
│   ├── controllers/     # Business logic handlers
│   ├── models/         # Database schemas
│   ├── routes/         # API endpoint definitions
│   └── middleware/     # Authentication & validation
├── views/
│   ├── pages/         # EJS templates
│   └── partials/      # Reusable components
├── public/
│   ├── styles/        # Component-based CSS
│   └── uploads/       # User uploaded images
└── server.js          # Main application entry
```

## 🔧 Core Components

### Authentication System
- Secure user registration and login
- Password reset functionality
- Session-based authentication with JWT
- Protected route middleware

### Campaign Engine
- Create campaigns with title, description, funding goals
- Image upload support with file validation
- Real-time funding progress calculation
- Deadline management and status tracking

### Payment Processing
- bKash-ready donation system
- Supporter tracking with messages
- Transaction history and receipts
- Creator earnings dashboard

## 🎨 Design Philosophy

### Component-Based CSS Approach
Unlike traditional utility-first frameworks, we've implemented a semantic component architecture:

```css
/* Instead of: bg-blue-500 text-white p-4 rounded */
/* We use: */
.campaign-card {
    background: var(--primary-blue);
    color: white;
    padding: 1rem;
    border-radius: var(--border-radius-lg);
}
```

This approach provides:
- Better maintainability and readability
- Consistent design system
- Easier customization
- Reduced CSS bundle size

## 📊 Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  university: String,
  password: String,
  profileImage: String,
  createdAt: Date
}
```

### Campaign Model
```javascript
{
  title: String,
  description: String,
  category: String,
  fundingGoal: Number,
  currentFunding: Number,
  deadline: Date,
  creator: ObjectId,
  backers: [{
    user: ObjectId,
    amount: Number,
    message: String,
    bkashNumber: String
  }],
  imageUrl: String,
  status: String,
  createdAt: Date
}
```

## 🤝 Contributing

We love contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the component-based CSS architecture
- Write clean, documented code
- Test thoroughly before submitting PRs
- Adhere to existing code style

## 📈 Project Stats

<!-- GitHub Stats -->
![GitHub contributors](https://img.shields.io/github/contributors/dristee9/my-html-project
![GitHub last commit](https://img.shields.io/github/last-commit/dristee9/my-html-project
![GitHub issues](https://img.shields.io/github/issues/dristee9/my-html-project
![GitHub pull requests](https://img.shields.io/github/issues-pr/dristee9/my-html-project
https://github.com/

## 🛡 Security

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- File upload security measures
- Protected routes and middleware

## 📞 Support

Need help? Feel free to:
- Open an issue on GitHub
- Contact our development team
- Check the documentation wiki

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by successful crowdfunding platforms
- Built for the Bangladeshi student community
- Powered by modern web technologies
- Supported by open-source tools and libraries

---

<p align="center">
  Made with ❤️ for Bangladeshi students
  <br>
  <a href="https://github.com/dristee9/my-html-project">View on GitHub</a>
</p>