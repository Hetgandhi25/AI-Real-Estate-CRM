import React, { useState, useEffect } from 'react';
import { CheckCircle, User, Shield, Bell, Palette } from 'lucide-react';
import { authService } from '@/services';
import { useAuth, useToast } from '@/hooks';
import { env } from '@/config/env';

type TabId = 'profile' | 'security' | 'notifications' | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function SettingsPage() {
  const { user, refreshSession } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Notifications state
  const [notifLeads, setNotifLeads] = useState(true);
  const [notifAppointments, setNotifAppointments] = useState(true);
  const [notifReviews, setNotifReviews] = useState(false);
  const [notifMessages, setNotifMessages] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email cannot be empty.");
      return;
    }
    setIsSavingProfile(true);
    try {
      await authService.updateProfile({ name: name.trim(), email: email.trim() });
      await refreshSession();
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.fromApiError(error, "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await authService.updateProfile({ password: newPassword });
      await refreshSession();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.fromApiError(error, "Failed to change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, security, and preferences.</p>
      </div>

      {/* Profile card */}
      <div className="glass-card rounded-2xl p-5 flex items-center gap-5">
        <div className="size-16 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-2xl font-bold text-primary-foreground flex-shrink-0">
          {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
        </div>
        <div>
          <p className="text-xl font-semibold">{user?.name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold capitalize">
              {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="size-3" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "profile" && (
        <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-lg">Profile Information</h2>
          <p className="text-sm text-muted-foreground">Update your display name and email address.</p>
          <hr className="border-border" />
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Full Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              placeholder="Your full name"
            />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Role</span>
            <input
              value={roleLabel}
              readOnly
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </label>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSavingProfile ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-lg">Change Password</h2>
          <p className="text-sm text-muted-foreground">Keep your account secure with a strong password.</p>
          <hr className="border-border" />
          <label className="space-y-2 block">
            <span className="text-sm font-medium">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Confirm New Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
            />
          </label>
          {newPassword && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Password strength</p>
              <div className="flex gap-1">
                {[8, 12, 16].map((len, i) => (
                  <div key={len} className={`h-1.5 flex-1 rounded-full ${newPassword.length >= len ? ["bg-red-400", "bg-amber-400", "bg-emerald-400"][i] : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{newPassword.length < 8 ? "Too short" : newPassword.length < 12 ? "Fair — try adding numbers" : "Strong"}</p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={isSavingPassword}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSavingPassword ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-lg">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">Choose which events trigger notifications.</p>
          <hr className="border-border" />
          {[
            { label: "New Leads", sub: "Notify when a new lead is assigned", value: notifLeads, setter: setNotifLeads },
            { label: "Appointments", sub: "Notify before scheduled appointments", value: notifAppointments, setter: setNotifAppointments },
            { label: "Reviews", sub: "Notify when a customer leaves a review", value: notifReviews, setter: setNotifReviews },
            { label: "Messages", sub: "Notify on new customer messages", value: notifMessages, setter: setNotifMessages },
          ].map(({ label, sub, value, setter }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => setter(!value)}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${value ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => toast.success("Notification preferences saved.")} className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground">
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-semibold text-lg">Appearance</h2>
          <p className="text-sm text-muted-foreground">Customize how {env.VITE_APP_NAME} looks for you.</p>
          <hr className="border-border" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-3">
              {["Dark (Default)", "System", "Light"].map((theme, i) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => toast.success(`${theme} theme selected — full theme switching coming soon.`)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${i === 0 ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <div className={`size-10 rounded-lg ${i === 0 ? "bg-zinc-900" : i === 1 ? "bg-gradient-to-br from-zinc-900 to-zinc-100" : "bg-zinc-100"}`} />
                  <span className="text-xs font-medium">{theme}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Density</p>
            <div className="flex gap-2">
              {["Comfortable", "Compact"].map((density, i) => (
                <button key={density} type="button" onClick={() => toast.success(`${density} density selected.`)} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {density}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;