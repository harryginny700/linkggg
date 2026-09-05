import { useRef, useState } from "react";
import api, { API_BASE, formatApiError } from "@/lib/api";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

// value = full image URL (or empty). onChange(url)
export default function ImageUpload({ value, onChange, testid = "image-upload", label = "Görsel" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(`${API_BASE}${res.data.url}`);
      toast.success("Görsel yüklendi");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <Upload size={16} className="text-zinc-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`${testid}-btn`}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {label} Yükle
          </button>
          {value && (
            <button
              type="button"
              data-testid={`${testid}-clear`}
              onClick={() => onChange("")}
              className="text-zinc-500 hover:text-red-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleFile} className="hidden" data-testid={`${testid}-input`} />
    </div>
  );
}
