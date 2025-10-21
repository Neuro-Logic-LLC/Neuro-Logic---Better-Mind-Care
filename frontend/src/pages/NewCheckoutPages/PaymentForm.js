// Minimal, unblocked: Stripe collects card on its page.
// Just shows amount and calls onPay().
import { PrimaryButton } from '../../components/button/Buttons';

export default function PaymentForm({
  amountLabel = '$0.00',
  disabled,
  onPay
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <PrimaryButton
          type="button"
          disabled={disabled}
          onClick={onPay}
          className="w-full h-11 rounded-lg bg-black text-white font-medium disabled:opacity-60"
        >
          Checkout — {amountLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
