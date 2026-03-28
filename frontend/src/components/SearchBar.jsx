import { useState } from "react";
import { useBridgeScan } from "../hooks/useBridgeScan";
import useAppStore from "../store/useAppStore";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState("city_scan");
  const { scan, loadDemo, analyzeImage } = useBridgeScan();
  const isLoading = useAppStore((s) => s.isLoading);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) scan(query.trim(), queryType);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) analyzeImage(file);
    e.target.value = "";
  };

  const placeholder =
    queryType === "coordinate_query"
      ? "51.1079, 17.0385"
      : queryType === "bridge_lookup"
      ? "Most Grunwaldzki"
      : "e.g. Warsaw, Kraków";

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <select
        value={queryType}
        onChange={(e) => setQueryType(e.target.value)}
        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
      >
        <option value="city_scan">City</option>
        <option value="bridge_lookup">Bridge</option>
        <option value="coordinate_query">Coords</option>
      </select>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-44 text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />

      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
      >
        {isLoading ? "Scanning…" : "Scan"}
      </button>

      <button
        type="button"
        onClick={loadDemo}
        disabled={isLoading}
        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        Demo
      </button>

      {/* Image upload — shows modal with analysis */}
      <label
        title="Analyse a bridge photo"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4m0 0l4 4m-4-4v12M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
        Analyse image
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </form>
  );
}
