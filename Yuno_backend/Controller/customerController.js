import axios from 'axios';
import User from '../Models/userModel.js';
import { generateToken } from '../Authentication/authMiddleware.js';
import mongoose from 'mongoose';

const YUNO_API_BASE = 'https://api-sandbox.y.uno/v1';
export const createCustomer = async (req, res) => {
  try {
    const { name, email, address } = req.body;

    // 🔑 Input validation
    if (!email || !name) {
      return res.status(400).json({
        error: "Email and name are required.",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user && user.yunoCustomerId) {
      return res.status(200).json({
        message: "Customer already exists",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          yunoCustomerId: user.yunoCustomerId,
          merchantCustomerId: user.merchantCustomerId,
        },
        token: generateToken(user._id),
      });
    }

    // Generate merchant_customer_id
    const merchantCustomerId = user
      ? user._id.toString()
      : new mongoose.Types.ObjectId().toString();

    // Split name safely
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Build payload for Yuno
    const payload = {
      merchant_customer_id: merchantCustomerId,
      first_name: firstName,
      last_name: lastName,
      email,
      country: address?.country || "US",
    };

    if (address?.document?.type && address?.document?.number) {
      payload.document = {
        document_type: address.document.type,
        document_number: address.document.number,
      };
    }

    if (address?.phone?.countryCode && address?.phone?.number) {
      payload.phone = {
        country_code: address.phone.countryCode,
        number: address.phone.number,
      };
    }

    if (address?.billing_address) {
      payload.billing_address = address.billing_address;
    }

    if (address?.shipping_address) {
      payload.shipping_address = address.shipping_address;
    }

    // Call Yuno API
    const yunoResponse = await axios.post(`${YUNO_API_BASE}/customers`, payload, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "public-api-key": process.env.PUBLIC_API_KEY,
        "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
      },
      timeout: 30000,
    });

    const yunoCustomer = yunoResponse.data;

    if (!yunoCustomer?.id) {
      throw new Error("Invalid Yuno response: missing customer ID");
    }

    // Save/update user in DB
    if (user) {
      user.yunoCustomerId = yunoCustomer.id;
      user.name = name;
      user.address = address || user.address;
      await user.save();
    } else {
      user = new User({
        name,
        email,
        address: address || {},
        yunoCustomerId: yunoCustomer.id,
        merchantCustomerId,
      });
      await user.save();
    }

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Customer created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        yunoCustomerId: user.yunoCustomerId,
        merchantCustomerId: user.merchantCustomerId,
      },
      yunoCustomer,
      token,
    });
  } catch (error) {
    console.error("Customer creation error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.message || "Yuno API error",
        code: "YUNO_API_ERROR",
        details: error.response.data,
      });
    } else if (error.request) {
      return res.status(503).json({
        error: "Payment service unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    } else {
      return res.status(500).json({
        error: error.message || "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
};
// Create customer using Yuno API
// Create customer using Yuno API
// export const createCustomer = async (req, res) => {
//   try {
//     const { name, email, address } = req.body;

//     // Input validation
//     if (!email || !name) {
//       return res.status(400).json({
//         error: "Email and name are required.",
//         code: "MISSING_REQUIRED_FIELDS",
//       });
//     }

//     // Check if user already exists
//     let user = await User.findOne({ email });
//     if (user && user.yunoCustomerId) {
//       return res.status(200).json({
//         message: "Customer already exists",
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           yunoCustomerId: user.yunoCustomerId,
//         },
//         token: generateToken(user._id),
//       });
//     }

//     // Generate merchant_customer_id
//     // You can use MongoDB _id, or your own UUID
//     const merchantCustomerId = user ? user._id.toString() : new mongoose.Types.ObjectId().toString();

//     // Create customer with Yuno API
//     // const yunoResponse = await axios.post(
//     //   `${YUNO_API_BASE}/customers`,
//     //   {
//     //     merchant_customer_id: merchantCustomerId, // ✅ REQUIRED
//     //     name,
//     //     email,
//     //     address: address || {},
//     //   },
//     //   {
//     //     headers: {
//     //       accept: "application/json",
//     //       "content-type": "application/json",
//     //       "public-api-key": process.env.PUBLIC_API_KEY,
//     //       "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
//     //     },
//     //     timeout: 30000,
//     //   }
//     // );
//     const yunoResponse = await axios.post(
//   `${YUNO_API_BASE}/customers`,
//   {
//     merchant_customer_id: merchantCustomerId, // required
//     first_name: name.split(" ")[0] || name,   // split into first and last
//     last_name: name.split(" ").slice(1).join(" ") || "",
//     email,
//     country: address?.country || "US",
//     document: address?.document ? {
//       document_type: address.document.type,   // e.g., "CC" or "CPF"
//       document_number: address.document.number
//     } : undefined,
//     phone: address?.phone ? {
//       country_code: address.phone.countryCode,
//       number: address.phone.number
//     } : undefined,
//     billing_address: address?.billing_address || undefined,
//     shipping_address: address?.shipping_address || undefined,
//   },
//   {
//     headers: {
//       accept: "application/json",
//       "content-type": "application/json",
//       "public-api-key": process.env.PUBLIC_API_KEY,
//       "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
//     },
//     timeout: 30000,
//   }
// );


//     const yunoCustomer = yunoResponse.data;

//     // Create or update user in database
//     if (user) {
//       user.yunoCustomerId = yunoCustomer.id;
//       user.name = name;
//       user.address = address || user.address;
//       await user.save();
//     } else {
//       user = new User({
//         name,
//         email,
//         address: address || {},
//         yunoCustomerId: yunoCustomer.id,
//         merchantCustomerId, // Save locally for future reference
//       });
//       await user.save();
//     }

//     // Generate JWT token
//     const token = generateToken(user._id);

//     res.status(201).json({
//       message: "Customer created successfully",
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         yunoCustomerId: user.yunoCustomerId,
//         merchantCustomerId: user.merchantCustomerId,
//       },
//       yunoCustomer,
//       token,
//     });
//   } catch (error) {
//     console.error("Customer creation error:", error);

//     if (error.response) {
//       return res.status(error.response.status).json({
//         error: error.response.data?.message || "Yuno API error",
//         code: "YUNO_API_ERROR",
//         details: error.response.data,
//       });
//     } else if (error.request) {
//       return res.status(503).json({
//         error: "Payment service unavailable",
//         code: "SERVICE_UNAVAILABLE",
//       });
//     } else {
//       return res.status(500).json({
//         error: error.message || "Internal server error",
//         code: "INTERNAL_ERROR",
//       });
//     }
//   }
// };

// Get customer information
export const getCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer from Yuno API
    // const yunoResponse = await axios.get(
    //   `${YUNO_API_BASE}/customers/${customerId}`,
    //   {
    //     headers: {
    //       'accept': 'application/json',
    //       'public-api-key': process.env.PUBLIC_API_KEY,
    //       'private-secret-key': process.env.PRIVATE_SECURITY_KEY
    //     },
    //     timeout: 30000
    //   }
    // );

    // res.json({
    //   success: true,
    //   customer: yunoResponse.data
    // });
    const yunoResponse = await axios.post(
  `${YUNO_API_BASE}/customers`,
  {
    merchant_customer_id: merchantCustomerId, // required
    first_name: name.split(" ")[0] || name,   // split into first and last
    last_name: name.split(" ").slice(1).join(" ") || "",
    email,
    country: address?.country || "US",
    document: address?.document ? {
      document_type: address.document.type,   // e.g., "CC" or "CPF"
      document_number: address.document.number
    } : undefined,
    phone: address?.phone ? {
      country_code: address.phone.countryCode,
      number: address.phone.number
    } : undefined,
    billing_address: address?.billing_address || undefined,
    shipping_address: address?.shipping_address || undefined,
  },
  {
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "public-api-key": process.env.PUBLIC_API_KEY,
      "private-secret-key": process.env.PRIVATE_SECURITY_KEY,
    },
    timeout: 30000,
  }
);


  console.log(yunoResponse.data);
  } catch (error) {
    console.error('Get customer error:', error);

    if (error.response) {
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.message || 'Customer not found';
      
      return res.status(statusCode).json({
        error: errorMessage,
        code: 'CUSTOMER_NOT_FOUND'
      });
    } else {
      return res.status(500).json({
        error: "Internal server error",
        code: 'INTERNAL_ERROR'
      });
    }
  }
};

// Update customer information
export const updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const updateData = req.body;

    // Update customer in Yuno API
    const yunoResponse = await axios.put(
      `${YUNO_API_BASE}/customers/${customerId}`,
      updateData,
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'public-api-key': process.env.PUBLIC_API_KEY,
          'private-secret-key': process.env.PRIVATE_SECURITY_KEY
        },
        timeout: 30000
      }
    );

    // Update local user record
    const user = await User.findOne({ yunoCustomerId: customerId });
    if (user) {
      if (updateData.name) user.name = updateData.name;
      if (updateData.email) user.email = updateData.email;
      if (updateData.address) user.address = updateData.address;
      await user.save();
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer: yunoResponse.data
    });

  } catch (error) {
    console.error('Update customer error:', error);

    if (error.response) {
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.message || 'Failed to update customer';
      
      return res.status(statusCode).json({
        error: errorMessage,
        code: 'UPDATE_FAILED'
      });
    } else {
      return res.status(500).json({
        error: "Internal server error",
        code: 'INTERNAL_ERROR'
      });
    }
  }
};
