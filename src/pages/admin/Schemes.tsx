import { useEffect, useState } from 'react';
import { Megaphone, Plus, Train, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { categoryMetaFor, rakeStatusMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import {
  announcementsApi,
  inventoryCategoriesApi,
  productsApi,
  rakesApi,
} from '@/services/api';
import {
  type Announcement,
  type AnnouncementType,
  type InventoryCategory,
  type Product,
  type ProductCategory,
  type RakeArrival,
  type RakeItem,
  type RakeStatus,
} from '@/types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  grossUnit,
  isoInDays,
  netFromGross,
} from '@/lib/utils';

interface RakeItemForm {
  productId: string;
  quantity: string;
  ratio: string;
  pricePerUnit: string;
}

const blankItem: RakeItemForm = { productId: '', quantity: '', ratio: '1', pricePerUnit: '' };

export function SchemesPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rakes, setRakes] = useState<RakeArrival[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Announcement modal
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [annForm, setAnnForm] = useState({
    type: 'SCHEME' as AnnouncementType,
    title: '',
    body: '',
    category: 'FERTILIZER' as ProductCategory,
  });

  // Rake modal
  const [creatingRake, setCreatingRake] = useState(false);
  const [rakeSaving, setRakeSaving] = useState(false);
  const [rakeForm, setRakeForm] = useState({
    rakeNumber: '',
    originStation: '',
    destinationGodown: '',
    expectedArrival: isoInDays(7).slice(0, 10),
    notes: '',
  });
  const [rakeItems, setRakeItems] = useState<RakeItemForm[]>([{ ...blankItem }]);

  const load = async () => {
    const [a, r, p, c] = await Promise.all([
      announcementsApi.list(),
      rakesApi.list(),
      productsApi.list(),
      inventoryCategoriesApi.list(),
    ]);
    setAnnouncements(a);
    setRakes(r);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // --- Announcements --------------------------------------------------------
  const createScheme = async () => {
    if (!annForm.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    setAnnSaving(true);
    try {
      await announcementsApi.create({
        type: annForm.type,
        title: annForm.title.trim(),
        body: annForm.body.trim(),
        category: annForm.category,
        startsAt: isoInDays(0),
        endsAt: isoInDays(30),
        active: true,
      });
      toast.success('Announcement published.');
      setAnnForm({ type: 'SCHEME', title: '', body: '', category: 'FERTILIZER' });
      setCreatingAnn(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    } finally {
      setAnnSaving(false);
    }
  };

  const removeScheme = async (id: string) => {
    await announcementsApi.remove(id);
    toast.info('Announcement removed.');
    await load();
  };

  // --- Rakes ----------------------------------------------------------------
  const setItem = (idx: number, patch: Partial<RakeItemForm>) =>
    setRakeItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addItemRow = () => setRakeItems((rows) => [...rows, { ...blankItem }]);
  const removeItemRow = (idx: number) =>
    setRakeItems((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));

  const createRake = async () => {
    if (!rakeForm.rakeNumber.trim()) {
      toast.error('Rake number is required.');
      return;
    }
    const items: RakeItem[] = [];
    for (const row of rakeItems) {
      if (!row.productId) continue;
      const p = products.find((x) => x.id === row.productId);
      if (!p) continue;
      items.push({
        productId: p.id,
        productName: p.name,
        category: p.category,
        unit: p.unit,
        hsnCode: p.hsnCode,
        taxRatePct: p.taxRatePct,
        quantity: parseInt(row.quantity, 10) || 0,
        bookedQty: 0,
        ratio: parseInt(row.ratio, 10) || 1,
        // Price entered GST-inclusive; store the net value like products do.
        pricePerUnit: row.pricePerUnit
          ? netFromGross(parseFloat(row.pricePerUnit), p.taxRatePct)
          : p.basePrice,
      });
    }
    if (items.length === 0) {
      toast.error('Add at least one product to the rake.');
      return;
    }
    setRakeSaving(true);
    try {
      await rakesApi.create({
        rakeNumber: rakeForm.rakeNumber.trim(),
        originStation: rakeForm.originStation.trim(),
        destinationGodown: rakeForm.destinationGodown.trim(),
        status: 'SCHEDULED',
        expectedArrival: new Date(rakeForm.expectedArrival).toISOString(),
        items,
        notes: rakeForm.notes.trim() || undefined,
        openForOrders: true,
      });
      toast.success('Rake published — retailers can now pre-book.');
      setCreatingRake(false);
      setRakeForm({
        rakeNumber: '',
        originStation: '',
        destinationGodown: '',
        expectedArrival: isoInDays(7).slice(0, 10),
        notes: '',
      });
      setRakeItems([{ ...blankItem }]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rake.');
    } finally {
      setRakeSaving(false);
    }
  };

  const cycleRake = async (rake: RakeArrival) => {
    const order: RakeStatus[] = ['SCHEDULED', 'IN_TRANSIT', 'ARRIVED', 'ALLOCATED'];
    const next = order[(order.indexOf(rake.status) + 1) % order.length];
    await rakesApi.update(rake.id, {
      status: next,
      openForOrders: next !== 'ALLOCATED',
    });
    toast.success(`${rake.rakeNumber} → ${rakeStatusMeta[next].label}`);
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Schemes & Rakes"
        description="Publish retailer offers and open upcoming rakes for pre-booking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreatingAnn(true)}>
              <Megaphone className="h-4 w-4" />
              Announcement
            </Button>
            <Button onClick={() => setCreatingRake(true)}>
              <Plus className="h-4 w-4" />
              New Rake
            </Button>
          </div>
        }
      />

      {loading ? (
        <InlineLoader label="Loading…" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Announcements */}
          <Card>
            <CardHeader
              title="Announcements"
              subtitle="Schemes and banners shown to retailers"
              icon={<Megaphone className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              {announcements.length === 0 ? (
                <EmptyState
                  icon={<Megaphone className="h-6 w-6" />}
                  title="No announcements"
                  description="Publish a scheme to promote products."
                />
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-surface-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={a.type === 'SCHEME' ? 'brand' : 'sky'}>{a.type}</Badge>
                        {a.category && (
                          <Badge tone={categoryMetaFor(a.category).tone}>
                            {categoryMetaFor(a.category).label}
                          </Badge>
                        )}
                      </div>
                      <button
                        className="focus-ring rounded-lg p-1.5 text-surface-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => removeScheme(a.id)}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-surface-900">{a.title}</p>
                    <p className="mt-1 text-xs text-surface-500">{a.body}</p>
                    <p className="mt-2 text-[11px] text-surface-400">
                      {formatDate(a.startsAt)} – {formatDate(a.endsAt)}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Rakes */}
          <Card>
            <CardHeader
              title="Rake Arrivals"
              subtitle="Multi-product inbound shipments open for pre-booking"
              icon={<Train className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              {rakes.length === 0 ? (
                <EmptyState icon={<Train className="h-6 w-6" />} title="No rakes scheduled" />
              ) : (
                rakes.map((r) => (
                  <div key={r.id} className="rounded-xl border border-surface-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-surface-900">
                          {r.rakeNumber}
                        </p>
                        <p className="text-xs text-surface-500">
                          {r.originStation} → {r.destinationGodown} · ETA{' '}
                          {formatDate(r.expectedArrival)}
                        </p>
                      </div>
                      <button onClick={() => cycleRake(r)} title="Advance status">
                        <Badge tone={rakeStatusMeta[r.status].tone} dot>
                          {rakeStatusMeta[r.status].label}
                        </Badge>
                      </button>
                    </div>
                    <div className="mt-3 space-y-1">
                      {r.items.map((it) => (
                        <div
                          key={it.productId}
                          className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-1.5 text-xs"
                        >
                          <span className="font-medium text-surface-700">
                            {it.productName}
                            <span className="ml-1.5 text-surface-400">×{it.ratio}</span>
                          </span>
                          <span className="text-surface-500">
                            {formatNumber(it.bookedQty)}/{formatNumber(it.quantity)} booked ·{' '}
                            {formatCurrency(grossUnit(it.pricePerUnit, it.taxRatePct))} incl. GST
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={r.openForOrders ? 'emerald' : 'slate'}>
                        {r.openForOrders ? 'Open for orders' : 'Closed'}
                      </Badge>
                      {r.notes && (
                        <span className="text-[11px] text-surface-400">{r.notes}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Announcement modal */}
      <Modal
        open={creatingAnn}
        onClose={() => setCreatingAnn(false)}
        title="New Announcement"
        subtitle="Publish a scheme or banner to the retailer portal."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreatingAnn(false)}>
              Cancel
            </Button>
            <Button loading={annSaving} onClick={createScheme}>
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" htmlFor="type">
              <Select
                id="type"
                value={annForm.type}
                onChange={(e) =>
                  setAnnForm({ ...annForm, type: e.target.value as AnnouncementType })
                }
              >
                <option value="SCHEME">Scheme</option>
                <option value="BANNER">Banner</option>
              </Select>
            </Field>
            <Field label="Category" htmlFor="cat">
              <Select
                id="cat"
                value={annForm.category}
                onChange={(e) =>
                  setAnnForm({ ...annForm, category: e.target.value as ProductCategory })
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Title" htmlFor="title" required>
            <Input
              id="title"
              placeholder="e.g. Kharif Booster — 9% off Urea"
              value={annForm.title}
              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="body">
            <Textarea
              id="body"
              rows={3}
              placeholder="Describe the offer and eligibility…"
              value={annForm.body}
              onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* Rake modal */}
      <Modal
        open={creatingRake}
        onClose={() => setCreatingRake(false)}
        title="New Rake"
        subtitle="Define the shipment and the products retailers can pre-book."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreatingRake(false)}>
              Cancel
            </Button>
            <Button loading={rakeSaving} onClick={createRake}>
              Publish Rake
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rake number" htmlFor="rn" required>
              <Input
                id="rn"
                placeholder="e.g. RK-KHARIF-9001"
                value={rakeForm.rakeNumber}
                onChange={(e) => setRakeForm({ ...rakeForm, rakeNumber: e.target.value })}
              />
            </Field>
            <Field label="Expected arrival" htmlFor="ea">
              <Input
                id="ea"
                type="date"
                value={rakeForm.expectedArrival}
                onChange={(e) =>
                  setRakeForm({ ...rakeForm, expectedArrival: e.target.value })
                }
              />
            </Field>
            <Field label="Origin station" htmlFor="os">
              <Input
                id="os"
                placeholder="e.g. Kandla Port"
                value={rakeForm.originStation}
                onChange={(e) => setRakeForm({ ...rakeForm, originStation: e.target.value })}
              />
            </Field>
            <Field label="Destination godown" htmlFor="dg">
              <Input
                id="dg"
                placeholder="e.g. Pune MIDC"
                value={rakeForm.destinationGodown}
                onChange={(e) =>
                  setRakeForm({ ...rakeForm, destinationGodown: e.target.value })
                }
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                Rake items & ratio
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={addItemRow}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {rakeItems.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-center gap-2 rounded-lg border border-surface-200 p-2"
                >
                  <div className="col-span-5">
                    <Select
                      value={row.productId}
                      onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value);
                        setItem(idx, {
                          productId: e.target.value,
                          pricePerUnit:
                            row.pricePerUnit ||
                            String(p ? grossUnit(p.basePrice, p.taxRatePct) : ''),
                        });
                      }}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Total qty"
                      value={row.quantity}
                      onChange={(e) => setItem(idx, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ratio"
                      value={row.ratio}
                      onChange={(e) => setItem(idx, { ratio: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder="₹/unit (incl GST)"
                      value={row.pricePerUnit}
                      onChange={(e) => setItem(idx, { pricePerUnit: e.target.value })}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1.5 text-surface-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => removeItemRow(idx)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-surface-400">
              Ratio defines how items are bundled per lot (e.g. 4:1:1). Retailers order in
              multiples of these ratios.
            </p>
          </div>

          <Field label="Notes" htmlFor="rnotes">
            <Textarea
              id="rnotes"
              rows={2}
              placeholder="Optional guidance shown to retailers…"
              value={rakeForm.notes}
              onChange={(e) => setRakeForm({ ...rakeForm, notes: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
