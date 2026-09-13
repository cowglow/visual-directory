import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { clearStoredToken } from "infrastructure/api/token-storage.ts";
import type { MutationStatus } from "infrastructure/redux/mutation-status.ts";

export type Role = "member" | "leader";

export type Account = {
  id: string;
  email: string;
  role: Role;
  memberId: string | null;
};

export type MagicLinkStatus = "idle" | "pending" | "sent" | "failed";

export type AuthState = {
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "offline";
  account: Account | null;
  error: string | null;
  magicLinkStatus: MagicLinkStatus;
  magicLinkError: string | null;
  inviteRequestId: string | null;
  inviteStatus: MutationStatus;
  inviteError: string | null;
  accounts: Account[];
  accountsStatus: MutationStatus;
  accountsError: string | null;
  updateAccountRequestId: string | null;
  updateAccountStatus: MutationStatus;
  updateAccountError: string | null;
};

const initialState: AuthState = {
  status: "idle",
  account: null,
  error: null,
  magicLinkStatus: "idle",
  magicLinkError: null,
  inviteRequestId: null,
  inviteStatus: "idle",
  inviteError: null,
  accounts: [],
  accountsStatus: "idle",
  accountsError: null,
  updateAccountRequestId: null,
  updateAccountStatus: "idle",
  updateAccountError: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearStoredToken();
      return { ...state, status: "unauthenticated" as const, account: null };
    },
    restoreSessionRequested(state) {
      return { ...state, status: "loading" as const };
    },
    restoreSessionSucceeded(state, action: PayloadAction<Account | null>) {
      return action.payload
        ? { ...state, status: "authenticated" as const, account: action.payload }
        : { ...state, status: "unauthenticated" as const };
    },
    // Fired from any API call, not just session restore, when the server says the
    // token is no longer valid - most commonly because it's now expired mid-session
    // (see infrastructure/api/api-client.ts's onUnauthorized hook). Same end state
    // as restoreSessionFailed's non-network branch: back to "please sign in", which
    // is where the magic-link request form lives, so the user can just ask for a
    // fresh one.
    sessionExpired(state) {
      clearStoredToken();
      return { ...state, status: "unauthenticated" as const, account: null };
    },
    restoreSessionFailed(state, action: PayloadAction<{ network: boolean }>) {
      if (action.payload.network) {
        // Server unreachable, not "your session is invalid" — don't log the user
        // out over a transient connection issue. Keep the stored token so a retry
        // can pick the session back up once the server is reachable again.
        return {
          ...state,
          status: "offline" as const,
          error: "Unable to reach the server. Check your connection and try again.",
        };
      }
      clearStoredToken();
      return { ...state, status: "unauthenticated" as const, account: null };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestMagicLinkRequested(state, _action: PayloadAction<{ email: string }>) {
      return { ...state, magicLinkStatus: "pending" as const, magicLinkError: null };
    },
    requestMagicLinkSucceeded(state) {
      // The API always responds the same way whether or not the account exists
      // (to avoid leaking which emails are registered), so reaching here is a
      // genuine "check your email" success.
      return { ...state, magicLinkStatus: "sent" as const };
    },
    requestMagicLinkFailed(state, action: PayloadAction<string>) {
      return { ...state, magicLinkStatus: "failed" as const, magicLinkError: action.payload };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    verifyMagicLinkRequested(state, _action: PayloadAction<{ token: string }>) {
      return { ...state, status: "loading" as const };
    },
    verifyMagicLinkSucceeded(state, action: PayloadAction<Account>) {
      return { ...state, status: "authenticated" as const, account: action.payload, error: null };
    },
    verifyMagicLinkFailed(state, action: PayloadAction<string>) {
      return { ...state, status: "unauthenticated" as const, error: action.payload };
    },
    inviteAccountRequested(
      state,
      action: PayloadAction<{ requestId: string; email: string; role: Role; memberId?: string }>,
    ) {
      return {
        ...state,
        inviteRequestId: action.payload.requestId,
        inviteStatus: "pending" as const,
        inviteError: null,
      };
    },
    inviteAccountSucceeded(state, action: PayloadAction<{ requestId: string }>) {
      return { ...state, inviteRequestId: action.payload.requestId, inviteStatus: "succeeded" as const };
    },
    inviteAccountFailed(state, action: PayloadAction<{ requestId: string; error: string }>) {
      return {
        ...state,
        inviteRequestId: action.payload.requestId,
        inviteStatus: "failed" as const,
        inviteError: action.payload.error,
      };
    },
    resetInviteAccount(state) {
      return { ...state, inviteRequestId: null, inviteStatus: "idle" as const, inviteError: null };
    },
    fetchAccountsRequested(state) {
      return { ...state, accountsStatus: "pending" as const, accountsError: null };
    },
    fetchAccountsSucceeded(state, action: PayloadAction<Account[]>) {
      return { ...state, accountsStatus: "succeeded" as const, accounts: action.payload };
    },
    fetchAccountsFailed(state, action: PayloadAction<string>) {
      return { ...state, accountsStatus: "failed" as const, accountsError: action.payload };
    },
    updateAccountRequested(
      state,
      action: PayloadAction<{ requestId: string; accountId: string; role: Role; memberId?: string | null }>,
    ) {
      return {
        ...state,
        updateAccountRequestId: action.payload.requestId,
        updateAccountStatus: "pending" as const,
        updateAccountError: null,
      };
    },
    updateAccountSucceeded(state, action: PayloadAction<{ requestId: string; account: Account }>) {
      return {
        ...state,
        updateAccountRequestId: action.payload.requestId,
        updateAccountStatus: "succeeded" as const,
        accounts: state.accounts.map((account) =>
          account.id === action.payload.account.id ? action.payload.account : account,
        ),
      };
    },
    updateAccountFailed(state, action: PayloadAction<{ requestId: string; error: string }>) {
      return {
        ...state,
        updateAccountRequestId: action.payload.requestId,
        updateAccountStatus: "failed" as const,
        updateAccountError: action.payload.error,
      };
    },
    resetUpdateAccount(state) {
      return { ...state, updateAccountRequestId: null, updateAccountStatus: "idle" as const, updateAccountError: null };
    },
  },
});

export const {
  logout,
  sessionExpired,
  restoreSessionRequested,
  restoreSessionSucceeded,
  restoreSessionFailed,
  requestMagicLinkRequested,
  requestMagicLinkSucceeded,
  requestMagicLinkFailed,
  verifyMagicLinkRequested,
  verifyMagicLinkSucceeded,
  verifyMagicLinkFailed,
  inviteAccountRequested,
  inviteAccountSucceeded,
  inviteAccountFailed,
  resetInviteAccount,
  fetchAccountsRequested,
  fetchAccountsSucceeded,
  fetchAccountsFailed,
  updateAccountRequested,
  updateAccountSucceeded,
  updateAccountFailed,
  resetUpdateAccount,
} = authSlice.actions;
export default authSlice.reducer;
