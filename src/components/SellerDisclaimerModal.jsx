import { useState } from "react";

/**
 * SellerDisclaimerModal
 *
 * Shows a one-time acknowledgment modal before a buyer can view a seller's
 * contact info or proceed to "Buy Now". Stores acknowledgment in memory only
 * for the session (swap the `hasAcknowledged` state for a persisted value,
 * e.g. a user profile flag from your backend, if you want it to persist
 * across sessions).
 *
 * Usage:
 *   const [showModal, setShowModal] = useState(false);
 *   const [revealed, setRevealed] = useState(false);
 *
 *   <button onClick={() => setShowModal(true)}>Contact Seller</button>
 *
 *   <SellerDisclaimerModal
 *     open={showModal}
 *     onClose={() => setShowModal(false)}
 *     onAcknowledge={() => { setRevealed(true); setShowModal(false); }}
 *   />
 */
export default function SellerDisclaimerModal({ open, onClose, onAcknowledge }) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-disclaimer-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="seller-disclaimer-title"
          className="text-lg font-semibold text-gray-900"
        >
          Before you continue
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          This platform does not process payments or verify sellers. All
          transactions happen directly between you and the seller.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-gray-600 list-disc list-inside">
          <li>Meet the seller in person before paying</li>
          <li>Inspect the item and confirm it matches the listing</li>
          <li>Avoid sending payment in advance to anyone you haven't met</li>
        </ul>

        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I understand and agree to meet the seller and inspect goods
          before making any payment.
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={onAcknowledge}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-indigo-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
