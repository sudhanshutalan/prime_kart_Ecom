import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import { toggleAuthPopup } from "./popupSlice.js";

export const register = createAsyncThunk(
  "auth/register",
  async (data, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/auth/register", data);
      toast.success(response.data.message);
      thunkAPI.dispatch(toggleAuthPopup());
      return response.data.user;
    } catch (error) {
      toast.error(error.response.data.message);
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  }
);

export const login = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/login", data);
    toast.success(response.data.message);
    thunkAPI.dispatch(toggleAuthPopup());
    return response.data.user;
  } catch (error) {
    toast.error(error.response.data.message);
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const getUser = createAsyncThunk("auth/getUser", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/auth/getUser");
    toast.success(response.data.message);
    return response.data.user;
  } catch (error) {
    toast.error(error.response.data.message);
    return thunkAPI.rejectWithValue(
      error.response.data.message || "Failed to get User"
    );
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/auth/logout");
    toast.success(response.data.message);
    thunkAPI.dispatch(toggleAuthPopup());
    return null;
  } catch (error) {
    toast.error(error.response.data.message);
    return thunkAPI.rejectWithValue(
      error.response.data.message || "Failed to logout"
    );
  }
});

export const forgotPassword = createAsyncThunk(
  "auth/forgot-password",
  async (email, thunkAPI) => {
    try {
      const response = await axiosInstance.post(
        "/auth/forgot-password?frontendUrl=http://localhost:5173",
        email
      );
      toast.success(response.data.message);
      return null;
    } catch (error) {
      toast.error(error.response.data.message);
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/reset-password",
  async ({ token, password, confirmPassword }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(
        `/auth/reset-password/${token}`,
        { password, confirmPassword }
      );
      toast.success(response.data.message);
      return response.data.user;
    } catch (error) {
      const message = error.response.data.message || "Some thing went wrong";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updatePassword = createAsyncThunk(
  "auth/update-password",
  async ({ currentPassword, newPassword, confirmNewPassword }, thunkAPI) => {
    try {
      // timestamp = 8:57
      const response = await axiosInstance.put("/auth/update-password", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success(response.data.message);
      return response.data.user;
    } catch (error) {
      const message = error.response.data.message || "Some thing went wrong";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/update-profile",
  async (data, thunkAPI) => {
    try {
      const response = await axiosInstance.put("/auth/update-profile", data);
      toast.success(response.data.message);
      return response.data.user;
    } catch (error) {
      const message = error.response.data.message || "Some thing went wrong";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isUpdatingPassword: false,
    isRequestingForToken: false,
    isCheckingAuth: true,
  },
  extraReducers: (builder) => {
    builder.addCase(register.pending, (state) => {
      state.isSigningUp = true;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isSigningUp = false;
      state.authUser = action.payload;
    });
    builder.addCase(register.rejected, (state) => {
      state.isSigningUp = false;
    });
    builder.addCase(login.pending, (state) => {
      state.isLoggingIn = true;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoggingIn = false;
      state.authUser = action.payload;
    });
    builder.addCase(login.rejected, (state) => {
      state.isLoggingIn = false;
    });
    builder.addCase(getUser.pending, (state) => {
      state.isCheckingAuth = true;
      state.authUser = null;
    });
    builder.addCase(getUser.fulfilled, (state, action) => {
      state.isCheckingAuth = false;
      state.authUser = action.payload;
    });
    builder.addCase(getUser.rejected, (state) => {
      state.isCheckingAuth = false;
      state.authUser = null;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.isLoggingOut = {};
    });
    builder.addCase(logout.rejected, (state) => {
      state.isLoggingOut = state.authUser;
    });
    builder.addCase(forgotPassword.pending, (state) => {
      state.isRequestingForToken = true;
    });
    builder.addCase(forgotPassword.fulfilled, (state) => {
      state.isRequestingForToken = false;
    });
    builder.addCase(forgotPassword.rejected, (state) => {
      state.isRequestingForToken = false;
    });
    builder.addCase(resetPassword.pending, (state) => {
      state.isResettingPassword = true;
    });
    builder.addCase(resetPassword.fulfilled, (state, action) => {
      state.isResettingPassword = false;
      state.authUser = action.payload;
    });
    builder.addCase(resetPassword.rejected, (state) => {
      state.isResettingPassword = false;
    });
    builder.addCase(updatePassword.pending, (state) => {
      state.isUpdatingPassword = true;
    });
    builder.addCase(updatePassword.fulfilled, (state) => {
      state.isUpdatingPassword = false;
    });
    builder.addCase(updatePassword.rejected, (state) => {
      state.isUpdatingPassword = false;
    });
    builder.addCase(updateProfile.pending, (state) => {
      state.isUpdatingProfile = true;
    });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.isUpdatingProfile = false;
      state.authUser = action.payload;
    });
    builder.addCase(updateProfile.rejected, (state) => {
      state.isUpdatingProfile = false;
    });
  },
});

export default authSlice.reducer;
