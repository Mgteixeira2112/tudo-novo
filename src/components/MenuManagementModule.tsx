import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit3, Plus, Power, Save, Trash2, X } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import {
  createInventoryItemFromMenu,
  InlineInventoryPayload,
  loadInventoryForMenu,
  loadMenuAdminSnapshot,
  MenuAdminItem,
  saveMenuItemAtomic,
  setMenuItemAvailability
} from '../services/menuAdmin.ts';

const CATEGORIES = ['Café da Manhã', 'Bebidas', 'Lanches', 'Pratos Principais', 'Sobremesas'];
const UNITS = ['un', 'kg', 'g', 'l', 'ml', 'pct', 'cx', 'fardo'];

const blankInventory = (): InlineInventoryPayload => ({
  name: '', sku: '', unit: 'un', sector: 'Alimentos_Bebidas', category: 'Ingredientes',
  currentStock: 0, minStock: 0, maxStock: undefined, costPrice: 0, supplier: ''
});

const blankForm = () => ({
  id: undefined as string | undefined,
  name: '', category: 'Pratos Principais', price: 0, description: '', prepTimeMinutes: 20,
  available: true, operationalType: 'simple' as 'simple' | 'recipe',
  simpleInventoryItemId: '', createSimpleInventory: false, newInventoryItem: blankInventory(),
  ingredients: [] as { inventoryItemId: string; quantity: number }[]
});

type FormState = ReturnType<typeof blankForm>;

export const MenuManagementModule: React.FC = () => {
  const [items, setItems] = useState<MenuAdminItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<FormState>(blankForm());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIngredientOpen, setNewIngredientOpen] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState<InlineInventoryPayload>(blankInventory());
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = async () => {
    const [menu, stock] = await Promise.all([loadMenuAdminSnapshot(), loadInventoryForMenu()]);
    setItems(menu);
    setInventory(stock);
  };

  useEffect(() => {
    refresh().catch((error: any) => setNotice({ kind: 'error', text: error?.message || 'Erro ao carregar cardápio.' }))
      .finally(() => setLoading(false));
  }, []);

  const recipeCost = useMemo(() => form.ingredients.reduce((sum, row) => {
    const item = inventory.find(inv => inv.id === row.inventoryItemId);
    return sum + Number(row.quantity || 0) * Number(item?.costPrice || 0);
  }, 0), [form.ingredients, inventory]);
  const foodCost = form.price > 0 ? recipeCost / form.price * 100 : 0;

  const openNew = () => {
    setForm(blankForm());
    setIngredientDraft(blankInventory());
    setNewIngredientOpen(false);
    setModalOpen(true);
  };

  const openEdit = (item: MenuAdminItem) => {
    setForm({
      ...blankForm(),
      id: item.id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
      description: item.description || '',
      prepTimeMinutes: Number(item.prepTimeMinutes || 0),
      available: item.available,
      operationalType: item.operationalType === 'recipe' ? 'recipe' : 'simple',
      simpleInventoryItemId: item.simpleInventoryItemId || '',
      ingredients: (item.ingredients || []).map(i => ({ inventoryItemId: i.inventoryItemId, quantity: Number(i.quantity) }))
    });
    setIngredientDraft(blankInventory());
    setNewIngredientOpen(false);
    setModalOpen(true);
  };

  const addIngredient = () => {
    const candidate = inventory.find(inv => !form.ingredients.some(row => row.inventoryItemId === inv.id));
    if (!candidate) return;
    setForm(current => ({ ...current, ingredients: [...current.ingredients, { inventoryItemId: candidate.id, quantity: 1 }] }));
  };

  const createIngredientInline = async () => {
    try {
      setSaving(true);
      const created = await createInventoryItemFromMenu(ingredientDraft);
      setInventory(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(current => ({ ...current, ingredients: [...current.ingredients, { inventoryItemId: created.id, quantity: 1 }] }));
      setIngredientDraft(blankInventory());
      setNewIngredientOpen(false);
      setNotice({ kind: 'ok', text: 'Ingrediente criado no estoque e incluído na ficha técnica.' });
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.message || 'Erro ao criar ingrediente.' });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveMenuItemAtomic({
        id: form.id,
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description,
        prepTimeMinutes: Number(form.prepTimeMinutes),
        available: form.available,
        operationalType: form.operationalType,
        simpleInventoryItemId: form.operationalType === 'simple' && !form.createSimpleInventory ? form.simpleInventoryItemId || undefined : undefined,
        newInventoryItem: form.operationalType === 'simple' && form.createSimpleInventory ? form.newInventoryItem : undefined,
        ingredients: form.operationalType === 'recipe' ? form.ingredients.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: Number(i.quantity) })) : undefined
      });
      await refresh();
      setModalOpen(false);
      setNotice({ kind: 'ok', text: 'Item do cardápio salvo com sucesso.' });
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.message || 'Erro ao salvar item.' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: MenuAdminItem) => {
    try {
      await setMenuItemAvailability(item.id, !item.available);
      await refresh();
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.message || 'Erro ao alterar disponibilidade.' });
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-10 text-sm text-[#6B705C]">Carregando administração do cardápio...</div>;

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#588157]" /> Administração do Cardápio</h2>
        <p className="text-xs text-[#6B705C] mt-1">Produto simples = estoque físico. Receita composta = ficha técnica de ingredientes.</p>
      </div>
      <button onClick={openNew} className="px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Novo item</button>
    </div>

    {notice && <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${notice.kind === 'ok' ? 'bg-[#F2F6EE] border-[#CCD5AE] text-[#3A5A40]' : 'bg-[#FFF4F0] border-[#E7B8A0] text-[#8A3B22]'}`}>{notice.text}</div>}

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(item => {
        const unclassified = !item.operationalType;
        const isRecipe = item.operationalType === 'recipe';
        const cost = isRecipe
          ? (item.ingredients || []).reduce((sum, ing) => sum + Number(ing.proportionalCost || 0), 0)
          : Number(item.simpleInventoryItem?.costPrice || 0);
        const typeLabel = unclassified ? 'Classificação pendente' : isRecipe ? 'Receita composta' : 'Produto simples';
        return <div key={item.id} className={`rounded-2xl border bg-white p-4 shadow-xs space-y-3 ${unclassified ? 'border-[#D4A373]' : 'border-[#E6E3D8]'}`}>
          <div className="flex justify-between gap-3">
            <div><p className="font-bold text-[#2C3327]">{item.name}</p><p className="text-[11px] text-[#6B705C]">{item.category}</p></div>
            <span className={`h-fit rounded-full px-2 py-1 text-[10px] font-extrabold ${item.available ? 'bg-[#EDF4E8] text-[#3A5A40]' : 'bg-[#F1EFE9] text-[#77796D]'}`}>{item.available ? 'ATIVO' : 'INATIVO'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Tipo" value={typeLabel} />
            <Metric label="Preço" value={`R$ ${Number(item.price).toFixed(2)}`} />
            <Metric label="Custo estimado" value={unclassified ? '—' : `R$ ${cost.toFixed(2)}`} />
            <Metric label="Matéria-prima" value={!unclassified && item.price > 0 ? `${(cost / item.price * 100).toFixed(1)}%` : '—'} />
          </div>
          <p className={`text-[11px] ${unclassified ? 'font-semibold text-[#9A5B21]' : 'text-[#6B705C]'}`}>
            {unclassified
              ? 'Item legado preservado. Edite-o para definir se é produto simples ou receita composta.'
              : isRecipe ? `${item.ingredients?.length || 0} ingrediente(s) na ficha técnica`
              : item.simpleInventoryItem ? `Estoque: ${item.simpleInventoryItem.name}` : 'Vínculo de estoque pendente'}
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => openEdit(item)} className="flex-1 py-2 rounded-lg border border-[#DADFD1] text-xs font-bold flex items-center justify-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Editar</button>
            <button onClick={() => toggle(item)} className="flex-1 py-2 rounded-lg border border-[#DADFD1] text-xs font-bold flex items-center justify-center gap-1"><Power className="w-3.5 h-3.5" /> {item.available ? 'Desativar' : 'Ativar'}</button>
          </div>
        </div>;
      })}
    </div>

    {modalOpen && <div className="fixed inset-0 z-50 bg-black/35 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <form onSubmit={submit} className="w-full max-w-4xl rounded-2xl bg-white border border-[#E6E3D8] shadow-2xl p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-[#2C3327]">{form.id ? 'Editar item' : 'Novo item'}</h3><p className="text-xs text-[#6B705C]">O tipo operacional é obrigatório ao salvar.</p></div><button type="button" onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome *"><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" /></Field>
          <Field label="Categoria *"><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Preço de venda *"><input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="input" /></Field>
          <Field label="Tempo de preparo (min)"><input type="number" min="0" value={form.prepTimeMinutes} onChange={e => setForm(f => ({ ...f, prepTimeMinutes: Number(e.target.value) }))} className="input" /></Field>
        </div>
        <Field label="Descrição"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input" /></Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TypeButton active={form.operationalType === 'simple'} title="Produto simples" text="Água, refrigerante, chocolate ou outro produto físico." onClick={() => setForm(f => ({ ...f, operationalType: 'simple' }))} />
          <TypeButton active={form.operationalType === 'recipe'} title="Receita composta" text="Prato preparado com vários ingredientes de estoque." onClick={() => setForm(f => ({ ...f, operationalType: 'recipe', createSimpleInventory: false }))} />
        </div>

        {form.operationalType === 'simple' ? <section className="panel space-y-4">
          <div className="flex flex-wrap gap-2">
            <MiniButton active={!form.createSimpleInventory} onClick={() => setForm(f => ({ ...f, createSimpleInventory: false }))}>Selecionar item existente</MiniButton>
            <MiniButton active={form.createSimpleInventory} onClick={() => setForm(f => ({ ...f, createSimpleInventory: true }))}>Cadastrar novo produto no estoque</MiniButton>
          </div>
          {!form.createSimpleInventory ? <Field label="Produto do estoque *"><select required value={form.simpleInventoryItemId} onChange={e => setForm(f => ({ ...f, simpleInventoryItemId: e.target.value }))} className="input"><option value="">Selecione...</option>{inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} — {inv.currentStock} {inv.unit}</option>)}</select></Field> : <InventoryFields value={form.newInventoryItem} onChange={newInventoryItem => setForm(f => ({ ...f, newInventoryItem }))} />}
        </section> : <section className="panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><b className="text-sm">Ficha técnica</b><p className="text-[11px] text-[#6B705C]">Cada componente referencia inventory_items.</p></div><div className="flex gap-2"><button type="button" onClick={addIngredient} className="small-btn"><Plus className="w-3.5 h-3.5" /> Ingrediente</button><button type="button" onClick={() => setNewIngredientOpen(true)} className="small-btn bg-[#2C3327] text-white">+ Cadastrar ingrediente</button></div></div>

          {form.ingredients.map((row, index) => {
            const inv = inventory.find(i => i.id === row.inventoryItemId);
            return <div key={`${row.inventoryItemId}-${index}`} className="grid grid-cols-12 gap-2 items-end rounded-xl bg-white border p-3">
              <label className="col-span-12 md:col-span-6 text-[11px] font-semibold">Ingrediente<select value={row.inventoryItemId} onChange={e => setForm(f => ({ ...f, ingredients: f.ingredients.map((x, i) => i === index ? { ...x, inventoryItemId: e.target.value } : x) }))} className="input">{inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
              <label className="col-span-5 md:col-span-2 text-[11px] font-semibold">Quantidade<input type="number" min="0.0001" step="0.0001" value={row.quantity} onChange={e => setForm(f => ({ ...f, ingredients: f.ingredients.map((x, i) => i === index ? { ...x, quantity: Number(e.target.value) } : x) }))} className="input" /></label>
              <div className="col-span-5 md:col-span-3 text-[11px] text-[#6B705C]"><div>Unidade: <b>{inv?.unit || '—'}</b></div><div>Estoque: <b>{inv?.currentStock ?? '—'}</b></div><div>Custo: <b>R$ {((inv?.costPrice || 0) * row.quantity).toFixed(2)}</b></div></div>
              <button type="button" onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== index) }))} className="col-span-2 md:col-span-1 h-9 rounded-lg border flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>;
          })}
          {form.ingredients.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-xs text-[#77796D]">Adicione ao menos um ingrediente.</div>}
          <div className="grid grid-cols-3 gap-2"><Metric label="Custo estimado" value={`R$ ${recipeCost.toFixed(2)}`} /><Metric label="Preço" value={`R$ ${Number(form.price).toFixed(2)}`} /><Metric label="Matéria-prima" value={`${foodCost.toFixed(1)}%`} /></div>

          {newIngredientOpen && <div className="rounded-xl border border-[#CCD5AE] bg-[#F4F8EF] p-4 space-y-3"><div className="flex justify-between"><b className="text-xs">Novo ingrediente no estoque</b><button type="button" onClick={() => setNewIngredientOpen(false)}><X className="w-4 h-4" /></button></div><InventoryFields value={ingredientDraft} onChange={setIngredientDraft} /><button type="button" disabled={saving || !ingredientDraft.name} onClick={createIngredientInline} className="px-4 py-2 rounded-lg bg-[#588157] text-white text-xs font-bold disabled:opacity-50">Cadastrar e voltar à ficha</button></div>}
        </section>}

        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} /> Disponível para venda</label>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancelar</button><button disabled={saving || !form.name || (form.operationalType === 'recipe' && form.ingredients.length === 0)} className="px-5 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar item'}</button></div>
      </form>
    </div>}

    <style>{`.input{margin-top:.25rem;width:100%;border:1px solid #DADFD1;border-radius:.75rem;padding:.625rem .75rem;background:white}.panel{border:1px solid #E6E3D8;border-radius:1rem;background:#FAF9F5;padding:1rem}.small-btn{display:flex;align-items:center;gap:.25rem;border:1px solid #DADFD1;border-radius:.5rem;padding:.5rem .75rem;font-size:.75rem;font-weight:700}`}</style>
  </div>;
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-lg bg-[#F7F5EF] p-2 text-xs"><span className="block text-[10px] text-[#77796D]">{label}</span><b>{value}</b></div>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="text-xs font-semibold block">{label}{children}</label>;
const TypeButton: React.FC<{ active: boolean; title: string; text: string; onClick: () => void }> = ({ active, title, text, onClick }) => <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left ${active ? 'border-[#588157] bg-[#F2F6EE]' : 'border-[#E6E3D8]'}`}><b className="text-sm">{title}</b><span className="block text-[11px] text-[#6B705C] mt-1">{text}</span></button>;
const MiniButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => <button type="button" onClick={onClick} className={`px-3 py-2 rounded-lg text-xs font-bold ${active ? 'bg-[#2C3327] text-white' : 'bg-white border'}`}>{children}</button>;

const InventoryFields: React.FC<{ value: InlineInventoryPayload; onChange: (value: InlineInventoryPayload) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<InlineInventoryPayload>) => onChange({ ...value, ...patch });
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <Field label="Nome *"><input required value={value.name} onChange={e => set({ name: e.target.value })} className="input" /></Field>
    <Field label="SKU"><input value={value.sku || ''} onChange={e => set({ sku: e.target.value })} className="input" /></Field>
    <Field label="Unidade *"><select value={value.unit} onChange={e => set({ unit: e.target.value })} className="input">{UNITS.map(u => <option key={u}>{u}</option>)}</select></Field>
    <Field label="Categoria"><input value={value.category} onChange={e => set({ category: e.target.value })} className="input" /></Field>
    <Field label="Custo unitário"><input type="number" min="0" step="0.01" value={value.costPrice} onChange={e => set({ costPrice: Number(e.target.value) })} className="input" /></Field>
    <Field label="Fornecedor"><input value={value.supplier || ''} onChange={e => set({ supplier: e.target.value })} className="input" /></Field>
    <Field label="Estoque atual"><input type="number" min="0" step="0.001" value={value.currentStock} onChange={e => set({ currentStock: Number(e.target.value) })} className="input" /></Field>
    <Field label="Estoque mínimo"><input type="number" min="0" step="0.001" value={value.minStock} onChange={e => set({ minStock: Number(e.target.value) })} className="input" /></Field>
    <Field label="Estoque máximo"><input type="number" min="0" step="0.001" value={value.maxStock ?? ''} onChange={e => set({ maxStock: e.target.value === '' ? undefined : Number(e.target.value) })} className="input" /></Field>
  </div>;
};
