"use client";

import { createContext, useContext, useState } from "react";

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <SearchContext.Provider value={{ query, setQuery, open, setOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    // Default implementation if provider is missing
    return {
      query: "",
      setQuery: () => {},
      open: false,
      setOpen: () => {},
    };
  }
  return context;
}
