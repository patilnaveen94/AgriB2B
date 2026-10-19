import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineLoader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/Table';
import { categoryMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { batchesApi, productsApi } from '@/services/api';
import {
  PRODUCT_CATEGORIES,
  availableStock,
  unitLabel,
  type Batch,
  type Product,
  type ProductCategory,
} from '@/types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  grossUnit,
  isoInDays,
  netFromGross,
} from '@/lib/utils';

interface BatchForm {
  batchNumber: string;
  quantity: string;
  manufactureDate: string;
  expiryDate: string;
  mrp: string;
}

const emptyBatch: BatchForm = {
  batchNumber: '',
  quantity: '',
  manufactureDate: '',
  expiryDate: '',
  mrp: '',
};

interface ProductForm {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  unit: string;
  packSize: string;
  packUnit: string;
  minOrderQty: string;
  orderStep: string;
  taxRatePct: string;
  basePrice: string;
  lowStockThreshold: string;
  hsnCode: string;
  imageUrl?: string;
}

const emptyProduct: ProductForm = {
  name: '',
  brand: '',
  category: 'FERTILIZER',
  description: '',
  unit: 'Bag',
  packSize: '',
  packUnit: 'kg',
  minOrderQty: '1',
  orderStep: '1',
  taxRatePct: '5',
  basePrice: '',
  lowStockThreshold: '50',
  hsnCode: '',
  imageUrl: undefined,
};

const UNIT_OPTIONS = ['Bag', 'Box', 'Bottle', 'Can', 'Drum', 'Packet', 'MT', 'Kg', 'L'];
const MEASURE_OPTIONS = ['kg', 'g', 'L', 'ml', 'MT', 'unit'];

export function InventoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [batches, setBatches] = useState<Record<string, Batch[]>>({});

  // Batch modal
  const [addingFor, setAddingFor] = useState<Product | null>(null);
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatch);
  const [savingBatch, setSavingBatch] = useState(false);

  // Product modal (create + edit)
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [savingProduct, setSavingProduct] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stock adjust modal
  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  const load = async () => {
    const list = await productsApi.list();
    setProducts(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const lowStockCount = useMemo(
    () => products.filter((p) => availableStock(p) <= p.lowStockThreshold).length,
    [products],
  );

  const toggle = async (product: Product) => {
    if (expanded === product.id) {
      setExpanded(null);
      return;
    }
    setExpanded(product.id);
    if (!batches[product.id]) {
      const list = await batchesApi.listByProduct(product.id);
      setBatches((b) => ({ ...b, [product.id]: list }));
    }
  };

  // --- Batches --------------------------------------------------------------
  const openAddBatch = (product: Product) => {
    setAddingFor(product);
    setBatchForm({
      ...emptyBatch,
      manufactureDate: isoInDays(0).slice(0, 10),
      expiryDate: isoInDays(365).slice(0, 10),
    });
  };

  const saveBatch = async () => {
    if (!addingFor || !user) return;
    if (!batchForm.batchNumber.trim() || !batchForm.quantity) {
      toast.error('Batch number and quantity are required.');
      return;
    }
    setSavingBatch(true);
    try {
      await batchesApi.add(
        addingFor.id,
        {
          batchNumber: batchForm.batchNumber.trim(),
          quantity: parseInt(batchForm.quantity, 10) || 0,
          manufactureDate: new Date(batchForm.manufactureDate).toISOString(),
          expiryDate: new Date(batchForm.expiryDate).toISOString(),
          mrp: parseFloat(batchForm.mrp) || 0,
        },
        user.uid,
      );
      toast.success('Batch added to inventory.');
      const list = await batchesApi.listByProduct(addingFor.id);
      setBatches((b) => ({ ...b, [addingFor.id]: list }));
      setAddingFor(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add batch.');
    } finally {
      setSavingBatch(false);
    }
  };

  // --- Product create / edit ------------------------------------------------
  const onPickImage = (file?: File) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error('Please choose an image under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setProductForm((f) => ({ ...f, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const openCreateProduct = () => {
    setEditingId(null);
    setProductForm(emptyProduct);
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingId(p.id);
    setProductForm({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      unit: p.unit,
      packSize: String(p.packSize ?? ''),
      packUnit: p.packUnit ?? '',
      minOrderQty: String(p.minOrderQty ?? 1),
      orderStep: String(p.orderStep ?? 1),
      taxRatePct: String(p.taxRatePct),
      basePrice: String(grossUnit(p.basePrice, p.taxRatePct)),
      lowStockThreshold: String(p.lowStockThreshold),
      hsnCode: p.hsnCode,
      imageUrl: p.imageUrl,
    });
    setProductModalOpen(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim() || !productForm.brand.trim() || !productForm.unit.trim()) {
      toast.error('Name, brand and sale unit are required.');
      return;
    }
    if (!productForm.basePrice) {
      toast.error('Base price is required.');
      return;
    }
    const taxRatePct = parseFloat(productForm.taxRatePct) || 0;
    const payload = {
      name: productForm.name.trim(),
      brand: productForm.brand.trim(),
      category: productForm.category,
      description: productForm.description.trim(),
      unit: productForm.unit.trim(),
      packSize: parseFloat(productForm.packSize) || 0,
      packUnit: productForm.packUnit.trim(),
      minOrderQty: Math.max(1, parseInt(productForm.minOrderQty, 10) || 1),
      orderStep: Math.max(1, parseInt(productForm.orderStep, 10) || 1),
      taxRatePct,
      // Admin enters a GST-inclusive price; we store the net (pre-tax) value.
      basePrice: netFromGross(parseFloat(productForm.basePrice) || 0, taxRatePct),
      lowStockThreshold: parseInt(productForm.lowStockThreshold, 10) || 0,
      hsnCode: productForm.hsnCode.trim(),
      imageUrl: productForm.imageUrl,
    };
    setSavingProduct(true);
    try {
      if (editingId) {
        await productsApi.update(editingId, payload);
        toast.success('Product updated.');
      } else {
        await productsApi.create({ ...payload, volumeTiers: [], active: true });
        toast.success('Product added to catalog.');
      }
      setProductModalOpen(false);
      setProductForm(emptyProduct);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This also removes its batches.`)) return;
    try {
      await productsApi.remove(p.id);
      toast.info(`${p.name} deleted.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product.');
    }
  };

  // --- Stock adjustment -----------------------------------------------------
  const openAdjust = (p: Product) => {
    setAdjustFor(p);
    setAdjustQty(String(p.totalStock));
    setAdjustNote('');
  };

  const saveAdjust = async () => {
    if (!adjustFor || !user) return;
    setSavingAdjust(true);
    try {
      await productsApi.adjustStock(
        adjustFor.id,
        parseInt(adjustQty, 10) || 0,
        user.uid,
        adjustNote.trim() || undefined,
      );
      toast.success(`Stock updated for ${adjustFor.name}.`);
      setAdjustFor(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust stock.');
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory & Batches"
        description="Manage products, units of measure, stock and batches."
        actions={
          <div className="flex items-center gap-2">
            {lowStockCount > 0 ? (
              <Badge tone="rose">{lowStockCount} low-stock SKUs</Badge>
            ) : (
              <Badge tone="emerald">All stock healthy</Badge>
            )}
            <Button onClick={openCreateProduct}>
              <Plus className="h-4 w-4" />
              New Product
            </Button>
          </div>
        }
      />

      {loading ? (
        <InlineLoader label="Loading inventory…" />
      ) : (
        <Card>
          <CardBody className="p-0">
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Category</Th>
                    <Th className="text-right">Available</Th>
                    <Th className="text-right">Held</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="text-right">Price</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const available = availableStock(p);
                    const low = available <= p.lowStockThreshold;
                    const isOpen = expanded === p.id;
                    return (
                      <>
                        <Tr key={p.id}>
                          <Td>
                            <button
                              className="flex items-center gap-3 text-left"
                              onClick={() => toggle(p)}
                            >
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="h-9 w-9 shrink-0 rounded-lg border border-surface-200 object-cover"
                                />
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-400">
                                  <Package className="h-4 w-4" />
                                </span>
                              )}
                              <span>
                                <span className="block font-medium text-surface-900">
                                  {p.name}
                                </span>
                                <span className="block text-xs text-surface-400">
                                  {p.brand} · {unitLabel(p)}
                                </span>
                              </span>
                            </button>
                          </Td>
                          <Td>
                            <Badge tone={categoryMeta[p.category].tone}>
                              {categoryMeta[p.category].label}
                            </Badge>
                          </Td>
                          <Td className="text-right">
                            <span
                              className={
                                low
                                  ? 'font-semibold text-rose-600'
                                  : 'font-semibold text-brand-700'
                              }
                            >
                              {formatNumber(available)}
                            </span>
                            <span className="ml-1 text-xs text-surface-400">{p.unit}</span>
                          </Td>
                          <Td className="text-right text-amber-600">
                            {formatNumber(p.heldStock)}
                          </Td>
                          <Td className="text-right text-surface-500">
                            {formatNumber(p.totalStock)}
                          </Td>
                          <Td className="text-right">
                            {formatCurrency(grossUnit(p.basePrice, p.taxRatePct))}
                            <span className="block text-[11px] text-surface-400">
                              /{p.unit} · incl. GST
                            </span>
                          </Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              <IconBtn label="Edit" onClick={() => openEditProduct(p)}>
                                <Pencil className="h-4 w-4" />
                              </IconBtn>
                              <IconBtn label="Adjust stock" onClick={() => openAdjust(p)}>
                                <SlidersHorizontal className="h-4 w-4" />
                              </IconBtn>
                              <IconBtn label="Add batch" onClick={() => openAddBatch(p)}>
                                <Plus className="h-4 w-4" />
                              </IconBtn>
                              <IconBtn
                                label="Delete"
                                danger
                                onClick={() => deleteProduct(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconBtn>
                            </div>
                          </Td>
                        </Tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="bg-surface-50 px-4 py-3">
                              {!batches[p.id] ? (
                                <p className="text-sm text-surface-400">Loading batches…</p>
                              ) : batches[p.id].length === 0 ? (
                                <p className="text-sm text-surface-400">
                                  No batches recorded.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {batches[p.id].map((b) => (
                                    <div
                                      key={b.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs"
                                    >
                                      <span className="font-semibold text-surface-800">
                                        {b.batchNumber}
                                      </span>
                                      <span className="text-surface-500">
                                        Qty {formatNumber(b.quantity)}
                                      </span>
                                      <span className="text-surface-500">
                                        MRP {formatCurrency(b.mrp)}
                                      </span>
                                      <span className="text-surface-500">
                                        Exp {formatDate(b.expiryDate)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </CardBody>
        </Card>
      )}

      {/* Add batch modal */}
      <Modal
        open={!!addingFor}
        onClose={() => setAddingFor(null)}
        title={`Add Batch · ${addingFor?.name ?? ''}`}
        subtitle="New stock is added using first-expiry-first-out ordering."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddingFor(null)}>
              Cancel
            </Button>
            <Button loading={savingBatch} onClick={saveBatch}>
              Add Batch
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label={`Batch number (qty in ${addingFor?.unit ?? 'units'})`} htmlFor="bn" required>
              <Input
                id="bn"
                placeholder="e.g. UREA-B2603"
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Quantity" htmlFor="qty" required>
            <Input
              id="qty"
              type="number"
              min={0}
              value={batchForm.quantity}
              onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
            />
          </Field>
          <Field label="MRP" htmlFor="mrp">
            <Input
              id="mrp"
              type="number"
              min={0}
              value={batchForm.mrp}
              onChange={(e) => setBatchForm({ ...batchForm, mrp: e.target.value })}
            />
          </Field>
          <Field label="Manufacture date" htmlFor="mfg">
            <Input
              id="mfg"
              type="date"
              value={batchForm.manufactureDate}
              onChange={(e) =>
                setBatchForm({ ...batchForm, manufactureDate: e.target.value })
              }
            />
          </Field>
          <Field label="Expiry date" htmlFor="exp">
            <Input
              id="exp"
              type="date"
              value={batchForm.expiryDate}
              onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* Product create/edit modal */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingId ? 'Edit Product' : 'New Product'}
        subtitle="Define how retailers buy this product and how it is priced."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingProduct} onClick={saveProduct}>
              {editingId ? 'Save Changes' : 'Add Product'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Image uploader */}
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-surface-300 bg-surface-50">
              {productForm.imageUrl ? (
                <img
                  src={productForm.imageUrl}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-6 w-6 text-surface-400" />
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                {productForm.imageUrl ? 'Change image' : 'Upload image'}
              </Button>
              {productForm.imageUrl && (
                <button
                  type="button"
                  className="ml-2 text-xs font-medium text-rose-600 hover:underline"
                  onClick={() => setProductForm((f) => ({ ...f, imageUrl: undefined }))}
                >
                  Remove
                </button>
              )}
              <p className="mt-1 text-xs text-surface-400">PNG or JPG, up to 1.5 MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Product name" htmlFor="pn" required>
              <Input
                id="pn"
                placeholder="e.g. Urea 46% N"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </Field>
            <Field label="Brand" htmlFor="pb" required>
              <Input
                id="pb"
                placeholder="e.g. IFFCO"
                value={productForm.brand}
                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              />
            </Field>
            <Field label="Category" htmlFor="pc">
              <Select
                id="pc"
                value={productForm.category}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    category: e.target.value as ProductCategory,
                  })
                }
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="HSN code" htmlFor="ph">
              <Input
                id="ph"
                value={productForm.hsnCode}
                onChange={(e) => setProductForm({ ...productForm, hsnCode: e.target.value })}
              />
            </Field>
          </div>

          {/* Units of measure */}
          <div className="rounded-xl border border-surface-200 bg-surface-50/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">
              Unit of measure
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Sale unit" htmlFor="su" required>
                <Input
                  id="su"
                  list="unit-options"
                  placeholder="Bag / Box / MT"
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                />
                <datalist id="unit-options">
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
              <Field label="Pack size" htmlFor="psz" hint="Content per unit">
                <Input
                  id="psz"
                  type="number"
                  min={0}
                  placeholder="e.g. 50"
                  value={productForm.packSize}
                  onChange={(e) =>
                    setProductForm({ ...productForm, packSize: e.target.value })
                  }
                />
              </Field>
              <Field label="Measure" htmlFor="pmu">
                <Input
                  id="pmu"
                  list="measure-options"
                  placeholder="kg / L"
                  value={productForm.packUnit}
                  onChange={(e) =>
                    setProductForm({ ...productForm, packUnit: e.target.value })
                  }
                />
                <datalist id="measure-options">
                  {MEASURE_OPTIONS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label="Min order qty" htmlFor="pmin">
                <Input
                  id="pmin"
                  type="number"
                  min={1}
                  value={productForm.minOrderQty}
                  onChange={(e) =>
                    setProductForm({ ...productForm, minOrderQty: e.target.value })
                  }
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-surface-400">
              Retailers order in <b>{productForm.unit || 'units'}</b>
              {productForm.packSize
                ? ` — each holds ${productForm.packSize} ${productForm.packUnit}.`
                : '.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label={`Price / ${productForm.unit || 'unit'} (incl. GST)`}
              htmlFor="pp"
              required
              hint="GST-inclusive selling price"
            >
              <Input
                id="pp"
                type="number"
                min={0}
                value={productForm.basePrice}
                onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
              />
            </Field>
            <Field label="GST %" htmlFor="pt">
              <Input
                id="pt"
                type="number"
                min={0}
                value={productForm.taxRatePct}
                onChange={(e) =>
                  setProductForm({ ...productForm, taxRatePct: e.target.value })
                }
              />
            </Field>
            <Field label="Order step" htmlFor="pstep">
              <Input
                id="pstep"
                type="number"
                min={1}
                value={productForm.orderStep}
                onChange={(e) =>
                  setProductForm({ ...productForm, orderStep: e.target.value })
                }
              />
            </Field>
            <Field label="Low-stock at" htmlFor="pl">
              <Input
                id="pl"
                type="number"
                min={0}
                value={productForm.lowStockThreshold}
                onChange={(e) =>
                  setProductForm({ ...productForm, lowStockThreshold: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="pd">
            <Textarea
              id="pd"
              rows={2}
              placeholder="Short product description shown in the catalog…"
              value={productForm.description}
              onChange={(e) =>
                setProductForm({ ...productForm, description: e.target.value })
              }
            />
          </Field>
        </div>
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustFor}
        onClose={() => setAdjustFor(null)}
        title={`Adjust Stock · ${adjustFor?.name ?? ''}`}
        subtitle="Set the physical quantity on hand. Held (reserved) stock is unaffected."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustFor(null)}>
              Cancel
            </Button>
            <Button loading={savingAdjust} onClick={saveAdjust}>
              Update Stock
            </Button>
          </>
        }
      >
        {adjustFor && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface-50 p-3">
                <p className="text-xs text-surface-400">Available</p>
                <p className="text-lg font-bold text-brand-700">
                  {formatNumber(availableStock(adjustFor))}
                </p>
              </div>
              <div className="rounded-lg bg-surface-50 p-3">
                <p className="text-xs text-surface-400">Held</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatNumber(adjustFor.heldStock)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-50 p-3">
                <p className="text-xs text-surface-400">Total</p>
                <p className="text-lg font-bold text-surface-700">
                  {formatNumber(adjustFor.totalStock)}
                </p>
              </div>
            </div>
            <Field label={`New total stock (in ${adjustFor.unit})`} htmlFor="adj" required>
              <Input
                id="adj"
                type="number"
                min={0}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
            </Field>
            <Field label="Reason (optional)" htmlFor="adjnote">
              <Input
                id="adjnote"
                placeholder="e.g. Physical count correction, damage, spillage…"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={
        danger
          ? 'focus-ring tap-transparent rounded-lg p-2 text-surface-400 hover:bg-rose-50 hover:text-rose-600'
          : 'focus-ring tap-transparent rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800'
      }
    >
      {children}
    </button>
  );
}
