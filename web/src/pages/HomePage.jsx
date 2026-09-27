import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-olive-900 to-olive-800 p-6 text-center text-white">
      <p className="font-logo text-4xl">Bayt Zaytoun</p>
      <p className="max-w-md text-olive-100">
        Scannez le QR code d'une table pour commander, ou accédez à l'espace personnel.
      </p>
      <Link
        to="/staff/login"
        className="mt-2 flex items-center gap-2 rounded-full bg-white px-6 py-2.5 font-medium text-olive-800 shadow-floating transition hover:bg-sand-100"
      >
        Espace personnel <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
