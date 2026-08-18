import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/api/auth";
import { authService } from "../api/services";
import type { AuthUser } from "../types";
import type { ApiError } from "@/types/api";
import { extractApiError } from "@/utils/apiError";
import {
  ChangePasswordInput,
  LoginInput,
  SignupRequestInput,
  UpdateProfileInput,
} from "@/contracts/validation";
import type { SignupRequestResponse } from "@/contracts/types";

export interface AuthState {
  user: AuthUser | null;
  selectedOrganizationId: string | null;
  loading: boolean;
  error: string | null;
  fetchMeRequestId: string | null;
}

const initialState: AuthState = {
  user: null,
  selectedOrganizationId: null,
  loading: true, // Start true while validating session on load
  error: null,
  fetchMeRequestId: null,
};

// ================= THUNKS =================

export const bootstrapAuth = createAsyncThunk<
  { user: AuthUser },
  void,
  { rejectValue: ApiError }
>("auth/bootstrap", async (_, { rejectWithValue }) => {
  try {
    if (!getAccessToken()) {
      const refreshData = await authService.refreshSession();
      if (!refreshData?.accessToken) {
        return rejectWithValue({
          success: false,
          status: 401,
          message: "No session",
        });
      }
      setAccessToken(refreshData.accessToken);
    }

    const data = await authService.fetchMe();
    if (!data?.user) {
      return rejectWithValue({
        success: false,
        status: 401,
        message: "No session",
      });
    }

    return {
      user: data.user,
    };
  } catch (error) {
    clearAccessToken();
    return rejectWithValue(extractApiError(error));
  }
});

export const fetchMe = createAsyncThunk<
  { user: AuthUser },
  void,
  { rejectValue: ApiError }
>("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const data = await authService.fetchMe();
    if (!data?.user) {
      return rejectWithValue({
        success: false,
        status: 401,
        message: "No session",
      });
    }
    return {
      user: data.user,
    };
  } catch (error) {
    return rejectWithValue(extractApiError(error));
  }
});

export const login = createAsyncThunk<
  { user: AuthUser },
  LoginInput,
  { rejectValue: ApiError }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const data = await authService.login(payload);
    const { user, accessToken } = data;
    setAccessToken(accessToken);
    return { user };
  } catch (error) {
    return rejectWithValue(extractApiError(error));
  }
});

export const signup = createAsyncThunk<
  SignupRequestResponse,
  SignupRequestInput,
  { rejectValue: ApiError }
>("auth/signup", async (payload, { rejectWithValue }) => {
  try {
    return await authService.submitSignupRequest(payload);
  } catch (error) {
    return rejectWithValue(extractApiError(error));
  }
});

export const updateProfile = createAsyncThunk<
  { user: AuthUser },
  UpdateProfileInput | FormData,
  { rejectValue: ApiError }
>("auth/updateProfile", async (payload, { rejectWithValue }) => {
  try {
    const data = await authService.updateProfile(payload);
    return {
      user: data.user,
    };
  } catch (error) {
    return rejectWithValue(extractApiError(error));
  }
});

export const changePassword = createAsyncThunk<
  void,
  ChangePasswordInput,
  { rejectValue: ApiError }
>("auth/changePassword", async (payload, { rejectWithValue }) => {
  try {
    await authService.changePassword(payload);
  } catch (error) {
    return rejectWithValue(extractApiError(error));
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: ApiError }>(
  "auth/logout",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue(extractApiError(error));
    } finally {
      dispatch(authSlice.actions.clearAuth());
    }
  },
);

// ================= SLICE =================

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      state.user = null;
      state.selectedOrganizationId = null;
      state.loading = false;
      state.error = null;
      state.fetchMeRequestId = null;
      clearAccessToken();
      // Notify other tabs
      localStorage.setItem("auth_logout", Date.now().toString());
    },
    setSelectedOrganizationId(state, action: { payload: string | null }) {
      state.selectedOrganizationId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // BOOTSTRAP AUTH (Refresh session before fetching /me)
      .addCase(bootstrapAuth.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchMeRequestId = action.meta.requestId;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (state.fetchMeRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.fetchMeRequestId = null;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        if (state.fetchMeRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.fetchMeRequestId = null;
        state.user = null;
        state.selectedOrganizationId = null;
        state.error = null;
      })

      // FETCH ME (Initialize App Auth State)
      .addCase(fetchMe.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchMeRequestId = action.meta.requestId;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        if (state.fetchMeRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.fetchMeRequestId = null;
        state.user = action.payload.user;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        if (state.fetchMeRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.fetchMeRequestId = null;
        if (state.user) {
          state.error = null;
          return;
        }
        state.user = null;
        state.error = action.payload?.message ?? "Session invalid";
      })

      // LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fetchMeRequestId = null;
        state.selectedOrganizationId = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.selectedOrganizationId = null;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.selectedOrganizationId = null;
        clearAccessToken();
        state.error = action.payload?.message ?? "Login failed";
      })

      // SIGNUP
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fetchMeRequestId = null;
        state.selectedOrganizationId = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = null;
        state.selectedOrganizationId = null;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.selectedOrganizationId = null;
        clearAccessToken();
        state.error = action.payload?.message ?? "Signup failed";
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload?.message ?? "Failed to update profile";
      })

      // CHANGE PASSWORD
      .addCase(changePassword.pending, (state) => {
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.user = null;
        clearAccessToken();
        localStorage.setItem("auth_logout", Date.now().toString());
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload?.message ?? "Failed to change password";
      })

      // LOGOUT
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.fetchMeRequestId = null;
        // clearAuth handles the rest
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.fetchMeRequestId = null;
        // even if server fails, we log out locally via clearAuth in the thunk's finally
      });
  },
});

export const { clearAuth, setSelectedOrganizationId } = authSlice.actions;
export default authSlice.reducer;
