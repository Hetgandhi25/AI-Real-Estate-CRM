import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LabeledField } from '@/components/common/labeled-field';
import type { Customer } from '@/types';
import { customerService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useCustomers, useQueryClient, useToast, useDebounce } from '@/hooks';

function CustomersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const { data: customers = [], isLoading } = useCustomers({ search: debouncedSearch || undefined });

  const filteredCustomers = customers;

  const resetForm = () => {
    setCurrentCustomer(null);
    setName("");
    setEmail("");
    setPhone("");
    setBudget("");
    setPreferredLocation("");
    setNotes("");
  };

  const openNewCustomerModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setCurrentCustomer(customer);
    setName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone);
    setBudget(customer.budget?.toString() ?? "");
    setPreferredLocation(customer.preferredLocation ?? "");
    setNotes(customer.notes ?? "");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const handleSaveCustomer = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Name, email, and phone are required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        budget: budget ? Number(budget) : undefined,
        preferredLocation: preferredLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (currentCustomer) {
        await customerService.updateCustomer(currentCustomer.id, payload);
        toast.success("Customer updated successfully");
      } else {
        await customerService.createCustomer(payload);
        toast.success("Customer created successfully");
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      closeModal();
    } catch (error) {
      toast.fromApiError(error, currentCustomer ? "Failed to update customer" : "Failed to create customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm("Delete this customer? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerId);
      toast.success("Customer deleted successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    } catch (error) {
      toast.fromApiError(error, "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading customers..." : `${customers.length} customer records`}
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCustomerModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" aria-hidden />
          Add Customer
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            id="customer-search"
            name="search"
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone or location"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-4 py-3 text-sm font-semibold text-muted-foreground border-b border-border bg-muted">
          <span className="col-span-2">Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Location</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No customers found.</div>
          ) : (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="grid grid-cols-6 gap-4 px-4 py-4 text-sm items-center">
                <div className="col-span-2">
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-muted-foreground text-xs">{customer.budget ? `$${customer.budget.toLocaleString()}` : "No budget set"}</div>
                </div>
                <div>{customer.email}</div>
                <div>{customer.phone}</div>
                <div>{customer.preferredLocation || "—"}</div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCustomerModal(customer)}
                    className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Edit customer"
                  >
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-destructive hover:bg-destructive/10"
                    aria-label="Delete customer"
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentCustomer ? "Edit customer" : "Add customer"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <LabeledField id="customer-name" label="Name">
              <input
                id="customer-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              />
            </LabeledField>
            <LabeledField id="customer-email" label="Email">
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              />
            </LabeledField>
            <LabeledField id="customer-phone" label="Phone">
              <input
                id="customer-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              />
            </LabeledField>
            <div className="grid grid-cols-2 gap-4">
              <LabeledField id="customer-budget" label="Budget">
                <input
                  id="customer-budget"
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                />
              </LabeledField>
              <LabeledField id="customer-location" label="Preferred location">
                <input
                  id="customer-location"
                  value={preferredLocation}
                  onChange={(event) => setPreferredLocation(event.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                />
              </LabeledField>
            </div>
            <LabeledField id="customer-notes" label="Notes">
              <textarea
                id="customer-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              />
            </LabeledField>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveCustomer}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {currentCustomer ? "Save changes" : "Create customer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomersPage;

