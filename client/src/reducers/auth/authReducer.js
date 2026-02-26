const initialAuthState = {
  user: null,
  permissions: null,
  isAuth: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "INIT_START":
      return { ...state, isLoading: true, error: null };
    case "INIT_SUCCESS":
      return {
        ...state,
        user: action.payload?.user ?? null,
        permissions: action.payload?.permissions ?? null,
        isAuth: Boolean(action.payload?.user),
        isLoading: false,
        error: null,
      };
    case "INIT_ERROR":
      return {
        ...state,
        user: null,
        permissions: null,
        isAuth: false,
        isLoading: false,
        error: action.payload || null,
      };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload?.user ?? null,
        permissions: action.payload?.permissions ?? null,
        isAuth: true,
        isLoading: false,
        error: null,
      };
    case "LOGOUT":
    case "EXPIRED":
      return {
        ...state,
        user: null,
        permissions: null,
        isAuth: false,
        isLoading: false,
        error: null,
      };
    case "FORBIDDEN":
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
}

export { initialAuthState, authReducer };
