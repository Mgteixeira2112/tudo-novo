import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Edit3, Plus, Power, Save, Trash2, X } from 'lucide-react';
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

const MENU_CATEGORIES = ['Café da Manhã', 'Bebidas', 'Lanches', 'Pratos Principais', 'Sobremesas'];
const UNITS = ['un', 'kg', 'g', 'l', 'ml', 'pct', 'cx', 'fardo'];

const emptyInventory = (): InlineInventoryPayload => ({
  name: '', sku: '', unit: 'un', sector: 'Alimentos_Bebidas', category: 'Ingredientes',
  currentStock: 0, minStock: 0, maxStock: undefined, costPrice: 0, supplier: ''
});

const emptyForm = () => ({
  id: undefined as string | undefined,
  name: '', category: 'Pratos Principais', price: 0, description: '', prepTimeMinutes: 20,
  available: true, operationalType: 'simple' as 'simple' | 'recipe',
  simpleInventoryItemId: '', createSimpleInventory: false, newInventoryItem: emptyInventory(),
  ingredients: [] as { inventoryItemId: string; quantity: number }[]
});

type FormState = ReturnType<typeof emptyForm>;

export const MenuManagementModule: React.FC = () => {
  const [items, setItems] = useState<MenuAdminItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineIngredient, setInlineIngredient] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState<InlineInventoryPayload>(emptyInventory());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = async () => {
    const [menu, stock] = await Promise.all([loadMenuAdminSnapshot(), loadInventoryForMenu()]);
    setItems(menu);
    setInventory(stock);
  };

  useEffect(() => {
    refresh().catch(error => setMessage({ type: 'error', text: error?.message || 'Erro ao carregar cardápio.' }))
      .finally(() => setLoading(false));
  }, []);

  const recipeCost = useMemo(() => form.ingredients.reduce((sum, ingredient) => {
    const item = inventory.find(inv => inv.id === ingredient.inventoryItemId);
    return sum + (item ? item.costPrice * Number(ingredient.quantity || 0) : 0);
  }, 0), [form.ingredients, inventory]);

  const foodCost = form.price > 0 ? (recipeCost / form.price) * 100 : 0;

  const startCreate = () => {
    setForm(emptyForm());
    setInlineIngredient(false);
    setIngredientDraft(emptyInventory());
    setOpen(true);
  };

  const startEdit = (item: MenuAdminItem) => {
    setForm({
      ...emptyForm(),
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      prepTimeMinutes: item.prepTimeMinutes,
      available: item.available,
      operationalType: item.operationalType || 'simple',
      simpleInventoryItemId: item.simpleInventoryItemId || '',
      ingredients: (item.ingredients || []).map(ingredient => ({
        inventoryItemId: ingredient.inventoryItemId,
        quantity: Number(ingredient.quantity)
      }))
    });
    setInlineIngredient(false);
    setIngredientDraft(emptyInventory());
    setOpen(true);
  };

  const addIngredientRow = () => {
    const available = inventory.find(inv => !form.ingredients.some(i => i.inventoryItemId === inv.id));
    if (!available) return;
    setForm(current => ({ ...current, ingredients: [...current.ingredients, { inventoryItemId: available.id, quantity: 1 }] }));
  };

  const createInlineIngredient = async () => {
    try {
      setSaving(true);
      const created = await createInventoryItemFromMenu(ingredientDraft);
      setInventory(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(current => ({ ...current, ingredients: [...current.ingredients, { inventoryItemId: created.id, quantity: 1 }] }));
      setIngredientDraft(emptyInventory());
      setInlineIngredient(false);
      setMessage({ type: 'success', text: 'Ingrediente cadastrado no estoque e adicionado à ficha técnica.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Erro ao cadastrar ingrediente.' });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
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
      setOpen(false);
      setForm(emptyForm());
      setMessage({ type: 'success', text: 'Item do cardápio salvo com sucesso.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Erro ao salvar item do cardápio.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuAdminItem) => {
    try {
      await setMenuItemAvailability(item.id, !item.available);
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Erro ao alterar disponibilidade.' });
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-10 text-sm text-[#6B705C]">Carregando administração do cardápio...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#588157]" /> Administração do Cardápio</h2>
          <p className="text-xs text-[#6B705C] mt-1">Produto simples vincula estoque físico. Receita composta utiliza ficha técnica de ingredientes.</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Novo item</button>
      </div>

      {message && <div className={`rounded-xl px-4 py-3 text-xs font-semibold border ${message.type === 'success' ? 'bg-[#F2F6EE] border-[#CCD5AE] text-[#3A5A40]' : 'bg-[#FFF4F0] border-[#E7B8A0] text-[#8A3B22]'}`}>{message.text}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(item => {
          const cost = item.operationalType === 'recipe'
            ? (item.ingredients || []).reduce((sum, ing) => sum + Number(ing.proportionalCost || 0), 0)
            : Number(item.simpleInventoryItem?.costPrice || 0);
          return <div key={item.id} className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs space-y-3">
            <div className="flex justify-between gap-3">
              <div><p className="font-bold text-[#2C3327]">{item.name}</p><p className="text-[11px] text-[#6B705C]">{item.category}</p></div>
              <span className={`h-fit rounded-full px-2 py-1 text-[10px] font-extrabold ${item.available ? 'bg-[#EDF4E8] text-[#3A5A40]' : 'bg-[#F1EFE9] text-[#77796D]'}`}>{item.available ? 'ATIVO' : 'INATIVO'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#F7F5EF] p-2"><span className="block text-[10px] text-[#77796D]">Tipo</span><b>{item.operationalType === 'recipe' ? 'Receita composta' : 'Produto simples'}</b></div>
              <div className="rounded-lg bg-[#F7F5EF] p-2"><span className="block text-[10px] text-[#77796D]">Preço</span><b>R$ {Number(item.price).toFixed(2)}</b></div>
              <div className="rounded-lg bg-[#F7F5EF] p-2"><span className="block text-[10px] text-[#77796D]">Custo estimado</span><b>R$ {cost.toFixed(2)}</b></div>
              <div className="rounded-lg bg-[#F7F5EF] p-2"><span className="block text-[10px] text-[#77796D]">Matéria-prima</span><b>{item.price > 0 ? `${((cost / item.price) * 100).toFixed(1)}%` : '—'}</b></div>
            </div>
            <p className="text-[11px] text-[#6B705C]">{item.operationalType === 'recipe' ? `${item.ingredients?.length || 0} ingrediente(s) na ficha técnica` : item.simpleInventoryItem ? `Estoque: ${item.simpleInventoryItem.name}` : 'Sem vínculo de estoque'}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => startEdit(item)} className="flex-1 py-2 rounded-lg border border-[#DADFD1] text-xs font-bold text-[#2C3327] flex items-center justify-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Editar</button>
              <button onClick={() => toggleAvailability(item)} className="flex-1 py-2 rounded-lg border border-[#DADFD1] text-xs font-bold text-[#2C3327] flex items-center justify-center gap-1"><Power className="w-3.5 h-3.5" /> {item.available ? 'Desativar' : 'Ativar'}</button>
            </div>
          </div>;
        })}
      </div>

      {open && <div className="fixed inset-0 z-50 bg-black/35 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <form onSubmit={submit} className="w-full max-w-4xl rounded-2xl bg-white border border-[#E6E3D8] shadow-2xl p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-[#2C3327]">{form.id ? 'Editar item' : 'Novo item do cardápio'}</h3><p className="text-xs text-[#6B705C]">Defina o tipo operacional antes de configurar o estoque.</p></div><button type="button" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold">Nome *<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#DADFD1] px-3 py-2.5" /></label>
            <label className="text-xs font-semibold">Categoria *<select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#DADFD1] px-3 py-2.5">{MENU_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs font-semibold">Preço de venda *<input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#DADFD1] px-3 py-2.5" /></label>
            <label className="text-xs font-semibold">Tempo de preparo (min)<input type="number" min="0" value={form.prepTimeMinutes} onChange={e => setForm(f => ({ ...f, prepTimeMinutes: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#DADFD1] px-3 py-2.5" /></label>
          </div>
          <label className="text-xs font-semibold block">Descrição<textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 w-full rounded-xl border border-[#DADFD1] px-3 py-2.5" /></label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, operationalType: 'simple' }))} className={`rounded-xl border p-4 text-left ${form.operationalType === 'simple' ? 'border-[#588157] bg-[#F2F6EE]' : 'border-[#E6E3D8]'}`}><b className="text-sm">Produto simples</b><span className="block text-[11px] text-[#6B705C] mt-1">Ex.: água, refrigerante, chocolate. Baixa uma unidade física vinculada.</span></button>
            <button type="button" onClick={() => setForm(f => ({ ...f, operationalType: 'recipe', createSimpleInventory: false }))} className={`rounded-xl border p-4 text-left ${form.operationalType === 'recipe' ? 'border-[#588157] bg-[#F2F6EE]' : 'border-[#E6E3D8]'}`}><b className="text-sm">Receita composta</b><span className="block text-[11px] text-[#6B705C] mt-1">Ex.: omelete ou prato executivo. Consome ingredientes da ficha técnica.</span></button>
          </div>

          {form.operationalType === 'simple' ? <div className="rounded-2xl bg-[#FAF9F5] border border-[#E6E3D8] p-4 space-y-4">
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setForm(f => ({ ...f, createSimpleInventory: false }))} className={`px-3 py-2 rounded-lg text-xs font-bold ${!form.createSimpleInventory ? 'bg-[#2C3327] text-white' : 'bg-white border'}`}>Selecionar item existente</button><button type="button" onClick={() => setForm(f => ({ ...f, createSimpleInventory: true }))} className={`px-3 py-2 rounded-lg text-xs font-bold ${form.createSimpleInventory ? 'bg-[#2C3327] text-white' : 'bg-white border'}`}>Cadastrar novo produto no estoque</button></div>
            {!form.createSimpleInventory ? <label className="text-xs font-semibold block">Produto do estoque *<select required value={form.simpleInventoryItemId} onChange={e => setForm(f => ({ ...f, simpleInventoryItemId: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="">Selecione...</option>{inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} — {inv.currentStock} {inv.unit}</option>)}</select></label> : <InventoryFields value={form.newInventoryItem} onChange={newInventoryItem => setForm(f => ({ ...f, newInventoryItem }))} />}
          </div> : <div className="rounded-2xl bg-[#FAF9F5] border border-[#E6E3D8] p-4 space-y-4">
            <div className="flex items-center justify-between"><div><b className="text-sm">Ficha técnica</b><p className="text-[11px] text-[#6B705C]">Cada componente aponta para um item real do inventário.</p></div><div className="flex gap-2"><button type="button" onClick={addIngredientRow} className="px-3 py-2 rounded-lg bg-white border text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Ingrediente</button><button type="button" onClick={() => setInlineIngredient(true)} className="px-3 py-2 rounded-lg bg-[#2C3327] text-white text-xs font-bold">+ Cadastrar ingrediente</button></div></div>
            {form.ingredients.map((ingredient, index) => {
              const inv = inventory.find(item => item.id === ingredient.inventoryItemId);
              return <div key={`${ingredient.inventoryItemId}-${index}`} className="grid grid-cols-12 gap-2 items-end rounded-xl bg-white border p-3">
                <label className="col-span-12 md:col-span-6 text-[11px] font-semibold">Ingrediente<select value={ingredient.inventoryItemId} onChange={e => setForm(f => ({ ...f, ingredients: f.ingredients.map((x, i) => i === index ? { ...x, inventoryItemId: e.target.value } : x) }))} className="mt-1 w-full rounded-lg border px-2 py-2">{inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="col-span-5 md:col-span-2 text-[11px] font-semibold">Quantidade<input type="number" min="0.0001" step="0.0001" value={ingredient.quantity} onChange={e => setForm(f => ({ ...f, ingredients: f.ingredients.map((x, i) => i === index ? { ...x, quantity: Number(e.target.value) } : x) }))} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
                <div className="col-span-5 md:col-span-3 text-[11px] text-[#6B705C]"><span className="block">Unidade: <b>{inv?.unit || '—'}</b></span><span className="block">Estoque: <b>{inv?.currentStock ?? '—'}</b></span><span className="block">Custo: <b>R$ {((inv?.costPrice || 0) * ingredient.quantity).toFixed(2)}</b></span></div>
                <button type="button" onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== index) }))} className="col-span-2 md:col-span-1 h-9 rounded-lg border flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
              </div>;
            })}
            {form.ingredients.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-xs text-[#77796D]">Adicione ao menos um ingrediente.</div>}
            <div className="grid grid-cols-3 gap-2 text-xs"><div className="bg-white rounded-xl p-3 border"><span className="text-[10px] text-[#77796D] block">Custo estimado</span><b>R$ {recipeCost.toFixed(2)}</b></div><div className="bg-white rounded-xl p-3 border"><span className="text-[10px] text-[#77796D] block">Preço de venda</span><b>R$ {Number(form.price || 0).toFixed(2)}</b></div><div className="bg-white rounded-xl p-3 border"><span className="text-[10px] text-[#77796D] block">Matéria-prima</span><b>{foodCost.toFixed(1)}%</b></div></div>
            {inlineIngredient && <div className="rounded-xl border border-[#CCD5AE] bg-[#F4F8EF] p-4 space-y-3"><div className="flex justify-between"><b className="text-xs">Novo ingrediente no estoque</b><button type="button" onClick={() => setInlineIngredient(false)}><X className="w-4 h-4" /></button></div><InventoryFields value={ingredientDraft} onChange={setIngredientDraft} /><button type="button" disabled={saving || !ingredientDraft.name} onClick={createInlineIngredient} className="px-4 py-2 rounded-lg bg-[#588157] text-white text-xs font-bold">Cadastrar e voltar à ficha</button></div>}
          </div>}

          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} /> Disponível para venda</label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancelar</button><button disabled={saving || !form.name || (form.operationalType === 'recipe' && form.ingredients.length === 0)} className="px-5 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar item'}</button></div>
        </form>
      </div>}
    </div>
  );
};

const InventoryFields: React.FC<{ value: InlineInventoryPayload; onChange: (value: InlineInventoryPayload) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<InlineInventoryPayload>) => onChange({ ...value, ...patch });
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <label className="text-[11px] font-semibold">Nome *<input required value={value.name} onChange={e => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">SKU<input value={value.sku || ''} onChange={e => set({ sku: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Unidade *<select value={value.unit} onChange={e => set({ unit: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2">{UNITS.map(u => <option key={u}>{u}</option>)}</select></label>
    <label className="text-[11px] font-semibold">Categoria<input value={value.category} onChange={e => set({ category: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Custo unitário<input type="number" min="0" step="0.01" value={value.costPrice} onChange={e => set({ costPrice: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Fornecedor<input value={value.supplier || ''} onChange={e => set({ supplier: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Estoque atual<input type="number" min="0" step="0.001" value={value.currentStock} onChange={e => set({ currentStock: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Estoque mínimo<input type="number" min="0" step="0.001" value={value.minStock} onChange={e => set({ minStock: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
    <label className="text-[11px] font-semibold">Estoque máximo<input type="number" min="0" step="0.001" value={value.maxStock ?? ''} onChange={e => set({ maxStock: e.target.value === '' ? undefined : Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
  </div>;
};
