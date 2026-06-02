import { useState, useEffect, useRef } from "react";
import { Bell, Search, Loader2, Building, User, TrendingUp, MessageSquare, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks";
import { searchGlobal } from "@/services/dashboard.service";

const SEARCH_ID = "global-search";

export function TopNav() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchGlobal(debouncedQuery)
      .then((res) => {
        setSuggestions(res);
        setActiveIndex(-1);
      })
      .catch((err) => {
        console.error("Global search error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Collect flat list of items for keyboard navigation and rendering
  const flatItems: any[] = [];
  if (suggestions) {
    if (suggestions.properties?.length) {
      suggestions.properties.forEach((p: any) => {
        flatItems.push({
          type: "property",
          id: p.id,
          title: p.title,
          subtitle: `${p.city}, ${p.state} • $${p.price.toLocaleString()}`,
          onClick: () => {
            window.location.href = `${ROUTES.property}?search=${encodeURIComponent(p.title)}`;
            setIsOpen(false);
            setQuery("");
          },
        });
      });
    }
    if (suggestions.customers?.length) {
      suggestions.customers.forEach((c: any) => {
        flatItems.push({
          type: "customer",
          id: c.id,
          title: c.name,
          subtitle: `${c.email} • ${c.phone}`,
          onClick: () => {
            window.location.href = `${ROUTES.customers}?search=${encodeURIComponent(c.name)}`;
            setIsOpen(false);
            setQuery("");
          },
        });
      });
    }
    if (suggestions.leads?.length) {
      suggestions.leads.forEach((l: any) => {
        flatItems.push({
          type: "lead",
          id: l.id,
          title: `Lead: ${l.customerName}`,
          subtitle: `Status: ${l.status} • Property: ${l.propertyTitle}`,
          onClick: () => {
            window.location.href = `${ROUTES.leads}?search=${encodeURIComponent(l.customerName)}`;
            setIsOpen(false);
            setQuery("");
          },
        });
      });
    }
    if (suggestions.conversations?.length) {
      suggestions.conversations.forEach((c: any) => {
        flatItems.push({
          type: "conversation",
          id: c.id,
          title: `Chat with ${c.customerName}`,
          subtitle: c.snippet || "View conversation",
          onClick: () => {
            window.location.href = `${ROUTES.messages}?search=${encodeURIComponent(c.customerName)}`;
            setIsOpen(false);
            setQuery("");
          },
        });
      });
    }
    if (suggestions.agents?.length) {
      suggestions.agents.forEach((a: any) => {
        flatItems.push({
          type: "agent",
          id: a.id,
          title: a.name,
          subtitle: `${a.specialization || "Real Estate Agent"} • ${a.email}`,
          onClick: () => {
            window.location.href = `${ROUTES.agents}?search=${encodeURIComponent(a.name)}`;
            setIsOpen(false);
            setQuery("");
          },
        });
      });
    }
  }

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        flatItems[activeIndex].onClick();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "property":
        return <Building className="size-4 text-sky-500" />;
      case "customer":
        return <User className="size-4 text-emerald-500" />;
      case "lead":
        return <TrendingUp className="size-4 text-amber-500" />;
      case "conversation":
        return <MessageSquare className="size-4 text-violet-500" />;
      case "agent":
        return <ShieldCheck className="size-4 text-rose-500" />;
      default:
        return <Search className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <header className="h-20 px-6 flex items-center gap-4 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="relative flex-1 max-w-xl" ref={containerRef} onKeyDown={handleKeyDown}>
        <label htmlFor={SEARCH_ID} className="sr-only">
          Search properties and customers
        </label>
        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        ) : (
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
        )}
        <input
          id={SEARCH_ID}
          name="search"
          type="text"
          autoComplete="off"
          placeholder="Search Property, Customer, Lead, Agent..."
          aria-label="Search properties and customers"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />

        {isOpen && (query.trim() !== "") && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-[480px] overflow-y-auto bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-2 z-50 flex flex-col gap-1 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
            {loading && flatItems.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Searching...
              </div>
            )}

            {!loading && flatItems.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No matches found.</div>
            )}

            {flatItems.length > 0 && (
              <div className="flex flex-col">
                {/* Render Group Headers and Items */}
                {["property", "customer", "lead", "conversation", "agent"].map((sectionType) => {
                  const itemsOfSection = flatItems.filter((item) => item.type === sectionType);
                  if (itemsOfSection.length === 0) return null;

                  return (
                    <div key={sectionType} className="flex flex-col">
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase mt-2 first:mt-0">
                        {sectionType}s
                      </div>
                      {itemsOfSection.map((item) => {
                        const globalIdx = flatItems.findIndex((fi) => fi.id === item.id && fi.type === item.type);
                        const isFocused = globalIdx === activeIndex;

                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={item.onClick}
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              isFocused ? "bg-accent text-accent-foreground" : "hover:bg-accent/40"
                            }`}
                          >
                            <div className="mt-0.5">{getIcon(item.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate leading-none mb-1">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate leading-none">{item.subtitle}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          aria-label="View notifications"
          onClick={() => navigate({ to: ROUTES.settings })}
          className="relative size-11 grid place-items-center rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
        >
          <Bell className="size-4" aria-hidden />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-destructive" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: ROUTES.settings })}
          className="flex items-center gap-3 pl-3 border-l border-border"
          aria-label="Open profile settings"
        >
          <div className="size-11 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center font-semibold">
            HM
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold leading-tight">Hawkins Maru</p>
            <p className="text-xs text-muted-foreground">Company Manager</p>
          </div>
        </button>
      </div>
    </header>
  );
}

