const Auth = require("../model/Auth");
const RefreshToken = require("../model/RefreshToken");
const authLogger = require("../utils/authLogger");
const {
  accessTokenGenerator,
  refreshTokenGenerator,
} = require("../utils/tokenGenerator");
const { validateSignUp, validateSignIn } = require("../utils/validation");

const userSignUp = async (req, res) => {
  authLogger.info("User Registration Endpoint Hit.....");
  try {
    const { error } = validateSignUp(req.body);
    if (error) {
      authLogger.warn("Validation Error Occured", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const {
      firstName,
      lastName,
      userName,
      phoneNumber,
      email,
      password,
      role,
    } = req.body;

    const existingUser = await Auth.findOne({ $or: [{ email }, { userName }] });

    if (existingUser) {
      authLogger.warn("User Already Exists.....Please Login to Continue");
      return res.status(401).json({
        success: false,
        message: "User Already Exists.....Please Login to Continue",
      });
    }

    const newUser = await Auth.create({
      firstName,
      lastName,
      userName,
      phoneNumber,
      email,
      password,
      role,
    });

    authLogger.info("New User Registered Successfully");

    const accessToken = accessTokenGenerator(newUser);
    const refreshToken = await refreshTokenGenerator(res, newUser.id);

    if (!accessToken || !refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Error Generating Token",
      });
    }

    newUser.refreshToken = JSON.stringify(refreshToken);

    await newUser.save();

    return res.status(200).json({
      success: true,
      message: "New User Registered Successfully",
      accessToken,
    });
  } catch (error) {
    authLogger.error("Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const userSignIn = async (req, res) => {
  authLogger.info("Login Endpoint Reached.......");
  try {
    const { error } = validateSignIn(req.body);
    if (error) {
      authLogger.warn(error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;

    const existingUser = await Auth.findOne({ email });

    if (!existingUser) {
      authLogger.warn("User not Found...");
      return res.status(404).json({
        success: false,
        message: "User Not found",
      });
    }

    const validatePassword = await existingUser.validatePassword(password);

    if (!validatePassword) {
      authLogger.warn("Incorrect Email or Password");
      return res.status(402).json({
        success: false,
        message: "Incorrect Email or Password",
      });
    }

    const accessToken = accessTokenGenerator(existingUser);
    const refreshToken = await refreshTokenGenerator(res, existingUser.id);

    if (!accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Error Generating Token",
      });
    }

    existingUser.refreshToken = JSON.stringify(refreshToken);

    await existingUser.save();

    const userData = existingUser;

    return res.status(200).json({
      success: true,
      message: "User Log in Successful",
      user: userData,
      accessToken,
    });
  } catch (error) {
    authLogger.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const user = await RefreshToken.findOne({ user: req.userInfo?.userId });
    const refreshToken = req.cookies?.refreshToken || user?.refreshToken;
    if (!refreshToken) {
      authLogger.warn("Refresh Token not Found");
      return res.status(404).json({
        success: false,
        message: "Refresh Token not Found",
      });
    }

    const existingToken = await RefreshToken.findOne({ token: refreshToken });
    if (!existingToken || existingToken.expiresIn < new Date()) {
      authLogger.warn("User Logged Out");
      return res.status(401).json({
        success: false,
        message: "Session Expired....Please Login Again To Continue",
      });
    }

    const tokenUser = await Auth.findById(existingToken.user).select(
      "-password -refreshToken",
    );

    if (!tokenUser) {
      authLogger.warn("Token with userId not Found");
      return res.status(401).json({
        success: false,
        message: "Session Expired....Please Login Again To Continue",
      });
    }

    const accessToken = accessTokenGenerator(tokenUser);

    return res.status(200).json({
      success: true,
      message: "New Access Token Created Successfully",
      user: tokenUser,
      accessToken,
    });
  } catch (error) {
    authLogger.error("Refresh Token Error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Internal Server Error Occured.... Please check your onternet connection and try again",
    });
  }
};

const getUserDetails = async (req, res) => {
  authLogger.info("Get User Details Endpoint Hit.....");
  try {
    const user = await Auth.findById(req.userInfo.userId).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details gotten successfully",
      data: user,
    });
  } catch (error) {
    authLogger.error("Get User Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const logOut = async (req, res) => {
  try {
    const tokenUser = await RefreshToken.findOne({
      user: req.userInfo?.userId,
    });

    if (!tokenUser) {
      authLogger.warn("UserLogged Out Already");
      return res.status(404).json({
        success: false,
        message: "User Logged Out Already",
      });
    }

    const delToken = await RefreshToken.findByIdAndDelete(tokenUser._id);

    if (!delToken) {
      authLogger.warn("Error logging out User");
      return res.status(401).json({
        success: false,
        message: "Error logging out User",
      });
    }

    authLogger.info("User Logged Out Successfully");
    return res.status(200).json({
      success: true,
      message: "User Logged Out Successfully",
    });
  } catch (error) {
    authLogger.error("Internal Server Error Occured");
    return res.status(500).json({
      success: true,
      message: "Internal Server Error Occured",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const getUsers = await Auth.find({});

    if(!getUsers){
      authLogger.warn("Error Fetching Users");
    return res.status(404).json({
      success: true,
      message: "Error Fetching Users",
    });
    }
    
    authLogger.info("Users Fetched Succesfully");
    return res.status(200).json({
      success: true,
      message: "Users Fetched Succesfully",
      data: getUsers
    });

    
  } catch (error) {
    authLogger.error("Internal Server error Occured");
    return res.status(500).json({
      success: true,
      message: "Internal Server Error Occured",
    });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // 1. Validate role payload against enum options
    const validRoles = ['admin', 'user'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Optional Guard: Prevent an admin from accidentally de-ranking themselves
    if (req.user && req.user.id === id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Bailing out: You cannot remove your own admin privileges.'
      });
    }

    // 2. Find and update the user target
    const updatedUser = await Auth.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true } // runValidators ensures the schema enum check triggers
    ).select('-password -refreshToken'); // Keep sensitive data out of payload response

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user record could not be found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}`,
      user: updatedUser
    });

  } catch (error) {
    // Replace console with your authLogger instance if available
    console.error('Error changing user role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while updating user role.'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional Guard: Prevent self-deletion via dashboard loops
    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Self-deletion is blocked via this endpoint.'
      });
    }

    // Execute hard delete row purge
    const deletedUser = await Auth.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user account could not be found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User account has been permanently scrubbed from the directory.'
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while executing user account deletion.'
    });
  }
};

module.exports = {
  userSignUp,
  userSignIn,
  refreshTokenController,
  getUserDetails,
  logOut,
  getAllUsers,
  changeUserRole,
  deleteUser
};
