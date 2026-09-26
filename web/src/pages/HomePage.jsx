import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-olive-50 p-6 text-center">
      <h1 className="text-3xl font-bold text-olive-800">Bayt Zaytoun — Menu QR</h1>
      <p className="max-w-md text-olive-700">
        Scannez le QR code d'une table pour commander, ou accédez à l'espace personnel.
      </p>
      <Link
        to="/staff/login"
        className="rounded-full bg-olive-600 px-6 py-2 font-medium text-white shadow hover:bg-olive-700"
      >
        Espace personnel
      </Link>
    </div>
  );
}
