import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchFilterOptions } from "../api/client";
import type { FilterOptions } from "../api/types";
import { useFilters } from "../hooks/useFilters";
import type { UseFiltersReturn } from "../hooks/useFilters";

interface FiltersContextValue extends UseFiltersReturn {
  options: FilterOptions | null;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const filters = useFilters();
  const [options, setOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    fetchFilterOptions().then(setOptions);
  }, []);

  return <FiltersContext.Provider value={{ ...filters, options }}>{children}</FiltersContext.Provider>;
}

export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return ctx;
}
