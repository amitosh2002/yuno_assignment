# Yuno Full-Stack Payment Integration

This project demonstrates a full-stack e-commerce application with payment processing integrated using the **Yuno SDK**. The frontend is built with React, and the backend is an Express.js server. The setup uses `concurrently` to run both services with a single command, which is ideal for development.

---

## 🚀 Features

* **Secure Payments**: The application handles sensitive card information securely through Yuno's tokenization process.
* **Full-Stack Workflow**: It demonstrates the complete payment flow, from creating a customer and checkout session on the backend to finalizing the payment with a one-time token from the frontend.
* **Single-Command Startup**: A `concurrently` script simplifies the development process, allowing both the frontend and backend to be started simultaneously.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: [https://nodejs.org/](https://nodejs.org/)
* **npm**: Comes with Node.js
* **A Yuno Account**: You will need your Public API Key and Private Secret Key from your Yuno dashboard.

---

## 📁 Project Structure

The project is organized into two main directories:

* `Yuno_payments/`: Contains the React frontend code.
* `Yuno_backend/`: Contains the Express.js backend code.
* To run the project First run the command in npm install
* npm run dev
* # Install backend dependencies
cd Yuno_backend
npm install

# Install frontend dependencies
cd ../Yuno_payments
npm install
# To Run the Project got to the Parent folder yuno assignment then run these command
*npm install
*npm run dev 
*This will automatically run both the frontend and backend
---

## ⚙️ Setup and Installation

Follow these steps to get the project up and running on your local machine.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <your-project-directory>
