import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import {
  businessItemApi,
  NRSApi,
  type BusinessItemSummary,
  type BusinessItem,
  type BusinessItemTaxCategory,
  type CreateBusinessItemPayload,
  type TaxCategory,
  type FIRSServiceCode,
  type ProductCode,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_ITEMS,
  MOCK_TAX_CATEGORIES,
  MOCK_SERVICE_CODES,
  MOCK_PRODUCT_CODES,
} from "../../lib/mockData";
import { useIsAdmin, useIsAegis } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const defaultTaxEntry = { code: "", name: "", isPercentage: true, percent: 0 };

const emptyForm: CreateBusinessItemPayload = {
  name: "",
  itemType: "Service",
  serviceCode: { code: "", name: "" },
  itemCategoryName: "",
  itemDescription: "",
  unitPrice: 0,
  taxCategories: [{ ...defaultTaxEntry }],
};

export default function ItemList() {
  const isAdmin = useIsAdmin();
  const isAegis = useIsAegis();
  const canManage = isAdmin || isAegis;

  const [items, setItems] = useState<BusinessItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([]);
  const [serviceCodes, setServiceCodes] = useState<FIRSServiceCode[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BusinessItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateBusinessItemPayload>(emptyForm);

  // Load lookup data once
  useEffect(() => {
    if (USE_MOCK) {
      setTaxCategories(MOCK_TAX_CATEGORIES as TaxCategory[]);
      setServiceCodes(MOCK_SERVICE_CODES as FIRSServiceCode[]);
      setProductCodes(MOCK_PRODUCT_CODES as ProductCode[]);
      return;
    }
    NRSApi.getTaxCategories()
      .then(setTaxCategories)
      .catch(() => {});
    NRSApi.getServiceCodes()
      .then(setServiceCodes)
      .catch(() => {});
    NRSApi.getProductCodes()
      .then(setProductCodes)
      .catch(() => {});
  }, []);

  const load = (p: number, ps: number) => {
    if (USE_MOCK) {
      const total = Math.ceil(MOCK_ITEMS.length / ps);
      setTotalCount(MOCK_ITEMS.length);
      setTotalPages(total);
      setItems(
        MOCK_ITEMS.slice(
          (p - 1) * ps,
          p * ps,
        ) as unknown as BusinessItemSummary[],
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    businessItemApi
      .list({ page: p, pageSize: ps })
      .then((r) => {
        setItems(r.items);
        setTotalPages(r.totalPages);
        setTotalCount(r.totalCount);
      })
      .catch(() => toast.error("Failed to load items."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page, pageSize);
  }, [page, pageSize]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, taxCategories: [{ ...defaultTaxEntry }] });
    setShowForm(true);
  };

  const openEdit = async (summary: BusinessItemSummary) => {
    // Fetch the full item to get serviceCode object, taxCategories, and itemDescription
    try {
      const item = await businessItemApi.getById(summary.id);
      setEditingItem(item);
      setForm({
        name: item.name,
        itemType: item.itemType,
        serviceCode: item.serviceCode,
        itemCategoryName: item.itemCategoryName ?? "",
        itemDescription: item.itemDescription,
        unitPrice: item.unitPrice,
        taxCategories: item.taxCategories ?? [],
      });
      setShowForm(true);
    } catch {
      toast.error("Failed to load item details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.itemDescription || form.unitPrice <= 0) {
      toast.error("Name, description and a positive unit price are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await businessItemApi.update(editingItem.id, form);
        toast.success("Item updated successfully.");
      } else {
        await businessItemApi.create(form);
        toast.success("Item created successfully.");
      }
      setShowForm(false);
      setEditingItem(null);
      setForm(emptyForm);
      load(page, pageSize);
    } catch {
      toast.error(
        editingItem ? "Failed to update item." : "Failed to create item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Delete item "${code}"? This cannot be undone.`))
      return;
    try {
      await businessItemApi.delete(id);
      toast.success("Item deleted.");
      load(page, pageSize);
    } catch {
      toast.error("Failed to delete item.");
    }
  };

  // Tax category helpers
  const addTaxEntry = () => {
    setForm((f) => ({
      ...f,
      taxCategories: [
        ...f.taxCategories,
        { code: "", name: "", isPercentage: true, percent: 0 },
      ],
    }));
  };

  const removeTaxEntry = (idx: number) => {
    setForm((f) => ({
      ...f,
      taxCategories: f.taxCategories.filter((_, i) => i !== idx),
    }));
  };

  const updateTaxEntry = (
    idx: number,
    update: Partial<BusinessItemTaxCategory>,
  ) => {
    setForm((f) => ({
      ...f,
      taxCategories: f.taxCategories.map((tc, i) =>
        i === idx ? { ...tc, ...update } : tc,
      ),
    }));
  };

  const applyNRSTaxCategory = (idx: number, nrsCode: string) => {
    const nrs = taxCategories.find((t) => t.code === nrsCode);
    if (!nrs) return;
    const parsedPercent =
      nrs.percent === "Not Available" || nrs.percent === ""
        ? undefined
        : parseFloat(nrs.percent);
    updateTaxEntry(idx, {
      code: nrs.code,
      name: nrs.value,
      isPercentage: true,
      percent: parsedPercent,
      flatAmount: undefined,
    });
  };

  return (
    <>
      <PageMeta
        title="Items | Aegis EInvoicing Portal"
        description="Manage business items and products"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Items
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your products and services catalogue
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Add Item
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6"
        >
          <h2 className="text-base font-semibold text-gray-700 dark:text-white mb-4">
            {editingItem ? "Edit Item" : "New Item"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="e.g. Consulting Service"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Item Type *
              </label>
              <select
                value={form.itemType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    itemType: e.target.value as "Goods" | "Service",
                    // reset code when switching type
                    serviceCode: { code: "", name: "" },
                  }))
                }
                className={inputCls}
                required
              >
                <option value="Service">Service</option>
                <option value="Goods">Goods</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {form.itemType === "Service" ? "Service Code" : "Product Code"}{" "}
                *
              </label>
              <select
                value={form.serviceCode.code}
                onChange={(e) => {
                  const codes =
                    form.itemType === "Service" ? serviceCodes : productCodes;
                  const selected = codes.find((c) => c.code === e.target.value);
                  setForm((f) => ({
                    ...f,
                    serviceCode: {
                      code: e.target.value,
                      name: selected?.description ?? "",
                    },
                  }));
                }}
                className={inputCls}
                required
              >
                <option value="">— Select code —</option>
                {(form.itemType === "Service"
                  ? serviceCodes
                  : productCodes
                ).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Code Description
              </label>
              <input
                value={form.serviceCode.name}
                readOnly
                className={`${inputCls} bg-gray-50 dark:bg-gray-700 cursor-default`}
                placeholder="Auto-filled from selected code"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Category
              </label>
              <input
                value={form.itemCategoryName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, itemCategoryName: e.target.value }))
                }
                className={inputCls}
                placeholder="e.g. Professional Services"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Unit Price (NGN) *
              </label>
              <input
                value={form.unitPrice === 0 ? "" : form.unitPrice}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unitPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                className={inputCls}
                placeholder="0.00"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Description *
              </label>
              <input
                value={form.itemDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, itemDescription: e.target.value }))
                }
                className={inputCls}
                placeholder="Item description"
                required
              />
            </div>

            {/* Tax Categories */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Tax Categories
                </label>
                <button
                  type="button"
                  onClick={addTaxEntry}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  + Add Tax Category
                </button>
              </div>
              {form.taxCategories.map((tc, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  {/* Pick from FIRS list */}
                  <select
                    value={tc.code}
                    onChange={(e) => applyNRSTaxCategory(idx, e.target.value)}
                    className={`${inputCls} sm:w-48`}
                  >
                    <option value="">— Select FIRS code —</option>
                    {taxCategories.map((nrs) => (
                      <option key={nrs.code} value={nrs.code}>
                        {nrs.value}
                        {nrs.percent !== "Not Available" && nrs.percent !== ""
                          ? ` (${nrs.percent}%)`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {/* % / Flat toggle */}
                  <select
                    value={tc.isPercentage ? "percent" : "flat"}
                    onChange={(e) =>
                      updateTaxEntry(idx, {
                        isPercentage: e.target.value === "percent",
                        percent:
                          e.target.value === "percent"
                            ? (tc.percent ?? 0)
                            : undefined,
                        flatAmount:
                          e.target.value === "flat"
                            ? (tc.flatAmount ?? 0)
                            : undefined,
                      })
                    }
                    className={`${inputCls} sm:w-32`}
                  >
                    <option value="percent">%</option>
                    <option value="flat">Flat fee</option>
                  </select>

                  {/* Value input */}
                  {tc.isPercentage ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tc.percent ?? ""}
                      onChange={(e) =>
                        updateTaxEntry(idx, {
                          percent: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Rate %"
                      className={`${inputCls} sm:w-28`}
                      required
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tc.flatAmount ?? ""}
                      onChange={(e) =>
                        updateTaxEntry(idx, {
                          flatAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Amount ₦"
                      className={`${inputCls} sm:w-28`}
                      required
                    />
                  )}

                  {form.taxCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTaxEntry(idx)}
                      className="text-red-500 hover:text-red-600 text-xs font-medium self-center"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving…"
                : editingItem
                  ? "Save Changes"
                  : "Create Item"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount > 0
              ? `${totalCount} item${totalCount !== 1 ? "s" : ""}`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Rows
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              No items found.
            </p>
            {canManage && (
              <button
                onClick={openCreate}
                className="text-brand-500 hover:text-brand-600 text-sm font-medium"
              >
                Add your NRSt item →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Code
                  </th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{item.name}</div>
                        {item.itemCategoryName && (
                          <div className="text-xs text-gray-400">
                            {item.itemCategoryName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {item.itemType}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">
                        ₦{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {item.serviceCode}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEdit(item)}
                              className="text-brand-500 hover:text-brand-600 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="text-red-500 hover:text-red-600 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
