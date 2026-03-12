"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PricingItem {
  id: string;
  device_name: string;
  price: number;
}

export function PricingTable() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/admin/pricing");
      if (!res.ok) {
        console.error("Pricing API returned status", res.status);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("Unexpected pricing response", data);
        return;
      }
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch pricing", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id?: string) {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_name: editName,
          price: parseFloat(editPrice),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setIsAdding(false);
        setEditName("");
        setEditPrice("");
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to save pricing", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this pricing?")) return;
    try {
      const res = await fetch(`/api/admin/pricing?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchItems();
    } catch (err) {
      console.error("Failed to delete pricing", err);
    }
  }

  function startEdit(item: PricingItem) {
    setEditingId(item.id);
    setEditName(item.device_name);
    setEditPrice(item.price.toString());
  }

  if (loading) return <div className="p-8 text-center text-soft">Loading pricing...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-ink">Device Pricing</h2>
        <Button
          onClick={() => {
            setIsAdding(true);
            setEditName("");
            setEditPrice("");
          }}
          disabled={isAdding}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Device Price
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-subtle">
              <th className="pb-3 text-sm font-medium text-soft">Device Name</th>
              <th className="pb-3 text-sm font-medium text-soft">Yearly Price (₹)</th>
              <th className="pb-3 text-sm font-medium text-soft text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {isAdding && (
              <tr>
                <td className="py-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Device Name"
                    className="h-9"
                  />
                </td>
                <td className="py-3">
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="2000"
                    className="h-9"
                  />
                </td>
                <td className="py-3 text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleSave()}><Check className="h-4 w-4 text-green-600" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}><X className="h-4 w-4 text-red-600" /></Button>
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-ink">
                  {editingId === item.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    item.device_name
                  )}
                </td>
                <td className="py-3 text-sm text-ink font-medium">
                  {editingId === item.id ? (
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    `₹${item.price}`
                  )}
                </td>
                <td className="py-3 text-right space-x-1">
                  {editingId === item.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleSave(item.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 text-red-600" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Edit2 className="h-4 w-4 text-soft" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!isAdding && items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-soft text-sm">
                  No device pricing set yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
