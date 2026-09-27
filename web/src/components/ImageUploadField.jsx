import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2 } from "lucide-react";
import { api } from "../lib/api.js";

const MAX_SIZE = 5 * 1024 * 1024;

export default function ImageUploadField({ value, onChange, className = "" }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("common.uploadInvalidType"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t("common.uploadTooLarge"));
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      const res = await api.post("/admin/uploads", formData);
      onChange(res.data.url);
    } catch {
      setError(t("common.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-dashed border-sand-200 dark:border-olive-700 bg-sand-50 dark:bg-olive-950/40"
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-olive-400" />
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("common.image")}
          className="w-full rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
