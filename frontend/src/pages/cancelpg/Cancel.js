import React from "react";
import { Link } from "react-router-dom";

export default function CancelPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-2">Checkout canceled</h1>
      <p className="text-gray-700 mb-6">No charge was made.</p>
      <Link to="/order" className="inline-block rounded-xl border border-gray-900 px-4 py-2 font-semibold">
        Back to products
      </Link>
    </div>
  );
}
