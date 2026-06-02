import React, { useState, useEffect, useMemo } from 'react';
import { Bed, Maximize2, MapPin, Plus, Search, Heart, RefreshCw, Sparkles, Check, X, PenLine, Trash2, Upload, Loader2 } from "lucide-react";
import { LabeledField } from "@/components/common/labeled-field";
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty, useAuth, useToast, useDebounce } from "@/hooks";
import { formatPrice } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Property } from "@/types";
import { AvailabilityToggle } from "@/components/ui/availability-toggle";

const FILTER_FIELDS = [
  { id: "property-status", name: "status", label: "Property status", placeholder: "Any Status", options: [
    { value: "all", label: "Any Status" },
    { value: "FOR_SALE", label: "For Sale" },
    { value: "FOR_RENT", label: "For Rent" },
    { value: "SOLD", label: "Sold" }
  ]},
  { id: "property-type", name: "type", label: "Property type", placeholder: "Any Type", options: [
    { value: "", label: "Any Type" },
    { value: "APARTMENT", label: "Apartment" },
    { value: "VILLA", label: "Villa" },
    { value: "STUDIO", label: "Studio" },
    { value: "PENTHOUSE", label: "Penthouse" },
    { value: "OFFICE", label: "Office" }
  ]},
] as const;

function PropertyPage() {
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [bhk, setBhk] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [furnished, setFurnished] = useState<boolean>(false);
  const [readyToMove, setReadyToMove] = useState<boolean>(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  // Details view state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Debounced input states
  const debouncedSearch = useDebounce(search, 300);
  const debouncedCity = useDebounce(city, 300);
  const debouncedLocation = useDebounce(location, 300);
  const debouncedMinPrice = useDebounce(minPrice, 300);
  const debouncedMaxPrice = useDebounce(maxPrice, 300);

  // Load search from URL search parameters if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  // Favorites/Wishlist State
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Comparison State
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Recently Viewed State
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);

  // AI Recommendation State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auth Session check for CRUD permission
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager" || user?.role === "agent";
  const toast = useToast();

  // CRUD Mutations
  const createPropertyMutation = useCreateProperty();
  const updatePropertyMutation = useUpdateProperty();
  const deletePropertyMutation = useDeleteProperty();

  // CRUD Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPropertyType, setFormPropertyType] = useState("APARTMENT");
  const [formBhk, setFormBhk] = useState("2");
  const [formBathrooms, setFormBathrooms] = useState("2");
  const [formArea, setFormArea] = useState("");
  const [formStatus, setFormStatus] = useState("FOR_SALE");
  const [formAvailability, setFormAvailability] = useState<"Available" | "Not Available">("Available");
  const [formAmenities, setFormAmenities] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  
  // Mock Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch properties from the database API
  const { data: apiProperties = [], isLoading } = useProperties({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status as any,
    type: type || undefined,
    city: debouncedCity || undefined,
    location: debouncedLocation || undefined,
    minPrice: debouncedMinPrice ? Number(debouncedMinPrice) : undefined,
    maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
    bhk: bhk ? Number(bhk) : undefined,
    furnished: furnished || undefined,
    readyToMove: readyToMove || undefined,
    availability: availabilityFilter === "all" ? undefined : availabilityFilter as any,
  });

  // Load favorites & recently viewed from LocalStorage
  useEffect(() => {
    const savedFavs = localStorage.getItem('yandox_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
    const savedRecent = localStorage.getItem('yandox_recently_viewed');
    if (savedRecent) {
      setRecentlyViewed(JSON.parse(savedRecent));
    }
  }, []);

  // Filter local copy in case of empty API list or to apply "Favorites Only" filter
  const filteredProperties = useMemo(() => {
    let list = apiProperties;
    if (showOnlyFavorites) {
      list = list.filter(p => favorites.includes(p.id));
    }
    return list;
  }, [apiProperties, showOnlyFavorites, favorites]);

  // Toggle Favorite
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('yandox_favorites', JSON.stringify(updated));
  };

  // Add/Remove from Comparison list
  const toggleCompare = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareList.some(p => p.id === property.id)) {
      setCompareList(compareList.filter(p => p.id !== property.id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 properties side-by-side.");
        return;
      }
      setCompareList([...compareList, property]);
    }
  };

  // Track property view & open details modal
  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    let updated = [property, ...recentlyViewed.filter(p => p.id !== property.id)].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem('yandox_recently_viewed', JSON.stringify(updated));
  };

  // Simulate AI Analysis
  const getAiRecommendation = () => {
    if (favorites.length === 0) {
      alert("Please add at least one property to your favorites list to get tailored AI recommendations.");
      return;
    }
    setIsAiLoading(true);
    setIsAiOpen(true);
    
    // Simulate smart matching advice
    setTimeout(() => {
      const favoritedItems = apiProperties.filter(p => favorites.includes(p.id));
      const avgPrice = favoritedItems.reduce((acc, curr) => acc + curr.price, 0) / favoritedItems.length;
      const commonType = favoritedItems.map(p => p.propertyType).reduce((a, b, i, arr) => 
        (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), favoritedItems[0]?.propertyType || "APARTMENT");

      setAiRecommendation(`Based on your favorites, you are looking for properties in the budget range around ${formatPrice(avgPrice)} with preference for ${commonType}s. 

We recommend exploring "Bayview Modern Villa" or "Chicago Penthouse Suite" as they align closely with your luxury/amenities filters, offering high price-to-square-foot ratios and premium structural scores. We suggest contacting Sarah Mitchell, who specializes in high-value ${commonType} residential deals.`);
      setIsAiLoading(false);
    }, 1500);
  };

  const handleCreateClick = () => {
    setFormMode('create');
    setEditingProperty(null);
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormCity("");
    setFormState("");
    setFormAddress("");
    setFormPropertyType("APARTMENT");
    setFormBhk("2");
    setFormBathrooms("2");
    setFormArea("");
    setFormStatus("FOR_SALE");
    setFormAvailability("Available");
    setFormAmenities("");
    setFormImages([]);
    setIsFormOpen(true);
  };

  const handleEditClick = (p: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode('edit');
    setEditingProperty(p);
    setFormTitle(p.title);
    setFormDescription(p.description);
    setFormPrice(p.price.toString());
    setFormCity(p.city);
    setFormState(p.state);
    setFormAddress(p.address);
    setFormPropertyType(p.propertyType);
    setFormBhk(p.bhk.toString());
    setFormBathrooms((p.bathrooms ?? 2).toString());
    setFormArea(p.area);
    setFormStatus(p.status);
    setFormAvailability(p.availability ?? "Available");
    
    let amenitiesArr: string[] = [];
    if (p.amenities) {
      if (Array.isArray(p.amenities)) {
        amenitiesArr = p.amenities;
      } else if (typeof (p.amenities as any) === 'string') {
        try {
          amenitiesArr = JSON.parse(p.amenities as any);
        } catch {
          amenitiesArr = (p.amenities as any).split(',').map((s: string) => s.trim());
        }
      }
    }
    setFormAmenities(amenitiesArr.join(", "));

    let imagesArr: string[] = [];
    if (p.images) {
      if (Array.isArray(p.images)) {
        imagesArr = p.images;
      } else if (typeof (p.images as any) === 'string') {
        try {
          imagesArr = JSON.parse(p.images as any);
        } catch {
          imagesArr = (p.images as any).split(',').map((s: string) => s.trim());
        }
      }
    }
    setFormImages(imagesArr);

    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          const typeImages: Record<string, string> = {
            VILLA: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
            APARTMENT: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
            PENTHOUSE: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
            STUDIO: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
            OFFICE: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
            LOFT: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
          };
          const generatedUrl = typeImages[formPropertyType] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

          setFormImages((prev) => [...prev, generatedUrl]);
          setIsUploading(false);
          toast.success("Image uploaded successfully!");
          return 100;
        }
        return prev + 25;
      });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formPrice || isNaN(Number(formPrice))) {
      toast.error("Price must be a valid number");
      return;
    }
    if (!formCity.trim() || !formState.trim() || !formAddress.trim()) {
      toast.error("Location details are required");
      return;
    }

    const payload: Partial<Property> = {
      title: formTitle,
      description: formDescription || formTitle,
      price: Number(formPrice),
      city: formCity,
      state: formState,
      address: formAddress,
      propertyType: formPropertyType,
      bhk: Number(formBhk),
      bathrooms: Number(formBathrooms),
      area: formArea || "1,200 sqft",
      status: formStatus as any,
      availability: formAvailability,
      amenities: formAmenities.split(",").map((s) => s.trim()).filter(Boolean),
      images: formImages,
    };

    try {
      if (formMode === "create") {
        await createPropertyMutation.mutateAsync(payload);
        toast.success("Property created successfully!");
      } else if (formMode === "edit" && editingProperty) {
        await updatePropertyMutation.mutateAsync({ id: editingProperty.id, data: payload });
        toast.success("Property updated successfully!");
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.fromApiError(err, `Failed to ${formMode} property`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deletePropertyMutation.mutateAsync(deleteConfirmId);
      toast.success("Property deleted successfully");
      setDeleteConfirmId(null);
    } catch (err) {
      toast.fromApiError(err, "Failed to delete property");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Fetching listings..." : `${filteredProperties.length} active listings found`}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/95 cursor-pointer shadow-[0_0_12px_rgba(var(--color-primary),0.2)]"
            >
              <Plus className="size-4" /> Add Property
            </button>
          )}
          <button
            type="button"
            onClick={getAiRecommendation}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="size-4 text-primary" /> AI Recommendations
          </button>
          <button
            type="button"
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${showOnlyFavorites ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" : "bg-card hover:bg-accent/40 border-border"}`}
          >
            <Heart className={`size-4 ${showOnlyFavorites ? "fill-red-500 text-red-500" : ""}`} /> 
            {showOnlyFavorites ? "Showing Favorites" : "Favorites Only"}
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <label htmlFor="property-search" className="sr-only">
              Search by address, city or zip code
            </label>
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <input
              id="property-search"
              name="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or details..."
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          
          {FILTER_FIELDS.map((field) => (
            <LabeledField key={field.id} id={field.id} label={field.label} hideLabel>
              <select
                id={field.id}
                name={field.name}
                value={field.name === "status" ? status : type}
                onChange={(e) => field.name === "status" ? setStatus(e.target.value) : setType(e.target.value)}
                className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {field.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </LabeledField>
          ))}

          <LabeledField id="property-bhk" label="BHK" hideLabel>
            <select
              id="property-bhk"
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </select>
          </LabeledField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 border-t border-border/50 pt-3">
          <LabeledField id="city-field" label="City" hideLabel>
            <input
              type="text"
              id="city-field"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Filter by city..."
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </LabeledField>

          <LabeledField id="property-location" label="Location" hideLabel>
            <input
              type="text"
              id="property-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search location/state..."
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </LabeledField>

          <LabeledField id="property-min-price" label="Min Price" hideLabel>
            <input
              type="number"
              id="property-min-price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min Price ($)..."
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </LabeledField>

          <LabeledField id="property-max-price" label="Max Price" hideLabel>
            <input
              type="number"
              id="property-max-price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max Price ($)..."
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </LabeledField>

          <LabeledField id="property-availability-filter" label="Availability" hideLabel>
            <select
              id="property-availability-filter"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="all">Any Availability</option>
              <option value="Available">Available</option>
              <option value="Not Available">Not Available</option>
            </select>
          </LabeledField>

          <div className="flex items-center gap-4 px-2 h-11">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={furnished}
                onChange={(e) => setFurnished(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring size-4"
              />
              Furnished
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={readyToMove}
                onChange={(e) => setReadyToMove(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring size-4"
              />
              Ready to Move
            </label>
          </div>
        </div>
      </div>

      {/* Comparison Drawer Trigger */}
      {compareList.length > 0 && (
        <div className="glass-card border-primary/30 rounded-2xl p-4 flex items-center justify-between animate-fade-in bg-primary/5">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">{compareList.length} properties selected for comparison</span>
            <div className="flex gap-2">
              {compareList.map(p => (
                <span key={p.id} className="text-xs bg-card px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 font-medium">
                  {p.title}
                  <button type="button" onClick={(e) => toggleCompare(p, e)} className="hover:text-red-500">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCompareOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl text-sm shadow-[var(--shadow-glow)]"
          >
            Compare Specs
          </button>
        </div>
      )}

      {/* Listings Grid / Skeleton Loaders */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-card rounded-2xl overflow-hidden animate-pulse h-80 space-y-4 p-5">
              <div className="h-40 bg-muted rounded-xl" />
              <div className="h-4 bg-muted w-2/3 rounded" />
              <div className="h-4 bg-muted w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="size-12 mx-auto bg-muted rounded-2xl grid place-items-center mb-4">
            <X className="size-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No properties found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or resetting favorites to find matches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProperties.map((p, index) => {
            const gradients = [
              "from-blue-600 to-indigo-600",
              "from-purple-600 to-pink-600",
              "from-emerald-600 to-teal-600",
              "from-amber-500 to-orange-600",
            ];
            const gradient = gradients[index % gradients.length];
            const isFav = favorites.includes(p.id);
            const isSelectedToCompare = compareList.some(item => item.id === p.id);

            let imageUrl = "";
            if (p.images) {
              if (Array.isArray(p.images) && p.images.length > 0) {
                imageUrl = p.images[0];
              } else if (typeof (p.images as any) === 'string') {
                try {
                  const parsed = JSON.parse(p.images as any);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    imageUrl = parsed[0];
                  }
                } catch {
                  const split = (p.images as any).split(',');
                  if (split.length > 0 && split[0].trim()) {
                    imageUrl = split[0].trim();
                  }
                }
              }
            }

            return (
              <article
                key={p.id}
                onClick={() => handlePropertyClick(p)}
                className="glass-card rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-muted">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={p.title} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_oklch(1_0_0_/_0.15),_transparent_60%)]" />
                    </div>
                  )}
                  
                  {/* Heart button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(p.id, e)}
                    className="absolute top-3 left-3 size-8 rounded-full bg-background/80 backdrop-blur grid place-items-center hover:scale-105 transition-transform z-10 cursor-pointer"
                    aria-label="Add to favorites"
                  >
                    <Heart className={`size-4 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </button>

                  {/* Compare button */}
                  <button
                    type="button"
                    onClick={(e) => toggleCompare(p, e)}
                    className={`absolute top-3 right-3 h-8 px-2 rounded-full bg-background/80 backdrop-blur flex items-center gap-1 text-[10px] font-semibold transition-transform hover:scale-105 z-10 cursor-pointer ${isSelectedToCompare ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <RefreshCw className={`size-3 ${isSelectedToCompare ? "animate-spin-slow text-primary" : ""}`} />
                    {isSelectedToCompare ? "Selected" : "Compare"}
                  </button>

                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur text-xs font-semibold text-primary tabular-nums z-10">
                    {formatPrice(p.price)}
                  </span>
                  <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur text-[10px] font-medium uppercase tracking-wider z-10">
                    {p.status.replace("_", " ")}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors truncate flex-1">
                      {p.title}
                    </h3>
                    {canManage && (
                      <div className="flex gap-1 relative z-10">
                        <button
                          type="button"
                          onClick={(e) => handleEditClick(p, e)}
                          className="size-7 rounded-lg bg-card hover:bg-accent border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Edit property"
                        >
                          <PenLine className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(p.id, e)}
                          className="size-7 rounded-lg bg-card hover:bg-red-500/10 border border-border hover:border-red-500/30 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete property"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden /> {p.city}, {p.state}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Bed className="size-4" aria-hidden /> {p.bhk} BHK
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Maximize2 className="size-4" aria-hidden /> {p.area}
                    </span>
                    <span className="ml-auto text-xs text-primary font-medium">{p.propertyType}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">Availability</span>
                    <div className="relative z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <AvailabilityToggle
                        checked={p.availability === "Available"}
                        disabled={!canManage || updatePropertyMutation.isPending}
                        onChange={async (checked) => {
                          const newAvailability = checked ? "Available" : "Not Available";
                          try {
                            await updatePropertyMutation.mutateAsync({
                              id: p.id,
                              data: { availability: newAvailability },
                            });
                            toast.success(`Property marked as ${newAvailability}`);
                          } catch (err) {
                            toast.fromApiError(err, "Failed to update availability");
                          }
                        }}
                      />
                      <span className={`text-xs font-bold ${p.availability === "Available" ? "text-emerald-500" : "text-rose-500"}`}>
                        {p.availability ?? "Available"}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Recently Viewed Slider */}
      {recentlyViewed.length > 0 && (
        <div className="pt-6 border-t border-border space-y-3">
          <h3 className="text-lg font-bold tracking-tight">Recently Viewed Properties</h3>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {recentlyViewed.map((p, idx) => (
              <div key={p.id + idx} className="glass-card rounded-xl p-3 min-w-[240px] max-w-[240px] flex items-center gap-3">
                <div className="size-12 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-bold text-primary-foreground">
                  {p.propertyType.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold truncate">{p.title}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{p.city}</p>
                  <p className="text-xs font-bold text-primary tabular-nums mt-0.5">{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Properties Specs</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 pt-4 text-sm">
            <div className="space-y-4 font-semibold text-muted-foreground pt-12">
              <div>Price</div>
              <div>BHK / Beds</div>
              <div>Bathrooms</div>
              <div>Area Size</div>
              <div>Location</div>
              <div>Category</div>
              <div>Status</div>
            </div>
            
            {compareList.map(p => (
              <div key={p.id} className="space-y-4 text-center border-l border-border pl-4">
                <div className="font-bold text-foreground text-base truncate mb-2 h-10">{p.title}</div>
                <div className="font-bold text-primary tabular-nums">{formatPrice(p.price)}</div>
                <div>{p.bhk} Beds</div>
                <div>{p.bathrooms ?? 2} Baths</div>
                <div>{p.area}</div>
                <div className="truncate">{p.city}, {p.state}</div>
                <div className="text-xs font-medium uppercase">{p.propertyType}</div>
                <div className="text-xs uppercase">{p.status.replace("_", " ")}</div>
              </div>
            ))}

            {Array.from({ length: 3 - compareList.length }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center border-l border-border border-dashed h-full min-h-[220px] text-muted-foreground text-xs">
                Select another property
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Recommendation Modal */}
      <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> AI Smart Match Recommendation
            </DialogTitle>
          </DialogHeader>
          
          {isAiLoading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <RefreshCw className="size-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analyzing your favorite properties...</span>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {aiRecommendation}
              </p>
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-xl text-sm"
              >
                Close Recommendation
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Property Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Add New Property" : "Edit Property"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledField id="form-title" label="Title">
                <input
                  id="form-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Sunset Boulevard Condo"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-price" label="Price ($)">
                <input
                  id="form-price"
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="e.g. 750000"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-type" label="Property Type">
                <select
                  id="form-type"
                  value={formPropertyType}
                  onChange={(e) => setFormPropertyType(e.target.value)}
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none"
                >
                  <option value="APARTMENT">Apartment</option>
                  <option value="VILLA">Villa</option>
                  <option value="STUDIO">Studio</option>
                  <option value="PENTHOUSE">Penthouse</option>
                  <option value="OFFICE">Office</option>
                  <option value="LOFT">Loft</option>
                  <option value="HOTEL">Hotel</option>
                </select>
              </LabeledField>

              <LabeledField id="form-status" label="Status">
                <select
                  id="form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none"
                >
                  <option value="FOR_SALE">For Sale</option>
                  <option value="FOR_RENT">For Rent</option>
                  <option value="SOLD">Sold</option>
                </select>
              </LabeledField>

              <LabeledField id="form-availability" label="Availability">
                <div className="flex items-center gap-3 h-10">
                  <AvailabilityToggle
                    checked={formAvailability === "Available"}
                    onChange={(checked) => setFormAvailability(checked ? "Available" : "Not Available")}
                  />
                  <span className={`text-sm font-bold ${formAvailability === "Available" ? "text-emerald-500" : "text-rose-500"}`}>
                    {formAvailability}
                  </span>
                </div>
              </LabeledField>

              <LabeledField id="form-bhk" label="BHK / Bedrooms">
                <input
                  id="form-bhk"
                  type="number"
                  value={formBhk}
                  onChange={(e) => setFormBhk(e.target.value)}
                  placeholder="e.g. 3"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-bathrooms" label="Bathrooms">
                <input
                  id="form-bathrooms"
                  type="number"
                  value={formBathrooms}
                  onChange={(e) => setFormBathrooms(e.target.value)}
                  placeholder="e.g. 2"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-area" label="Area Size">
                <input
                  id="form-area"
                  type="text"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="e.g. 1,500 sqft"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-city" label="City">
                <input
                  id="form-city"
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Los Angeles"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-state" label="State">
                <input
                  id="form-state"
                  type="text"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  placeholder="e.g. CA"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>

              <LabeledField id="form-address" label="Address">
                <input
                  id="form-address"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 123 Sunset Blvd"
                  className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </LabeledField>
            </div>

            <LabeledField id="form-description" label="Description">
              <textarea
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter property descriptions..."
                rows={3}
                className="w-full rounded-lg bg-input border border-border text-sm p-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </LabeledField>

            <LabeledField id="form-amenities" label="Amenities (comma separated)">
              <input
                id="form-amenities"
                type="text"
                value={formAmenities}
                onChange={(e) => setFormAmenities(e.target.value)}
                placeholder="e.g. Pool, Gym, Garage, Fireplace, Garden"
                className="h-10 w-full rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </LabeledField>

            {/* Simulated Image Upload */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Property Images</span>
              <div className="flex items-center gap-3">
                <label className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-accent flex items-center gap-2 text-sm font-medium cursor-pointer transition-colors">
                  <Upload className="size-4 text-muted-foreground" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSimulatedUpload}
                    className="sr-only"
                    disabled={isUploading}
                  />
                </label>
                {isUploading && (
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{uploadProgress}%</span>
                  </div>
                )}
              </div>

              {formImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border group bg-muted bg-[image:none]">
                      <img src={img} alt="Preview" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 size-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/95 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {(createPropertyMutation.isPending || updatePropertyMutation.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {formMode === "create" ? "Add Property" : "Save Changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this property? This action is permanent and will delete all associated leads and appointments.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletePropertyMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
              >
                {deletePropertyMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Delete Listing
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Details Modal */}
      <Dialog open={Boolean(selectedProperty)} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedProperty.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* Image Carousel / Gallery */}
                <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden bg-muted">
                  {selectedProperty.images && selectedProperty.images.length > 0 ? (
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                      {selectedProperty.propertyType}
                    </div>
                  )}
                  <span className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-background/90 backdrop-blur-md text-lg font-bold text-primary shadow-lg">
                    {formatPrice(selectedProperty.price)}
                  </span>
                  <span className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-background/90 backdrop-blur-md text-sm font-semibold uppercase tracking-wider text-foreground shadow-lg">
                    {selectedProperty.status.replace("_", " ")}
                  </span>
                </div>

                {/* Grid of basic specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-center p-2">
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-semibold mt-0.5">{selectedProperty.propertyType}</div>
                  </div>
                  <div className="text-center p-2 border-l border-border/50">
                    <div className="text-xs text-muted-foreground">BHK</div>
                    <div className="font-semibold mt-0.5">{selectedProperty.bhk} BHK</div>
                  </div>
                  <div className="text-center p-2 border-l border-border/50">
                    <div className="text-xs text-muted-foreground">Bathrooms</div>
                    <div className="font-semibold mt-0.5">{selectedProperty.bathrooms ?? 2}</div>
                  </div>
                  <div className="text-center p-2 border-l border-border/50">
                    <div className="text-xs text-muted-foreground">Area Size</div>
                    <div className="font-semibold mt-0.5">{selectedProperty.area}</div>
                  </div>
                </div>

                {/* Inline Availability Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">Property Availability Status</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle whether this listing is currently available for clients.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AvailabilityToggle
                      checked={selectedProperty.availability === "Available"}
                      disabled={!canManage || updatePropertyMutation.isPending}
                      onChange={async (checked) => {
                        const newAvailability = checked ? "Available" : "Not Available";
                        try {
                          const updated = await updatePropertyMutation.mutateAsync({
                            id: selectedProperty.id,
                            data: { availability: newAvailability },
                          });
                          setSelectedProperty(updated); // Update dialog state in real-time
                          toast.success(`Property marked as ${newAvailability}`);
                        } catch (err) {
                          toast.fromApiError(err, "Failed to update availability");
                        }
                      }}
                    />
                    <span className={`text-sm font-bold ${selectedProperty.availability === "Available" ? "text-emerald-500" : "text-rose-500"}`}>
                      {selectedProperty.availability ?? "Available"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-base">Location</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-4" /> {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-base">Description</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {selectedProperty.description}
                  </p>
                </div>

                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-base">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        let amenitiesArr: string[] = [];
                        if (Array.isArray(selectedProperty.amenities)) {
                          amenitiesArr = selectedProperty.amenities;
                        } else if (typeof (selectedProperty.amenities as any) === 'string') {
                          try {
                            amenitiesArr = JSON.parse(selectedProperty.amenities as any);
                          } catch {
                            amenitiesArr = (selectedProperty.amenities as any).split(',').map((s: string) => s.trim());
                          }
                        }
                        return amenitiesArr.map((amenity, idx) => (
                          <span key={idx} className="px-3 py-1 bg-accent/40 rounded-lg border border-border/50 text-xs font-medium text-foreground">
                            {amenity}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedProperty(null)}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl text-sm"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PropertyPage;
