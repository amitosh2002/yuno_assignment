import User from "../Models/userModel.js";
// No need to import mongoose or require it here.

export const createUser = async (req, res) => {
  try {
    const { name, email, address } = req.body;

    // Input validation
    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required." });
    }

    let user = await User.findOne({ email });

    // If user doesn't exist, create a new one.
    if (!user) {
      user = new User({ 
        name, 
        email, 
        address // The address field is now included in the schema
      });
      await user.save();
    }

    // Return the user data
    res.status(200).json(user);
  } catch (error) {
    console.error("Error creating or finding user:", error);
    res.status(500).json({ message: "An error occurred while processing the request." });
  }
};