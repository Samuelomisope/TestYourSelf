import { createContext, useContext } from "react";

export const FeedbackContext = createContext(null);

const noop = { toast: { success() {}, error() {}, info() {} }, confirm: async () => false };

export const useToast = () => (useContext(FeedbackContext) || noop).toast;
export const useConfirm = () => (useContext(FeedbackContext) || noop).confirm;

// For code outside React components (or deeply nested handlers) that just needs to show a message.
let bridge = null;
export const registerToast = (t) => { bridge = t; };
export const notify = {
  success: (m) => bridge?.success(m),
  error: (m) => bridge?.error(m),
  info: (m) => bridge?.info(m),
};
